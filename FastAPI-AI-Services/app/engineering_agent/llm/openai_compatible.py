"""
OpenAI-Compatible LLM Provider Adapter for Engineering Agent.
Supports OpenAI, Groq, Together, Fireworks, Betopia, vLLM, Ollama, and any compatible proxy.
"""
import time
import asyncio
from typing import Dict, Any, List, Optional
import httpx

from app.engineering_agent.llm.base import (
    BaseAgentLLMProvider,
    LLMCompletionResponse,
    LLMUsage
)
from app.engineering_agent.llm.exceptions import (
    LLMAuthenticationError,
    LLMRateLimitError,
    LLMTimeoutError,
    LLMProviderUnavailableError,
    LLMResponseParsingError,
    LLMError
)
from app.utils.logger import logger

class OpenAICompatibleAgentProvider(BaseAgentLLMProvider):
    """
    Adapter for any OpenAI-compatible Chat Completions REST API.
    """

    @property
    def provider_name(self) -> str:
        return "openai_compatible"

    async def complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: Optional[int] = None,
        **kwargs: Any
    ) -> LLMCompletionResponse:
        """
        Execute completion with retries, timeout handling, and exception normalization.
        """
        endpoint = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        payload.update(kwargs)

        masked_key = self.mask_secret(self.api_key)
        logger.info(
            f"[OpenAICompatibleProvider] Calling {endpoint} | Model: '{self.model}' | Key: {masked_key}"
        )

        attempts = 0
        last_error: Optional[Exception] = None

        while attempts <= self.max_retries:
            attempts += 1
            start_ts = time.time()
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    res = await client.post(endpoint, json=payload, headers=headers)
                    duration_ms = (time.time() - start_ts) * 1000.0

                    if res.status_code == 200:
                        data = res.json()
                        choices = data.get("choices", [])
                        if not choices:
                            raise LLMResponseParsingError("Provider returned empty choices array", raw_response=data)

                        message_obj = choices[0].get("message", {})
                        content = message_obj.get("content", "")

                        usage_dict = data.get("usage", {})
                        usage = LLMUsage(
                            prompt_tokens=usage_dict.get("prompt_tokens", 0),
                            completion_tokens=usage_dict.get("completion_tokens", 0),
                            total_tokens=usage_dict.get("total_tokens", 0)
                        ) if usage_dict else None

                        logger.info(f"[OpenAICompatibleProvider] Response received in {duration_ms:.1f}ms")
                        return LLMCompletionResponse(
                            content=content,
                            model=data.get("model", self.model),
                            provider=self.provider_name,
                            latency_ms=round(duration_ms, 2),
                            usage=usage,
                            metadata={"finish_reason": choices[0].get("finish_reason")}
                        )

                    elif res.status_code in (401, 403):
                        raise LLMAuthenticationError(
                            f"Authentication failed (HTTP {res.status_code}): Invalid or unauthorized API key.",
                            raw_response=res.text
                        )
                    elif res.status_code == 429:
                        if attempts <= self.max_retries:
                            await asyncio.sleep(1.0 * attempts)
                            continue
                        raise LLMRateLimitError(
                            "LLM provider rate limit exceeded (HTTP 429).",
                            raw_response=res.text
                        )
                    elif res.status_code in (502, 503, 504):
                        if attempts <= self.max_retries:
                            await asyncio.sleep(1.0 * attempts)
                            continue
                        raise LLMProviderUnavailableError(
                            f"LLM provider service error (HTTP {res.status_code}).",
                            raw_response=res.text
                        )
                    else:
                        raise LLMError(
                            f"Unexpected provider error (HTTP {res.status_code}): {res.text[:200]}",
                            status_code=res.status_code,
                            raw_response=res.text
                        )

            except httpx.TimeoutException as e:
                last_error = LLMTimeoutError(f"LLM request timed out after {self.timeout}s: {str(e)}")
                if attempts <= self.max_retries:
                    logger.warning(f"[OpenAICompatibleProvider] Timeout on attempt {attempts}/{self.max_retries + 1}. Retrying...")
                    await asyncio.sleep(1.0 * attempts)
                    continue
                raise last_error

            except httpx.RequestError as e:
                last_error = LLMProviderUnavailableError(f"Network connection error to provider: {str(e)}")
                if attempts <= self.max_retries:
                    logger.warning(f"[OpenAICompatibleProvider] Network error on attempt {attempts}/{self.max_retries + 1}. Retrying...")
                    await asyncio.sleep(1.0 * attempts)
                    continue
                raise last_error

        if last_error:
            raise last_error
        raise LLMError("Exhausted retries without a valid response from provider.")

    async def test_connection(self) -> Dict[str, Any]:
        """Ping provider with a minimal test message."""
        test_messages = [{"role": "user", "content": "ping"}]
        res = await self.complete(messages=test_messages, max_tokens=5)
        return {
            "success": True,
            "provider": self.provider_name,
            "model": res.model,
            "latency_ms": res.latency_ms
        }
