"""
Phase 1 Engineering AI Agent Test Suite (unittest compatible).
Verifies request validation, state management, Express tool client, and endpoint routing.
"""
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import unittest
import jwt
import time
from fastapi.testclient import TestClient

from app.main import create_application
from app.config import settings
from app.engineering_agent.schemas.request import EngineeringAgentRequest
from app.engineering_agent.schemas.response import EngineeringAgentResponse
from app.engineering_agent.state.agent_state import AgentState
from app.engineering_agent.tools.express_client import express_api_client

class TestPhase1EngineeringAgent(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_application()
        cls.client = TestClient(cls.app)

    def create_mock_jwt(self, user_id="usr-test-1", org_id="org-test-tenant", email="engineer@tenant.com"):
        """Helper to create a valid signed JWT access token for testing."""
        payload = {
            "id": user_id,
            "email": email,
            "role": "admin",
            "organizationId": org_id,
            "exp": int(time.time()) + 3600
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    def test_request_schema_validation(self):
        """Test EngineeringAgentRequest schema validation."""
        # Valid payload
        req = EngineeringAgentRequest(
            message="Analyze PR throughput for backend repo",
            project_id="prj-101",
            repository_id="repo-202"
        )
        self.assertEqual(req.message, "Analyze PR throughput for backend repo")
        self.assertEqual(req.project_id, "prj-101")
        self.assertEqual(req.agent_mode, "auto")

        # Empty message should fail
        with self.assertRaises(ValueError):
            EngineeringAgentRequest(message="")

    def test_agent_state_model(self):
        """Test AgentState internal lifecycle and metrics recording."""
        state = AgentState(
            user_request="Investigate recent commits",
            tenant_id="tenant-alpha",
            user_id="usr-dev-1",
            project_id="prj-999"
        )

        state.add_reasoning_step("Classification complete", action="classify")
        self.assertEqual(len(state.intermediate_reasoning), 1)
        self.assertEqual(state.intermediate_reasoning[0].action, "classify")

        state.record_tool_result(
            tool_name="get_project_detail",
            input_args={"project_id": "prj-999"},
            output_data={"metrics": {"commitsCount": 42}},
            success=True,
            duration_ms=15.5
        )
        self.assertEqual(len(state.tool_results), 1)
        self.assertEqual(state.tool_results[0].tool_name, "get_project_detail")

        state.add_metric("Total Commits", 42)
        self.assertEqual(len(state.metrics), 1)
        self.assertEqual(state.metrics[0]["value"], 42)

        duration = state.finalize()
        self.assertGreaterEqual(duration, 0.0)
        self.assertIsNotNone(state.end_time)

    def test_express_api_client_header_generation(self):
        """Test that ExpressApiClient generates correct tenant & authorization headers."""
        headers = express_api_client._get_headers(
            auth_token="Bearer mock-token-xyz",
            tenant_id="org-acme"
        )
        self.assertEqual(headers["Authorization"], "Bearer mock-token-xyz")
        self.assertEqual(headers["x-tenant-id"], "org-acme")

    def test_engineering_agent_health_endpoint(self):
        """Test GET /api/v1/engineering-agent/health."""
        res = self.client.get("/api/v1/engineering-agent/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "online")
        self.assertEqual(data["module"], "engineering_agent")
        self.assertIn("developer_activity_analysis", data["capabilities"])

    def test_engineering_agent_endpoint_unauthorized(self):
        """Test that POST /api/v1/engineering-agent/chat rejects requests without JWT token."""
        res = self.client.post(
            "/api/v1/engineering-agent/chat",
            json={"message": "Analyze commit activity"}
        )
        self.assertEqual(res.status_code, 401)

    def test_engineering_agent_endpoint_authorized(self):
        """Test POST /api/v1/engineering-agent/chat with valid JWT."""
        token = self.create_mock_jwt(user_id="usr-100", org_id="org-qa-1", email="dev@betopia.com")
        
        payload = {
            "message": "Analyze developer activity and commit trends for the project",
            "project_id": "prj-test-555",
            "agent_mode": "auto"
        }

        res = self.client.post(
            "/api/v1/engineering-agent/chat",
            headers={"Authorization": f"Bearer {token}"},
            json=payload
        )

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("response", data)
        self.assertIn("conversation_id", data)
        self.assertIn("tools_executed", data)
        self.assertIsNotNone(data["detected_intent"])

    def test_existing_chatbot_remains_intact(self):
        """Test that existing chatbot routes still exist and respond properly."""
        res = self.client.get("/api/v1/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

        # Chatbot endpoint still rejects unauthorized requests as expected
        chat_res = self.client.post("/api/v1/chatbot/chat", json={"message": "hello"})
        self.assertEqual(chat_res.status_code, 401)

if __name__ == "__main__":
    unittest.main()
