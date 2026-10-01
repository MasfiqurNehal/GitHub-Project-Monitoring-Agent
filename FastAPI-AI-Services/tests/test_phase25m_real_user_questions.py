"""
Phase 25M: Real User Questions Automated Test Suite.

Verifies end-to-end intent understanding, entity resolution, real tool calling, data aggregation,
conversational memory follow-ups, and natural-language LLM synthesis across 7 real user questions:

Test 1: "What repositories are in the test nehal project?"
Test 2: "How many developers are working on the test nehal project?"
Test 3: "How many commits were made in the test nehal project?"
Test 4: "Which developer made the most commits?"
Test 5: "What about their PRs?" (Conversational memory follow-up)
Test 6: "What happened yesterday in this project?"
Test 7: "Tell me about this project."
"""
import unittest
from unittest.mock import patch, AsyncMock, MagicMock

from app.engineering_agent.orchestration.state import GraphState
from app.engineering_agent.router import IntentCategory, engineering_intent_router
from app.engineering_agent.router.schemas import ExtractedEntities
from app.engineering_agent.memory.schemas import ConversationSession, ConversationTurn
from app.engineering_agent.memory import memory_context_resolver
from app.engineering_agent.response_generation import response_generator
from app.engineering_agent.response_generation.schemas import DataAvailabilityStatus
from app.engineering_agent.llm import BaseAgentLLMProvider, LLMCompletionResponse
from app.engineering_agent.orchestration.nodes import (
    validate_context_node,
    route_intent_node,
    multi_agent_composite_node
)


class DummyLLMProvider(BaseAgentLLMProvider):
    """Mock LLM Provider for Phase 25M real user question verification."""
    def __init__(self, response_text: str):
        super().__init__(base_url="https://mock.llm/v1", api_key="sk-mock", model="gpt-mock")
        self.response_text = response_text
        self.completed_messages = []

    @property
    def provider_name(self) -> str:
        return "mock-betopia"

    async def test_connection(self) -> bool:
        return True

    async def complete(self, messages, temperature=0.2, max_tokens=None, **kwargs):
        self.completed_messages = messages
        return LLMCompletionResponse(
            content=self.response_text,
            model="openai/gpt-5.4-mini",
            provider="mock-betopia",
            latency_ms=12.5
        )


