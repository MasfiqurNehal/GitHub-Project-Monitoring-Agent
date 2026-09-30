"""
Phase 25N: Dedicated LLM Connectivity Diagnostic Engine.
Performs live/mocked runtime connection testing against the configured Engineering Agent LLM provider.
Ensures ZERO secret leaks, records latency, and explicitly reports LLM_STATUS = FAILED on errors.
"""
import time
from typing import Dict, Any, Optional
from dataclasses import dataclass

from app.config import settings
from app.engineering_agent.llm.factory import agent_llm_factory
from app.engineering_agent.llm.exceptions import (
    LLMAuthenticationError,
    LLMTimeoutError,
    LLMProviderUnavailableError,
    LLMConfigurationError,
    LLMError
)
from app.utils.logger import logger


@dataclass
class LLMDiagnosticReport:
    """Safe Diagnostic Report for Engineering Agent LLM provider connectivity."""
    llm_status: str                  # "SUCCESS" or "FAILED"
    provider: str                    # e.g., "betopia", "openai"
    model: str                       # e.g., "openai/gpt-5.4-mini"
    endpoint: str                    # Safe endpoint URL
    api_key_masked: str              # Masked API key (e.g. sk-***1234)
    request_sent: bool               # Whether HTTP call was dispatched
    response_received: bool          # Whether HTTP response was received
    latency_ms: float                # Latency duration in ms
    generated_content: Optional[str] = None  # Synthesized text snippet
    error_type: Optional[str] = None         # Category: unauthorized, timeout, endpoint_unavailable, etc.
    error_reason: Optional[str] = None       # Detailed safe error explanation


