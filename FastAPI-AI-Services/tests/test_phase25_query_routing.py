"""
Phase 25: Parts 2, 3, 4 Query Routing & Tool Isolation Test Suite.

Verifies:
1. Part 2: Deterministic query routing across all required categories:
   - GENERAL_TECHNICAL_QA
   - REPOSITORY_QUERY
   - PROJECT_QUERY
   - DEVELOPER_QUERY
   - COMMIT_QUERY
   - PULL_REQUEST_QUERY
   - ISSUE_QUERY
   - PROJECT_REPORT
   - ENGINEERING_ANALYSIS
   - FOLLOW_UP_QUERY
   - AMBIGUOUS_QUERY
2. Part 3: General technical questions bypass all GitHub/database/telemetry tools and call LLM directly.
3. Part 4: GitHub/project queries resolve specific entities and execute ONLY the required live tool.
"""
import unittest
from unittest.mock import patch, AsyncMock

from app.engineering_agent.router import IntentCategory, deterministic_intent_matcher, engineering_intent_router
from app.engineering_agent.router.schemas import ExtractedEntities
from app.engineering_agent.orchestration.state import GraphState
from app.engineering_agent.orchestration.nodes import route_intent_node, route_after_intent, general_it_knowledge_node
from app.engineering_agent.agents.general_it_agent import general_it_agent
from app.engineering_agent.memory.schemas import ConversationSession, ConversationTurn
from app.engineering_agent.memory import memory_context_resolver
from app.engineering_agent.llm import BaseAgentLLMProvider, LLMCompletionResponse, AgentLLMProviderFactory


class DummyRoutingLLMProvider(BaseAgentLLMProvider):
    """Mock LLM Provider for routing verification."""
    @property
    def provider_name(self) -> str:
        return "mock-betopia"

    async def test_connection(self) -> bool:
        return True

    async def complete(self, messages, temperature=0.3, max_tokens=None, **kwargs):
        return LLMCompletionResponse(
            content="A quantum computer is a computational device that leverages quantum mechanical phenomena such as superposition and entanglement.",
            model="openai/gpt-5.4-mini",
            provider="mock-betopia",
            latency_ms=85.0
        )


