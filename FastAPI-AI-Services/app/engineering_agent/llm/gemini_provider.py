"""
Google Gemini Native REST LLM Provider Adapter for Engineering Agent.
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

class GeminiAgentProvider(BaseAgentLLMProvider):
    """
    Native adapter for Google Gemini API via REST generateContent.
    """

    @property
    def provider_name(self) -> str:
        return "gemini"

    async def complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: Optional[int] = None,
        **kwargs: Any
    ) -> LLMCompletionResponse:
        base_url = self.base_url or "https://generativelanguage.googleapis.com"
        model_name = self.model or "gemini-1.5-flash"
        endpoint = f"{base_url.rstrip('/')}/v1beta/models/{model_name}:generateContent?key={self.api_key}"

        # Convert standard OpenAI message format to Gemini contents
        gemini_contents = []
        system_instruction_text = ""

        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            if role == "system":
                system_instruction_text += content + "\n"
            else:
                gemini_role = "model" if role in ("assistant", "model") else "user"
                gemini_contents.append({
                    "role": gemini_role,
                    "parts": [{"text": content}]
                })

        payload: Dict[str, Any] = {
            "contents": gemini_contents,
            "generationConfig": {
                "temperature": temperature
            }
        }
        if max_tokens:
            payload["generationConfig"]["maxOutputTokens"] = max_tokens
        if system_instruction_text.strip():
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction_text.strip()}]
            }

        masked_key = self.mask_secret(self.api_key)
        logger.info(
            f"[GeminiAgentProvider] Calling Gemini API | Model: '{model_name}' | Key: {masked_key}"
        )

        attempts = 0
        last_error: Optional[Exception] = None

        while attempts <= self.max_retries:
            attempts += 1
            start_ts = time.time()
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    res = await client.post(endpoint, json=payload, headers={"Content-Type": "application/json"})
                    duration_ms = (time.time() - start_ts) * 1000.0

                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if not candidates:
                            raise LLMResponseParsingError("Gemini returned empty candidates", raw_response=data)

                        first_cand = candidates[0]
                        parts = first_cand.get("content", {}).get("parts", [])
                        text_content = "".join([p.get("text", "") for p in parts])

                        usage_meta = data.get("usageMetadata", {})
                        usage = LLMUsage(
                            prompt_tokens=usage_meta.get("promptTokenCount", 0),
                            completion_tokens=usage_meta.get("candidatesTokenCount", 0),
                            total_tokens=usage_meta.get("totalTokenCount", 0)
                        ) if usage_meta else None

                        return LLMCompletionResponse(
                            content=text_content,
                            model=model_name,
                            provider=self.provider_name,
                            latency_ms=round(duration_ms, 2),
                            usage=usage
                        )

                    elif res.status_code in (400, 401, 403):
                        raise LLMAuthenticationError(
                            f"Gemini API authentication failed (HTTP {res.status_code}): {res.text[:200]}",
                            raw_response=res.text
                        )
                    elif res.status_code == 429:
                        if attempts <= self.max_retries:
                            await asyncio.sleep(1.0 * attempts)
                            continue
                        raise LLMRateLimitError("Gemini API rate limit exceeded.", raw_response=res.text)
                    elif res.status_code in (500, 503):
                        if attempts <= self.max_retries:
                            await asyncio.sleep(1.0 * attempts)
                            continue
                        raise LLMProviderUnavailableError(f"Gemini API service error (HTTP {res.status_code}).", raw_response=res.text)
                    else:
                        raise LLMError(f"Gemini API error (HTTP {res.status_code}): {res.text[:200]}", status_code=res.status_code)

            except httpx.TimeoutException as e:
                last_error = LLMTimeoutError(f"Gemini request timed out: {str(e)}")
                if attempts <= self.max_retries:
                    await asyncio.sleep(1.0 * attempts)
                    continue
                raise last_error

            except httpx.RequestError as e:
                last_error = LLMProviderUnavailableError(f"Gemini network error: {str(e)}")
                if attempts <= self.max_retries:
                    await asyncio.sleep(1.0 * attempts)
                    continue
                raise last_error

        if last_error:
            raise last_error
        raise LLMError("Exhausted retries calling Gemini.")

    async def test_connection(self) -> Dict[str, Any]:
        res = await self.complete(messages=[{"role": "user", "content": "ping"}], max_tokens=5)
        return {
            "success": True,
            "provider": self.provider_name,
            "model": res.model,
            "latency_ms": res.latency_ms
        }