class LLMDiagnosticRunner:
    """
    Dedicated diagnostic runner for Phase 25N LLM connection testing.
    Does NOT silently fall back to mock data if live LLM fails.
    """

    def mask_api_key(self, key: Optional[str]) -> str:
        """Safely mask API key for diagnostics and logging."""
        if not key:
            return "[MISSING]"
        clean = key.strip()
        if len(clean) <= 8:
            return "***" + clean[-2:]
        return clean[:4] + "..." + clean[-4:]

    async def run_diagnostic(
        self,
        provider_name: Optional[str] = None,
        custom_prompt: str = "Respond with 'PONG' to confirm connection."
    ) -> LLMDiagnosticReport:
        """
        Execute diagnostic test against the configured LLM provider.
        """
        start_ts = time.time()
        provider_str = provider_name or getattr(settings, "ENGINEERING_AGENT_LLM_PROVIDER", "")
        model_str = getattr(settings, "ENGINEERING_AGENT_LLM_MODEL", "") or "default"
        base_url_str = getattr(settings, "ENGINEERING_AGENT_LLM_BASE_URL", "").rstrip("/")
        endpoint_str = f"{base_url_str}/chat/completions" if base_url_str else "default_endpoint"
        raw_key = getattr(settings, "ENGINEERING_AGENT_LLM_API_KEY", "")
        masked_key = self.mask_api_key(raw_key)

        # 1. Verify Configuration Exists
        if not provider_str or not raw_key:
            latency_ms = round((time.time() - start_ts) * 1000.0, 2)
            logger.error("[LLMDiagnosticRunner] LLM_STATUS = FAILED (Missing Configuration)")
            return LLMDiagnosticReport(
                llm_status="FAILED",
                provider=provider_str or "unconfigured",
                model=model_str,
                endpoint=endpoint_str,
                api_key_masked=masked_key,
                request_sent=False,
                response_received=False,
                latency_ms=latency_ms,
                error_type="configuration_error",
                error_reason="Missing ENGINEERING_AGENT_LLM_PROVIDER or ENGINEERING_AGENT_LLM_API_KEY environment configuration."
            )

        # 2. Instantiate Provider Adapter
        try:
            provider_inst = agent_llm_factory.get_provider(
                provider_name=provider_str,
                base_url=base_url_str or None,
                api_key=raw_key or None,
                model=model_str or None
            )
        except LLMConfigurationError as cfg_err:
            latency_ms = round((time.time() - start_ts) * 1000.0, 2)
            logger.error(f"[LLMDiagnosticRunner] LLM_STATUS = FAILED ({cfg_err.message})")
            return LLMDiagnosticReport(
                llm_status="FAILED",
                provider=provider_str,
                model=model_str,
                endpoint=endpoint_str,
                api_key_masked=masked_key,
                request_sent=False,
                response_received=False,
                latency_ms=latency_ms,
                error_type="invalid_configuration",
                error_reason=cfg_err.message
            )

        # 3. Dispatch Live Diagnostic API Request
        test_messages = [
            {"role": "system", "content": "You are GitMonitor Diagnostic Probes. Respond succinctly."},
            {"role": "user", "content": custom_prompt}
        ]

        logger.info(f"[LLMDiagnosticRunner] Sending probe to {endpoint_str} | Model: {model_str} | Key: {masked_key}")

        try:
            completion = await provider_inst.complete(
                messages=test_messages,
                temperature=0.0,
                max_tokens=20
            )
            latency_ms = round((time.time() - start_ts) * 1000.0, 2)
            content = (completion.content or "").strip()

            if not content:
                logger.error("[LLMDiagnosticRunner] LLM_STATUS = FAILED (Empty Content)")
                return LLMDiagnosticReport(
                    llm_status="FAILED",
                    provider=provider_inst.provider_name,
                    model=completion.model or model_str,
                    endpoint=endpoint_str,
                    api_key_masked=masked_key,
                    request_sent=True,
                    response_received=True,
                    latency_ms=latency_ms,
                    error_type="malformed_response",
                    error_reason="Provider returned HTTP 200 but message content was empty."
                )

            logger.info(f"[LLMDiagnosticRunner] LLM_STATUS = SUCCESS ({latency_ms:.1f}ms)")
            return LLMDiagnosticReport(
                llm_status="SUCCESS",
                provider=provider_inst.provider_name,
                model=completion.model or model_str,
                endpoint=endpoint_str,
                api_key_masked=masked_key,
                request_sent=True,
                response_received=True,
                latency_ms=latency_ms,
                generated_content=content
            )

        except LLMAuthenticationError as e:
            latency_ms = round((time.time() - start_ts) * 1000.0, 2)
            logger.error(f"[LLMDiagnosticRunner] LLM_STATUS = FAILED (Unauthorized): {e.message}")
            return LLMDiagnosticReport(
                llm_status="FAILED",
                provider=provider_str,
                model=model_str,
                endpoint=endpoint_str,
                api_key_masked=masked_key,
                request_sent=True,
                response_received=False,
                latency_ms=latency_ms,
                error_type="unauthorized",
                error_reason=f"Invalid API key or unauthorized credentials (HTTP 401/403): {e.message}"
            )

        except LLMTimeoutError as e:
            latency_ms = round((time.time() - start_ts) * 1000.0, 2)
            logger.error(f"[LLMDiagnosticRunner] LLM_STATUS = FAILED (Timeout): {e.message}")
            return LLMDiagnosticReport(
                llm_status="FAILED",
                provider=provider_str,
                model=model_str,
                endpoint=endpoint_str,
                api_key_masked=masked_key,
                request_sent=True,
                response_received=False,
                latency_ms=latency_ms,
                error_type="timeout",
                error_reason=f"API request timed out: {e.message}"
            )

        except LLMProviderUnavailableError as e:
            latency_ms = round((time.time() - start_ts) * 1000.0, 2)
            logger.error(f"[LLMDiagnosticRunner] LLM_STATUS = FAILED (Endpoint Unavailable): {e.message}")
            return LLMDiagnosticReport(
                llm_status="FAILED",
                provider=provider_str,
                model=model_str,
                endpoint=endpoint_str,
                api_key_masked=masked_key,
                request_sent=True,
                response_received=False,
                latency_ms=latency_ms,
                error_type="endpoint_unavailable",
                error_reason=f"Upstream endpoint unavailable or returned HTTP 502/503: {e.message}"
            )

        except LLMError as e:
            latency_ms = round((time.time() - start_ts) * 1000.0, 2)
            logger.error(f"[LLMDiagnosticRunner] LLM_STATUS = FAILED (Provider Error): {e.message}")
            return LLMDiagnosticReport(
                llm_status="FAILED",
                provider=provider_str,
                model=model_str,
                endpoint=endpoint_str,
                api_key_masked=masked_key,
                request_sent=True,
                response_received=False,
                latency_ms=latency_ms,
                error_type="provider_error",
                error_reason=f"LLM Provider execution error: {e.message}"
            )

        except Exception as e:
            latency_ms = round((time.time() - start_ts) * 1000.0, 2)
            logger.error(f"[LLMDiagnosticRunner] LLM_STATUS = FAILED (Unexpected Exception): {str(e)}")
            return LLMDiagnosticReport(
                llm_status="FAILED",
                provider=provider_str,
                model=model_str,
                endpoint=endpoint_str,
                api_key_masked=masked_key,
                request_sent=True,
                response_received=False,
                latency_ms=latency_ms,
                error_type="unexpected_exception",
                error_reason=f"Unexpected exception during LLM connectivity test: {str(e)}"
            )


llm_diagnostic_runner = LLMDiagnosticRunner()