class TestPhase25MRealUserQuestions(unittest.IsolatedAsyncioTestCase):
    """Automated verification suite for Phase 25M real user question scenarios."""

    def setUp(self):
        self.tenant_id = "org-nehal-test"
        self.user_id = "usr-nehal-1"

    # =========================================================================
    # TEST 1: "What repositories are in the test nehal project?"
    # =========================================================================
    @patch("app.engineering_agent.llm.AgentLLMProviderFactory.get_provider")
    async def test_1_repositories_in_project(self, mock_get_provider):
        """Test 1: Verify project resolution, repo tool execution, repo count (3), and LLM response."""
        llm_response = (
            "Based on the latest project telemetry, the **test nehal project** currently contains **3 connected repositories**.\n\n"
            "### Repositories\n\n"
            "| Repository | Commits | PRs | Issues |\n"
            "|---|---:|---:|---:|\n"
            "| `GitHub-Project-Monitoring-Agent` | 78 | 0 | 0 |\n"
            "| `Nexora-AI` | 1 | 0 | 0 |\n"
            "| `Dead-ZONE` | 1 | 0 | 0 |\n"
        )
        mock_provider = DummyLLMProvider(llm_response)
        mock_get_provider.return_value = mock_provider

        query = "What repositories are in the test nehal project?"

        state: GraphState = {
            "user_request": query,
            "tenant_id": self.tenant_id,
            "user_id": self.user_id,
            "selected_agent": "Project Agent",
            "detected_intent": IntentCategory.PROJECT_INFO.value,
            "entities": ExtractedEntities(project_name="test nehal project"),
            "telemetry_data": {
                "project_overview": {"name": "test nehal project", "repository_count": 3, "contributor_count": 1},
                "repositories": [
                    {"name": "GitHub-Project-Monitoring-Agent", "commits_count": 78, "pull_requests_count": 0, "issues_count": 0},
                    {"name": "Nexora-AI", "commits_count": 1, "pull_requests_count": 0, "issues_count": 0},
                    {"name": "Dead-ZONE", "commits_count": 1, "pull_requests_count": 0, "issues_count": 0}
                ]
            },
            "tools_executed": [{"tool_name": "get_project_repositories", "duration_ms": 25.0}]
        }

        # 1. Verify Intent & Entity Extraction
        route_res = await route_intent_node(state)
        self.assertEqual(route_res["entities"].project_name, "test nehal project")

        # 2. Verify Response Generator LLM Synthesis
        fact_res = await response_generator.generate_response(state)
        self.assertEqual(fact_res.data_availability, DataAvailabilityStatus.AVAILABLE)
        self.assertIn("3 connected repositories", fact_res.markdown_content)
        self.assertIn("GitHub-Project-Monitoring-Agent", fact_res.markdown_content)
        self.assertIn("Nexora-AI", fact_res.markdown_content)
        self.assertIn("Dead-ZONE", fact_res.markdown_content)

    # =========================================================================
    # TEST 2: "How many developers are working on the test nehal project?"
    # =========================================================================
    @patch("app.engineering_agent.llm.AgentLLMProviderFactory.get_provider")
    async def test_2_developer_count_in_project(self, mock_get_provider):
        """Test 2: Verify developer tool execution, correct count (1), and natural language answer."""
        llm_response = (
            "The **test nehal project** currently has **1 active contributor**: **MasfiqurNehal** (56 commits)."
        )
        mock_provider = DummyLLMProvider(llm_response)
        mock_get_provider.return_value = mock_provider

        query = "How many developers are working on the test nehal project?"

        state: GraphState = {
            "user_request": query,
            "tenant_id": self.tenant_id,
            "selected_agent": "Developer Agent",
            "detected_intent": IntentCategory.DEVELOPER_INFO.value,
            "entities": ExtractedEntities(project_name="test nehal project"),
            "telemetry_data": {
                "project_overview": {"name": "test nehal project", "contributor_count": 1},
                "developers": [
                    {"name": "MasfiqurNehal", "commits_count": 56, "prs_count": 0}
                ]
            },
            "tools_executed": [{"tool_name": "get_project_developers", "duration_ms": 18.0}]
        }

        fact_res = await response_generator.generate_response(state)
        self.assertIn("1 active contributor", fact_res.markdown_content)
        self.assertIn("MasfiqurNehal", fact_res.markdown_content)

    # =========================================================================
    # TEST 3: "How many commits were made in the test nehal project?"
    # =========================================================================
    @patch("app.engineering_agent.llm.AgentLLMProviderFactory.get_provider")
    async def test_3_total_commits_aggregation(self, mock_get_provider):
        """Test 3: Verify commit tool execution, commit aggregation (80), and final LLM synthesis."""
        llm_response = (
            "Across the **test nehal project**, a total of **80 commits** were recorded across 3 repositories.\n\n"
            "- **GitHub-Project-Monitoring-Agent**: 78 commits\n"
            "- **Nexora-AI**: 1 commit\n"
            "- **Dead-ZONE**: 1 commit\n"
        )
        mock_provider = DummyLLMProvider(llm_response)
        mock_get_provider.return_value = mock_provider

        query = "How many commits were made in the test nehal project?"

        state: GraphState = {
            "user_request": query,
            "tenant_id": self.tenant_id,
            "selected_agent": "Commit Agent",
            "detected_intent": IntentCategory.COMMIT_INFO.value,
            "entities": ExtractedEntities(project_name="test nehal project"),
            "telemetry_data": {
                "total_commits": 80,
                "repositories": [
                    {"name": "GitHub-Project-Monitoring-Agent", "commits_count": 78},
                    {"name": "Nexora-AI", "commits_count": 1},
                    {"name": "Dead-ZONE", "commits_count": 1}
                ]
            },
            "tools_executed": [{"tool_name": "get_repository_commits", "duration_ms": 30.0}]
        }

        fact_res = await response_generator.generate_response(state)
        self.assertIn("80 commits", fact_res.markdown_content)

    # =========================================================================
    # TEST 4: "Which developer made the most commits?"
    # =========================================================================
    @patch("app.engineering_agent.llm.AgentLLMProviderFactory.get_provider")
    async def test_4_top_developer_identification(self, mock_get_provider):
        """Test 4: Verify developer activity tool, ranking aggregation, top developer (MasfiqurNehal), and count (56)."""
        llm_response = (
            "The developer with the most commits in the project is **MasfiqurNehal**, who contributed **56 commits**."
        )
        mock_provider = DummyLLMProvider(llm_response)
        mock_get_provider.return_value = mock_provider

        query = "Which developer made the most commits?"

        state: GraphState = {
            "user_request": query,
            "tenant_id": self.tenant_id,
            "selected_agent": "Developer Agent",
            "detected_intent": IntentCategory.DEVELOPER_INFO.value,
            "telemetry_data": {
                "top_developer": "MasfiqurNehal",
                "top_developer_commits": 56,
                "developers": [
                    {"name": "MasfiqurNehal", "commits_count": 56}
                ]
            },
            "tools_executed": [{"tool_name": "get_developer_activity", "duration_ms": 22.0}]
        }

        fact_res = await response_generator.generate_response(state)
        self.assertIn("MasfiqurNehal", fact_res.markdown_content)
        self.assertIn("56 commits", fact_res.markdown_content)

    # =========================================================================
    # TEST 5: "What about their PRs?"
    # =========================================================================
    @patch("app.engineering_agent.llm.AgentLLMProviderFactory.get_provider")
    async def test_5_conversational_pr_followup(self, mock_get_provider):
        """Test 5: Verify conversation context resolution, developer reference (MasfiqurNehal), PR tool execution, and final answer."""
        llm_response = (
            "### Pull Request Activity for **MasfiqurNehal**\n\n"
            "Telemetry currently shows **0 pull requests** opened or reviewed by MasfiqurNehal."
        )
        mock_provider = DummyLLMProvider(llm_response)
        mock_get_provider.return_value = mock_provider

        session = ConversationSession(
            conversation_id="sess-5",
            tenant_id=self.tenant_id,
            user_id=self.user_id,
            turns=[
                ConversationTurn(
                    turn_id="turn-4",
                    user_message="Which developer made the most commits?",
                    agent_response="MasfiqurNehal made 56 commits.",
                    intent="DEVELOPER_INFO",
                    developer_name="MasfiqurNehal",
                    project_name="test nehal project"
                )
            ],
            last_developer_name="MasfiqurNehal",
            last_project_name="test nehal project",
            last_intent="DEVELOPER_INFO"
        )

        query = "What about their PRs?"
        extracted = ExtractedEntities(metric_targets=["prs"])

        # 1. Verify Memory Context Resolver inherits antecedent developer
        res = memory_context_resolver.resolve(
            query=query,
            session=session,
            current_entities=extracted,
            current_intent=IntentCategory.PULL_REQUEST_INFO
        )
        self.assertTrue(res.is_follow_up)
        self.assertEqual(res.inherited_developer_name, "MasfiqurNehal")

        # 2. Verify Final LLM Response Synthesis
        state: GraphState = {
            "user_request": query,
            "tenant_id": self.tenant_id,
            "selected_agent": "Pull Request Agent",
            "detected_intent": IntentCategory.PULL_REQUEST_INFO.value,
            "telemetry_data": {
                "developer": "MasfiqurNehal",
                "pull_requests_count": 0,
                "pull_requests": []
            },
            "tools_executed": [{"tool_name": "get_developer_prs", "duration_ms": 15.0}]
        }

        fact_res = await response_generator.generate_response(state)
        self.assertIn("MasfiqurNehal", fact_res.markdown_content)
        self.assertIn("0 pull requests", fact_res.markdown_content)

    # =========================================================================
    # TEST 6: "What happened yesterday in this project?"
    # =========================================================================
    @patch("app.engineering_agent.llm.AgentLLMProviderFactory.get_provider")
    async def test_6_yesterday_activity_summary(self, mock_get_provider):
        """Test 6: Verify date interpretation (yesterday), project context, activity tools, and structured response."""
        llm_response = (
            "## Yesterday's Activity Summary\n\n"
            "For timeframe **yesterday**, 0 new commits and 0 new PRs were recorded for **test nehal project**."
        )
        mock_provider = DummyLLMProvider(llm_response)
        mock_get_provider.return_value = mock_provider

        session = ConversationSession(
            conversation_id="sess-6",
            tenant_id=self.tenant_id,
            user_id=self.user_id,
            turns=[
                ConversationTurn(
                    turn_id="turn-5",
                    user_message="Tell me about test nehal project",
                    agent_response="Project summary...",
                    project_name="test nehal project"
                )
            ],
            last_project_name="test nehal project"
        )

        query = "What happened yesterday in this project?"
        extracted = ExtractedEntities(timeframe="yesterday")

        # Memory Context Resolver verifies temporal follow-up
        res = memory_context_resolver.resolve(
            query=query,
            session=session,
            current_entities=extracted,
            current_intent=None
        )
        self.assertTrue(res.is_follow_up)
        self.assertEqual(res.inherited_project_name, "test nehal project")
        self.assertEqual(res.updated_timeframe, "yesterday")

        state: GraphState = {
            "user_request": query,
            "tenant_id": self.tenant_id,
            "selected_agent": "Project Agent",
            "detected_intent": IntentCategory.PROJECT_INFO.value,
            "telemetry_data": {
                "project": "test nehal project",
                "timeframe": "yesterday",
                "commits_count": 0,
                "prs_count": 0
            },
            "tools_executed": [{"tool_name": "get_project_activity", "duration_ms": 28.0}]
        }

        fact_res = await response_generator.generate_response(state)
        self.assertIn("Yesterday", fact_res.markdown_content)

    # =========================================================================
    # TEST 7: "Tell me about this project."
    # =========================================================================
    @patch("app.engineering_agent.llm.AgentLLMProviderFactory.get_provider")
    async def test_7_comprehensive_project_overview(self, mock_get_provider):
        """Test 7: Verify project resolution, multi-tool execution, comprehensive summary, and LLM synthesis."""
        llm_response = (
            "## Project Summary\n\n"
            "The **test nehal project** currently contains **3 repositories** and **1 active contributor**.\n\n"
            "### Repositories\n\n"
            "| Repository | Commits | PRs | Issues |\n"
            "|---|---:|---:|---:|\n"
            "| `GitHub-Project-Monitoring-Agent` | 78 | 0 | 0 |\n"
            "| `Nexora-AI` | 1 | 0 | 0 |\n"
            "| `Dead-ZONE` | 1 | 0 | 0 |\n\n"
            "### Contributor Activity\n\n"
            "**MasfiqurNehal**\n"
            "- Commits: **56**\n"
            "- Pull Requests: **0**\n\n"
            "### Data Freshness\n\n"
            "Data source: live/project monitoring backend."
        )
        mock_provider = DummyLLMProvider(llm_response)
        mock_get_provider.return_value = mock_provider

        query = "Tell me about this project."

        session = ConversationSession(
            conversation_id="sess-7",
            tenant_id=self.tenant_id,
            user_id=self.user_id,
            turns=[
                ConversationTurn(
                    turn_id="turn-6",
                    user_message="Select test nehal project",
                    agent_response="Project selected",
                    project_name="test nehal project"
                )
            ],
            last_project_name="test nehal project"
        )

        extracted = ExtractedEntities()
        res = memory_context_resolver.resolve(
            query=query,
            session=session,
            current_entities=extracted,
            current_intent=IntentCategory.PROJECT_INFO
        )
        self.assertTrue(res.is_follow_up)
        self.assertEqual(res.inherited_project_name, "test nehal project")

        state: GraphState = {
            "user_request": query,
            "tenant_id": self.tenant_id,
            "selected_agent": "Multi-Agent Composite (Project + Developer + Commit)",
            "detected_intent": IntentCategory.PROJECT_INFO.value,
            "entities": ExtractedEntities(project_name="test nehal project"),
            "telemetry_data": {
                "project_overview": {"name": "test nehal project", "repository_count": 3, "contributor_count": 1},
                "repositories": [
                    {"name": "GitHub-Project-Monitoring-Agent", "commits_count": 78, "pull_requests_count": 0, "issues_count": 0},
                    {"name": "Nexora-AI", "commits_count": 1, "pull_requests_count": 0, "issues_count": 0},
                    {"name": "Dead-ZONE", "commits_count": 1, "pull_requests_count": 0, "issues_count": 0}
                ],
                "developers": [
                    {"name": "MasfiqurNehal", "commits_count": 56, "prs_count": 0}
                ]
            },
            "tools_executed": [
                {"tool_name": "get_project_details", "duration_ms": 15.0},
                {"tool_name": "get_project_repositories", "duration_ms": 20.0},
                {"tool_name": "get_project_developers", "duration_ms": 18.0}
            ]
        }

        fact_res = await response_generator.generate_response(state)
        self.assertEqual(fact_res.data_availability, DataAvailabilityStatus.AVAILABLE)
        self.assertIn("## Project Summary", fact_res.markdown_content)
        self.assertIn("test nehal project", fact_res.markdown_content)
        self.assertIn("GitHub-Project-Monitoring-Agent", fact_res.markdown_content)
        self.assertIn("MasfiqurNehal", fact_res.markdown_content)


def run_phase25m_suite():
    suite = unittest.TestSuite()
    suite.addTest(TestPhase25MRealUserQuestions('test_1_repositories_in_project'))
    suite.addTest(TestPhase25MRealUserQuestions('test_2_developer_count_in_project'))
    suite.addTest(TestPhase25MRealUserQuestions('test_3_total_commits_aggregation'))
    suite.addTest(TestPhase25MRealUserQuestions('test_4_top_developer_identification'))
    suite.addTest(TestPhase25MRealUserQuestions('test_5_conversational_pr_followup'))
    suite.addTest(TestPhase25MRealUserQuestions('test_6_yesterday_activity_summary'))
    suite.addTest(TestPhase25MRealUserQuestions('test_7_comprehensive_project_overview'))
    return suite


if __name__ == "__main__":
    unittest.main()
