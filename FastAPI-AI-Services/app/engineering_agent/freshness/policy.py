"""
Data Freshness Policy Engine for Engineering AI Agent.
Determines whether user requests should be served from:
1. Historical Neon database store (e.g. 'last month', 'in 2025')
2. Recent synchronized Neon database + sync freshness check (e.g. 'dashboard overview', 'weekly velocity')
3. Live GitHub read API / real-time activity stream (e.g. 'today', 'last 5 minutes', 'latest commit', 'current open PRs')
"""
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from app.engineering_agent.freshness.schemas import (
    FreshnessTier,
    DataSourceType,
    FreshnessMetadata,
    FreshnessEvaluation
)
from app.engineering_agent.router.schemas import IntentCategory, ExtractedEntities
from app.utils.logger import logger


# Explicit Real-Time / Live regex triggers
LIVE_CURRENT_PATTERNS = [
    r"\b(today|today's|todays)\b",
    r"\b(right\s+now|just\s+now|at\s+the\s+moment|currently|current)\b",
    r"\b(last\s+5\s+min(?:ute)?s?|5\s+mins?|last\s+10\s+mins?|last\s+hour|past\s+hour)\b",
    r"\b(latest\s+commit|latest\s+pr|latest\s+pull\s+request|latest\s+push|latest\s+activity)\b",
    r"\b(most\s+recent\s+commit|most\s+recent\s+pr|most\s+recent\s+activity)\b",
    r"\b(current\s+open\s+prs?|current\s+number\s+of\s+open|open\s+prs?\s+right\s+now|open\s+issues?\s+right\s+now)\b",
    r"\b(live|realtime|real-time|real\s+time)\b",
    r"\b(who\s+is\s+working|who\s+committed\s+in\s+the\s+last)\b",
]

# Explicit Historical regex triggers
HISTORICAL_PATTERNS = [
    r"\b(last\s+month|previous\s+month|past\s+month)\b",
    r"\b(last\s+year|previous\s+year|past\s+year)\b",
    r"\b(last\s+quarter|previous\s+quarter|q1|q2|q3|q4)\b",
    r"\b(past\s+30\s+days?|past\s+60\s+days?|past\s+90\s+days?|past\s+180\s+days?|past\s+365\s+days?)\b",
    r"\b(in\s+202[0-9]|in\s+201[0-9])\b",
    r"\b(historical|over\s+time|long\s+term|trend\s+over|historical\s+trend)\b",
    r"\b(all\s+time|alltime|lifetime|overall\s+history)\b",
]


