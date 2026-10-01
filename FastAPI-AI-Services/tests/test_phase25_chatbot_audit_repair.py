"""
Phase 25: Floating Chatbot Execution Audit, Intent Routing, Live Telemetry & Repair Test Suite.

Verifies:
1. "hello" greeting response.
2. "hi" greeting response.
3. "thanks" casual response.
4. "sdf" garbage input handling without crash.
5. General technical question ("What is a database?").
6. GitHub concept question ("What is a pull request?").
7. Application knowledge question ("What is GitHub Monitoring?").
8. Live repository count intent.
9. Live project count intent.
10. Live developer count intent.
11. Live commit count intent.
12. Unauthorized request rejection (401).
13. Safe environment variable configuration diagnostic (/config-status).
14. Provider health verification (/test-provider).
15. LLM timeout resilience (no AGENT_EXECUTION_ERROR).
16. LLM provider failure handling.
17. Malformed provider response handling.
18. Multi-turn conversation continuation under same conversation_id.
19. Markdown response formatting validation.
20. Frontend/backend API contract validation.
"""
import unittest
import jwt
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.providers.ai_provider import AIProviderException
from app.services.chatbot_intent_router import chatbot_intent_router, ChatbotIntentCategory

class TestPhase25ChatbotAuditRepair(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

        self.user = {
            "id": "usr-phase25-test",
            "email": "tester@gitmonitor.io",
            "organizationId": "org-phase25-test",
            "role": "admin"
        }
        self.token = jwt.encode(self.user, settings.JWT_SECRET, algorithm="HS256")
        self.headers = {"Authorization": f"Bearer {self.token}"}

    # 1. hello
    def test_01_hello(self):
        res = self.client.post("/api/v1/chatbot/chat", json={"message": "hello"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("Hello! 👋", data["data"]["answer"])

    # 2. hi
    def test_02_hi(self):
        res = self.client.post("/api/v1/chatbot/chat", json={"message": "hi"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("Hello! 👋", data["data"]["answer"])

    # 3. thanks
    def test_03_thanks(self):
        res = self.client.post("/api/v1/chatbot/chat", json={"message": "thanks"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])

    # 4. garbage input
    def test_04_garbage_input(self):
        for garbage in ["sdf", "!@#$", "qwerty"]:
            res = self.client.post("/api/v1/chatbot/chat", json={"message": garbage}, headers=self.headers)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["success"])
            self.assertTrue(any(phrase in data["data"]["answer"].lower() for phrase in ["not sure", "repositories", "projects", "github"]))


    # 5. general technical question
    def test_05_general_technical_question(self):
        res = self.client.post("/api/v1/chatbot/chat", json={"message": "What is a database?"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertTrue(len(data["data"]["answer"]) > 20)

    # 6. GitHub concept question
    def test_06_github_concept_question(self):
        res = self.client.post("/api/v1/chatbot/chat", json={"message": "What is a pull request?"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])

    # 7. application knowledge question
    def test_07_application_knowledge_question(self):
        res = self.client.post("/api/v1/chatbot/chat", json={"message": "What is this GitHub Monitoring bot?"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])

    # 8. live repository count
    def test_08_live_repository_count(self):
        res = self.client.post("/api/v1/chatbot/chat", json={"message": "How many repositories are connected?"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("Repositories", data["data"]["answer"])

    # 9. live project count
    def test_09_live_project_count(self):
        res = self.client.post("/api/v1/chatbot/chat", json={"message": "How many projects do I have?"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("Projects", data["data"]["answer"])

    # 10. live developer count
    def test_10_live_developer_count(self):
        res = self.client.post("/api/v1/chatbot/chat", json={"message": "How many developers are active?"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("Developers", data["data"]["answer"])

    # 11. live commit count
    def test_11_live_commit_count(self):
        res = self.client.post("/api/v1/chatbot/chat", json={"message": "How many commits do we have?"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("Commit", data["data"]["answer"])

    # 12. unauthorized tenant access
    def test_12_unauthorized_tenant_access(self):
        res = self.client.post("/api/v1/chatbot/chat", json={"message": "hello"})
        self.assertEqual(res.status_code, 401)

    # 13. missing LLM API key / config status
    def test_13_missing_llm_api_key(self):
        res = self.client.get("/api/v1/chatbot/config-status", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("config", data)
        self.assertNotIn("sk_", str(data))  # Never expose secrets

    # 14. invalid LLM configuration / provider test
    def test_14_invalid_llm_configuration(self):
        res = self.client.post("/api/v1/chatbot/test-provider", json={"prompt": "Reply with exactly: CHATBOT_LLM_OK"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])

    # 15. LLM timeout resilience
    def test_15_llm_timeout(self):
        with patch("app.providers.ai_provider.ai_provider.generate_completion", side_effect=AIProviderException("Timeout", status_code=504)):
            res = self.client.post("/api/v1/chatbot/chat", json={"message": "Explain microservices"}, headers=self.headers)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["success"])
            self.assertNotIn("AGENT_EXECUTION_ERROR", str(data))

    # 16. LLM provider failure
    def test_16_llm_provider_failure(self):
        with patch("app.providers.ai_provider.ai_provider.generate_completion", side_effect=Exception("Provider down")):
            res = self.client.post("/api/v1/chatbot/chat", json={"message": "What is REST?"}, headers=self.headers)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["success"])

    # 17. malformed provider response
    def test_17_malformed_provider_response(self):
        with patch("app.providers.ai_provider.ai_provider.generate_completion", return_value={"answer": ""}):
            res = self.client.post("/api/v1/chatbot/chat", json={"message": "What is Docker?"}, headers=self.headers)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertTrue(data["success"])
            self.assertTrue(len(data["data"]["answer"]) > 0)

    # 18. conversation continuation
    def test_18_conversation_continuation(self):
        # Turn 1
        res1 = self.client.post("/api/v1/chatbot/chat", json={"message": "What is a pull request?"}, headers=self.headers)
        self.assertEqual(res1.status_code, 200)
        conv_id = res1.json()["data"]["conversation_id"]

        # Turn 2
        res2 = self.client.post("/api/v1/chatbot/chat", json={"conversation_id": conv_id, "message": "How does it relate to code review?"}, headers=self.headers)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["data"]["conversation_id"], conv_id)

    # 19. chatbot response formatting
    def test_19_chatbot_response_formatting(self):
        res = self.client.post("/api/v1/chatbot/chat", json={"message": "What is GitHub Monitoring?"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        answer = res.json()["data"]["answer"]
        self.assertTrue(any(marker in answer for marker in ["###", "**", "•", "-"]))

    # 20. frontend/backend response contract
    def test_20_frontend_backend_response_contract(self):
        res = self.client.post("/api/v1/chatbot/chat", json={"message": "Hello"}, headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("success", data)
        self.assertIn("data", data)
        self.assertIn("message_id", data["data"])
        self.assertIn("conversation_id", data["data"])
        self.assertIn("answer", data["data"])
        self.assertIn("sources", data["data"])
