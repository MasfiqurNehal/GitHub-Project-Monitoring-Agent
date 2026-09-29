"""
LLM Provider Factory for Engineering AI Agent.
Enforces strict environment-driven configuration and complete separation from chatbot settings.
"""
from typing import Dict, Type, Optional

from app.config import settings
from app.engineering_agent.llm.base import BaseAgentLLMProvider
from app.engineering_agent.llm.exceptions import LLMConfigurationError
from app.engineering_agent.llm.openai_compatible import OpenAICompatibleAgentProvider
from app.engineering_agent.llm.gemini_provider import GeminiAgentProvider
from app.engineering_agent.llm.anthropic_provider import AnthropicAgentProvider
from app.utils.logger import logger

class AgentLLMProviderFactory:
    """
    Factory for instantiating and caching Engineering Agent LLM provider adapters.
    """

    _registry: Dict[str, Type[BaseAgentLLMProvider]] = {
        "openai_compatible": OpenAICompatibleAgentProvider,
        "openai": OpenAICompatibleAgentProvider,
        "betopia": OpenAICompatibleAgentProvider,
        "groq": OpenAICompatibleAgentProvider,
        "together": OpenAICompatibleAgentProvider,
        "fireworks": OpenAICompatibleAgentProvider,
        "vllm": OpenAICompatibleAgentProvider,
        "ollama": OpenAICompatibleAgentProvider,
        "gemini": GeminiAgentProvider,
        "anthropic": AnthropicAgentProvider,
    }

    @classmethod
    def register_provider(cls, name: str, provider_cls: Type[BaseAgentLLMProvider]) -> None:
        """Register a new LLM provider adapter dynamically."""
        cls._registry[name.lower().strip()] = provider_cls
        logger.info(f"[AgentLLMProviderFactory] Registered custom provider adapter: '{name}'")

    @classmethod
    def get_provider(
        cls,
        provider_name: Optional[str] = None,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
        max_retries: Optional[int] = None
    ) -> BaseAgentLLMProvider:
        """
        Instantiate the configured Engineering Agent LLM provider.
        Enforces strict environment validation with zero fallback to chatbot credentials.
        """
        raw_provider = (
            provider_name
            if provider_name is not None
            else settings.ENGINEERING_AGENT_LLM_PROVIDER
        )
        norm_provider = (raw_provider or "").lower().strip()

        if not norm_provider:
            raise LLMConfigurationError(
                "Engineering Agent LLM configuration is incomplete. "
                "Missing environment variable: ENGINEERING_AGENT_LLM_PROVIDER. "
                "(Note: Engineering Agent does not fall back to chatbot AI_PROVIDER configuration)."
            )

        provider_cls = cls._registry.get(norm_provider)
        if not provider_cls:
            supported = ", ".join(sorted(set(cls._registry.keys())))
            raise LLMConfigurationError(
                f"Unsupported Engineering Agent LLM provider '{raw_provider}'. "
                f"Supported providers: [{supported}]."
            )

        # Resolve credentials strictly from ENGINEERING_AGENT_LLM_*
        cfg_api_key = (
            api_key
            if api_key is not None
            else settings.ENGINEERING_AGENT_LLM_API_KEY
        )
        if not cfg_api_key or not cfg_api_key.strip():
            raise LLMConfigurationError(
                "Engineering Agent LLM configuration is incomplete. "
                "Missing environment variable: ENGINEERING_AGENT_LLM_API_KEY. "
                "(Note: Engineering Agent does not fall back to chatbot AI_API_KEY configuration)."
            )

        cfg_base_url = (
            base_url
            if base_url is not None
            else settings.ENGINEERING_AGENT_LLM_BASE_URL
        )

        cfg_model = (
            model
            if model is not None
            else settings.ENGINEERING_AGENT_LLM_MODEL
        ) or "default"

        cfg_timeout = (
            timeout
            if timeout is not None
            else settings.ENGINEERING_AGENT_LLM_TIMEOUT
        )

        cfg_retries = (
            max_retries
            if max_retries is not None
            else settings.ENGINEERING_AGENT_LLM_MAX_RETRIES
        )

        return provider_cls(
            base_url=cfg_base_url,
            api_key=cfg_api_key,
            model=cfg_model,
            timeout=cfg_timeout,
            max_retries=cfg_retries
        )

agent_llm_factory = AgentLLMProviderFactory()
