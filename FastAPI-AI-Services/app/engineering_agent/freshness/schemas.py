"""
Data Freshness Schemas and Metadata Models for Engineering AI Agent.
Enforces intelligent tiering between Historical Analytics, Recent Synchronized Data, and Live GitHub Data.
"""
from enum import Enum
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class FreshnessTier(str, Enum):
    """Data Freshness Classification Tiers."""
    HISTORICAL = "historical"        # Long-term / historical metrics (e.g., last month, last year, past 90d) -> Neon Synced DB
    RECENT_SYNC = "recent_sync"      # Standard application dashboard & workspace telemetry -> Neon DB + Sync Freshness
    LIVE_CURRENT = "live_current"    # Explicit current / real-time queries (e.g., today, last 5 mins, latest commit, open PRs) -> GitHub Live Read / Recent Stream


class DataSourceType(str, Enum):
    """Authoritative Data Storage & Query Source."""
    NEON_SYNCED_DB = "neon_synced_db"
    NEON_SYNC_METRICS = "neon_sync_metrics"
    LIVE_GITHUB_READ_API = "live_github_read_api"
    GITHUB_ACTIVITY_STREAM = "github_activity_stream"


class FreshnessMetadata(BaseModel):
    """Metadata detailing data freshness, timestamps, source attribution, and validity."""
    tier: FreshnessTier = Field(..., description="Classified freshness tier")
    source_type: DataSourceType = Field(..., description="Authoritative data store queried")
    source_label: str = Field(..., description="Human-readable attribution label (e.g. 'Neon Synced DB', 'Live GitHub Read API')")
    as_of: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        description="Timestamp when the data was retrieved or evaluated"
    )
    last_synced_at: Optional[str] = Field(None, description="ISO timestamp of last successful background sync")
    age_seconds: Optional[int] = Field(None, description="Elapsed seconds since last synchronization if known")
    is_live_requested: bool = Field(False, description="Whether the user explicitly requested live/real-time information")
    is_stale: bool = Field(False, description="Flag indicating if the underlying cache/sync is stale for the query intent")
    freshness_note: Optional[str] = Field(None, description="Concise user-facing or audit note explaining data source provenance")


class FreshnessEvaluation(BaseModel):
    """Result of evaluating a specific query against repository or entity sync state."""
    tier: FreshnessTier
    freshness_metadata: FreshnessMetadata
    recommended_tools: List[str] = Field(default_factory=list, description="Tools best suited for the freshness requirement")
    force_fresh: bool = Field(False, description="Whether tools should prioritize real-time/latest records")
    staleness_warning: Optional[str] = Field(None, description="Warning if data might lag behind GitHub upstream")
