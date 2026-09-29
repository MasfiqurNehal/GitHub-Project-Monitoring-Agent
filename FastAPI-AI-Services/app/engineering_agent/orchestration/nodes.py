"""
Processing Nodes and Conditional Routing Functions for Engineering Agent StateGraph.
"""
import time
import json
import asyncio
from typing import Dict, Any, List, Optional

from app.engineering_agent.orchestration.state import GraphState
from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.router import engineering_intent_router, IntentCategory

from app.engineering_agent.freshness import freshness_evaluator, FreshnessMetadata, FreshnessTier
from app.engineering_agent.agents.registry import specialist_registry

from app.engineering_agent.agents.repository_agent import repository_agent
from app.engineering_agent.agents.commit_agent import commit_agent
from app.engineering_agent.agents.pull_request_agent import pull_request_agent
from app.engineering_agent.agents.issue_agent import issue_agent
from app.engineering_agent.agents.developer_agent import developer_agent
from app.engineering_agent.agents.project_agent import project_agent
from app.engineering_agent.agents.analytics_agent import analytics_agent
from app.engineering_agent.llm import agent_llm_factory, LLMError
from app.engineering_agent.prompts.system_prompts import (
    ENGINEERING_ORCHESTRATOR_SYSTEM_PROMPT,
    SPECIALIZED_INTENT_PROMPTS
)
from app.utils.logger import logger


# =============================================================================
# 1. Validation & Intent Routing Nodes
# =============================================================================

async def validate_context_node(state: GraphState) -> Dict[str, Any]:
    """Validate presence of authenticated tenant context and initialize containers."""
    tenant_id = state.get("tenant_id")
    if not tenant_id:
        return {"error": "Tenant context is missing from graph state."}
    
    return {
        "telemetry_data": state.get("telemetry_data") or {},
        "metrics": state.get("metrics") or [],
        "actions": state.get("actions") or [],
        "artifacts": state.get("artifacts") or [],
        "execution_steps": state.get("execution_steps") or []
    }


async def route_intent_node(state: GraphState) -> Dict[str, Any]:
    """Execute hybrid intent router to determine intent category, confidence, and entities."""
    routing_result = await engineering_intent_router.route(
        prompt=state["user_request"],
        project_id=state.get("project_id"),
        repository_id=state.get("repository_id")
    )

    # Evaluate data freshness requirement (Phase 8: Data Freshness Strategy)
    freshness_eval = freshness_evaluator.evaluate_request(
        user_message=state["user_request"],
        intent=routing_result.intent,
        entities=routing_result.entities
    )

    # Check for multi-agent query pattern: mentions both project and developer/ranking
    prompt_lower = state["user_request"].lower()
    is_multi_agent = bool(
        ("who" in prompt_lower or "most" in prompt_lower or "top" in prompt_lower or "compare" in prompt_lower) and
        ("project" in prompt_lower or routing_result.intent == IntentCategory.PROJECT_INFO or state.get("project_id"))
    )

    return {
        "detected_intent": routing_result.intent.value,
        "confidence": routing_result.confidence,
        "entities": routing_result.entities,
        "requires_clarification": routing_result.requires_clarification,
        "clarification_prompt": routing_result.clarification_prompt,
        "suggested_options": routing_result.suggested_options,
        "is_multi_agent_pipeline": is_multi_agent,
        "freshness_metadata": freshness_eval.freshness_metadata.model_dump(),
        "data_freshness_tier": freshness_eval.tier.value,
        "force_fresh": freshness_eval.force_fresh
    }



# =============================================================================
# 2. Guardrail & Clarification Nodes
# =============================================================================

async def guardrail_reject_node(state: GraphState) -> Dict[str, Any]:
    """Politely handle non-IT or unsupported queries without invoking tools."""
    actions = [{"label": opt, "href": "/dashboard"} for opt in state.get("suggested_options", [])]
    return {
        "selected_agent": "Guardrail_Reject",
        "final_response": (
            "👋 I am the **GitMonitor Engineering Intelligence Agent**, specialized exclusively in "
            "GitHub repository monitoring, developer velocity, code churn, and software engineering analytics.\n\n"
            "How can I assist you with your projects, commits, pull requests, or team contributions today?"
        ),
        "actions": actions
    }


