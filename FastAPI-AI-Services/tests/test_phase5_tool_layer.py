"""
Phase 5: Engineering Agent Tool Layer Test Suite.
Validates all 17 read-only tools, input validation schemas, tenant context forwarding,
strict mutation prohibitions, error handling, and empty result resilience.
"""
import os
import sys
import unittest
import asyncio
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.engineering_agent.tools import (
    tool_registry,
    express_api_client,
    ReadOnlyTool,
    ToolResult,
    PROHIBITED_MUTATION_OPERATIONS,
    GetRepositoryInput,
    ListRepositoriesInput,
    GetRepositoryCommitsInput,
    GetCommitDetailsInput,
    GetDeveloperCommitStatisticsInput
)


class TestPhase5ToolLayer(unittest.TestCase):
    """Test suite for Phase 5 Engineering Agent Tool Layer."""

    def setUp(self):
        self.auth_token = "Bearer test-jwt-token-xyz"
        self.tenant_id = "org-test-company-a"

    # -------------------------------------------------------------------------
    # 1. Registry Completeness & Read-Only Safety Tests
    # -------------------------------------------------------------------------
    def test_registry_contains_all_17_tools(self):
        """Verify that all 17 required read-only tools are registered."""
        expected_tools = [
            "get_repository",
            "list_repositories",
            "get_repository_branches",
            "get_repository_commits",
            "get_commit_details",
            "get_repository_pull_requests",
            "get_pull_request_details",
            "get_repository_issues",
            "get_issue_details",
            "get_repository_developers",
            "get_developer_activity",
            "get_developer_commit_statistics",
            "get_code_impact",
            "get_project",
            "get_project_repositories",
            "get_project_statistics",
            "get_dashboard_analytics"
        ]
        registered_names = [t.name for t in tool_registry.list_tools()]
        for tool_name in expected_tools:
            self.assertIn(tool_name, registered_names, f"Tool '{tool_name}' missing from registry")
            tool = tool_registry.get_tool(tool_name)
            self.assertTrue(tool.is_read_only, f"Tool '{tool_name}' must be marked read_only")

    def test_prohibited_mutation_actions_rejected(self):
        """Verify that mutation operations (push, commit, merge, branch delete) are strictly rejected."""
        for prohibited in PROHIBITED_MUTATION_OPERATIONS:
            res = asyncio.run(
                tool_registry.execute_tool(
                    name=prohibited,
                    args={"branch": "main"},
                    auth_token=self.auth_token,
                    tenant_id=self.tenant_id
                )
            )
            self.assertFalse(res.success)
            self.assertIn("prohibited mutation action", res.error.lower())
            self.assertTrue(res.is_read_only)

    def test_tool_instantiation_blocks_mutation_names(self):
        """Verify that ReadOnlyTool raises ValueError if initialized with mutation name."""
        with self.assertRaises(ValueError):
            ReadOnlyTool(
                name="push",
                description="Attempt write",
                input_model=GetRepositoryInput,
                handler=lambda x, y, z: None
            )

    # -------------------------------------------------------------------------
    # 2. Input Validation Schema Tests
    # -------------------------------------------------------------------------
    def test_input_validation_failure_handled_gracefully(self):
        """Test that calling a tool without required arguments returns a clean error."""
        # get_repository requires repository_id
        res = asyncio.run(
            tool_registry.execute_tool(
                name="get_repository",
                args={},  # Missing required repository_id
                auth_token=self.auth_token,
                tenant_id=self.tenant_id
            )
        )
        self.assertFalse(res.success)
        self.assertIn("Invalid arguments for get_repository", res.error)
        self.assertTrue(res.is_read_only)

    # -------------------------------------------------------------------------
    # 3. Execution of All 17 Read-Only Tools
    # -------------------------------------------------------------------------
    def test_tool_get_repository(self):
        """Test 1: get_repository execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": {"id": "repo-1", "name": "backend"}}
            res = asyncio.run(
                tool_registry.execute_tool("get_repository", {"repository_id": "repo-1"}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            self.assertEqual(res.data["name"], "backend")
            mock_get.assert_called_once_with("/repositories/repo-1", self.auth_token, self.tenant_id)

    def test_tool_list_repositories(self):
        """Test 2: list_repositories execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": [{"id": "repo-1"}, {"id": "repo-2"}]}
            res = asyncio.run(
                tool_registry.execute_tool("list_repositories", {"limit": 20}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            self.assertEqual(len(res.data), 2)
            mock_get.assert_called_once_with("/repositories", self.auth_token, self.tenant_id, params={"limit": 20})

    def test_tool_get_repository_branches(self):
        """Test 3: get_repository_branches execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": {"default_branch": "main", "branches": ["main", "dev"]}}
            res = asyncio.run(
                tool_registry.execute_tool("get_repository_branches", {"repository_id": "repo-1"}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            self.assertEqual(res.data["default_branch"], "main")

    def test_tool_get_repository_commits(self):
        """Test 4: get_repository_commits execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": [{"sha": "abc123", "message": "feat: init"}]}
            res = asyncio.run(
                tool_registry.execute_tool("get_repository_commits", {"repository_id": "repo-1", "limit": 10}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            self.assertEqual(len(res.data), 1)

    def test_tool_get_commit_details(self):
        """Test 5: get_commit_details execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": {"sha": "abc123", "files_changed": 3}}
            res = asyncio.run(
                tool_registry.execute_tool("get_commit_details", {"commit_id": "abc123", "include_changes": True}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            mock_get.assert_called_once_with("/commits/abc123/changes", self.auth_token, self.tenant_id)

    def test_tool_get_repository_pull_requests(self):
        """Test 6: get_repository_pull_requests execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": [{"id": "pr-1", "title": "fix auth"}]}
            res = asyncio.run(
                tool_registry.execute_tool("get_repository_pull_requests", {"repository_id": "repo-1", "status": "open"}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            mock_get.assert_called_once_with("/repositories/repo-1/pull-requests", self.auth_token, self.tenant_id, params={"status": "open"})

    def test_tool_get_pull_request_details(self):
        """Test 7: get_pull_request_details execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": {"id": "pr-1", "title": "fix auth", "turnaround_hours": 4.5}}
            res = asyncio.run(
                tool_registry.execute_tool("get_pull_request_details", {"pull_request_id": "pr-1"}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            mock_get.assert_called_once_with("/pull-requests/pr-1", self.auth_token, self.tenant_id)

    def test_tool_get_repository_issues(self):
        """Test 8: get_repository_issues execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": [{"id": "iss-1", "title": "UI bug"}]}
            res = asyncio.run(
                tool_registry.execute_tool("get_repository_issues", {"repository_id": "repo-1", "status": "open"}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            mock_get.assert_called_once_with("/repositories/repo-1/issues", self.auth_token, self.tenant_id, params={"status": "open"})

    def test_tool_get_issue_details(self):
        """Test 9: get_issue_details execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": {"id": "iss-1", "state": "closed"}}
            res = asyncio.run(
                tool_registry.execute_tool("get_issue_details", {"issue_id": "iss-1"}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            mock_get.assert_called_once_with("/issues/iss-1", self.auth_token, self.tenant_id)

    def test_tool_get_repository_developers(self):
        """Test 10: get_repository_developers execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": [{"id": "dev-1", "login": "nehal"}]}
            res = asyncio.run(
                tool_registry.execute_tool("get_repository_developers", {}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            mock_get.assert_called_once_with("/developers", self.auth_token, self.tenant_id)

    def test_tool_get_developer_activity(self):
        """Test 11: get_developer_activity execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": [{"event": "commit", "timestamp": "2026-09-29"}]}
            res = asyncio.run(
                tool_registry.execute_tool("get_developer_activity", {"developer_id": "dev-1"}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            mock_get.assert_called_once_with("/developers/dev-1/activity", self.auth_token, self.tenant_id, params={"limit": 50})

    def test_tool_get_developer_commit_statistics(self):
        """Test 12: get_developer_commit_statistics execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": {"commitsCount": 42, "additions": 1200, "deletions": 300}}
            res = asyncio.run(
                tool_registry.execute_tool("get_developer_commit_statistics", {"developer_id": "dev-1", "preset": "30d"}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            self.assertEqual(res.data["commitsCount"], 42)
            mock_get.assert_called_once_with("/developers/dev-1/analytics", self.auth_token, self.tenant_id, params={"preset": "30d"})

    def test_tool_get_code_impact(self):
        """Test 13: get_code_impact execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": {"linesAdded": 5000, "linesDeleted": 1200, "churnRate": 0.24}}
            res = asyncio.run(
                tool_registry.execute_tool("get_code_impact", {"repository_id": "repo-1", "timeframe": "30d"}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            mock_get.assert_called_once_with("/repositories/repo-1/churn", self.auth_token, self.tenant_id, params={"timeframe": "30d"})

    def test_tool_get_project(self):
        """Test 14: get_project execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": {"id": "prj-1", "name": "Apollo"}}
            res = asyncio.run(
                tool_registry.execute_tool("get_project", {"project_id": "prj-1"}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            mock_get.assert_called_once_with("/projects/prj-1", self.auth_token, self.tenant_id)

    def test_tool_get_project_repositories(self):
        """Test 15: get_project_repositories execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": [{"id": "repo-1"}, {"id": "repo-2"}]}
            res = asyncio.run(
                tool_registry.execute_tool("get_project_repositories", {"project_id": "prj-1"}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            mock_get.assert_called_once_with("/projects/prj-1/repositories", self.auth_token, self.tenant_id)

    def test_tool_get_project_statistics(self):
        """Test 16: get_project_statistics execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": {"totalCommits": 150, "activeDevelopers": 5}}
            res = asyncio.run(
                tool_registry.execute_tool("get_project_statistics", {"project_id": "prj-1", "preset": "30d"}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            mock_get.assert_called_once_with("/reports/project/prj-1", self.auth_token, self.tenant_id, params={"preset": "30d"})

    def test_tool_get_dashboard_analytics(self):
        """Test 17: get_dashboard_analytics execution."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": {"repositoriesCount": 4, "totalCommits": 450}}
            res = asyncio.run(
                tool_registry.execute_tool("get_dashboard_analytics", {"timeframe": "30d"}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            mock_get.assert_called_once_with("/dashboard/overview", self.auth_token, self.tenant_id, params={"preset": "30d"})

    # -------------------------------------------------------------------------
    # 4. Empty Result & Error Handling Tests
    # -------------------------------------------------------------------------
    def test_empty_results_handled_gracefully(self):
        """Test that tools returning null or empty data return success=True and data=[]."""
        with patch.object(express_api_client, "_get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"success": True, "data": None}
            res = asyncio.run(
                tool_registry.execute_tool("list_repositories", {}, self.auth_token, self.tenant_id)
            )
            self.assertTrue(res.success)
            self.assertEqual(res.data, [])

    def test_tool_schema_export(self):
        """Test that get_tool_definitions exports valid schemas for all 17 tools."""
        definitions = tool_registry.get_tool_definitions()
        self.assertEqual(len(definitions), 17)
        for d in definitions:
            self.assertTrue(d.is_read_only)
            self.assertIn("properties", d.parameters)


if __name__ == "__main__":
    unittest.main()
