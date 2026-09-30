"""
Phase 25N: Actual LLM Connectivity Automated Diagnostic Test Suite.

Verifies:
1. Provider & Model configuration existence.
2. API Request dispatch & Response reception.
3. Latency measurement.
4. Valid generated content validation.
5. Strict API Key masking (zero secret leaks).
6. Explicit LLM_STATUS = FAILED reporting on authentication, timeout, or endpoint errors without silent mock fallbacks.
"""
import unittest
from unittest.mock import patch, AsyncMock

from app.config import settings
from app.engineering_agent.llm.diagnostics import llm_diagnostic_runner, LLMDiagnosticReport
from app.engineering_agent.llm.base import BaseAgentLLMProvider, LLMCompletionResponse
from app.engineering_agent.llm.exceptions import (
    LLMAuthenticationError,
    LLMTimeoutError,
    LLMProviderUnavailableError
)


class DummySuccessProvider(BaseAgentLLMProvider):
    """Mock LLM Provider returning valid completion for test."""
    @property
    def provider_name(self) -> str:
        return "mock-betopia"

    async def complete(self, messages, temperature=0.0, max_tokens=None, **kwargs):
        return LLMCompletionResponse(
            content="PONG - Diagnostic Probe OK",
            model="openai/gpt-5.4-mini",
            latency_ms=142.5
        )


class DummyAuthErrorProvider(BaseAgentLLMProvider):
    """Mock LLM Provider throwing 401 Unauthorized."""
    @property
    def provider_name(self) -> str:
        return "mock-betopia"

    async def complete(self, messages, temperature=0.0, max_tokens=None, **kwargs):
        raise LLMAuthenticationError("Authentication failed (HTTP 401): Invalid API key")


class DummyTimeoutProvider(BaseAgentLLMProvider):
    """Mock LLM Provider throwing timeout error."""
    @property
    def provider_name(self) -> str:
        return "mock-betopia"

    async def complete(self, messages, temperature=0.0, max_tokens=None, **kwargs):
        raise LLMTimeoutError("LLM request timed out after 30.0s")


class TestPhase25NLLMConnectivity(unittest.IsolatedAsyncioTestCase):
    """Diagnostic Test Suite for Phase 25N Actual LLM Connectivity."""

    def test_api_key_masking_invariant(self):
        """Verify API keys are strictly masked and never printed in plain text."""
        raw_key = "sk-proj-betopia-1234567890abcdef"
        masked = llm_diagnostic_runner.mask_api_key(raw_key)

        self.assertNotIn("1234567890", masked)
        self.assertTrue(masked.startswith("sk-p"))
        self.assertTrue(masked.endswith("cdef"))

    @patch("app.engineering_agent.llm.factory.agent_llm_factory.get_provider")
    async def test_successful_llm_connection_report(self, mock_get_provider):
        """Verify report returns LLM_STATUS = SUCCESS when LLM endpoint is reached."""
        mock_get_provider.return_value = DummySuccessProvider(
            base_url="https://api.betopia.ai/v1",
            api_key="sk-mock-valid-key-1234",
            model="openai/gpt-5.4-mini"
        )

        with patch.object(settings, "ENGINEERING_AGENT_LLM_PROVIDER", "betopia"), \
             patch.object(settings, "ENGINEERING_AGENT_LLM_API_KEY", "sk-mock-valid-key-1234"), \
             patch.object(settings, "ENGINEERING_AGENT_LLM_MODEL", "openai/gpt-5.4-mini"):

            report = await llm_diagnostic_runner.run_diagnostic()

            self.assertEqual(report.llm_status, "SUCCESS")
            self.assertTrue(report.request_sent)
            self.assertTrue(report.response_received)
            self.assertGreater(report.latency_ms, 0.0)
            self.assertIn("PONG", report.generated_content)
            self.assertNotIn("sk-mock-valid-key-1234", report.api_key_masked)

    @patch("app.engineering_agent.llm.factory.agent_llm_factory.get_provider")
    async def test_unauthorized_api_key_failure_reporting(self, mock_get_provider):
        """Verify report returns LLM_STATUS = FAILED on 401/403 Invalid API key error."""
        mock_get_provider.return_value = DummyAuthErrorProvider(
            base_url="https://api.betopia.ai/v1",
            api_key="sk-invalid-key-9999",
            model="openai/gpt-5.4-mini"
        )

        with patch.object(settings, "ENGINEERING_AGENT_LLM_PROVIDER", "betopia"), \
             patch.object(settings, "ENGINEERING_AGENT_LLM_API_KEY", "sk-invalid-key-9999"), \
             patch.object(settings, "ENGINEERING_AGENT_LLM_MODEL", "openai/gpt-5.4-mini"):

            report = await llm_diagnostic_runner.run_diagnostic()

            self.assertEqual(report.llm_status, "FAILED")
            self.assertEqual(report.error_type, "unauthorized")
            self.assertIn("Invalid API key", report.error_reason)
            self.assertIsNone(report.generated_content)

    @patch("app.engineering_agent.llm.factory.agent_llm_factory.get_provider")
    async def test_timeout_failure_reporting(self, mock_get_provider):
        """Verify report returns LLM_STATUS = FAILED on request timeout."""
        mock_get_provider.return_value = DummyTimeoutProvider(
            base_url="https://api.betopia.ai/v1",
            api_key="sk-timeout-key-5555",
            model="openai/gpt-5.4-mini"
        )

        with patch.object(settings, "ENGINEERING_AGENT_LLM_PROVIDER", "betopia"), \
             patch.object(settings, "ENGINEERING_AGENT_LLM_API_KEY", "sk-timeout-key-5555"), \
             patch.object(settings, "ENGINEERING_AGENT_LLM_MODEL", "openai/gpt-5.4-mini"):

            report = await llm_diagnostic_runner.run_diagnostic()

            self.assertEqual(report.llm_status, "FAILED")
            self.assertEqual(report.error_type, "timeout")
            self.assertIn("timed out", report.error_reason)
            self.assertIsNone(report.generated_content)

    async def test_missing_configuration_failure_reporting(self):
        """Verify report returns LLM_STATUS = FAILED when configuration is missing."""
        with patch.object(settings, "ENGINEERING_AGENT_LLM_PROVIDER", ""), \
             patch.object(settings, "ENGINEERING_AGENT_LLM_API_KEY", ""):

            report = await llm_diagnostic_runner.run_diagnostic()

            self.assertEqual(report.llm_status, "FAILED")
            self.assertEqual(report.error_type, "configuration_error")
            self.assertIn("Missing", report.error_reason)


if __name__ == "__main__":
    unittest.main()
