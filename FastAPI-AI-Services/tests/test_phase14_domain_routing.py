"""
Phase 14: General IT/Software Question Routing Tests.

Validates the three-way domain distinction:
  Category A: GitHub / Application Telemetry (Tools / Database)
  Category B: Engineering / IT / Hardware Knowledge (Configured LLM Knowledge)
  Category C: Non-IT / Out-of-Domain General Questions (Polite Guardrail)
"""
import unittest
from unittest.mock import AsyncMock, patch

from app.engineering_agent.router.schemas import IntentCategory
from app.engineering_agent.router.deterministic_matcher import deterministic_intent_matcher
from app.engineering_agent.router.domain_router import (
    domain_router,
    QuestionDomainCategory,
    DomainRoutingDecision
)
from app.engineering_agent.agents.general_it_agent import general_it_agent
from app.engineering_agent.agents.registry import specialist_registry
from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.orchestration.engine import build_engineering_agent_graph
from app.engineering_agent.response_generation.schemas import DataAvailabilityStatus


class TestPhase14DomainRouting(unittest.IsolatedAsyncioTestCase):
    """Test suite for Phase 14 domain classification and execution workflows."""

    def test_category_a_github_application_questions(self):
        """Verify Category A questions route to GitHub application/tools."""
        test_queries = [
            "How many commits did Nehal make?",
            "Who committed in the last 5 minutes?",
            "Show the latest commit in Nexora AI",
            "What's the current number of open PRs?",
            "Show code churn and top modified files in backend repository",
        ]
        for query in test_queries:
            decision = domain_router.classify_domain(query)
            self.assertEqual(
                decision.domain,
                QuestionDomainCategory.GITHUB_APPLICATION,
                f"Failed for query: {query}"
            )
            self.assertTrue(decision.requires_tools)
            self.assertFalse(decision.requires_guardrail)

    def test_category_b_engineering_it_knowledge_questions(self):
        """Verify Category B questions route to LLM engineering/IT knowledge capability."""
        test_queries = [
            "What is quantum computing?",
            "What processor is good for gaming?",
            "Explain the difference between SQL and NoSQL",
            "What is Docker and how do container namespaces work?",
            "How does garbage collection work in V8 engine?",
            "What is the circuit breaker pattern in microservices?",
            "Compare ARM vs x86 architecture instruction sets",
        ]
        for query in test_queries:
            decision = domain_router.classify_domain(query)
            self.assertEqual(
                decision.domain,
                QuestionDomainCategory.ENGINEERING_IT_KNOWLEDGE,
                f"Failed for query: {query}"
            )
            self.assertFalse(decision.requires_tools)
            self.assertFalse(decision.requires_guardrail)
            self.assertEqual(decision.matched_intent, IntentCategory.GENERAL_ENGINEERING_QA)

    def test_category_c_non_it_general_questions(self):
        """Verify Category C questions trigger polite guardrail rejection."""
        test_queries = [
            "Which tourist place is good?",
            "Recommend a recipe for chocolate cake",
            "Who won the World Cup?",
            "What is the weather today in Paris?",
            "Tell me a funny dating story",
            "What are the best luxury vacation hotels?",
        ]
        for query in test_queries:
            decision = domain_router.classify_domain(query)
            self.assertEqual(
                decision.domain,
                QuestionDomainCategory.NON_IT_GENERAL,
                f"Failed for query: {query}"
            )
            self.assertFalse(decision.requires_tools)
            self.assertTrue(decision.requires_guardrail)
            self.assertEqual(decision.matched_intent, IntentCategory.UNSUPPORTED_NON_IT)

    def test_deterministic_matcher_non_it_rejection(self):
        """Verify deterministic matcher identifies Non-IT questions as UNSUPPORTED_NON_IT."""
        intent, conf, _ = deterministic_intent_matcher.match("Which tourist place is good for a holiday?")
        self.assertEqual(intent, IntentCategory.UNSUPPORTED_NON_IT)
        self.assertGreaterEqual(conf, 0.90)

        intent, conf, _ = deterministic_intent_matcher.match("How to bake a chocolate cake?")
        self.assertEqual(intent, IntentCategory.UNSUPPORTED_NON_IT)
        self.assertGreaterEqual(conf, 0.90)

    def test_specialist_registry_maps_general_it_agent(self):
        """Verify registry maps GENERAL_ENGINEERING_QA to GeneralITKnowledgeAgent."""
        agent = specialist_registry.get_agent_for_intent(IntentCategory.GENERAL_ENGINEERING_QA)
        self.assertEqual(agent.agent_id, "general_it_agent")
        self.assertEqual(agent.name, "General IT & Software Engineering Specialist")

    async def test_general_it_agent_execution(self):
        """Verify GeneralITKnowledgeAgent produces structured technical response without tool calls."""
        agent_state = AgentState(
            user_request="What processor is good for gaming?",
            tenant_id="tenant-alpha",
            user_id="user-1"
        )
        res = await general_it_agent.analyze(agent_state)

        self.assertTrue(res.success)
        self.assertEqual(res.agent_id, "general_it_agent")
        self.assertIn("explanation", res.data)
        self.assertEqual(res.data["source"], "LLM Engineering Knowledge (Parametric)")
        self.assertEqual(len(res.tools_used), 0)  # Category B must not invoke GitHub tools

    async def test_e2e_category_c_guardrail_rejection(self):
        """End-to-End StateGraph execution: Category C query receives polite focus rejection."""
        graph = build_engineering_agent_graph()
        initial_state = {
            "user_request": "Which tourist place is good for vacation?",
            "tenant_id": "org-test-tenant",
            "user_id": "usr-test-1",
            "conversation_id": "conv-test",
            "message_id": "msg-test"
        }
        final_state = await graph.ainvoke(initial_state)

        self.assertEqual(final_state.get("selected_agent"), "Guardrail_Reject")
        self.assertIn("GitMonitor Engineering Intelligence Agent", final_state["final_response"])
        self.assertIn("software engineering", final_state["final_response"].lower())
        self.assertIn("unable to answer", final_state["final_response"].lower())

    async def test_e2e_category_b_general_it_knowledge_flow(self):
        """End-to-End StateGraph execution: Category B query generates authoritative answer without empty data error."""
        graph = build_engineering_agent_graph()
        initial_state = {
            "user_request": "What is quantum computing?",
            "tenant_id": "org-test-tenant",
            "user_id": "usr-test-1",
            "conversation_id": "conv-test",
            "message_id": "msg-test"
        }
        final_state = await graph.ainvoke(initial_state)

        self.assertEqual(final_state.get("selected_agent"), "General IT & Software Engineering Specialist")
        self.assertIn("quantum", final_state["final_response"].lower())
        self.assertNotIn("No engineering activity records were found", final_state["final_response"])


if __name__ == "__main__":
    unittest.main()
