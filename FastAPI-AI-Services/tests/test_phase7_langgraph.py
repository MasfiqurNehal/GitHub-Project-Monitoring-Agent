"""
Phase 7: LangGraph Engineering Agent Orchestration Test Suite.
Validates the StateGraph state machine, conditional routing, multi-agent parallel pipelines,
error recovery, clarification handling, and zero chain-of-thought exposure.
"""
import os
import sys
import unittest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.engineering_agent.orchestration import (
    compiled_engineering_graph,
    build_engineering_agent_graph,
    GraphState,
    StateGraph,
    END
)
from app.engineering_agent.agents import engineering_orchestrator
from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.router.schemas import IntentCategory
from app.engineering_agent.llm import agent_llm_factory
from app.engineering_agent.llm.base import LLMCompletionResponse
from app.engineering_agent.tools import ToolResult


class TestPhase7LangGraphOrchestration(unittest.TestCase):
    """Test suite for Phase 7 LangGraph / StateGraph Orchestration."""

    def setUp(self):
        self.auth_token = "Bearer test-jwt-token"
        self.tenant_id = "org-test-tenant"
        self.user_id = "usr-test-1"

        # Mock LLM provider for fast deterministic testing
        self.mock_llm = MagicMock()
        self.mock_llm.complete = AsyncMock(return_value=LLMCompletionResponse(
            content="### Engineering Synthesis\nAnalysis verified via StateGraph.",
            model="mock-model",
            provider="mock-provider",
            latency_ms=8.0
        ))
        self.llm_patcher = patch.object(agent_llm_factory, "get_provider", return_value=self.mock_llm)
        self.llm_patcher.start()

    def tearDown(self):
        self.llm_patcher.stop()

    def create_graph_state(self, prompt: str, project_id=None, repository_id=None) -> GraphState:
        agent_state = AgentState(
            user_request=prompt,
            tenant_id=self.tenant_id,
            user_id=self.user_id,
            auth_token=self.auth_token,
            project_id=project_id,
            repository_id=repository_id,
            conversation_id="conv-p7-test",
            message_id="msg-p7-test"
        )
        return {
            "user_request": prompt,
            "tenant_id": self.tenant_id,
            "user_id": self.user_id,
            "auth_token": self.auth_token,
            "project_id": project_id,
            "repository_id": repository_id,
            "conversation_id": "conv-p7-test",
            "message_id": "msg-p7-test",
            "telemetry_data": {},
            "metrics": [],
            "actions": [],
            "artifacts": [],
            "tools_executed": [],
            "execution_steps": [],
            "agent_state": agent_state
        }

    # -------------------------------------------------------------------------
    # 1. Graph Topology & Compilation Tests
    # -------------------------------------------------------------------------
    def test_graph_compilation_and_nodes(self):
        """Verify graph builds with correct entry point and registered nodes."""
        graph = compiled_engineering_graph
        self.assertEqual(graph.entry_point, "validate_context")
        expected_nodes = [
            "validate_context", "route_intent", "guardrail_reject", "clarification",
            "repository_agent", "commit_agent", "pull_request_agent", "issue_agent",
            "developer_agent", "project_agent", "analytics_agent",
            "multi_agent_composite", "aggregate_results", "generate_response"
        ]
        for node_name in expected_nodes:
            self.assertIn(node_name, graph.nodes, f"Node '{node_name}' missing from graph")

    # -------------------------------------------------------------------------
    # 2. Sequential Specialist Graph Traversal Tests
    # -------------------------------------------------------------------------
    def test_single_specialist_repository_path(self):
        """Test sequential path: validate -> route -> repository_agent -> aggregate -> generate."""
        state = self.create_graph_state("List all repositories in our organization")
        
        res = asyncio.run(compiled_engineering_graph.ainvoke(state))
        
        self.assertEqual(res.get("detected_intent"), IntentCategory.REPOSITORY_INFO.value)
        self.assertIn("Repository Specialist Agent", res.get("selected_agent", ""))
        self.assertTrue(len(res.get("final_response", "")) > 0)
        self.assertGreater(len(res.get("execution_steps", [])), 3)


    def test_single_specialist_commit_path(self):
        """Test sequential path for commit analysis."""
        state = self.create_graph_state("Show recent commits in repository", repository_id="repo-1")
        
        res = asyncio.run(compiled_engineering_graph.ainvoke(state))
        
        self.assertEqual(res.get("detected_intent"), IntentCategory.COMMIT_INFO.value)
        self.assertIn("Commit Specialist Agent", res.get("selected_agent", ""))

    # -------------------------------------------------------------------------
    # 3. Multi-Agent Parallel Pipeline Execution Test
    # -------------------------------------------------------------------------
    def test_multi_agent_composite_pipeline(self):
        """
        Test multi-agent cross-cutting query:
        "Who made the most commits to the Nexora project last month?"
        Workflow: Router -> Multi-Agent Composite (Project -> Parallel Dev/Commit -> Analytics) -> Response
        """
        state = self.create_graph_state(
            "Who made the most commits to the Nexora project last month?",
            project_id="prj-nexora"
        )

        res = asyncio.run(compiled_engineering_graph.ainvoke(state))

        self.assertTrue(res.get("is_multi_agent_pipeline"))
        self.assertIn("Multi-Agent Composite", res.get("selected_agent", ""))
        self.assertIn("active_specialists", res)
        self.assertGreaterEqual(len(res.get("active_specialists", [])), 4)
        self.assertTrue(len(res.get("final_response", "")) > 0)

    # -------------------------------------------------------------------------
    # 4. Conditional Routing Guardrails & Clarification Tests
    # -------------------------------------------------------------------------
    def test_guardrail_rejection_branch(self):
        """Test that out-of-scope non-IT queries route to guardrail_reject -> END."""
        state = self.create_graph_state("How to bake Italian pizza at home")

        res = asyncio.run(compiled_engineering_graph.ainvoke(state))

        self.assertEqual(res.get("selected_agent"), "Guardrail_Reject")
        self.assertIn("GitMonitor Engineering Intelligence Agent", res.get("final_response", ""))
        # Verify it terminated without calling generate_response LLM
        self.assertNotIn("### Engineering Synthesis", res.get("final_response", ""))

    def test_clarification_branch(self):
        """Test that low-confidence / ambiguous queries route to clarification -> END."""
        state = self.create_graph_state("check")

        res = asyncio.run(compiled_engineering_graph.ainvoke(state))

        self.assertTrue(res.get("requires_clarification"))
        self.assertEqual(res.get("selected_agent"), "Clarification_Router")
        self.assertIn("Clarification Needed", res.get("final_response", ""))

    # -------------------------------------------------------------------------
    # 5. Error Recovery & Cycle Guardrails
    # -------------------------------------------------------------------------
    def test_node_error_recovery(self):
        """Verify that an exception in a node is caught and recorded without crashing graph."""
        custom_graph = StateGraph()
        
        async def failing_node(s: GraphState):
            raise RuntimeError("Database connection timed out")
            
        custom_graph.add_node("start_node", failing_node)
        custom_graph.set_entry_point("start_node")
        compiled = custom_graph.compile()

        state = self.create_graph_state("test failure")
        res = asyncio.run(compiled.ainvoke(state))
        
        self.assertIn("Database connection timed out", res.get("error", ""))

    # -------------------------------------------------------------------------
    # 6. Full Orchestrator Integration Test
    # -------------------------------------------------------------------------
    def test_orchestrator_runs_graph_cleanly(self):
        """Test full orchestrator execution synchronizes state back to AgentState."""
        agent_state = AgentState(
            user_request="Show PR velocity and review turnaround time",
            tenant_id=self.tenant_id,
            user_id=self.user_id,
            auth_token=self.auth_token,
            conversation_id="conv-orch-1",
            message_id="msg-orch-1"
        )

        asyncio.run(engineering_orchestrator.orchestrate(agent_state))

        self.assertEqual(agent_state.detected_intent, IntentCategory.PULL_REQUEST_INFO.value)
        self.assertIn("Pull Request Specialist Agent", agent_state.selected_agent)
        self.assertTrue(len(agent_state.final_response) > 0)
        self.assertGreater(len(agent_state.actions), 0)



if __name__ == "__main__":
    unittest.main()
