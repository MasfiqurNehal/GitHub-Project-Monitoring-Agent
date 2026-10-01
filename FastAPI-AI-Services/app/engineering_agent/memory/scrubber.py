"""
Secret & Credential Scrubber for Engineering Agent Memory.
Ensures zero storage of private keys, GitHub PATs, JWTs, or passwords in conversation memory.
"""
import re
from typing import Optional


class SecretScrubber:
    """Sanitizes text and metadata to prevent persistent storage of sensitive secrets."""

    SECRET_PATTERNS = [
        # GitHub Personal Access Tokens (classic & fine-grained)
        (r"ghp_[a-zA-Z0-9]{15,50}", "[REDACTED_GITHUB_PAT]"),
        (r"gho_[a-zA-Z0-9]{15,50}", "[REDACTED_GITHUB_OAUTH]"),
        (r"github_pat_[a-zA-Z0-9_]{20,100}", "[REDACTED_GITHUB_FINE_GRAINED_PAT]"),
        (r"ghs_[a-zA-Z0-9]{15,50}", "[REDACTED_GITHUB_SERVER_TOKEN]"),
        (r"ghr_[a-zA-Z0-9]{15,50}", "[REDACTED_GITHUB_REFRESH_TOKEN]"),
        
        # PEM Private Keys (RSA, EC, OpenSSH)
        (r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----", "[REDACTED_PRIVATE_KEY]"),
        
        # JWT / Bearer Tokens
        (r"Bearer\s+eyJ[a-zA-Z0-9_\-\.]+", "Bearer [REDACTED_JWT]"),
        (r"\beyJ[a-zA-Z0-9_\-]{20,}\.eyJ[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}\b", "[REDACTED_JWT]"),
        
        # Generic API keys & Passwords
        (r"(?i)(?:api_key|apikey|secret_key|private_key|client_secret|password)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-]{16,})['\"]?", "api_key=[REDACTED_SECRET]"),
        (r"(?i)(?:sk_live_|sk_test_|pk_live_|pk_test_)[a-zA-Z0-9]{24,}", "[REDACTED_API_KEY]"),
        (r"\b(?:sk-|sk-proj-)[a-zA-Z0-9_\-]{15,}\b", "[REDACTED_API_KEY]"),
    ]

    def scrub(self, text: Optional[str]) -> str:
        """Removes all recognized secret patterns from text."""
        if not text:
            return ""
        
        sanitized = text
        for pattern, replacement in self.SECRET_PATTERNS:
            sanitized = re.sub(pattern, replacement, sanitized)
        return sanitized


secret_scrubber = SecretScrubber()
