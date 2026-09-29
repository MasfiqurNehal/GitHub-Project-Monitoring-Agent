"""
Freshness Evaluator & Response Annotator for Engineering AI Agent.
Coordinates freshness evaluation across specialist agents, ensuring data transparency and zero database mutation during live reads.
"""
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from app.engineering_agent.freshness.schemas import (
    FreshnessTier,
    DataSourceType,
    FreshnessMetadata,
    FreshnessEvaluation
)
from app.engineering_agent.freshness.policy import data_freshness_policy
from app.engineering_agent.router.schemas import IntentCategory, ExtractedEntities
from app.utils.logger import logger


class FreshnessEvaluator:
    """
    Evaluator that determines data freshness requirements for an agent execution
    and generates clear, transparent data provenance annotations for end users.
    """

    def evaluate_request(
        self,
        user_message: str,
        intent: Optional[IntentCategory] = None,
        entities: Optional[ExtractedEntities] = None,
        last_synced_at: Optional[str] = None
    ) -> FreshnessEvaluation:
        """
        Evaluate user request to produce a comprehensive FreshnessEvaluation.
        """
        # 1. Classify initial tier from query and entities
        initial_meta = data_freshness_policy.classify_query_freshness(
            query=user_message,
            intent=intent,
            entities=entities
        )

        # 2. Adjust with repository/sync timestamp if available
        if last_synced_at:
            meta = data_freshness_policy.evaluate_sync_timestamp(
                last_synced_at=last_synced_at,
                tier=initial_meta.tier
            )
        else:
            meta = initial_meta

        # 3. Formulate recommended tools & execution flags
        recommended_tools: List[str] = []
        force_fresh = False
        staleness_warning: Optional[str] = None

        if meta.tier == FreshnessTier.LIVE_CURRENT:
            force_fresh = True
            recommended_tools = [
                "get_developer_activity",
                "get_repository_commits",
                "get_repository_pull_requests",
                "get_repository_issues"
            ]
            if meta.is_stale:
                staleness_warning = "Note: Retrieving live stream to ensure up-to-the-minute accuracy."
        elif meta.tier == FreshnessTier.HISTORICAL:
            recommended_tools = [
                "get_project_statistics",
                "get_code_impact",
                "get_developer_commit_statistics",
                "get_dashboard_analytics"
            ]
        else: # RECENT_SYNC
            recommended_tools = [
                "get_dashboard_analytics",
                "get_project_statistics",
                "list_repositories"
            ]

        logger.info(
            f"[FreshnessEvaluator] Query classified as '{meta.tier.value}' | "
            f"Source: '{meta.source_label}' | Force Fresh: {force_fresh}"
        )

        return FreshnessEvaluation(
            tier=meta.tier,
            freshness_metadata=meta,
            recommended_tools=recommended_tools,
            force_fresh=force_fresh,
            staleness_warning=staleness_warning
        )

    def format_provenance_footnote(self, metadata: FreshnessMetadata) -> str:
        """
        Generate a concise, user-friendly markdown provenance footer.
        Avoids internal chain-of-thought while maintaining complete data transparency.
        """
        if metadata.tier == FreshnessTier.LIVE_CURRENT:
            return f"\n\n---\n*Data Source: **{metadata.source_label}** (Retrieved live at {metadata.as_of})*"
        elif metadata.tier == FreshnessTier.HISTORICAL:
            return f"\n\n---\n*Data Source: **{metadata.source_label}** (Historical analytics baseline as of {metadata.as_of})*"
        else:
            sync_info = f", last sync: {metadata.last_synced_at}" if metadata.last_synced_at else ""
            return f"\n\n---\n*Data Source: **{metadata.source_label}** (As of {metadata.as_of}{sync_info})*"


freshness_evaluator = FreshnessEvaluator()
