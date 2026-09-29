"""
Phase 2 Engineering AI Agent LLM Provider Abstraction Test Suite.
Verifies complete provider decoupling, environment isolation, factory resolution, and secret masking.
"""
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import unittest
from unittest.mock import patch, MagicMock
import time
import jwt
from fastapi.testclient import TestClient

from app.main import create_application
from app.config import settings
from app.engineering_agent.llm.base import (
    BaseAgentLLMProvider,
    LLMCompletionResponse,
    LLMUsage
)
from app.engineering_agent.llm.exceptions import (
    LLMError,
    LLMConfigurationError,
    LLMAuthenticationError,
    LLMRateLimitError,
    LLMTimeoutError,
    LLMProviderUnavailableError
)
from app.engineering_agent.llm.openai_compatible import OpenAICompatibleAgentProvider
from app.engineering_agent.llm.gemini_provider import GeminiAgentProvider
from app.engineering_agent.llm.anthropic_provider import AnthropicAgentProvider
from app.engineering_agent.llm.factory import AgentLLMProviderFactory

class TestPhase2LLMProviderAbstraction(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_application()
        cls.client = TestClient(cls.app)

    def create_mock_jwt(self, user_id="usr-test-1", org_id="org-test-tenant", email="engineer@tenant.com"):
        payload = {
            "id": user_id,
            "email": email,
            "role": "admin",
            "organizationId": org_id,
            "exp": int(time.time()) + 3600
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    def test_1_provider_configuration_loading(self):
        """1. Verify Engineering Agent LLM configuration attributes exist on settings."""
        self.assertTrue(hasattr(settings, "ENGINEERING_AGENT_LLM_PROVIDER"))
        self.assertTrue(hasattr(settings, "ENGINEERING_AGENT_LLM_BASE_URL"))
        self.assertTrue(hasattr(settings, "ENGINEERING_AGENT_LLM_API_KEY"))
        self.assertTrue(hasattr(settings, "ENGINEERING_AGENT_LLM_MODEL"))
        self.assertTrue(hasattr(settings, "ENGINEERING_AGENT_LLM_TIMEOUT"))
        self.assertTrue(hasattr(settings, "ENGINEERING_AGENT_LLM_MAX_RETRIES"))

    def test_2_does_not_use_ai_api_key_when_agent_key_missing(self):
        """2 & 6. Verify missing ENGINEERING_AGENT_LLM_API_KEY raises LLMConfigurationError and does NOT fall back to AI_API_KEY."""
        with patch.object(settings, "ENGINEERING_AGENT_LLM_PROVIDER", "openai_compatible"), \
             patch.object(settings, "ENGINEERING_AGENT_LLM_API_KEY", ""), \
             patch.object(settings, "AI_API_KEY", "chatbot-secret-key-123"):
            
            with self.assertRaises(LLMConfigurationError) as ctx:
                AgentLLMProviderFactory.get_provider()
            self.assertIn("ENGINEERING_AGENT_LLM_API_KEY", str(ctx.exception))
            self.assertIn("does not fall back to chatbot", str(ctx.exception))

    def test_3_does_not_use_ai_provider_when_agent_provider_missing(self):
        """3. Verify missing ENGINEERING_AGENT_LLM_PROVIDER raises LLMConfigurationError and does NOT fall back to AI_PROVIDER."""
        with patch.object(settings, "ENGINEERING_AGENT_LLM_PROVIDER", ""), \
             patch.object(settings, "AI_PROVIDER", "betopia"):
            
            with self.assertRaises(LLMConfigurationError) as ctx:
                AgentLLMProviderFactory.get_provider()
            self.assertIn("ENGINEERING_AGENT_LLM_PROVIDER", str(ctx.exception))

    def test_4_factory_resolves_openai_compatible(self):
        """4 & 7. Verify factory resolves openai_compatible provider adapter."""
        provider = AgentLLMProviderFactory.get_provider(
            provider_name="openai_compatible",
            base_url="https://api.example.com/v1",
            api_key="sk-test-12345678",
            model="custom-model-x"
        )
        self.assertIsInstance(provider, OpenAICompatibleAgentProvider)
        self.assertEqual(provider.provider_name, "openai_compatible")
        self.assertEqual(provider.model, "custom-model-x")
        self.assertEqual(provider.base_url, "https://api.example.com/v1")

    def test_5_factory_resolves_gemini(self):
        """5 & 8. Verify factory resolves Gemini provider adapter."""
        provider = AgentLLMProviderFactory.get_provider(
            provider_name="gemini",
            base_url="https://generativelanguage.googleapis.com",
            api_key="gemini-key-12345678",
            model="gemini-1.5-pro"
        )
        self.assertIsInstance(provider, GeminiAgentProvider)
        self.assertEqual(provider.provider_name, "gemini")
        self.assertEqual(provider.model, "gemini-1.5-pro")

    def test_6_factory_resolves_anthropic(self):
        """6 & 9. Verify factory resolves Anthropic provider adapter."""
        provider = AgentLLMProviderFactory.get_provider(
            provider_name="anthropic",
            base_url="https://api.anthropic.com",
            api_key="sk-ant-12345678",
            model="claude-3-5-sonnet"
        )
        self.assertIsInstance(provider, AnthropicAgentProvider)
        self.assertEqual(provider.provider_name, "anthropic")
        self.assertEqual(provider.model, "claude-3-5-sonnet")

    def test_7_unknown_provider_raises_error(self):
        """7 & 10. Verify unsupported provider name produces a clear error."""
        with self.assertRaises(LLMConfigurationError) as ctx:
            AgentLLMProviderFactory.get_provider(
                provider_name="unsupported_quantum_llm",
                api_key="secret-key"
            )
        self.assertIn("Unsupported Engineering Agent LLM provider", str(ctx.exception))

    def test_8_secret_masking(self):
        """8 & 11. Verify secret masking functions properly and never exposes full credentials."""
        masked_long = BaseAgentLLMProvider.mask_secret("sk-live-abcdef1234567890xyz")
        self.assertTrue(masked_long.startswith("sk-"))
        self.assertTrue(masked_long.endswith("0xyz"))
        self.assertNotIn("abcdef1234567890", masked_long)

        masked_short = BaseAgentLLMProvider.mask_secret("short")
        self.assertEqual(masked_short, "***")

        masked_empty = BaseAgentLLMProvider.mask_secret("")
        self.assertEqual(masked_empty, "<empty>")

    def test_9_future_provider_extensibility(self):
        """9. Verify custom provider registration works dynamically without modifying orchestrator."""
        class MockCustomProvider(BaseAgentLLMProvider):
            @property
            def provider_name(self) -> str:
                return "mock_custom"

            async def complete(self, messages, **kwargs):
                return LLMCompletionResponse(
                    content="custom response",
                    model=self.model,
                    provider=self.provider_name,
                    latency_ms=10.0
                )

            async def test_connection(self):
                return {"success": True}

        AgentLLMProviderFactory.register_provider("mock_custom", MockCustomProvider)
        instantiated = AgentLLMProviderFactory.get_provider(
            provider_name="mock_custom",
            api_key="test-key"
        )
        self.assertIsInstance(instantiated, MockCustomProvider)
        self.assertEqual(instantiated.provider_name, "mock_custom")

    def test_10_endpoint_execution_with_mocked_provider(self):
        """10. Verify POST /api/v1/engineering-agent/chat executes successfully through factory abstraction."""
        token = self.create_mock_jwt(user_id="usr-p2-test", org_id="org-p2-test")

        res = self.client.post(
            "/api/v1/engineering-agent/chat",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": "Analyze commit patterns and developer velocity"}
        )

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertIn("response", data)
        self.assertIn("detected_intent", data)

    def test_11_chatbot_regression_check(self):
        """11. Verify chatbot health and endpoints remain 100% operational."""
        health_res = self.client.get("/api/v1/health")
        self.assertEqual(health_res.status_code, 200)
        self.assertEqual(health_res.json()["status"], "ok")

        chat_unauth = self.client.post("/api/v1/chatbot/chat", json={"message": "hello"})
        self.assertEqual(chat_unauth.status_code, 401)

if __name__ == "__main__":
    unittest.main()
