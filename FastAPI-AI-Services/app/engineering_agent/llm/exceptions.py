"""
Normalized Exceptions for Engineering Agent LLM Providers.
"""
from typing import Optional, Any

class LLMError(Exception):
    """Base exception for all Engineering Agent LLM Provider errors."""
    def __init__(self, message: str, status_code: int = 500, raw_response: Optional[Any] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.raw_response = raw_response

class LLMConfigurationError(LLMError):
    """Raised when Engineering Agent LLM configuration is missing or invalid."""
    def __init__(self, message: str):
        super().__init__(message=message, status_code=500)

class LLMAuthenticationError(LLMError):
    """Raised on 401/403 provider authentication failures."""
    def __init__(self, message: str, raw_response: Optional[Any] = None):
        super().__init__(message=message, status_code=401, raw_response=raw_response)

class LLMRateLimitError(LLMError):
    """Raised on 429 rate limit errors."""
    def __init__(self, message: str, raw_response: Optional[Any] = None):
        super().__init__(message=message, status_code=429, raw_response=raw_response)

class LLMTimeoutError(LLMError):
    """Raised when an LLM provider request times out."""
    def __init__(self, message: str):
        super().__init__(message=message, status_code=504)

class LLMProviderUnavailableError(LLMError):
    """Raised on 502/503 or network connectivity errors to provider."""
    def __init__(self, message: str, raw_response: Optional[Any] = None):
        super().__init__(message=message, status_code=503, raw_response=raw_response)

class LLMResponseParsingError(LLMError):
    """Raised when provider response cannot be parsed."""
    def __init__(self, message: str, raw_response: Optional[Any] = None):
        super().__init__(message=message, status_code=502, raw_response=raw_response)
