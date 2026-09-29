"""
Base LLM Provider Interface & Normalized Response Data Models for Engineering Agent.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

@dataclass
class LLMMessage:
    """Standard message representation."""
    role: str
    content: str

@dataclass
class LLMUsage:
    """Token usage telemetry."""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

@dataclass
class LLMCompletionResponse:
    """Normalized response envelope returned by any provider adapter."""
    content: str
    model: str
    provider: str
    latency_ms: float
    usage: Optional[LLMUsage] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

class BaseAgentLLMProvider(ABC):
    """
    Abstract Base Class for Engineering Agent LLM Providers.
    Decouples the orchestrator completely from vendor SDKs and API quirks.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        timeout: float = 45.0,
        max_retries: int = 2
    ):
        self.base_url = (base_url or "").rstrip("/")
        self.api_key = api_key or ""
        self.model = model or ""
        self.timeout = timeout
        self.max_retries = max_retries

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider adapter."""
        pass

    @staticmethod
    def mask_secret(secret: Optional[str]) -> str:
        """Utility for safely logging API keys and secrets."""
        if not secret:
            return "<empty>"
        if len(secret) <= 8:
            return "***"
        return f"{secret[:3]}...{secret[-4:]}"

    @abstractmethod
    async def complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: Optional[int] = None,
        **kwargs: Any
    ) -> LLMCompletionResponse:
        """
        Execute chat completion against the provider and return a normalized LLMCompletionResponse.
        """
        pass

    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """Verify provider credentials and reachability with a test ping."""
        pass
