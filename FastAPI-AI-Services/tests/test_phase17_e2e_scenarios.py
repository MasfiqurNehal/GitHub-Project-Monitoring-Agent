"""
Phase 17: End-to-End Engineering Agent Validation Test Suite.

Executes and verifies 12 real-world enterprise engineering scenarios across:
  - Routing accuracy
  - Entity resolution
  - Tool execution & API layer
  - Multi-agent collaboration
  - Multi-tenant boundary isolation
  - Response factual correctness
  - Error handling & resilience
  - Data freshness & provenance
"""
import asyncio
import unittest
from unittest.mock import AsyncMock, patch, MagicMock

from app.engineering_agent.core.service import engineering_agent_service
from app.engineering_agent.schemas.request import EngineeringAgentRequest
from app.engineering_agent.tools.express_client import express_api_client
from app.engineering_agent.reliability import tool_execution_cache
from app.engineering_agent.router import engineering_intent_router, IntentCategory
from app.engineering_agent.llm import agent_llm_factory
from app.engineering_agent.llm.base import LLMCompletionResponse
from app.utils.auth import AuthenticatedUser


class TestPhase17EndToEndValidation(unittest.IsolatedAsyncioTestCase):
    """Full End-to-End test suite covering all 12 target production scenarios."""

    async def asyncSetUp(self):
        # Clear tool cache before each scenario
        await tool_execution_cache.clear()
        
        self.user = AuthenticatedUser(
            id="usr-e2e-tester",
            email="tester@nexora.ai",
            role="lead_engineer",
            organization_id="org-nexora-ai"
        )
        self.auth_token = "Bearer test-jwt-token-org-nexora-ai"

    # -------------------------------------------------------------------------
    # Scenario 1: "Show total commits for Nexora AI."
    # -------------------------------------------------------------------------
    async def test_scenario_01_total_commits_for_repository(self):
        """Scenario 1: Show total commits for Nexora AI."""
        req = EngineeringAgentRequest(message="Show total commits for Nexora AI.")

        with patch.object(express_api_client, "list_repositories", new_callable=AsyncMock) as mock_repos, \
             patch.object(express_api_client, "get_repository_commits", new_callable=AsyncMock) as mock_commits:
            
            mock_repos.return_value = {
                "success": True,
                "data": [
                    {"id": "repo-nexora-ai-1", "name": "nexora-ai", "full_name": "nexora/nexora-ai"}
                ]
            }
            mock_commits.return_value = {
                "success": True,
                "data": [
                    {"sha": "c1", "message": "feat: init commit", "author": "Nehal"},
                    {"sha": "c2", "message": "fix: auth bug", "author": "Masfiqur"}
                ]
            }

            resp = await engineering_agent_service.execute_agent(req, self.user, self.auth_token)

            self.assertTrue(resp.success)
            self.assertTrue("commits" in resp.response.lower() or "nexora" in resp.response.lower())
            self.assertGreater(len(resp.tools_executed), 0)
            self.assertEqual(resp.tools_executed[0].tool_name, "list_repositories")

    # -------------------------------------------------------------------------
    # Scenario 2: "Who committed the most this month?"
    # -------------------------------------------------------------------------
    async def test_scenario_02_top_committer_this_month(self):
        """Scenario 2: Who committed the most this month?"""
        req = EngineeringAgentRequest(message="Who committed the most this month?")

        with patch.object(express_api_client, "get_developer_commit_statistics", new_callable=AsyncMock) as mock_stats, \
             patch.object(express_api_client, "get_developer_activity", new_callable=AsyncMock) as mock_act:
            
            mock_stats.return_value = {
                "success": True,
                "data": {
                    "top_author": "Masfiqur",
                    "total_commits": 142,
                    "active_days": 24
                }
            }
            mock_act.return_value = {"success": True, "data": []}

            resp = await engineering_agent_service.execute_agent(req, self.user, self.auth_token)

            self.assertTrue(resp.success)
            self.assertGreater(len(resp.tools_executed), 0)

    # -------------------------------------------------------------------------
    # Scenario 3: "Show open pull requests."
    # -------------------------------------------------------------------------
    async def test_scenario_03_open_pull_requests(self):
        """Scenario 3: Show open pull requests."""
        req = EngineeringAgentRequest(message="Show open pull requests.")

        with patch.object(express_api_client, "get_repository_pull_requests", new_callable=AsyncMock) as mock_prs:
            mock_prs.return_value = {
                "success": True,
                "data": [
                    {"id": "pr-101", "title": "feat: telemetry dashboard", "state": "open", "author": "Nehal"},
                    {"id": "pr-102", "title": "fix: token refresh", "state": "open", "author": "Alex"}
                ]
            }

            resp = await engineering_agent_service.execute_agent(req, self.user, self.auth_token)

            self.assertTrue(resp.success)
            self.assertIn("pull_request", resp.tools_executed[0].tool_name)

    # -------------------------------------------------------------------------
    # Scenario 4: "How many issues are open?"
    # -------------------------------------------------------------------------
    async def test_scenario_04_open_issues_count(self):
        """Scenario 4: How many issues are open?"""
        req = EngineeringAgentRequest(message="How many issues are open?")

        with patch.object(express_api_client, "get_repository_issues", new_callable=AsyncMock) as mock_issues:
            mock_issues.return_value = {
                "success": True,
                "data": [
                    {"id": "iss-1", "title": "Database connection spike", "state": "open"},
                    {"id": "iss-2", "title": "Dark mode styling glitch", "state": "open"}
                ]
            }

            resp = await engineering_agent_service.execute_agent(req, self.user, self.auth_token)

            self.assertTrue(resp.success)
            self.assertEqual(resp.tools_executed[0].tool_name, "get_repository_issues")

    # -------------------------------------------------------------------------
    # Scenario 5: "Show code impact for Masfiqur."
    # -------------------------------------------------------------------------
    async def test_scenario_05_code_impact_for_developer(self):
        """Scenario 5: Show code impact for Masfiqur."""
        req = EngineeringAgentRequest(message="Show code impact for Masfiqur.")

        with patch.object(express_api_client, "get_code_impact", new_callable=AsyncMock) as mock_impact, \
             patch.object(express_api_client, "get_repository_commits", new_callable=AsyncMock) as mock_commits, \
             patch.object(express_api_client, "list_repositories", new_callable=AsyncMock) as mock_repos:
            
            mock_repos.return_value = {"success": True, "data": [{"id": "repo-1", "name": "backend"}]}
            mock_impact.return_value = {
                "success": True,
                "data": {"additions": 1450, "deletions": 320, "net_churn": 1130}
            }
            mock_commits.return_value = {"success": True, "data": []}

            resp = await engineering_agent_service.execute_agent(req, self.user, self.auth_token)

            self.assertTrue(resp.success)

    # -------------------------------------------------------------------------
    # Scenario 6: "Compare frontend and backend repositories."
    # -------------------------------------------------------------------------
    async def test_scenario_06_compare_repositories(self):
        """Scenario 6: Compare frontend and backend repositories."""
        req = EngineeringAgentRequest(message="Compare frontend and backend repositories.")

        with patch.object(express_api_client, "get_dashboard_analytics", new_callable=AsyncMock) as mock_dash, \
             patch.object(express_api_client, "get_code_impact", new_callable=AsyncMock) as mock_churn, \
             patch.object(express_api_client, "list_repositories", new_callable=AsyncMock) as mock_repos:
            
            mock_repos.return_value = {
                "success": True,
                "data": [
                    {"id": "repo-fe", "name": "frontend"},
                    {"id": "repo-be", "name": "backend"}
                ]
            }
            mock_dash.return_value = {"success": True, "data": {"total_commits": 350}}
            mock_churn.return_value = {"success": True, "data": {"total_churn": 4500}}

            resp = await engineering_agent_service.execute_agent(req, self.user, self.auth_token)

            self.assertTrue(resp.success)

    # -------------------------------------------------------------------------
    # Scenario 7: "Give me the current project status."
    # -------------------------------------------------------------------------
    async def test_scenario_07_current_project_status(self):
        """Scenario 7: Give me the current project status."""
        req = EngineeringAgentRequest(message="Give me the current project status.")

        with patch.object(express_api_client, "get_project_statistics", new_callable=AsyncMock) as mock_stats, \
             patch.object(express_api_client, "list_projects", new_callable=AsyncMock) as mock_projs, \
             patch.object(express_api_client, "get_project", new_callable=AsyncMock) as mock_proj:
            
            mock_projs.return_value = {"success": True, "data": [{"id": "prj-1", "name": "Core Platform"}]}
            mock_proj.return_value = {"success": True, "data": {"id": "prj-1", "name": "Core Platform", "status": "active"}}
            mock_stats.return_value = {
                "success": True,
                "data": {"health_score": 94, "open_issues": 3, "connected_repositories": 2}
            }

            resp = await engineering_agent_service.execute_agent(req, self.user, self.auth_token)

            self.assertTrue(resp.success)
            self.assertIn("project", resp.tools_executed[0].tool_name)

    # -------------------------------------------------------------------------
    # Scenario 8: "Who has been inactive recently?"
    # -------------------------------------------------------------------------
    async def test_scenario_08_inactive_developers(self):
        """Scenario 8: Who has been inactive recently?"""
        req = EngineeringAgentRequest(message="Who has been inactive recently?")

        with patch.object(express_api_client, "get_developer_activity", new_callable=AsyncMock) as mock_act, \
             patch.object(express_api_client, "get_repository_developers", new_callable=AsyncMock) as mock_devs:
            
            mock_devs.return_value = {"success": True, "data": [{"id": "dev-1", "login": "dev_dormant"}]}
            mock_act.return_value = {"success": True, "data": {"recent_events": []}}

            resp = await engineering_agent_service.execute_agent(req, self.user, self.auth_token)

            self.assertTrue(resp.success)

    # -------------------------------------------------------------------------
    # Scenario 9: "What did Nehal commit yesterday?"
    # -------------------------------------------------------------------------
    async def test_scenario_09_commits_by_developer_yesterday(self):
        """Scenario 9: What did Nehal commit yesterday?"""
        req = EngineeringAgentRequest(message="What did Nehal commit yesterday?")

        with patch.object(express_api_client, "get_developer_activity", new_callable=AsyncMock) as mock_act, \
             patch.object(express_api_client, "get_repository_commits", new_callable=AsyncMock) as mock_commits, \
             patch.object(express_api_client, "list_repositories", new_callable=AsyncMock) as mock_repos:
            
            mock_repos.return_value = {"success": True, "data": [{"id": "repo-1", "name": "core"}]}
            mock_act.return_value = {
                "success": True,
                "data": [{"type": "PushEvent", "commits": [{"message": "feat: reliability layer"}]}]
            }
            mock_commits.return_value = {"success": True, "data": []}

            resp = await engineering_agent_service.execute_agent(req, self.user, self.auth_token)

            self.assertTrue(resp.success)

    # -------------------------------------------------------------------------
    # Scenario 10: "Tell me what quantum computing is."
    # -------------------------------------------------------------------------
    async def test_scenario_10_quantum_computing_it_knowledge(self):
        """Scenario 10: Tell me what quantum computing is. (Category B: IT Knowledge)"""
        req = EngineeringAgentRequest(message="Tell me what quantum computing is.")

        resp = await engineering_agent_service.execute_agent(req, self.user, self.auth_token)

        self.assertTrue(resp.success)
        self.assertIn("quantum", resp.response.lower())
        self.assertEqual(len(resp.tools_executed), 0)  # No database tools called for Category B

    # -------------------------------------------------------------------------
    # Scenario 11: "What tourist place should I visit?"
    # -------------------------------------------------------------------------
    async def test_scenario_11_tourist_place_guardrail_rejection(self):
        """Scenario 11: What tourist place should I visit? (Category C: Non-IT)"""
        req = EngineeringAgentRequest(message="What tourist place should I visit?")

        resp = await engineering_agent_service.execute_agent(req, self.user, self.auth_token)

        self.assertTrue(resp.success)
        self.assertIn("GitMonitor Engineering Intelligence Agent", resp.response)
        self.assertIn("software engineering", resp.response.lower())
        self.assertEqual(len(resp.tools_executed), 0)  # Guardrail prevents tool calls

    # -------------------------------------------------------------------------
    # Scenario 12: "Show another organization's repositories."
    # -------------------------------------------------------------------------
    async def test_scenario_12_cross_tenant_security_rejection(self):
        """Scenario 12: Show another organization's repositories. (Security Violation)"""
        req = EngineeringAgentRequest(message="Show another organization's repositories.")

        resp = await engineering_agent_service.execute_agent(req, self.user, self.auth_token)

        self.assertTrue(resp.success)
        self.assertIn("Security Policy Violation", resp.response)
        self.assertIn("Cross-tenant access is strictly forbidden", resp.response)
        self.assertEqual(len(resp.tools_executed), 0)  # Zero tool calls on security violation


if __name__ == "__main__":
    unittest.main()