async def clarification_node(state: GraphState) -> Dict[str, Any]:
    """Handle low-confidence or ambiguous queries by requesting clarification."""
    actions = [{"label": opt, "href": "/projects"} for opt in state.get("suggested_options", [])]
    clarification_prompt = state.get("clarification_prompt") or "Could you clarify your request?"
    return {
        "selected_agent": "Clarification_Router",
        "final_response": (
            f"### 🔍 Clarification Needed\n\n"
            f"{clarification_prompt}\n\n"
            f"Please choose one of the options below or rephrase your request."
        ),
        "actions": actions
    }


# =============================================================================
# 3. Specialist Agent Execution Nodes
# =============================================================================

def _get_agent_state_from_graph(state: GraphState) -> AgentState:
    """Retrieve or construct the AgentState instance for specialist agent compatibility."""
    agent_state = state.get("agent_state")
    if agent_state is not None:
        return agent_state
    
    return AgentState(
        user_request=state.get("user_request", ""),
        tenant_id=state.get("tenant_id", ""),
        user_id=state.get("user_id", "system-user"),
        auth_token=state.get("auth_token"),
        project_id=state.get("project_id"),
        repository_id=state.get("repository_id"),
        conversation_id=state.get("conversation_id", "eng-conv-default"),
        message_id=state.get("message_id", "eng-msg-default")
    )



async def repository_node(state: GraphState) -> Dict[str, Any]:
    """Execute Repository Specialist Agent."""
    agent_state = _get_agent_state_from_graph(state)
    res = await repository_agent.analyze(agent_state, state.get("entities"))
    return {
        "selected_agent": repository_agent.name,
        "telemetry_data": {**state.get("telemetry_data", {}), **res.data},
        "metrics": (state.get("metrics", []) + res.metrics),
        "actions": (state.get("actions", []) + res.actions)
    }


async def commit_node(state: GraphState) -> Dict[str, Any]:
    """Execute Commit Specialist Agent."""
    agent_state = _get_agent_state_from_graph(state)
    res = await commit_agent.analyze(agent_state, state.get("entities"))
    return {
        "selected_agent": commit_agent.name,
        "telemetry_data": {**state.get("telemetry_data", {}), **res.data},
        "metrics": (state.get("metrics", []) + res.metrics),
        "actions": (state.get("actions", []) + res.actions)
    }


async def pull_request_node(state: GraphState) -> Dict[str, Any]:
    """Execute Pull Request Specialist Agent."""
    agent_state = _get_agent_state_from_graph(state)
    res = await pull_request_agent.analyze(agent_state, state.get("entities"))
    return {
        "selected_agent": pull_request_agent.name,
        "telemetry_data": {**state.get("telemetry_data", {}), **res.data},
        "metrics": (state.get("metrics", []) + res.metrics),
        "actions": (state.get("actions", []) + res.actions)
    }


async def issue_node(state: GraphState) -> Dict[str, Any]:
    """Execute Issue Specialist Agent."""
    agent_state = _get_agent_state_from_graph(state)
    res = await issue_agent.analyze(agent_state, state.get("entities"))
    return {
        "selected_agent": issue_agent.name,
        "telemetry_data": {**state.get("telemetry_data", {}), **res.data},
        "metrics": (state.get("metrics", []) + res.metrics),
        "actions": (state.get("actions", []) + res.actions)
    }


async def developer_node(state: GraphState) -> Dict[str, Any]:
    """Execute Developer Specialist Agent."""
    agent_state = _get_agent_state_from_graph(state)
    res = await developer_agent.analyze(agent_state, state.get("entities"))
    return {
        "selected_agent": developer_agent.name,
        "telemetry_data": {**state.get("telemetry_data", {}), **res.data},
        "metrics": (state.get("metrics", []) + res.metrics),
        "actions": (state.get("actions", []) + res.actions)
    }


