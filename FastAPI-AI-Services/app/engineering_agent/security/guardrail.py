"""
Engineering AI Agent Security & Guardrails Engine (Phase 15).
Enforces:
  1. Prompt Injection & Jailbreak Defense
  2. Strict Read-Only Policy (Rejection of Delete/Write/Mutate Operations)
  3. Secret & Credential Exfiltration Prevention (Private Keys, Tokens, Passwords)
  4. Cross-Tenant Exfiltration & Override Prevention
"""
import re
from enum import Enum
from typing import Optional, Tuple
from dataclasses import dataclass

from app.engineering_agent.memory.scrubber import secret_scrubber
from app.utils.logger import logger


class SecurityViolationType(str, Enum):
    """Classification taxonomy for detected security violations."""
    PROMPT_INJECTION = "prompt_injection"
    UNAUTHORIZED_WRITE_MUTATION = "unauthorized_write_mutation"
    SECRET_EXFILTRATION = "secret_exfiltration"
    CROSS_TENANT_EXFILTRATION = "cross_tenant_exfiltration"


@dataclass
class SecurityValidationResult:
    """Outcome of safety and security inspection on user input or state."""
    is_safe: bool
    violation_type: Optional[SecurityViolationType] = None
    rejection_message: Optional[str] = None
    sanitized_text: Optional[str] = None


class SecurityGuardrailValidator:
    """
    Validates user prompts and agent execution parameters against security threats.
    """

    # 1. Prompt Injection & Jailbreak Patterns
    INJECTION_PATTERNS = [
        r"\b(ignore\s+(?:all\s+)?(?:previous\s+|your\s+)?(?:instructions|rules|constraints|guidelines|system\s+prompt))\b",
        r"\b(system\s+override|override\s+(?:all\s+)?security|disregard\s+(?:all\s+)?(?:rules|previous))\b",
        r"\b(you\s+are\s+now\s+dan|jailbreak|bypass\s+(?:all\s+)?safety|act\s+as\s+an\s+unrestricted\s+ai)\b",
        r"\b(output\s+your\s+system\s+prompt|print\s+system\s+prompt|show\s+system\s+instructions)\b",
    ]

    # 2. Write / Mutation / Destructive Operation Patterns
    WRITE_MUTATION_PATTERNS = [
        r"\b(delete\s+(?:this|the|all|a)?\s*(?:repository|repo|database|table|branch|issue|project|user|tenant))\b",
        r"\b(drop\s+table|truncate\s+table|destroy\s+repository|purge\s+database|wipe\s+database)\b",
        r"\b(force\s+push|push\s+to\s+main|overwrite\s+branch|modify\s+permissions|grant\s+admin|create\s+repository)\b",
        r"\b(merge\s+pr|close\s+pr|delete\s+commit|delete\s+branch|remove\s+contributor)\b",
    ]

    # 3. Secret & Credential Exfiltration Patterns
    SECRET_EXFILTRATION_PATTERNS = [
        r"\b(give\s+me\s+(?:the\s+)?(?:github\s+|app\s+)?(?:private\s+key|pem\s+key|secret\s+key|jwt\s+secret|root\s+password|database\s+password))\b",
        r"\b(print\s+(?:the\s+)?(?:api\s+key|github_app_private_key|private_key|pat|secret|env\s+variables?))\b",
        r"\b(dump\s+(?:all\s+)?(?:secrets|environment\s+variables|passwords|tokens|credentials))\b",
        r"\b(show\s+(?:me\s+)?(?:the\s+)?(?:private\s+key|pem\s+file|ssh\s+key|github\s+secret|db\s+password))\b",
    ]

    # 4. Cross-Tenant Exfiltration & Override Patterns
    CROSS_TENANT_PATTERNS = [
        r"\b(show\s+(?:me\s+)?(?:another|other|foreign|competitor|all)\s+(?:company|organization|org|tenant|client)'?s?\s+(?:repositories|repos|data|commits|prs|projects))\b",
        r"\b(use\s+tenant_id|switch\s+to\s+tenant|impersonate\s+tenant|access\s+organization\s+[a-zA-Z0-9_\-]+)\b",
        r"\b(list\s+all\s+tenants|show\s+all\s+organizations|dump\s+other\s+tenants)\b",
    ]

    def validate_prompt(self, prompt: str) -> SecurityValidationResult:
        """
        Inspect user prompt for security violations before execution.
        """
        norm = prompt.lower().strip()

        # 1. Check for Secret Exfiltration Attempts
        for pattern in self.SECRET_EXFILTRATION_PATTERNS:
            if re.search(pattern, norm, re.IGNORECASE):
                logger.warning(f"[SecurityGuardrail] Secret exfiltration attempt detected: '{prompt[:40]}...'")
                return SecurityValidationResult(
                    is_safe=False,
                    violation_type=SecurityViolationType.SECRET_EXFILTRATION,
                    rejection_message=(
                        "🔒 **Security Policy Violation:** Access to private keys, authentication secrets, "
                        "API tokens, and environment variables is strictly forbidden."
                    )
                )

        # 2. Check for Unauthorized Mutation / Write Attempts
        for pattern in self.WRITE_MUTATION_PATTERNS:
            if re.search(pattern, norm, re.IGNORECASE):
                logger.warning(f"[SecurityGuardrail] Write/mutation attempt detected: '{prompt[:40]}...'")
                return SecurityValidationResult(
                    is_safe=False,
                    violation_type=SecurityViolationType.UNAUTHORIZED_WRITE_MUTATION,
                    rejection_message=(
                        "🔒 **Security Policy Violation:** The GitMonitor AI Agent operates strictly in **READ-ONLY** mode. "
                        "Repository deletion, branch modification, and write operations are strictly prohibited."
                    )
                )

        # 3. Check for Cross-Tenant Exfiltration Attempts
        for pattern in self.CROSS_TENANT_PATTERNS:
            if re.search(pattern, norm, re.IGNORECASE):
                logger.warning(f"[SecurityGuardrail] Cross-tenant access attempt detected: '{prompt[:40]}...'")
                return SecurityValidationResult(
                    is_safe=False,
                    violation_type=SecurityViolationType.CROSS_TENANT_EXFILTRATION,
                    rejection_message=(
                        "🔒 **Security Policy Violation:** Cross-tenant access is strictly forbidden. "
                        "The agent operates exclusively within your authenticated organization context."
                    )
                )

        # 4. Check for Prompt Injection / Jailbreaks
        for pattern in self.INJECTION_PATTERNS:
            if re.search(pattern, norm, re.IGNORECASE):
                logger.warning(f"[SecurityGuardrail] Prompt injection attempt detected: '{prompt[:40]}...'")
                return SecurityValidationResult(
                    is_safe=False,
                    violation_type=SecurityViolationType.PROMPT_INJECTION,
                    rejection_message=(
                        "🔒 **Security Policy Violation:** System instruction override or safety bypass attempts are prohibited. "
                        "Please submit a valid software engineering or repository inquiry."
                    )
                )

        # 5. Sanitize text for any embedded secrets
        sanitized = secret_scrubber.scrub(prompt)

        return SecurityValidationResult(
            is_safe=True,
            sanitized_text=sanitized
        )


security_guardrail_validator = SecurityGuardrailValidator()
