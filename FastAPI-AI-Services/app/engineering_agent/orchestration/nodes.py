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
from app.engineering_agent.entity_resolution import entity_resolver, tenant_entity_loader, EntityType
from app.engineering_agent.response_generation import response_generator
from app.engineering_agent.agents.registry import specialist_registry



from app.engineering_agent.agents.repository_agent import repository_agent
from app.engineering_agent.agents.commit_agent import commit_agent
from app.engineering_agent.agents.pull_request_agent import pull_request_agent
from app.engineering_agent.agents.issue_agent import issue_agent
from app.engineering_agent.agents.developer_agent import developer_agent
from app.engineering_agent.agents.project_agent import project_agent
from app.engineering_agent.agents.analytics_agent import analytics_agent
from app.engineering_agent.agents.general_it_agent import general_it_agent
from app.engineering_agent.security import security_guardrail_validator
from app.engineering_agent.llm import agent_llm_factory, LLMError
from app.engineering_agent.prompts.system_prompts import (
    ENGINEERING_ORCHESTRATOR_SYSTEM_PROMPT,
    SPECIALIZED_INTENT_PROMPTS
)
from app.utils.logger import logger


from app.engineering_agent.memory import conversation_memory_store, ConversationSession

# =============================================================================
# 1. Validation & Intent Routing Nodes
# =============================================================================

async def validate_context_node(state: GraphState) -> Dict[str, Any]:
    """Validate presence of authenticated tenant context, load conversation memory, and initialize containers."""
    tenant_id = state.get("tenant_id")
    user_id = state.get("user_id")
    conv_id = state.get("conversation_id")
    if not tenant_id:
        return {"error": "Tenant context is missing from graph state."}
    
    session = None
    recent_turns = []
    if tenant_id and user_id and conv_id:
        try:
            session = await conversation_memory_store.get_session(tenant_id, user_id, conv_id)
            recent_turns = await conversation_memory_store.get_recent_turns(tenant_id, user_id, conv_id, max_turns=5)
        except Exception as e:
            logger.warning(f"[validate_context_node] Failed to load conversation memory: {e}")

    return {
        "memory_session": session,
        "recent_turns": recent_turns,
        "telemetry_data": state.get("telemetry_data") or {},
        "metrics": state.get("metrics") or [],
        "actions": state.get("actions") or [],
        "artifacts": state.get("artifacts") or [],
        "execution_steps": state.get("execution_steps") or []
    }


async def route_intent_node(state: GraphState) -> Dict[str, Any]:
    """Execute hybrid intent router with conversation memory to determine intent, confidence, and entities."""
    # Step 0: Security & Guardrails Inspection (Phase 15: Security Validation)
    user_prompt = state.get("user_request", "")
    sec_res = security_guardrail_validator.validate_prompt(user_prompt)
    if not sec_res.is_safe:
        logger.warning(f"[route_intent_node] Security violation detected ({sec_res.violation_type}): {user_prompt[:50]}")
        return {
            "detected_intent": "security_violation",
            "security_violation": sec_res.rejection_message,
            "requires_clarification": False,
            "actions": [
                {"label": "Explore Dashboard", "href": "/dashboard"},
                {"label": "View Repositories", "href": "/repositories"}
            ]
        }

    session = state.get("memory_session")
    routing_result = await engineering_intent_router.route(
        prompt=user_prompt,
        project_id=state.get("project_id"),
        repository_id=state.get("repository_id"),
        developer_id=state.get("developer_id"),
        session=session
    )

    # Evaluate data freshness requirement (Phase 8: Data Freshness Strategy)
    freshness_eval = freshness_evaluator.evaluate_request(
        user_message=state["user_request"],
        intent=routing_result.intent,
        entities=routing_result.entities
    )

    entities = routing_result.entities
    requires_clarification = routing_result.requires_clarification
    clarification_prompt = routing_result.clarification_prompt
    suggested_options = routing_result.suggested_options
    resolved_repo_id = state.get("repository_id")
    resolved_proj_id = state.get("project_id")

    tenant_id = state.get("tenant_id")
    auth_token = state.get("auth_token")

    # Perform Tenant-Scoped Entity Resolution (Phase 9: Entity Resolution)
    if tenant_id and entities and not requires_clarification:
        # 1. Resolve repository name
        if entities.repository_name:
            try:
                repos = await tenant_entity_loader.get_tenant_repositories(tenant_id, auth_token)
                res_repo = entity_resolver.resolve_repository(entities.repository_name, repos)
                if res_repo.clarification_needed:
                    requires_clarification = True
                    clarification_prompt = res_repo.clarification_message
                    suggested_options = res_repo.suggested_options
                elif res_repo.resolved_entity:
                    resolved_repo_id = res_repo.resolved_entity.entity_id
                    entities.repository_name = res_repo.resolved_entity.entity_name
            except Exception as e:
                logger.warning(f"[route_intent_node] Failed to resolve repository entity: {e}")

        # 2. Resolve project name
        if entities.project_name and not requires_clarification:
            try:
                projects = await tenant_entity_loader.get_tenant_projects(tenant_id, auth_token)
                res_proj = entity_resolver.resolve_project(entities.project_name, projects)
                if res_proj.clarification_needed:
                    requires_clarification = True
                    clarification_prompt = res_proj.clarification_message
                    suggested_options = res_proj.suggested_options
                elif res_proj.resolved_entity:
                    resolved_proj_id = res_proj.resolved_entity.entity_id
                    entities.project_name = res_proj.resolved_entity.entity_name
            except Exception as e:
                logger.warning(f"[route_intent_node] Failed to resolve project entity: {e}")

        # 3. Resolve developer name
        if entities.developer_name and not requires_clarification:
            try:
                devs = await tenant_entity_loader.get_tenant_developers(tenant_id, auth_token)
                res_dev = entity_resolver.resolve_developer(entities.developer_name, devs)
                if res_dev.clarification_needed:
                    requires_clarification = True
                    clarification_prompt = res_dev.clarification_message
                    suggested_options = res_dev.suggested_options
                elif res_dev.resolved_entity:
                    entities.developer_name = res_dev.resolved_entity.entity_name
            except Exception as e:
                logger.warning(f"[route_intent_node] Failed to resolve developer entity: {e}")

    # Check for multi-agent query pattern: mentions both project and developer/ranking
    prompt_lower = state["user_request"].lower()
    is_multi_agent = bool(
        ("who" in prompt_lower or "most" in prompt_lower or "top" in prompt_lower or "compare" in prompt_lower) and
        ("project" in prompt_lower or routing_result.intent == IntentCategory.PROJECT_INFO or resolved_proj_id)
    )

    return {
        "detected_intent": routing_result.intent.value,
        "confidence": routing_result.confidence,
        "entities": entities,
        "requires_clarification": requires_clarification,
        "clarification_prompt": clarification_prompt,
        "suggested_options": suggested_options,
        "is_multi_agent_pipeline": is_multi_agent,
        "repository_id": resolved_repo_id,
        "project_id": resolved_proj_id,
        "freshness_metadata": freshness_eval.freshness_metadata.model_dump(),
        "data_freshness_tier": freshness_eval.tier.value,
        "force_fresh": freshness_eval.force_fresh
    }




