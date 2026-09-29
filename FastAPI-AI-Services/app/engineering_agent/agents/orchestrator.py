"""
Engineering Agent Multi-Agent Orchestrator.
Coordinates intent classification, specialist sub-agent dispatching, tool invocation, and LLM reasoning.
"""
import time
import json
from typing import Dict, Any, List, Optional

from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.agents.registry import specialist_registry
from app.engineering_agent.prompts.system_prompts import (
    ENGINEERING_ORCHESTRATOR_SYSTEM_PROMPT,
    SPECIALIZED_INTENT_PROMPTS
)
from app.engineering_agent.llm import agent_llm_factory, LLMError
from app.engineering_agent.router import engineering_intent_router, IntentCategory
from app.utils.logger import logger


class EngineeringOrchestrator:
    """
    Main controller for the Engineering AI Agent.
    Coordinates intent classification, specialist sub-agents, and LLM reasoning.
    """

    async def orchestrate(self, state: AgentState) -> None:
        """
        Execute full multi-step engineering analysis workflow:
        1. Classify intent via hybrid intent router.
        2. Dispatch to appropriate Specialist Agent.
        3. Gather domain telemetry via read-only tools.
        4. Formulate structured engineering prompt with real backend telemetry.
        5. Query AI Provider.
        6. Populate state with response, metrics, and actions.
        """
        logger.info(f"[EngineeringAgent] Orchestrating request for user '{state.user_id}' in tenant '{state.tenant_id}'")
        state.add_reasoning_step("Initiating engineering intent classification and entity extraction.", action="classify_intent")

        # Step 1: Execute Intent Router
        routing_result = await engineering_intent_router.route(
            prompt=state.user_request,
            project_id=state.project_id,
            repository_id=state.repository_id
        )

        state.detected_intent = routing_result.intent.value

        # Handle unsupported non-IT questions
        if routing_result.intent == IntentCategory.UNSUPPORTED_NON_IT:
            state.selected_agent = "Guardrail_Reject"
            state.final_response = (
                "👋 I am the **GitMonitor Engineering Intelligence Agent**, specialized exclusively in "
                "GitHub repository monitoring, developer velocity, code churn, and software engineering analytics.\n\n"
                "How can I assist you with your projects, commits, pull requests, or team contributions today?"
            )
            for opt in routing_result.suggested_options:
                state.add_action(opt, href="/dashboard")
            state.add_reasoning_step("Handled out-of-scope non-IT query gracefully.", action="guardrail_reject")
            return

        # Handle clarification if confidence is too low
        if routing_result.requires_clarification and routing_result.clarification_prompt:
            state.selected_agent = "Clarification_Router"
            state.final_response = (
                f"### 🔍 Clarification Needed\n\n"
                f"{routing_result.clarification_prompt}\n\n"
                f"Please choose one of the options below or rephrase your request."
            )
            for opt in routing_result.suggested_options:
                state.add_action(opt, href="/projects")
            state.add_reasoning_step("Requested user clarification due to ambiguous query.", action="request_clarification")
            return

        # Step 2: Dispatch to Specialist Agent
        specialist = specialist_registry.get_agent_for_intent(routing_result.intent)
        state.selected_agent = specialist.name

        state.add_reasoning_step(
            f"Resolved intent '{state.detected_intent}' (confidence: {routing_result.confidence:.2f}). Dispatched to {specialist.name}.",
            action="dispatch_specialist"
        )

        specialist_result = await specialist.analyze(state, routing_result.entities)
        context_data = specialist_result.data or {}

        # Populate state metrics and actions from specialist output
        for m in specialist_result.metrics:
            state.add_metric(
                label=m.get("label", "Metric"),
                value=m.get("value", 0),
                change=m.get("change"),
                color=m.get("color", "emerald")
            )

        for a in specialist_result.actions:
            state.add_action(
                label=a.get("label", "View Details"),
                href=a.get("href"),
                action_type=a.get("action_type", "link")
            )

        state.add_reasoning_step(
            f"{specialist.name} gathered telemetry using {len(specialist_result.tools_used)} tools in {specialist_result.duration_ms:.1f}ms.",
            action="execute_llm_reasoning"
        )

        # Step 3: Construct LLM Prompt Messages
        intent_instruction = SPECIALIZED_INTENT_PROMPTS.get(
            state.detected_intent,
            SPECIALIZED_INTENT_PROMPTS.get("general_engineering_analysis", specialist.description)
        )

        system_message = (
            f"{ENGINEERING_ORCHESTRATOR_SYSTEM_PROMPT}\n\n"
            f"Active Specialist: {specialist.name}\n"
            f"Specialized Task Focus: {intent_instruction}\n"
        )

        telemetry_summary_str = json.dumps(context_data, default=str)[:3500] if context_data else "No specific repository telemetry available."

        user_content = (
            f"USER INSTRUCTION: {state.user_request}\n\n"
            f"AUTHENTICATED TENANT CONTEXT:\n"
            f"- Tenant ID: {state.tenant_id}\n"
            f"- Scoped Project ID: {state.project_id or 'All Projects'}\n"
            f"- Scoped Repository ID: {state.repository_id or 'All Repositories'}\n\n"
            f"LIVE TELEMETRY FROM SPECIALIST TOOLS:\n"
            f"```json\n{telemetry_summary_str}\n```\n\n"
            f"Synthesize an expert technical response with actionable recommendations."
        )

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_content}
        ]

        # Step 4: Generate completion via Engineering Agent LLM Provider
        try:
            provider = agent_llm_factory.get_provider()
            completion_resp = await provider.complete(messages=messages, temperature=0.3)
            state.final_response = completion_resp.content or "Analysis complete."
        except LLMError as e:
            logger.error(f"[EngineeringAgent] LLM Provider error ({e.__class__.__name__}): {e.message}")
            state.final_response = (
                f"### ⚙️ Engineering Analysis ({specialist.name})\n\n"
                f"We retrieved live engineering telemetry for your tenant (`{state.tenant_id}`).\n\n"
                f"- **Specialist**: {specialist.name}\n"
                f"- **Tools Executed**: {len(state.tool_results)}\n"
                f"- **Status**: Live data fetched successfully.\n\n"
                f"*(Note: Engineering Agent LLM Provider notice: {e.message})*"
            )
        except Exception as e:
            logger.error(f"[EngineeringAgent] Unexpected error during AI completion: {str(e)}")
            state.final_response = (
                f"### ⚙️ Engineering Analysis ({specialist.name})\n\n"
                f"We retrieved live engineering telemetry for your tenant (`{state.tenant_id}`).\n\n"
                f"- **Specialist**: {specialist.name}\n"
                f"- **Tools Executed**: {len(state.tool_results)}\n"
                f"- **Status**: Live data fetched successfully.\n\n"
                f"*(Note: AI Provider synthesis temporarily unavailable)*"
            )

        # Fallback default actions if none added by specialist
        if not state.actions:
            if state.project_id:
                state.add_action("View Project Detail", href=f"/projects/{state.project_id}")
            else:
                state.add_action("View Projects Dashboard", href="/projects")
                state.add_action("View Developer Velocity", href="/developers")

        state.add_reasoning_step("Completed response formulation.", action="finalize")


engineering_orchestrator = EngineeringOrchestrator()
