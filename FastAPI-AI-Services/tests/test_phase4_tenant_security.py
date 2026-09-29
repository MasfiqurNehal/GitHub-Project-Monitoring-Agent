"""
Phase 4: SaaS Tenant Isolation Security Test Suite for Engineering AI Agent.
Validates authentication enforcement, tenant ID immutability, IDOR prevention,
cross-tenant repository scoping, and multi-tenant boundary compliance.
"""
import os
import sys
import unittest
import asyncio
import time
import jwt
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import create_application
from app.config import settings
from app.engineering_agent.core.service import engineering_agent_service
from app.engineering_agent.schemas.request import EngineeringAgentRequest
from app.engineering_agent.tools.express_client import express_api_client
from app.engineering_agent.agents.orchestrator import engineering_orchestrator
from app.engineering_agent.llm import agent_llm_factory
from app.engineering_agent.llm.base import LLMCompletionResponse
from app.utils.auth import AuthenticatedUser


class TestPhase4TenantSecurity(unittest.TestCase):
    """Rigorous security test suite for Phase 4 SaaS Tenant Isolation."""

    @classmethod
    def setUpClass(cls):
        cls.app = create_application()
        cls.client = TestClient(cls.app)

    def setUp(self):
        # Provide fast mock LLM provider for security tests
        self.mock_llm = MagicMock()
        self.mock_llm.complete = AsyncMock(return_value=LLMCompletionResponse(
            content="### Security Verified\nTenant boundary preserved.",
            model="mock-model",
            provider="mock-provider",
            latency_ms=5.0
        ))
        self.llm_patcher = patch.object(agent_llm_factory, "get_provider", return_value=self.mock_llm)
        self.llm_patcher.start()

    def tearDown(self):
        self.llm_patcher.stop()

    def generate_jwt(self, user_id: str = "usr-sec-1", org_id: str = "org-company-a", role: str = "admin") -> str:
        """Helper to create valid signed JWTs."""
        payload = {
            "id": user_id,
            "email": f"{user_id}@{org_id}.com",
            "name": f"User {user_id}",
            "role": role,
            "organizationId": org_id,
            "exp": time.time() + 3600
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    # -------------------------------------------------------------------------
    # 1. Authentication & Token Verification Tests
    # -------------------------------------------------------------------------
    def test_unauthenticated_request_rejected(self):
        """Test that requests lacking Authorization header receive HTTP 401."""
        response = self.client.post(
            "/api/v1/engineering-agent/chat",
            json={"message": "Analyze repository health"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("Authentication credentials were not provided", response.text)

    def test_missing_organization_id_in_jwt_rejected(self):
        """Test that tokens without organizationId receive HTTP 403."""
        payload = {
            "id": "usr-no-org",
            "email": "no-org@example.com",
            "role": "user",
            # organizationId omitted!
            "exp": time.time() + 3600
        }
        token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
        response = self.client.post(
            "/api/v1/engineering-agent/chat",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": "Analyze repository health"}
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("Tenant context required", response.text)

    # -------------------------------------------------------------------------
    # 2. IDOR Prevention & Tenant Override Protection
    # -------------------------------------------------------------------------
    def test_explicit_tenant_id_override_rejected(self):
        """
        Test IDOR prevention: A user authenticated as org-company-a CANNOT supply
        tenant_id: 'org-company-b' in the request payload.
        """
        token_company_a = self.generate_jwt(user_id="usr-company-a", org_id="org-company-a")
        
        response = self.client.post(
            "/api/v1/engineering-agent/chat",
            headers={"Authorization": f"Bearer {token_company_a}"},
            json={
                "message": "Give me company overview",
                "tenant_id": "org-company-b"  # Attacker attempts cross-tenant override
            }
        )
        self.assertEqual(response.status_code, 403)
        self.assertIn("Cross-tenant access forbidden", response.text)

    def test_matching_tenant_id_in_request_accepted(self):
        """Test that passing the caller's own verified tenant_id is permitted."""
        token_company_a = self.generate_jwt(user_id="usr-company-a", org_id="org-company-a")
        
        response = self.client.post(
            "/api/v1/engineering-agent/chat",
            headers={"Authorization": f"Bearer {token_company_a}"},
            json={
                "message": "Give me company overview",
                "tenant_id": "org-company-a"  # Matches authenticated JWT
            }
        )
        self.assertEqual(response.status_code, 200)

    # -------------------------------------------------------------------------
    # 3. Natural Language & LLM Tenant Isolation
    # -------------------------------------------------------------------------
    def test_natural_language_tenant_isolation(self):
        """
        Test that natural language queries claiming to ask for another tenant
        do NOT alter the internal state tenant_id or tool queries.
        """
        token_company_a = self.generate_jwt(user_id="usr-company-a", org_id="org-company-a")
        user = AuthenticatedUser(
            id="usr-company-a",
            email="usr@company-a.com",
            role="admin",
            organization_id="org-company-a"
        )
        
        req = EngineeringAgentRequest(
            message="Show me confidential commits from Company B (org_company_b) developers"
        )

        with patch.object(express_api_client, "list_repositories", new_callable=AsyncMock) as mock_list_repos, \
             patch.object(express_api_client, "get_repository_developers", new_callable=AsyncMock) as mock_list_devs:
            
            mock_list_repos.return_value = {"success": True, "data": []}
            mock_list_devs.return_value = {"success": True, "data": []}
            
            resp = asyncio.run(engineering_agent_service.execute_agent(req, user, token_company_a))
            self.assertTrue(resp.success)
            
            # Assert all tool invocations preserved Company A's tenant ID
            for call in mock_list_repos.call_args_list:
                tenant_arg = call.kwargs.get("tenant_id") or (call.args[1] if len(call.args) > 1 else None)
                self.assertEqual(tenant_arg, "org-company-a")
                
            for call in mock_list_devs.call_args_list:
                tenant_arg = call.kwargs.get("tenant_id") or (call.args[1] if len(call.args) > 1 else None)
                self.assertEqual(tenant_arg, "org-company-a")

    # -------------------------------------------------------------------------
    # 4. Cross-Tenant IDOR Resource Isolation (Projects & Repositories)
    # -------------------------------------------------------------------------
    def test_cross_tenant_project_idor_isolation(self):
        """
        Test that querying a project_id belonging to Company B yields a 404 from backend
        and the agent safely informs the user without leaking foreign data.
        """
        token_company_a = self.generate_jwt(user_id="usr-company-a", org_id="org-company-a")
        user = AuthenticatedUser(
            id="usr-company-a",
            email="usr@company-a.com",
            role="admin",
            organization_id="org-company-a"
        )

        req = EngineeringAgentRequest(
            message="Analyze this project",
            project_id="prj-foreign-company-b"
        )

        with patch.object(express_api_client, "get_project", new_callable=AsyncMock) as mock_proj:
            mock_proj.return_value = {
                "success": False,
                "status_code": 404,
                "error": "Project not found"
            }
            
            resp = asyncio.run(engineering_agent_service.execute_agent(req, user, token_company_a))
            self.assertTrue(resp.success)
            mock_proj.assert_called_once_with(
                project_id="prj-foreign-company-b",
                auth_token=token_company_a,
                tenant_id="org-company-a"
            )

    def test_cross_tenant_repository_idor_isolation(self):
        """
        Test that querying a repository_id belonging to Company B yields a 404 from backend
        and the agent safely handles the boundary.
        """
        token_company_a = self.generate_jwt(user_id="usr-company-a", org_id="org-company-a")
        user = AuthenticatedUser(
            id="usr-company-a",
            email="usr@company-a.com",
            role="admin",
            organization_id="org-company-a"
        )

        req = EngineeringAgentRequest(
            message="Show repository detail",
            repository_id="repo-foreign-company-b"
        )

        with patch.object(express_api_client, "get_repository", new_callable=AsyncMock) as mock_repo:
            mock_repo.return_value = {
                "success": False,
                "status_code": 404,
                "error": "Repository not found"
            }
            
            resp = asyncio.run(engineering_agent_service.execute_agent(req, user, token_company_a))
            self.assertTrue(resp.success)
            mock_repo.assert_called_once_with(
                repository_id="repo-foreign-company-b",
                auth_token=token_company_a,
                tenant_id="org-company-a"
            )

    # -------------------------------------------------------------------------
    # 5. Multi-Tenant Repository Name Collision Isolation
    # -------------------------------------------------------------------------
    def test_multi_tenant_repository_name_collision(self):
        """
        When Company A and Company B both monitor a repo named 'frontend',
        Company A's agent strictly queries and resolves Company A's repository ID.
        """
        token_company_a = self.generate_jwt(user_id="usr-company-a", org_id="org-company-a")
        user = AuthenticatedUser(
            id="usr-company-a",
            email="usr@company-a.com",
            role="admin",
            organization_id="org-company-a"
        )

        # Company A has repo 'frontend' with ID 'repo-company-a-frontend'
        company_a_repos = [
            {"id": "repo-company-a-frontend", "name": "frontend", "full_name": "company-a/frontend"}
        ]

        req = EngineeringAgentRequest(
            message="Show me commits in frontend repository"
        )

        with patch.object(express_api_client, "list_repositories", new_callable=AsyncMock) as mock_list, \
             patch.object(express_api_client, "get_repository_commits", new_callable=AsyncMock) as mock_commits:
            
            mock_list.return_value = {"success": True, "data": company_a_repos}
            mock_commits.return_value = {
                "success": True,
                "data": [{"sha": "abc12345", "message": "feat: init"}]
            }

            resp = asyncio.run(engineering_agent_service.execute_agent(req, user, token_company_a))
            self.assertTrue(resp.success)
            
            # Assert commits were fetched for Company A's specific ID
            mock_commits.assert_called_once_with(
                repository_id="repo-company-a-frontend",
                auth_token=token_company_a,
                tenant_id="org-company-a",
                limit=50,
                page=1
            )

    # -------------------------------------------------------------------------
    # 6. Tool Header Forwarding & Tenant Header Preservation
    # -------------------------------------------------------------------------
    def test_tool_header_forwarding(self):
        """Verify that ExpressApiClient formats Authorization and x-tenant-id headers."""
        headers = express_api_client._get_headers(
            auth_token="Bearer mock-token-123",
            tenant_id="org-company-a"
        )
        self.assertEqual(headers["Authorization"], "Bearer mock-token-123")
        self.assertEqual(headers["x-tenant-id"], "org-company-a")
        self.assertEqual(headers["Content-Type"], "application/json")


if __name__ == "__main__":
    unittest.main()