async def project_node(state: GraphState) -> Dict[str, Any]:
    """Execute Project Specialist Agent."""
    agent_state = _get_agent_state_from_graph(state)
    res = await project_agent.analyze(agent_state, state.get("entities"))
    return {
        "selected_agent": project_agent.name,
        "telemetry_data": {**state.get("telemetry_data", {}), **res.data},
        "metrics": (state.get("metrics", []) + res.metrics),
        "actions": (state.get("actions", []) + res.actions)
    }


async def analytics_node(state: GraphState) -> Dict[str, Any]:
    """Execute Analytics Specialist Agent."""
    agent_state = _get_agent_state_from_graph(state)
    res = await analytics_agent.analyze(agent_state, state.get("entities"))
    return {
        "selected_agent": analytics_agent.name,
        "telemetry_data": {**state.get("telemetry_data", {}), **res.data},
        "metrics": (state.get("metrics", []) + res.metrics),
        "actions": (state.get("actions", []) + res.actions)
    }


# =============================================================================
# 4. Multi-Agent Composite Node (Parallel / Pipelined Execution)
# =============================================================================

async def multi_agent_composite_node(state: GraphState) -> Dict[str, Any]:
    """
    Executes a multi-specialist workflow for cross-cutting queries:
    1. Project Agent identifies project repositories.
    2. Concurrently runs Developer Agent & Commit Agent via asyncio.gather.
    3. Runs Analytics Agent to aggregate KPIs and rankings across repositories.
    """
    agent_state = _get_agent_state_from_graph(state)
    entities = state.get("entities")
    logger.info("[MultiAgentNode] Starting multi-specialist composite orchestration")

    # Step 1: Project Agent scope resolution
    proj_res = await project_agent.analyze(agent_state, entities)

    # Step 2: Parallel execution of Developer Agent and Commit Agent
    dev_task = developer_agent.analyze(agent_state, entities)
    commit_task = commit_agent.analyze(agent_state, entities)
    dev_res, commit_res = await asyncio.gather(dev_task, commit_task, return_exceptions=False)

    # Step 3: Analytics Agent aggregation
    analytics_res = await analytics_agent.analyze(agent_state, entities)

    combined_telemetry = {
        **state.get("telemetry_data", {}),
        "project_scope": proj_res.data,
        "developer_velocity": dev_res.data,
        "commit_metrics": commit_res.data,
        "analytics_summary": analytics_res.data
    }

    combined_metrics = (
        state.get("metrics", []) +
        proj_res.metrics +
        dev_res.metrics +
        commit_res.metrics +
        analytics_res.metrics
    )

    combined_actions = (
        state.get("actions", []) +
        proj_res.actions +
        dev_res.actions +
        analytics_res.actions
    )

    return {
        "selected_agent": "Multi-Agent Composite (Project + Developer + Commit + Analytics)",
        "active_specialists": [
            project_agent.name,
            developer_agent.name,
            commit_agent.name,
            analytics_agent.name
        ],
        "telemetry_data": combined_telemetry,
        "metrics": combined_metrics,
        "actions": combined_actions
    }


# =============================================================================
# 5. Result Aggregation & Response Generation Nodes
# =============================================================================

async def aggregate_results_node(state: GraphState) -> Dict[str, Any]:
    """Validate aggregated telemetry and format fallback defaults if empty."""
    telemetry = state.get("telemetry_data") or {}
    metrics = state.get("metrics") or []
    actions = state.get("actions") or []

    if not actions:
        actions = [
            {"label": "View Dashboard", "href": "/dashboard"},
            {"label": "View Projects", "href": "/projects"}
        ]

    return {
        "telemetry_data": telemetry,
        "metrics": metrics,
        "actions": actions
    }