# =============================================================================
# 2. Guardrail & Clarification Nodes
# =============================================================================

async def security_reject_node(state: GraphState) -> Dict[str, Any]:
    """Explicitly reject security policy violations (prompt injection, write attempts, secret exfiltration)."""
    violation_msg = state.get("security_violation") or (
        "🔒 **Security Policy Violation:** The requested operation violates the security constraints of the GitMonitor AI Agent."
    )
    actions = [
        {"label": "Explore Dashboard", "href": "/dashboard"},
        {"label": "View Repositories", "href": "/repositories"}
    ]
    return {
        "selected_agent": "Security_Guardrail",
        "final_response": violation_msg,
        "actions": actions
    }


async def guardrail_reject_node(state: GraphState) -> Dict[str, Any]:
    """Politely handle non-IT or unsupported queries without invoking tools."""
    actions = [
        {"label": "Explore Dashboard", "href": "/dashboard"},
        {"label": "View Repositories", "href": "/repositories"},
        {"label": "Developer Velocity", "href": "/developers"}
    ]
    return {
        "selected_agent": "Guardrail_Reject",
        "final_response": (
            "👋 I am the **GitMonitor Engineering Intelligence Agent**, focused exclusively on "
            "software engineering, computer systems, IT architectures, and GitHub repository monitoring.\n\n"
            "I am unable to answer general lifestyle, tourism, or non-technical questions. "
            "How can I assist you with your repositories, code architectures, hardware systems, or team metrics today?"
        ),
        "actions": actions
    }


async def general_it_knowledge_node(state: GraphState) -> Dict[str, Any]:
    """Execute General IT & Software Engineering Specialist Agent (Category B)."""
    agent_state = _get_agent_state_from_graph(state)
    res = await general_it_agent.analyze(agent_state, state.get("entities"))
    return {
        "selected_agent": general_it_agent.name,
        "telemetry_data": {**state.get("telemetry_data", {}), **res.data},
        "metrics": (state.get("metrics", []) + res.metrics),
        "actions": (state.get("actions", []) + res.actions)
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
    """Synthesize final expert engineering response via ResponseGenerator (Phase 10: Response Generation)."""
    fact_checked_resp = await response_generator.generate_response(state)
    return {
        "final_response": fact_checked_resp.markdown_content,
        "metrics": [m.model_dump() for m in fact_checked_resp.key_metrics] if fact_checked_resp.key_metrics else state.get("metrics", []),
        "actions": fact_checked_resp.actions or state.get("actions", [])
    }




# =============================================================================
# 6. Conditional Edge Routing Functions
# =============================================================================

def route_after_intent(state: GraphState) -> str:
    """Conditional router evaluated after route_intent_node."""
    if state.get("security_violation") or state.get("detected_intent") == "security_violation":
        return "security_reject"
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
    elif intent == IntentCategory.GENERAL_ENGINEERING_QA.value:
        return "general_it_knowledge"
    else:
        return "analytics"
