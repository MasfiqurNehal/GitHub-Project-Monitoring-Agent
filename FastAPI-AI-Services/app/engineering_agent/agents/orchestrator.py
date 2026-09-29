"""
Engineering Agent Multi-Agent Orchestrator.
Coordinates intent classification, specialist sub-agents, and graph execution using the LangGraph StateGraph engine.
"""
from typing import Dict, Any, List, Optional

from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.orchestration import compiled_engineering_graph, GraphState
from app.utils.logger import logger


class EngineeringOrchestrator:
    """
    Main controller for the Engineering AI Agent.
    Coordinates intent routing, specialist sub-agents, and LLM reasoning via StateGraph.
    """

    async def orchestrate(self, state: AgentState) -> None:
        """
        Execute full multi-step engineering analysis workflow via compiled LangGraph state machine:
        1. Context validation
        2. Intent classification & entity extraction
        3. Dynamic specialist dispatch / multi-agent parallel execution
        4. Tool telemetry retrieval
        5. Result aggregation
        6. Expert response synthesis (zero chain-of-thought)
        """
        logger.info(f"[EngineeringOrchestrator] Launching StateGraph execution for user '{state.user_id}' in tenant '{state.tenant_id}'")
        state.add_reasoning_step("Launching LangGraph Engineering Agent state machine.", action="launch_graph")

        initial_graph_state: GraphState = {
            "user_request": state.user_request,
            "tenant_id": state.tenant_id,
            "user_id": state.user_id,
            "auth_token": state.auth_token,
            "project_id": state.project_id,
            "repository_id": state.repository_id,
            "conversation_id": state.conversation_id,
            "message_id": state.message_id,
            "telemetry_data": {},
            "metrics": [],
            "actions": [],
            "artifacts": [],
            "tools_executed": [],
            "execution_steps": [],
            "agent_state": state
        }

        # Run StateGraph DAG
        output_graph_state = await compiled_engineering_graph.ainvoke(initial_graph_state)

        # Synchronize output state back to master AgentState
        state.detected_intent = output_graph_state.get("detected_intent") or state.detected_intent
        state.selected_agent = output_graph_state.get("selected_agent") or state.selected_agent
        state.final_response = output_graph_state.get("final_response") or "Analysis complete."
        state.error = output_graph_state.get("error")

        # Sync metrics
        for m in output_graph_state.get("metrics", []):
            state.add_metric(
                label=m.get("label", "Metric"),
                value=m.get("value", 0),
                change=m.get("change"),
                color=m.get("color", "emerald")
            )

        # Sync actions
        for a in output_graph_state.get("actions", []):
            state.add_action(
                label=a.get("label", "View Details"),
                href=a.get("href"),
                action_type=a.get("action_type", "link")
            )

        if not state.actions:
            if state.project_id:
                state.add_action("View Project Detail", href=f"/projects/{state.project_id}")
            else:
                state.add_action("View Projects Dashboard", href="/projects")
                state.add_action("View Developer Velocity", href="/developers")

        state.add_reasoning_step("StateGraph execution finalized.", action="finalize")


engineering_orchestrator = EngineeringOrchestrator()