async def generate_response_node(state: GraphState) -> Dict[str, Any]:
    """Synthesize final expert engineering response via LLM Provider (zero chain-of-thought)."""
    selected_agent = state.get("selected_agent", "Engineering Agent")
    detected_intent = state.get("detected_intent", "general_engineering_qa")
    telemetry = state.get("telemetry_data", {})

    intent_instruction = SPECIALIZED_INTENT_PROMPTS.get(
        detected_intent,
        SPECIALIZED_INTENT_PROMPTS.get("general_engineering_analysis", "Provide deep engineering insights.")
    )

    system_message = (
        f"{ENGINEERING_ORCHESTRATOR_SYSTEM_PROMPT}\n\n"
        f"Active Specialist: {selected_agent}\n"
        f"Specialized Task Focus: {intent_instruction}\n"
    )

    telemetry_str = json.dumps(telemetry, default=str)[:3500] if telemetry else "No specific telemetry recorded."

    user_content = (
        f"USER INSTRUCTION: {state['user_request']}\n\n"
        f"AUTHENTICATED TENANT CONTEXT:\n"
        f"- Tenant ID: {state['tenant_id']}\n"
        f"- Scoped Project ID: {state.get('project_id') or 'All Projects'}\n"
        f"- Scoped Repository ID: {state.get('repository_id') or 'All Repositories'}\n\n"
        f"LIVE TELEMETRY FROM SPECIALIST AGENTS & TOOLS:\n"
        f"```json\n{telemetry_str}\n```\n\n"
        f"Synthesize an expert technical response with actionable recommendations. Never expose internal thoughts or hidden keys."
    )

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_content}
    ]

    try:
        provider = agent_llm_factory.get_provider()
        resp = await provider.complete(messages=messages, temperature=0.3)
        final_answer = resp.content or "Analysis complete."
    except LLMError as e:
        logger.error(f"[StateGraph] LLM Provider error ({e.__class__.__name__}): {e.message}")
        final_answer = (
            f"### ⚙️ Engineering Analysis ({selected_agent})\n\n"
            f"We retrieved live engineering telemetry for your tenant (`{state['tenant_id']}`).\n\n"
            f"- **Specialist**: {selected_agent}\n"
            f"- **Status**: Live telemetry gathered successfully.\n\n"
            f"*(Note: LLM synthesis notice: {e.message})*"
        )
    except Exception as e:
        logger.error(f"[StateGraph] Unexpected error during completion: {str(e)}")
        final_answer = (
            f"### ⚙️ Engineering Analysis ({selected_agent})\n\n"
            f"We retrieved live engineering telemetry for your tenant (`{state['tenant_id']}`).\n\n"
            f"- **Specialist**: {selected_agent}\n"
            f"- **Status**: Live telemetry gathered successfully.\n"
        )

    # Append Data Freshness Provenance Footnote (Phase 8: Data Freshness Strategy)
    freshness_dict = state.get("freshness_metadata")

    if freshness_dict and "Data Source:" not in final_answer:
        try:
            meta = FreshnessMetadata(**freshness_dict)
            footnote = freshness_evaluator.format_provenance_footnote(meta)
            final_answer += footnote
        except Exception as e:
            logger.warning(f"[generate_response_node] Failed to append freshness footnote: {e}")

    return {"final_response": final_answer}



# =============================================================================
# 6. Conditional Edge Routing Functions
# =============================================================================

def route_after_intent(state: GraphState) -> str:
    """Conditional router evaluated after route_intent_node."""
    if state.get("detected_intent") == IntentCategory.UNSUPPORTED_NON_IT.value:
        return "guardrail"
    if state.get("requires_clarification"):
        return "clarification"
    if state.get("is_multi_agent_pipeline"):
        return "multi_agent"

    intent = state.get("detected_intent")
    if intent == IntentCategory.REPOSITORY_INFO.value:
        return "repository"
    elif intent in (IntentCategory.COMMIT_INFO.value, IntentCategory.CODE_IMPACT.value):
        return "commit"
    elif intent == IntentCategory.PULL_REQUEST_INFO.value:
        return "pull_request"
    elif intent == IntentCategory.ISSUE_INFO.value:
        return "issue"
    elif intent == IntentCategory.DEVELOPER_INFO.value:
        return "developer"
    elif intent == IntentCategory.PROJECT_INFO.value:
        return "project"
    else:
        return "analytics"