class DataFreshnessPolicy:
    """
    Evaluates query intent, temporal entities, and repository sync timestamps to select
    the appropriate data source tier and ensure timely, authoritative responses.
    """

    # Freshness threshold limits in seconds
    LIVE_STALENESS_THRESHOLD_SECONDS = 300      # 5 minutes
    RECENT_SYNC_STALENESS_THRESHOLD_SECONDS = 86400  # 24 hours

    def classify_query_freshness(
        self,
        query: str,
        intent: Optional[IntentCategory] = None,
        entities: Optional[ExtractedEntities] = None
    ) -> FreshnessMetadata:
        """
        Classifies the incoming user query into one of three freshness tiers:
        - HISTORICAL: Historical analytics (e.g. 'last month') -> Neon DB
        - LIVE_CURRENT: Explicit real-time / current queries (e.g. 'today', 'latest commit') -> Live GitHub read
        - RECENT_SYNC: Standard dashboard & general analytics -> Neon DB + sync metadata
        """
        normalized = (query or "").lower().strip()
        timeframe_token = entities.timeframe.lower() if (entities and entities.timeframe) else ""

        # 1. Check for explicit Live / Current triggers
        is_live_match = any(re.search(pat, normalized, re.IGNORECASE) for pat in LIVE_CURRENT_PATTERNS)
        if is_live_match or timeframe_token in ("today", "live", "now"):
            return FreshnessMetadata(
                tier=FreshnessTier.LIVE_CURRENT,
                source_type=DataSourceType.LIVE_GITHUB_READ_API,
                source_label="Live GitHub Read API",
                is_live_requested=True,
                is_stale=False,
                freshness_note="Query explicitly targets real-time state (today/live/latest records). Authorized read-only GitHub stream used."
            )

        # 2. Check for explicit Historical triggers
        is_historical_match = any(re.search(pat, normalized, re.IGNORECASE) for pat in HISTORICAL_PATTERNS)
        if is_historical_match or timeframe_token in ("last_month", "last_year", "all", "historical"):
            return FreshnessMetadata(
                tier=FreshnessTier.HISTORICAL,
                source_type=DataSourceType.NEON_SYNCED_DB,
                source_label="Neon Synced DB (Historical Store)",
                is_live_requested=False,
                is_stale=False,
                freshness_note="Query targets historical analytics and trends. Served from authoritative Neon database store."
            )

        # 3. Default to Recent Synchronized Application Data
        return FreshnessMetadata(
            tier=FreshnessTier.RECENT_SYNC,
            source_type=DataSourceType.NEON_SYNC_METRICS,
            source_label="Neon Synced DB (Recent Sync)",
            is_live_requested=False,
            is_stale=False,
            freshness_note="Served from Neon database with background GitHub synchronization metadata."
        )

    def evaluate_sync_timestamp(
        self,
        last_synced_at: Optional[str],
        tier: FreshnessTier
    ) -> FreshnessMetadata:
        """
        Calculates data age from last_synced_at ISO timestamp and assesses whether
        the data satisfies the requested freshness tier.
        """
        now = datetime.now(timezone.utc)
        age_seconds: Optional[int] = None
        is_stale = False

        if last_synced_at:
            try:
                # Parse ISO timestamp
                clean_ts = last_synced_at.replace("Z", "+00:00")
                parsed_ts = datetime.fromisoformat(clean_ts)
                if parsed_ts.tzinfo is None:
                    parsed_ts = parsed_ts.replace(tzinfo=timezone.utc)
                age_seconds = max(0, int((now - parsed_ts).total_seconds()))
            except Exception as e:
                logger.warning(f"[DataFreshnessPolicy] Failed to parse last_synced_at '{last_synced_at}': {e}")

        # Check staleness based on tier
        if tier == FreshnessTier.LIVE_CURRENT:
            if age_seconds is None or age_seconds > self.LIVE_STALENESS_THRESHOLD_SECONDS:
                is_stale = True
            source_type = DataSourceType.LIVE_GITHUB_READ_API
            source_label = "Live GitHub Read API"
            freshness_note = f"Real-time query evaluated. Last background sync was {age_seconds}s ago." if age_seconds is not None else "Real-time query evaluated via live GitHub read API."
        elif tier == FreshnessTier.HISTORICAL:
            is_stale = False
            source_type = DataSourceType.NEON_SYNCED_DB
            source_label = "Neon Synced DB (Historical Store)"
            freshness_note = "Historical baseline data served from Neon DB."
        else: # RECENT_SYNC
            if age_seconds is not None and age_seconds > self.RECENT_SYNC_STALENESS_THRESHOLD_SECONDS:
                is_stale = True
            source_type = DataSourceType.NEON_SYNC_METRICS
            source_label = "Neon Synced DB (Recent Sync)"
            freshness_note = f"Synchronized application data (last synced {age_seconds // 60 if age_seconds else '?'} mins ago)."

        return FreshnessMetadata(
            tier=tier,
            source_type=source_type,
            source_label=source_label,
            as_of=now.strftime("%Y-%m-%d %H:%M:%S UTC"),
            last_synced_at=last_synced_at,
            age_seconds=age_seconds,
            is_live_requested=(tier == FreshnessTier.LIVE_CURRENT),
            is_stale=is_stale,
            freshness_note=freshness_note
        )


data_freshness_policy = DataFreshnessPolicy()
