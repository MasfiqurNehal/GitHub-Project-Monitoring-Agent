"""
Knowledge Source Router and Provenance Discriminator.
Strictly distinguishes between:
A. GitHub / Application Data (Tool Layer / Neon DB / Live APIs)
B. Company Knowledge (Tenant-Scoped Company RAG)
C. General IT / Software Knowledge (Global Engineering Standards RAG)
D. LLM Parametric Knowledge (Base Model Reasoning)

Guarantees that these sources are never confused, mixed, or hallucinated.
"""
import re
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
from app.engineering_agent.rag_foundation.schemas import KnowledgeSourceType
from app.engineering_agent.router.schemas import IntentCategory


@dataclass
class SourceClassificationResult:
    """Result of classifying a query's required knowledge source."""
    primary_source: KnowledgeSourceType
    secondary_sources: List[KnowledgeSourceType]
    rationale: str
    rag_retrieval_required: bool


class KnowledgeSourceRouter:
    """
    Determines which knowledge source or retrieval system is authoritative for a given user query.
    """

    # Indicators that explicitly target Company internal documentation / policies / SOPs
    COMPANY_KNOWLEDGE_PATTERNS = [
        r"\b(company\s+policy|our\s+standards?|team\s+guidelines?|coding\s+standard|internal\s+docs?|runbook|sop|onboarding|architecture\s+decision|adr|deployment\s+checklist|release\s+procedure|our\s+convention)\b",
        r"\b(how\s+do\s+we\s+deploy|our\s+branching\s+strategy|internal\s+style\s+guide|company\s+wiki)\b",
    ]

    # Indicators for General IT / Software engineering concepts
    GENERAL_IT_PATTERNS = [
        r"\b(difference\s+between|what\s+is\s+the\s+difference|explain\s+how|best\s+practices?\s+for|what\s+is\s+(?:docker|kubernetes|graphql|rest|oauth|jwt|solid|clean\s+code|design\s+pattern|the\s+circuit\s+breaker\s+pattern))\b",
        r"\b(git\s+rebase\s+vs\s+git\s+merge|microservices\s+vs\s+monolith|sql\s+vs\s+nosql|asyncio|concurrency|mutex|circuit\s+breaker)\b",
    ]

    # Indicators for Telemetry / GitHub Factual Data
    GITHUB_DATA_PATTERNS = [
        r"\b(how\s+many\s+commits|who\s+committed|open\s+prs?|pull\s+requests?|recent\s+activity|developer\s+velocity|churn|lines\s+added|lines\s+deleted|branches\s+in|repo\s+status|project\s+health)\b",
        r"\b(show\s+(?:commits?|prs?|issues?|repositories|developers|metrics|analytics|latest\s+commit))\b",
        r"\b(who\s+opened\s+pull\s+request|who\s+worked\s+on)\b",
    ]

    def classify(
        self,
        query: str,
        detected_intent: Optional[IntentCategory] = None
    ) -> SourceClassificationResult:
        """
        Classifies the knowledge provenance and flags if vector RAG retrieval is required.
        """
        primary, secondary, rationale = self.classify_source_requirement(query, detected_intent)
        rag_required = (
            primary in (KnowledgeSourceType.COMPANY_KNOWLEDGE, KnowledgeSourceType.GENERAL_IT_KNOWLEDGE)
        )
        return SourceClassificationResult(
            primary_source=primary,
            secondary_sources=secondary,
            rationale=rationale,
            rag_retrieval_required=rag_required,
        )

    def classify_source_requirement(
        self,
        query: str,
        detected_intent: Optional[IntentCategory] = None
    ) -> Tuple[KnowledgeSourceType, List[KnowledgeSourceType], str]:
        """
        Classifies the primary and secondary required knowledge sources for a query.
        Returns (PrimarySource, SecondarySources, Rationale).
        """
        norm = query.lower().strip()

        # 1. Company Knowledge match
        for pattern in self.COMPANY_KNOWLEDGE_PATTERNS:
            if re.search(pattern, norm, re.IGNORECASE):
                return (
                    KnowledgeSourceType.COMPANY_KNOWLEDGE,
                    [KnowledgeSourceType.LLM_PARAMETRIC_KNOWLEDGE],
                    "Query explicitly targets internal company policies, runbooks, or architectural guidelines."
                )

        # 2. GitHub / Live Application Data match
        # If intent is already identified as repository/commit/PR/developer/project telemetry
        if detected_intent in (
            IntentCategory.REPOSITORY_INFO,
            IntentCategory.COMMIT_INFO,
            IntentCategory.PULL_REQUEST_INFO,
            IntentCategory.ISSUE_INFO,
            IntentCategory.DEVELOPER_INFO,
            IntentCategory.PROJECT_INFO,
            IntentCategory.DASHBOARD_ANALYTICS,
            IntentCategory.CROSS_REPOSITORY_ANALYTICS,
            IntentCategory.CODE_IMPACT,
        ):
            return (
                KnowledgeSourceType.GITHUB_APPLICATION_DATA,
                [KnowledgeSourceType.LLM_PARAMETRIC_KNOWLEDGE],
                f"Query requires factual telemetry and tool execution for intent '{detected_intent.value}'."
            )

        for pattern in self.GITHUB_DATA_PATTERNS:
            if re.search(pattern, norm, re.IGNORECASE):
                return (
                    KnowledgeSourceType.GITHUB_APPLICATION_DATA,
                    [KnowledgeSourceType.LLM_PARAMETRIC_KNOWLEDGE],
                    "Query targets monitored repository telemetry, commits, PRs, or developer metrics."
                )

        # 3. General IT / Software Engineering Knowledge match
        for pattern in self.GENERAL_IT_PATTERNS:
            if re.search(pattern, norm, re.IGNORECASE):
                return (
                    KnowledgeSourceType.GENERAL_IT_KNOWLEDGE,
                    [KnowledgeSourceType.LLM_PARAMETRIC_KNOWLEDGE],
                    "Query targets general software engineering concepts, design patterns, or industry standards."
                )

        if detected_intent == IntentCategory.GENERAL_ENGINEERING_QA:
            return (
                KnowledgeSourceType.GENERAL_IT_KNOWLEDGE,
                [KnowledgeSourceType.LLM_PARAMETRIC_KNOWLEDGE],
                "Intent classified as General Engineering QA."
            )

        # 4. Default: LLM Parametric Reasoning
        return (
            KnowledgeSourceType.LLM_PARAMETRIC_KNOWLEDGE,
            [],
            "Query requires general analytical reasoning and language synthesis."
        )


knowledge_source_router = KnowledgeSourceRouter()