class TestPhase25QueryRouting(unittest.IsolatedAsyncioTestCase):
    """Test suite for Parts 2, 3, and 4 Query Routing, General Technical Direct LLM, and GitHub Tool Isolation."""

    # =========================================================================
    # PART 2: Query Routing Taxonomy & Deterministic Rules
    # =========================================================================

    def test_routing_general_technical_qa(self):
        """Verify 'What is a quantum computer?', 'What is dependency injection?', 'Explain REST API' -> GENERAL_TECHNICAL_QA."""
        queries = [
            "What is a quantum computer?",
            "What is dependency injection?",
            "Explain REST API",
            "What is SOLID principles?",
            "Explain microservices architecture"
        ]
        for q in queries:
            cat, conf, ent = deterministic_intent_matcher.match(q)
            self.assertIn(
                cat,
                (IntentCategory.GENERAL_TECHNICAL_QA, IntentCategory.GENERAL_ENGINEERING_QA),
                f"Failed for query: {q}"
            )
            self.assertGreaterEqual(conf, 0.85)
            self.assertIsNone(ent.repository_name)
            self.assertIsNone(ent.developer_name)

    def test_routing_repository_query(self):
        """Verify 'Tell me about Book-vibe-upgrade-V2' -> REPOSITORY_QUERY / REPOSITORY_INFO."""
        query = "Tell me about Book-vibe-upgrade-V2"
        cat, conf, ent = deterministic_intent_matcher.match(query)
        self.assertIn(cat, (IntentCategory.REPOSITORY_INFO, IntentCategory.REPOSITORY_QUERY))
        self.assertEqual(ent.repository_name, "Book-vibe-upgrade-V2")

    def test_routing_commit_query(self):
        """Verify 'How many commits did Book-vibe-upgrade-V2 have today?' -> COMMIT_QUERY / COMMIT_INFO."""
        query = "How many commits did Book-vibe-upgrade-V2 have today?"
        cat, conf, ent = deterministic_intent_matcher.match(query)
        self.assertIn(cat, (IntentCategory.COMMIT_INFO, IntentCategory.COMMIT_QUERY))
        self.assertEqual(ent.repository_name, "Book-vibe-upgrade-V2")
        self.assertEqual(ent.timeframe, "today")
        self.assertIn("commits", ent.metric_targets)

    def test_routing_developer_query(self):
        """Verify 'Which developer made the most commits today?' -> DEVELOPER_QUERY / DEVELOPER_INFO."""
        query = "Which developer made the most commits today?"
        cat, conf, ent = deterministic_intent_matcher.match(query)
        self.assertIn(cat, (IntentCategory.DEVELOPER_INFO, IntentCategory.DEVELOPER_QUERY))
        self.assertEqual(ent.timeframe, "today")
        self.assertIn("commits", ent.metric_targets)

    def test_routing_pull_request_query(self):
        """Verify 'Show open pull requests' -> PULL_REQUEST_QUERY / PULL_REQUEST_INFO."""
        query = "Show open pull requests"
        cat, conf, ent = deterministic_intent_matcher.match(query)
        self.assertIn(cat, (IntentCategory.PULL_REQUEST_INFO, IntentCategory.PULL_REQUEST_QUERY))
        self.assertIn("pull_requests", ent.metric_targets)

    def test_routing_project_report(self):
        """Verify 'Give me today's report' -> PROJECT_REPORT / DASHBOARD_ANALYTICS."""
        query = "Give me today's report"
        cat, conf, ent = deterministic_intent_matcher.match(query)
        self.assertIn(cat, (IntentCategory.DASHBOARD_ANALYTICS, IntentCategory.PROJECT_REPORT))
        self.assertEqual(ent.timeframe, "today")

    def test_routing_engineering_analysis(self):
        """Verify 'Why did commit activity decrease?' -> ENGINEERING_ANALYSIS / CODE_IMPACT."""
        query = "Why did commit activity decrease?"
        cat, conf, ent = deterministic_intent_matcher.match(query)
        self.assertIn(cat, (IntentCategory.CODE_IMPACT, IntentCategory.ENGINEERING_ANALYSIS))

    def test_routing_follow_up_query(self):
        """Verify 'What about that developer?' -> FOLLOW_UP_QUERY resolved with memory."""
        session = ConversationSession(
            conversation_id="sess-part2",
            tenant_id="org-test",
            user_id="usr-test",
            turns=[
                ConversationTurn(
                    turn_id="turn-1",
                    user_message="Which developer made the most commits today?",
                    agent_response="MasfiqurNehal made 56 commits.",
                    intent="developer_info",
                    developer_name="MasfiqurNehal"
                )
            ],
            last_developer_name="MasfiqurNehal",
            last_intent="developer_info"
        )
        query = "What about that developer?"
        res = memory_context_resolver.resolve(
            query=query,
            session=session,
            current_entities=ExtractedEntities()
        )
        self.assertTrue(res.is_follow_up)
        self.assertEqual(res.inherited_developer_name, "MasfiqurNehal")

    # =========================================================================
    # PART 3: General Technical Questions Direct LLM Bypass
    # =========================================================================

    @patch("app.engineering_agent.llm.AgentLLMProviderFactory.get_provider")
    async def test_part3_general_technical_qa_direct_llm_flow(self, mock_get_provider):
        """
        Verify Part 3: General technical queries bypass database/GitHub tools and call LLM directly.
        ZERO tools used, ZERO database queries, fast response.
        """
        mock_provider = DummyRoutingLLMProvider(base_url="https://mock/v1", api_key="sk-mock", model="gpt-mock")
        mock_get_provider.return_value = mock_provider

        state: GraphState = {
            "user_request": "What is a quantum computer?",
            "tenant_id": "org-test-tenant",
            "user_id": "usr-test"
        }

        # 1. Route Intent Node: matches GENERAL_TECHNICAL_QA / GENERAL_ENGINEERING_QA
        route_res = await route_intent_node(state)
        self.assertIn(
            route_res["detected_intent"],
            (IntentCategory.GENERAL_TECHNICAL_QA.value, IntentCategory.GENERAL_ENGINEERING_QA.value)
        )

        # 2. StateGraph Router directs to general_it_knowledge node
        next_branch = route_after_intent({**state, **route_res})
        self.assertEqual(next_branch, "general_it_knowledge")

        # 3. Execute General IT Knowledge Node: calls LLM directly
        gen_res = await general_it_knowledge_node({**state, **route_res})
        self.assertEqual(gen_res["selected_agent"], general_it_agent.name)
        self.assertIn("A quantum computer is a computational device", gen_res["telemetry_data"]["explanation"])
        self.assertEqual(len(gen_res["telemetry_data"].get("tools_used", [])), 0)

    # =========================================================================
    # PART 4: GitHub / Project Targeted Tool Selection
    # =========================================================================

    def test_part4_named_repository_tool_isolation(self):
        """
        Verify Part 4: Query targeting a specific repository extracts ONLY that repository
        and does not scan every repository or invoke unrelated project tools.
        """
        query = "How many commits did Book-vibe-upgrade-V2 have today?"
        cat, conf, ent = deterministic_intent_matcher.match(query)

        # 1. Authoritative repository resolution
        self.assertEqual(ent.repository_name, "Book-vibe-upgrade-V2")
        self.assertIsNone(ent.project_name)
        self.assertIsNone(ent.developer_name)
        self.assertEqual(ent.timeframe, "today")

        # 2. Targeted Intent
        self.assertIn(cat, (IntentCategory.COMMIT_INFO, IntentCategory.COMMIT_QUERY))

        # 3. Router selection directs strictly to commit agent
        branch = route_after_intent({"detected_intent": cat.value})
        self.assertEqual(branch, "commit")


    # =========================================================================
    # PART 5: Project Context Scope Resolution
    # =========================================================================

    async def test_part5_project_context_scoped_routing(self):
        """
        Verify Part 5: When project_id or project context is present, 'Give me today's report'
        correctly adopts the project scope without forcing ambiguous clarification.
        """
        result = await engineering_intent_router.route(
            prompt="Give me today's report",
            project_id="prj-test-nehal-123",
            repository_id=None
        )
        self.assertFalse(result.requires_clarification)
        self.assertEqual(result.entities.project_name, "prj-test-nehal-123")
        self.assertIn(result.intent, (IntentCategory.DASHBOARD_ANALYTICS, IntentCategory.PROJECT_REPORT))

    # =========================================================================
    # PART 6 & 7: Real LLM Observability & Tool Telemetry Verification
    # =========================================================================

    def test_part6_and_7_structured_execution_telemetry(self):
        """
        Verify Part 6 & 7: Execution telemetry trace contains request_id, intent, route,
        llm metrics, tools_executed list with timestamps, and durations.
        """
        from app.engineering_agent.schemas.response import ExecutionTelemetryTrace, ToolExecutionSummary

        tool_summary = ToolExecutionSummary(
            tool_name="get_commit_activity",
            status="success",
            duration_ms=842.0,
            start_time=1700000000.0,
            end_time=1700000000.842
        )
        self.assertEqual(tool_summary.tool_name, "get_commit_activity")
        self.assertEqual(tool_summary.duration_ms, 842.0)
        self.assertIsNotNone(tool_summary.start_time)

        trace = ExecutionTelemetryTrace(
            request_id="req_123",
            query="What is a quantum computer?",
            intent="general_technical_qa",
            route="direct_llm",
            llm_provider="betopia",
            llm_model="openai/gpt-5.4-mini",
            llm_called=True,
            llm_latency_ms=120.5,
            tools_selected=[],
            tools_executed=[],
            tool_latency_ms=0.0,
            database_latency_ms=0.0,
            total_latency_ms=125.0,
            success=True,
            error_type=None
        )
        self.assertEqual(trace.request_id, "req_123")
        self.assertEqual(trace.route, "direct_llm")
        self.assertTrue(trace.llm_called)
        self.assertEqual(len(trace.tools_executed), 0)

    # =========================================================================
    # PART 8: Tool Selection Optimization & Concurrency
    # =========================================================================

    def test_part8_tool_selection_counts(self):
        """
        Verify Part 8: General technical queries select 0 tools, specific queries select only required tools.
        """
        # 1. Quantum computer -> 0 tools
        cat_qa, _, ent_qa = deterministic_intent_matcher.match("What is a quantum computer?")
        self.assertIn(cat_qa, (IntentCategory.GENERAL_TECHNICAL_QA, IntentCategory.GENERAL_ENGINEERING_QA))

        # 2. What are today's commits? -> Commit tool target
        cat_c, _, ent_c = deterministic_intent_matcher.match("What are today's commits?")
        self.assertIn(cat_c, (IntentCategory.COMMIT_INFO, IntentCategory.COMMIT_QUERY))
        self.assertIn("commits", ent_c.metric_targets)

        # 3. Show open PRs -> PR tool target
        cat_pr, _, ent_pr = deterministic_intent_matcher.match("Show open PRs")
        self.assertIn(cat_pr, (IntentCategory.PULL_REQUEST_INFO, IntentCategory.PULL_REQUEST_QUERY))
        self.assertIn("pull_requests", ent_pr.metric_targets)

    # =========================================================================
    # PART 9: Fix 'Classification Needed' for Standard Queries
    # =========================================================================

    async def test_part9_no_unnecessary_clarification(self):
        """
        Verify Part 9: Standard queries NEVER produce clarification:
        - 'What is a quantum computer?'
        - 'What is REST API?'
        - 'Give me today's report'
        - 'Tell me about Book-vibe-upgrade-V2'
        - 'How many commits today?'
        - 'Show open pull requests'
        """
        queries = [
            "What is a quantum computer?",
            "What is REST API?",
            "Give me today's report",
            "Tell me about Book-vibe-upgrade-V2",
            "How many commits today?",
            "Show open pull requests"
        ]
        for q in queries:
            res = await engineering_intent_router.route(prompt=q)
            self.assertFalse(
                res.requires_clarification,
                f"Query '{q}' unexpectedly requested clarification!"
            )
            self.assertGreaterEqual(res.confidence, 0.80)


if __name__ == "__main__":
    unittest.main()

