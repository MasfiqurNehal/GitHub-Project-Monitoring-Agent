"""
AI Provider Abstraction Layer

Provides a provider-independent interface for interacting with LLMs (Betopia, OpenAI, Gemini, Claude, Grok, etc.)
Configured dynamically via environment variables: AI_PROVIDER, AI_BASE_URL, AI_API_KEY, AI_MODEL.
"""
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import httpx

from app.config import settings
from app.utils.logger import logger

class AIProviderException(Exception):
    """Base exception for AI provider errors."""
    def __init__(self, message: str, status_code: int = 500, raw_response: Optional[Any] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.raw_response = raw_response


class BaseAIProvider(ABC):
    """Abstract Base Class for AI Providers."""
    
    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None
    ):
        self.base_url = (base_url or settings.AI_BASE_URL).rstrip("/")
        self.api_key = api_key or settings.AI_API_KEY
        self.model = model or settings.AI_MODEL
        self.timeout = timeout or settings.AI_TIMEOUT_SECONDS

    @abstractmethod
    async def generate_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Generate a chat completion response from the AI provider."""
        pass

    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """Test connection to the AI provider with a lightweight prompt."""
        pass


class OpenAICompatibleProvider(BaseAIProvider):
    """
    Generic Provider for OpenAI-compatible APIs (Betopia, OpenAI, Grok, Local vLLM/Ollama, etc.).
    Sends requests to {base_url}/chat/completions using standard Bearer authorization.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
        provider_name: str = "OpenAI-Compatible"
    ):
        super().__init__(base_url, api_key, model, timeout)
        self.provider_name = provider_name

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def generate_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs: Any
    ) -> Dict[str, Any]:
        endpoint = f"{self.base_url}/chat/completions"
        
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
            
        payload.update(kwargs)

        logger.info(
            f"[{self.provider_name}] Sending chat request to endpoint: {endpoint} "
            f"(Model: '{self.model}')"
        )

        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    endpoint,
                    headers=self._get_headers(),
                    json=payload
                )

            elapsed_ms = round((time.time() - start_time) * 1000, 2)

            if response.status_code != 200:
                error_body = response.text
                logger.error(
                    f"[{self.provider_name}] API Error ({response.status_code}): {error_body}"
                )
                raise AIProviderException(
                    message=f"{self.provider_name} API returned error status {response.status_code}: {error_body[:200]}",
                    status_code=response.status_code,
                    raw_response=error_body
                )

            data = response.json()
            logger.info(f"[{self.provider_name}] Success in {elapsed_ms}ms")

            # Extract response content standard format
            choices = data.get("choices", [])
            answer = ""
            if choices:
                message = choices[0].get("message", {})
                answer = message.get("content", "")

            usage = data.get("usage", {})
            return {
                "answer": answer,
                "model": data.get("model", self.model),
                "provider": self.provider_name.lower(),
                "usage": usage,
                "raw_response": data,
                "latency_ms": elapsed_ms
            }

        except httpx.TimeoutException as exc:
            logger.error(f"[{self.provider_name}] Timeout after {self.timeout}s: {exc}")
            raise AIProviderException(
                message=f"{self.provider_name} request timed out after {self.timeout} seconds",
                status_code=504
            )
        except httpx.RequestError as exc:
            logger.error(f"[{self.provider_name}] Network request error: {exc}")
            raise AIProviderException(
                message=f"{self.provider_name} connection failed: {str(exc)}",
                status_code=502
            )

    async def test_connection(self) -> Dict[str, Any]:
        """Test provider connectivity with a minimal test message."""
        test_messages = [{"role": "user", "content": "Ping"}]
        try:
            res = await self.generate_completion(messages=test_messages, max_tokens=5)
            return {
                "status": "ok",
                "provider": self.provider_name.lower(),
                "model": res.get("model"),
                "latency_ms": res.get("latency_ms")
            }
        except Exception as err:
            return {
                "status": "error",
                "provider": self.provider_name.lower(),
                "error": str(err)
            }


class BetopiaAIProvider(OpenAICompatibleProvider):
    """
    Betopia AI Provider implementation.
    Inherits OpenAICompatibleProvider with Betopia specific defaults & error handling.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None
    ):
        super().__init__(
            base_url=base_url or settings.AI_BASE_URL,
            api_key=api_key or settings.AI_API_KEY,
            model=model or settings.AI_MODEL,
            timeout=timeout or settings.AI_TIMEOUT_SECONDS,
            provider_name="BetopiaAI"
        )


class GeminiAIProvider(BaseAIProvider):
    """Placeholder adapter for Native Google Gemini API."""

    async def generate_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs: Any
    ) -> Dict[str, Any]:
        # Native Gemini REST / SDK adapter placeholder
        return {
            "answer": "Gemini native provider adapter placeholder response",
            "model": self.model or "gemini-1.5-flash",
            "provider": "gemini",
            "usage": {},
            "latency_ms": 0.0
        }

    async def test_connection(self) -> Dict[str, Any]:
        return {"status": "ok", "provider": "gemini"}


class ClaudeAIProvider(BaseAIProvider):
    """Placeholder adapter for Anthropic Claude API."""

    async def generate_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs: Any
    ) -> Dict[str, Any]:
        return {
            "answer": "Claude provider adapter placeholder response",
            "model": self.model or "claude-3-5-sonnet",
            "provider": "claude",
            "usage": {},
            "latency_ms": 0.0
        }

    async def test_connection(self) -> Dict[str, Any]:
        return {"status": "ok", "provider": "claude"}


class AIProviderFactory:
    """Factory to create provider instances dynamically based on configuration."""

    @staticmethod
    def get_provider(
        provider_name: Optional[str] = None,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None
    ) -> BaseAIProvider:
        target_provider = (provider_name or settings.AI_PROVIDER).lower()

        logger.info(f"Instantiating AI Provider: '{target_provider}'")

        if target_provider in ["betopia", "betopia_ai"]:
            return BetopiaAIProvider(
                base_url=base_url,
                api_key=api_key,
                model=model,
                timeout=timeout
            )
        elif target_provider in ["openai", "openai_compatible", "grok"]:
            return OpenAICompatibleProvider(
                base_url=base_url,
                api_key=api_key,
                model=model,
                timeout=timeout,
                provider_name=target_provider.upper()
            )
        elif target_provider == "gemini":
            return GeminiAIProvider(
                base_url=base_url,
                api_key=api_key,
                model=model,
                timeout=timeout
            )
        elif target_provider == "claude":
            return ClaudeAIProvider(
                base_url=base_url,
                api_key=api_key,
                model=model,
                timeout=timeout
            )
        else:
            logger.warning(
                f"Unknown AI_PROVIDER '{target_provider}'. Falling back to OpenAICompatibleProvider."
            )
            return OpenAICompatibleProvider(
                base_url=base_url,
                api_key=api_key,
                model=model,
                timeout=timeout,
                provider_name=target_provider
            )


# Default singleton instance bound to application settings
ai_provider = AIProviderFactory.get_provider()
