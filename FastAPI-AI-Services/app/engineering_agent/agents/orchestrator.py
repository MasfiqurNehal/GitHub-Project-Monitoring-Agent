"""
Engineering Agent Multi-Agent Orchestrator.
Coordinates intent classification, tool invocation, telemetry retrieval, and LLM reasoning.
"""
import time
import json
from typing import Dict, Any, List, Optional

from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.tools.express_client import express_api_client
from app.engineering_agent.prompts.system_prompts import (
    ENGINEERING_ORCHESTRATOR_SYSTEM_PROMPT,
    SPECIALIZED_INTENT_PROMPTS
)
from app.engineering_agent.llm import agent_llm_factory, LLMError
from app.agents.detector import agent_detector
from app.utils.logger import logger

class EngineeringOrchestrator:
    """
    Main controller for the Engineering AI Agent.
    """

    async def orchestrate(self, state: AgentState) -> None:
        """
        Execute full multi-step engineering analysis workflow:
        1. Classify intent.
        2. Plan and execute context tool calls.
        3. Formulate structured engineering prompt with real backend telemetry.
        4. Query AI Provider.
        5. Populate state with response, metrics, and actions.
        """
        logger.info(f"[EngineeringAgent] Orchestrating request for user '{state.user_id}' in tenant '{state.tenant_id}'")
        state.add_reasoning_step("Initiating engineering intent classification and tool planning.", action="classify_intent")

        # Step 1: Detect intent
        detection = agent_detector.detect_intent(state.user_request)
        state.detected_intent = detection.task_category if detection.requires_agent else "general_engineering_analysis"
        state.selected_agent = "EngineeringOrchestrator"

        state.add_reasoning_step(
            f"Detected engineering intent category: '{state.detected_intent}'",
            action="plan_tools"
        )

        # Step 2: Fetch relevant telemetry data from Express backend via Tools
        context_data: Dict[str, Any] = {}
        
        # Tool A: Projects
        if state.project_id:
            t0 = time.time()
            proj_res = await express_api_client.get_project_detail(
                project_id=state.project_id,
                auth_token=state.auth_token,
                tenant_id=state.tenant_id
            )
            dur = (time.time() - t0) * 1000.0
            state.record_tool_result(
                tool_name="get_project_detail",
                input_args={"project_id": state.project_id},
                output_data=proj_res.get("data"),
                success=proj_res.get("success", False),
                error_message=proj_res.get("error"),
                duration_ms=dur
            )
            if proj_res.get("success"):
                context_data["project_details"] = proj_res.get("data")
                state.project_context = proj_res.get("data")
        else:
            t0 = time.time()
            projs_res = await express_api_client.list_projects(
                auth_token=state.auth_token,
                tenant_id=state.tenant_id
            )
            dur = (time.time() - t0) * 1000.0
            state.record_tool_result(
                tool_name="list_projects",
                input_args={},
                output_data=projs_res.get("data"),
                success=projs_res.get("success", False),
                error_message=projs_res.get("error"),
                duration_ms=dur
            )
            if projs_res.get("success"):
                context_data["projects_list"] = projs_res.get("data")

        # Tool B: Repositories
        if state.repository_id:
            t0 = time.time()
            repo_res = await express_api_client.get_repository_detail(
                repository_id=state.repository_id,
                auth_token=state.auth_token,
                tenant_id=state.tenant_id
            )
            dur = (time.time() - t0) * 1000.0
            state.record_tool_result(
                tool_name="get_repository_detail",
                input_args={"repository_id": state.repository_id},
                output_data=repo_res.get("data"),
                success=repo_res.get("success", False),
                error_message=repo_res.get("error"),
                duration_ms=dur
            )
            if repo_res.get("success"):
                context_data["repository_details"] = repo_res.get("data")
                state.repository_context = repo_res.get("data")
        elif "developer" in state.detected_intent or "repo" in state.user_request.lower() or "project" in state.user_request.lower():
            t0 = time.time()
            repos_res = await express_api_client.list_repositories(
                auth_token=state.auth_token,
                tenant_id=state.tenant_id
            )
            dur = (time.time() - t0) * 1000.0
            state.record_tool_result(
                tool_name="list_repositories",
                input_args={},
                output_data=repos_res.get("data"),
                success=repos_res.get("success", False),
                error_message=repos_res.get("error"),
                duration_ms=dur
            )
            if repos_res.get("success"):
                context_data["repositories_list"] = repos_res.get("data")

        # Tool C: Developers
        if "developer" in state.detected_intent or "developer" in state.user_request.lower() or "team" in state.user_request.lower() or "contributor" in state.user_request.lower():
            t0 = time.time()
            devs_res = await express_api_client.list_developers(
                auth_token=state.auth_token,
                tenant_id=state.tenant_id
            )
            dur = (time.time() - t0) * 1000.0
            state.record_tool_result(
                tool_name="list_developers",
                input_args={},
                output_data=devs_res.get("data"),
                success=devs_res.get("success", False),
                error_message=devs_res.get("error"),
                duration_ms=dur
            )
            if devs_res.get("success"):
                context_data["developers_list"] = devs_res.get("data")
                state.developer_context = devs_res.get("data")

        # Tool D: Pull Requests / Activity
        if "pr" in state.user_request.lower() or "review" in state.user_request.lower() or "pull request" in state.user_request.lower():
            t0 = time.time()
            prs_res = await express_api_client.list_pull_requests(
                auth_token=state.auth_token,
                tenant_id=state.tenant_id
            )
            dur = (time.time() - t0) * 1000.0
            state.record_tool_result(
                tool_name="list_pull_requests",
                input_args={},
                output_data=prs_res.get("data"),
                success=prs_res.get("success", False),
                error_message=prs_res.get("error"),
                duration_ms=dur
            )
            if prs_res.get("success"):
                context_data["pull_requests_list"] = prs_res.get("data")

        state.add_reasoning_step(
            f"Retrieved telemetry from {len(state.tool_results)} Express tools.",
            action="execute_llm_reasoning"
        )

        # Step 3: Construct LLM Prompt Messages
        intent_instruction = SPECIALIZED_INTENT_PROMPTS.get(
            state.detected_intent,
            SPECIALIZED_INTENT_PROMPTS["general_engineering_analysis"]
        )

        system_message = (
            f"{ENGINEERING_ORCHESTRATOR_SYSTEM_PROMPT}\n\n"
            f"Specialized Task Focus: {intent_instruction}\n"
        )

        telemetry_summary_str = json.dumps(context_data, default=str)[:3500] if context_data else "No specific repository telemetry available."

        user_content = (
            f"USER INSTRUCTION: {state.user_request}\n\n"
            f"AUTHENTICATED TENANT CONTEXT:\n"
            f"- Tenant ID: {state.tenant_id}\n"
            f"- Scoped Project ID: {state.project_id or 'All Projects'}\n"
            f"- Scoped Repository ID: {state.repository_id or 'All Repositories'}\n\n"
            f"LIVE TELEMETRY FROM BACKEND TOOLS:\n"
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
                f"### ⚙️ Engineering Analysis\n\n"
                f"We retrieved live engineering telemetry for your tenant (`{state.tenant_id}`).\n\n"
                f"- **Tools Executed**: {len(state.tool_results)}\n"
                f"- **Status**: Live data fetched successfully.\n\n"
                f"*(Note: Engineering Agent LLM Provider synthesis notice: {e.message})*"
            )
        except Exception as e:
            logger.error(f"[EngineeringAgent] Unexpected error during AI completion: {str(e)}")
            state.final_response = (
                f"### ⚙️ Engineering Analysis\n\n"
                f"We retrieved live engineering telemetry for your tenant (`{state.tenant_id}`).\n\n"
                f"- **Tools Executed**: {len(state.tool_results)}\n"
                f"- **Status**: Live data fetched successfully.\n\n"
                f"*(Note: AI Provider synthesis temporarily unavailable)*"
            )

        # Step 5: Extract Metrics & Recommended Actions from telemetry
        if state.project_context and isinstance(state.project_context, dict):
            metrics_dict = state.project_context.get("project", {}).get("metrics", {}) or state.project_context.get("stats", {})
            if metrics_dict:
                if "commitsCount" in metrics_dict:
                    state.add_metric("Total Commits", metrics_dict.get("commitsCount", 0))
                if "repositoriesCount" in metrics_dict:
                    state.add_metric("Connected Repos", metrics_dict.get("repositoriesCount", 0))
                if "developersCount" in metrics_dict:
                    state.add_metric("Active Devs", metrics_dict.get("developersCount", 0))
                if "prsCount" in metrics_dict:
                    state.add_metric("Pull Requests", metrics_dict.get("prsCount", 0))

        if state.project_id:
            state.add_action("View Project Detail", href=f"/projects/{state.project_id}")
        else:
            state.add_action("View Projects Dashboard", href="/projects")
            state.add_action("View Developer Velocity", href="/developers")

        state.add_reasoning_step("Completed response formulation.", action="finalize")

engineering_orchestrator = EngineeringOrchestrator()
