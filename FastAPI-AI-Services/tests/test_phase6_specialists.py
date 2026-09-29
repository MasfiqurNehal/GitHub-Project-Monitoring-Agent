"""
Phase 6: Engineering Specialist Agents Test Suite.
Validates the 7 domain-specific read-only specialist sub-agents:
1. RepositoryAgent
2. CommitAgent
3. PullRequestAgent
4. IssueAgent
5. DeveloperAgent
6. ProjectAgent
7. AnalyticsAgent
"""
import os
import sys
import unittest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.engineering_agent.agents import (
    specialist_registry,
    repository_agent,
    commit_agent,
    pull_request_agent,
    issue_agent,
    developer_agent,
    project_agent,
    analytics_agent,
    engineering_orchestrator
)
from app.engineering_agent.agents.schemas import SpecialistExecutionResult
from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.router.schemas import IntentCategory, ExtractedEntities
from app.engineering_agent.tools import tool_registry, ToolResult
from app.engineering_agent.llm import agent_llm_factory
from app.engineering_agent.llm.base import LLMCompletionResponse


class TestPhase6SpecialistAgents(unittest.TestCase):
    """Test suite for Phase 6 Engineering Specialist Agents."""

    def setUp(self):
        self.auth_token = "Bearer test-jwt-token"
        self.tenant_id = "org-test-tenant"
        self.user_id = "usr-test-1"

    def create_state(self, prompt: str, project_id=None, repository_id=None) -> AgentState:
        return AgentState(
            user_request=prompt,
            tenant_id=self.tenant_id,
            user_id=self.user_id,
            auth_token=self.auth_token,
            project_id=project_id,
            repository_id=repository_id,
            conversation_id="conv-test-1",
            message_id="msg-test-1"
        )

    # -------------------------------------------------------------------------
    # 1. Registry & Intent Dispatcher Tests
    # -------------------------------------------------------------------------
    def test_specialist_registry_contains_all_7_agents(self):
        """Verify that all 7 specialist agents are registered."""
        agents = specialist_registry.list_agents()
        self.assertEqual(len(agents), 7)
        agent_ids = [a.agent_id for a in agents]
        for expected in [
            "repository_agent", "commit_agent", "pull_request_agent",
            "issue_agent", "developer_agent", "project_agent", "analytics_agent"
        ]:
            self.assertIn(expected, agent_ids)

    def test_intent_to_specialist_mapping(self):
        """Verify that each intent category correctly resolves to the expected specialist agent."""
        self.assertEqual(
            specialist_registry.get_agent_for_intent(IntentCategory.REPOSITORY_INFO).agent_id,
            "repository_agent"
        )
        self.assertEqual(
            specialist_registry.get_agent_for_intent(IntentCategory.COMMIT_INFO).agent_id,
            "commit_agent"
        )
        self.assertEqual(
            specialist_registry.get_agent_for_intent(IntentCategory.PULL_REQUEST_INFO).agent_id,
            "pull_request_agent"
        )
        self.assertEqual(
            specialist_registry.get_agent_for_intent(IntentCategory.ISSUE_INFO).agent_id,
            "issue_agent"
        )
        self.assertEqual(
            specialist_registry.get_agent_for_intent(IntentCategory.DEVELOPER_INFO).agent_id,
            "developer_agent"
        )
        self.assertEqual(
            specialist_registry.get_agent_for_intent(IntentCategory.PROJECT_INFO).agent_id,
            "project_agent"
        )
        self.assertEqual(
            specialist_registry.get_agent_for_intent(IntentCategory.DASHBOARD_ANALYTICS).agent_id,
            "analytics_agent"
        )
        self.assertEqual(
            specialist_registry.get_agent_for_intent(IntentCategory.CROSS_REPOSITORY_ANALYTICS).agent_id,
            "analytics_agent"
        )

    # -------------------------------------------------------------------------
    # 2. Individual Specialist Agent Execution Tests
    # -------------------------------------------------------------------------
    def test_repository_agent_execution(self):
        """Test RepositoryAgent fetches metadata and branches."""
        state = self.create_state("List repository branches", repository_id="repo-1")
        entities = ExtractedEntities(repository_name="frontend")

        with patch.object(repository_agent, "call_tool", new_callable=AsyncMock) as mock_tool:
            mock_tool.side_effect = [
                ToolResult(tool_name="list_repositories", success=True, data=[{"id": "repo-1", "name": "frontend"}]),
                ToolResult(tool_name="get_repository", success=True, data={"id": "repo-1", "name": "frontend", "commits_count": 50}),
                ToolResult(tool_name="get_repository_branches", success=True, data={"default_branch": "main", "branches": ["main"]})
            ]

            res: SpecialistExecutionResult = asyncio.run(repository_agent.analyze(state, entities))
            self.assertTrue(res.success)
            self.assertEqual(res.agent_id, "repository_agent")
            self.assertIn("repositories", res.data)
            self.assertIn("branches", res.data)
            self.assertGreater(len(res.metrics), 0)

    def test_commit_agent_execution(self):
        """Test CommitAgent fetches commits and code impact."""
        state = self.create_state("Show commits", repository_id="repo-1")

        with patch.object(commit_agent, "call_tool", new_callable=AsyncMock) as mock_tool:
            mock_tool.side_effect = [
                ToolResult(tool_name="get_repository_commits", success=True, data=[{"sha": "abc1", "message": "feat: init"}]),
                ToolResult(tool_name="get_commit_details", success=True, data={"sha": "abc1", "files_changed": 2}),
                ToolResult(tool_name="get_code_impact", success=True, data={"linesAdded": 100, "linesDeleted": 20})
            ]

            res: SpecialistExecutionResult = asyncio.run(commit_agent.analyze(state))
            self.assertTrue(res.success)
            self.assertEqual(res.agent_id, "commit_agent")
            self.assertIn("commits", res.data)
            self.assertIn("code_churn", res.data)

    def test_pull_request_agent_execution(self):
        """Test PullRequestAgent tracks open, closed, and merged PRs."""
        state = self.create_state("Show open PRs")

        with patch.object(pull_request_agent, "call_tool", new_callable=AsyncMock) as mock_tool:
            mock_tool.side_effect = [
                ToolResult(tool_name="get_repository_pull_requests", success=True, data=[
                    {"id": "pr-1", "state": "open"},
                    {"id": "pr-2", "state": "merged"}
                ]),
                ToolResult(tool_name="get_pull_request_details", success=True, data={"id": "pr-1", "title": "Update README"})
            ]

            res: SpecialistExecutionResult = asyncio.run(pull_request_agent.analyze(state))
            self.assertTrue(res.success)
            self.assertEqual(res.agent_id, "pull_request_agent")
            self.assertIn("pull_requests", res.data)
            # Verify open & closed metrics
            metric_labels = [m["label"] for m in res.metrics]
            self.assertIn("Open PRs", metric_labels)
            self.assertIn("Merged/Closed", metric_labels)

    def test_issue_agent_execution(self):
        """Test IssueAgent categorizes open and resolved tickets."""
        state = self.create_state("Show issues")

        with patch.object(issue_agent, "call_tool", new_callable=AsyncMock) as mock_tool:
            mock_tool.side_effect = [
                ToolResult(tool_name="get_repository_issues", success=True, data=[
                    {"id": "iss-1", "state": "open"},
                    {"id": "iss-2", "state": "closed"}
                ]),
                ToolResult(tool_name="get_issue_details", success=True, data={"id": "iss-1", "title": "Crash on login"})
            ]

            res: SpecialistExecutionResult = asyncio.run(issue_agent.analyze(state))
            self.assertTrue(res.success)
            self.assertEqual(res.agent_id, "issue_agent")
            self.assertIn("issues", res.data)
            metric_labels = [m["label"] for m in res.metrics]
            self.assertIn("Open Issues", metric_labels)
            self.assertIn("Resolved Issues", metric_labels)

    def test_developer_agent_execution(self):
        """Test DeveloperAgent fetches contributor velocity and activity stream."""
        state = self.create_state("How many commits masfiqur did")
        entities = ExtractedEntities(developer_name="masfiqur", timeframe="7d")

        with patch.object(developer_agent, "call_tool", new_callable=AsyncMock) as mock_tool:
            mock_tool.side_effect = [
                ToolResult(tool_name="get_repository_developers", success=True, data=[
                    {"id": "dev-1", "login": "masfiqur", "name": "Masfiqur Nehal"}
                ]),
                ToolResult(tool_name="get_developer_activity", success=True, data=[{"event": "push"}]),
                ToolResult(tool_name="get_developer_commit_statistics", success=True, data={"commitsCount": 14, "linesAdded": 450})
            ]

            res: SpecialistExecutionResult = asyncio.run(developer_agent.analyze(state, entities))
            self.assertTrue(res.success)
            self.assertEqual(res.agent_id, "developer_agent")
            self.assertIn("developer_commit_stats", res.data)

    def test_project_agent_execution(self):
        """Test ProjectAgent aggregates multiple repositories in a project."""
        state = self.create_state("Overview of project Apollo", project_id="prj-apollo")

        with patch.object(project_agent, "call_tool", new_callable=AsyncMock) as mock_tool:
            mock_tool.side_effect = [
                ToolResult(tool_name="get_project", success=True, data={"id": "prj-apollo", "name": "Apollo"}),
                ToolResult(tool_name="get_project_repositories", success=True, data=[{"id": "r-1"}, {"id": "r-2"}]),
                ToolResult(tool_name="get_project_statistics", success=True, data={"totalCommits": 120, "activeDevelopers": 4})
            ]

            res: SpecialistExecutionResult = asyncio.run(project_agent.analyze(state))
            self.assertTrue(res.success)
            self.assertEqual(res.agent_id, "project_agent")
            self.assertIn("project_repositories", res.data)
            self.assertIn("project_statistics", res.data)

    def test_analytics_agent_execution(self):
        """Test AnalyticsAgent retrieves workspace KPIs and cross-repo churn."""
        state = self.create_state("Show dashboard metrics and cross repository churn")

        with patch.object(analytics_agent, "call_tool", new_callable=AsyncMock) as mock_tool:
            mock_tool.side_effect = [
                ToolResult(tool_name="get_dashboard_analytics", success=True, data={"totalCommits": 500, "activeDevelopers": 10}),
                ToolResult(tool_name="get_code_impact", success=True, data={"linesAdded": 10000, "linesDeleted": 2500}),
                ToolResult(tool_name="list_repositories", success=True, data=[{"id": "r-1"}, {"id": "r-2"}])
            ]

            res: SpecialistExecutionResult = asyncio.run(analytics_agent.analyze(state))
            self.assertTrue(res.success)
            self.assertEqual(res.agent_id, "analytics_agent")
            self.assertIn("dashboard_overview", res.data)
            self.assertIn("code_impact_summary", res.data)

    # -------------------------------------------------------------------------
    # 3. End-to-End Orchestrator Dispatching Test
    # -------------------------------------------------------------------------
    def test_orchestrator_dispatches_to_specialist(self):
        """Test that orchestrator routes intent and dispatches to the correct specialist."""
        state = self.create_state("Show me all pull requests in repository")

        mock_llm_provider = MagicMock()
        mock_llm_provider.complete = AsyncMock(return_value=LLMCompletionResponse(
            content="### PR Velocity\nAll PRs are reviewed.",
            model="mock-model",
            provider="mock-provider",
            latency_ms=10.0
        ))

        with patch.object(agent_llm_factory, "get_provider", return_value=mock_llm_provider), \
             patch.object(pull_request_agent, "analyze", new_callable=AsyncMock) as mock_pr_analyze:
            
            mock_pr_analyze.return_value = SpecialistExecutionResult(
                agent_id="pull_request_agent",
                agent_name="Pull Request Specialist Agent",
                success=True,
                data={"pull_requests": [{"id": "pr-1", "title": "Test PR"}]},
                metrics=[{"label": "Open PRs", "value": 1}],
                actions=[{"label": "View PRs", "href": "/pull-requests"}],
                tools_used=["get_repository_pull_requests"],
                duration_ms=15.0
            )

            asyncio.run(engineering_orchestrator.orchestrate(state))

            self.assertEqual(state.detected_intent, "pull_request_info")
            self.assertEqual(state.selected_agent, "Pull Request Specialist Agent")
            self.assertIn("### PR Velocity", state.final_response)
            self.assertEqual(len(state.metrics), 1)
            self.assertEqual(state.metrics[0]["label"], "Open PRs")


if __name__ == "__main__":
    unittest.main()
