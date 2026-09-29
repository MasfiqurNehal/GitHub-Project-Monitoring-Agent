"""
Anthropic Claude Native REST LLM Provider Adapter for Engineering Agent.
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

class AnthropicAgentProvider(BaseAgentLLMProvider):
    """
    Native adapter for Anthropic Messages API.
    """

    @property
    def provider_name(self) -> str:
        return "anthropic"

    async def complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: Optional[int] = None,
        **kwargs: Any
    ) -> LLMCompletionResponse:
        base_url = self.base_url or "https://api.anthropic.com"
        endpoint = f"{base_url.rstrip('/')}/v1/messages"
        model_name = self.model or "claude-3-5-sonnet-20240620"
        max_tok = max_tokens or 4096

        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01"
        }

        system_prompt = ""
        anthropic_messages = []
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role == "system":
                system_prompt += content + "\n"
            else:
                anthropic_messages.append({"role": role, "content": content})

        payload: Dict[str, Any] = {
            "model": model_name,
            "messages": anthropic_messages,
            "max_tokens": max_tok,
            "temperature": temperature
        }
        if system_prompt.strip():
            payload["system"] = system_prompt.strip()

        masked_key = self.mask_secret(self.api_key)
        logger.info(
            f"[AnthropicAgentProvider] Calling Anthropic API | Model: '{model_name}' | Key: {masked_key}"
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
                        content_blocks = data.get("content", [])
                        text_content = "".join([b.get("text", "") for b in content_blocks if b.get("type") == "text"])

                        usage_dict = data.get("usage", {})
                        usage = LLMUsage(
                            prompt_tokens=usage_dict.get("input_tokens", 0),
                            completion_tokens=usage_dict.get("output_tokens", 0),
                            total_tokens=usage_dict.get("input_tokens", 0) + usage_dict.get("output_tokens", 0)
                        ) if usage_dict else None

                        return LLMCompletionResponse(
                            content=text_content,
                            model=data.get("model", model_name),
                            provider=self.provider_name,
                            latency_ms=round(duration_ms, 2),
                            usage=usage
                        )

                    elif res.status_code in (401, 403):
                        raise LLMAuthenticationError(
                            f"Anthropic authentication failed (HTTP {res.status_code}): {res.text[:200]}",
                            raw_response=res.text
                        )
                    elif res.status_code == 429:
                        if attempts <= self.max_retries:
                            await asyncio.sleep(1.0 * attempts)
                            continue
                        raise LLMRateLimitError("Anthropic rate limit exceeded.", raw_response=res.text)
                    elif res.status_code in (500, 503):
                        if attempts <= self.max_retries:
                            await asyncio.sleep(1.0 * attempts)
                            continue
                        raise LLMProviderUnavailableError(f"Anthropic service error (HTTP {res.status_code}).", raw_response=res.text)
                    else:
                        raise LLMError(f"Anthropic error (HTTP {res.status_code}): {res.text[:200]}", status_code=res.status_code)

            except httpx.TimeoutException as e:
                last_error = LLMTimeoutError(f"Anthropic request timed out: {str(e)}")
                if attempts <= self.max_retries:
                    await asyncio.sleep(1.0 * attempts)
                    continue
                raise last_error

            except httpx.RequestError as e:
                last_error = LLMProviderUnavailableError(f"Anthropic network error: {str(e)}")
                if attempts <= self.max_retries:
                    await asyncio.sleep(1.0 * attempts)
                    continue
                raise last_error

        if last_error:
            raise last_error
        raise LLMError("Exhausted retries calling Anthropic.")

    async def test_connection(self) -> Dict[str, Any]:
        res = await self.complete(messages=[{"role": "user", "content": "ping"}], max_tokens=5)
        return {
            "success": True,
            "provider": self.provider_name,
            "model": res.model,
            "latency_ms": res.latency_ms
        }
