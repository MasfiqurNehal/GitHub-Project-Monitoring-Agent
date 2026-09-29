"""
Test Suite for Phase 8: Engineering Agent Data Freshness Strategy.
Validates intelligent tiering between Historical Analytics (Neon DB),
Recent Synchronized Telemetry, and Live GitHub Read API.
"""
import unittest
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from unittest.mock import AsyncMock, patch

from app.engineering_agent.freshness import (
    FreshnessTier,
    DataSourceType,
    FreshnessMetadata,
    data_freshness_policy,
    freshness_evaluator
)
from app.engineering_agent.router import engineering_intent_router
from app.engineering_agent.orchestration import compiled_engineering_graph, GraphState
from app.engineering_agent.tools import read_only_tool_registry


class TestPhase8DataFreshnessStrategy(unittest.TestCase):
    """Unit and integration tests for Phase 8 Data Freshness Strategy."""

    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    # =========================================================================
    # 1. Classification of Historical Queries
    # =========================================================================
    def test_historical_query_classification(self):
        """Historical queries ('last month', 'in 2024', 'past 90 days') must route to HISTORICAL tier."""
        historical_queries = [
            "How many commits did Nehal make last month?",
            "Show the commit activity for previous month",
            "What was our code churn in 2025?",
            "Show developer velocity over the past 90 days",
            "Give me the historical trend of pull requests for Nexora"
        ]

        for query in historical_queries:
            meta = data_freshness_policy.classify_query_freshness(query)
            self.assertEqual(
                meta.tier,
                FreshnessTier.HISTORICAL,
                f"Query '{query}' should be classified as HISTORICAL but got {meta.tier}"
            )
            self.assertEqual(meta.source_type, DataSourceType.NEON_SYNCED_DB)
            self.assertFalse(meta.is_live_requested)
            self.assertIn("Neon", meta.source_label)

    # =========================================================================
    # 2. Classification of Explicit Live / Real-Time Queries
    # =========================================================================
    def test_live_current_query_classification(self):
        """Explicit real-time queries ('today', 'last 5 minutes', 'latest commit', 'current open PRs') must route to LIVE_CURRENT tier."""
        live_queries = [
            "How many commits did Nehal make today?",
            "Who committed in the last 5 minutes?",
            "Show the latest commit.",
            "What's the current number of open PRs?",
            "Who is working right now?",
            "Show the latest pull request on main branch",
            "Are there any open issues right now?"
        ]

        for query in live_queries:
            meta = data_freshness_policy.classify_query_freshness(query)
            self.assertEqual(
                meta.tier,
                FreshnessTier.LIVE_CURRENT,
                f"Query '{query}' should be classified as LIVE_CURRENT but got {meta.tier}"
            )
            self.assertEqual(meta.source_type, DataSourceType.LIVE_GITHUB_READ_API)
            self.assertTrue(meta.is_live_requested)
            self.assertIn("Live GitHub", meta.source_label)

    # =========================================================================
    # 3. Classification of Dashboard & General Queries
    # =========================================================================
    def test_recent_sync_dashboard_classification(self):
        """General dashboard & team health queries must route to RECENT_SYNC tier."""
        dashboard_queries = [
            "Show dashboard overview",
            "Give me a workspace summary",
            "What is our team velocity?",
            "List monitored repositories"
        ]

        for query in dashboard_queries:
            meta = data_freshness_policy.classify_query_freshness(query)
            self.assertEqual(
                meta.tier,
                FreshnessTier.RECENT_SYNC,
                f"Query '{query}' should be classified as RECENT_SYNC but got {meta.tier}"
            )
            self.assertEqual(meta.source_type, DataSourceType.NEON_SYNC_METRICS)
            self.assertFalse(meta.is_live_requested)

    # =========================================================================
    # 4. Sync Timestamp Freshness & Staleness Calculation
    # =========================================================================
    def test_evaluate_sync_timestamp_fresh_vs_stale(self):
        """Test timestamp age calculation and stale flags."""
        now = datetime.now(timezone.utc)

        # 2 minutes old -> Fresh for LIVE_CURRENT (< 300s)
        fresh_ts = (now - timedelta(minutes=2)).isoformat()
        meta_fresh = data_freshness_policy.evaluate_sync_timestamp(fresh_ts, FreshnessTier.LIVE_CURRENT)
        self.assertFalse(meta_fresh.is_stale)
        self.assertIsNotNone(meta_fresh.age_seconds)
        self.assertLess(meta_fresh.age_seconds, 300)

        # 10 minutes old -> Stale for LIVE_CURRENT (> 300s)
        stale_live_ts = (now - timedelta(minutes=10)).isoformat()
        meta_stale_live = data_freshness_policy.evaluate_sync_timestamp(stale_live_ts, FreshnessTier.LIVE_CURRENT)
        self.assertTrue(meta_stale_live.is_stale)

        # 2 hours old -> Fresh for RECENT_SYNC (< 24h)
        recent_ts = (now - timedelta(hours=2)).isoformat()
        meta_recent = data_freshness_policy.evaluate_sync_timestamp(recent_ts, FreshnessTier.RECENT_SYNC)
        self.assertFalse(meta_recent.is_stale)

        # 30 days old -> Historical tier always serves authoritative baseline
        old_ts = (now - timedelta(days=30)).isoformat()
        meta_hist = data_freshness_policy.evaluate_sync_timestamp(old_ts, FreshnessTier.HISTORICAL)
        self.assertFalse(meta_hist.is_stale)
        self.assertEqual(meta_hist.source_type, DataSourceType.NEON_SYNCED_DB)

    # =========================================================================
    # 5. Freshness Evaluator Formulates Execution Directives
    # =========================================================================
    def test_freshness_evaluator_directives(self):
        """Verify freshness evaluator sets force_fresh flag and recommended tools."""
        eval_live = freshness_evaluator.evaluate_request(
            user_message="Show the latest commit made today"
        )
        self.assertEqual(eval_live.tier, FreshnessTier.LIVE_CURRENT)
        self.assertTrue(eval_live.force_fresh)
        self.assertIn("get_repository_commits", eval_live.recommended_tools)

        eval_hist = freshness_evaluator.evaluate_request(
            user_message="How many commits were created last month?"
        )
        self.assertEqual(eval_hist.tier, FreshnessTier.HISTORICAL)
        self.assertFalse(eval_hist.force_fresh)

    # =========================================================================
    # 6. Response Provenance Footnote Generation
    # =========================================================================
    def test_response_provenance_footnote(self):
        """Verify user response footnote contains data source attribution without CoT leaks."""
        meta_live = FreshnessMetadata(
            tier=FreshnessTier.LIVE_CURRENT,
            source_type=DataSourceType.LIVE_GITHUB_READ_API,
            source_label="Live GitHub Read API",
            as_of="2026-09-29 15:30:00 UTC",
            is_live_requested=True,
            is_stale=False
        )
        footnote = freshness_evaluator.format_provenance_footnote(meta_live)
        self.assertIn("Live GitHub Read API", footnote)
        self.assertIn("2026-09-29 15:30:00 UTC", footnote)
        self.assertNotIn("thought", footnote.lower())
        self.assertNotIn("chain of thought", footnote.lower())

    # =========================================================================
    # 7. StateGraph End-to-End Freshness Propagation
    # =========================================================================
    def test_stategraph_freshness_propagation(self):
        """Test full graph execution propagates freshness metadata and appends data source banner."""
        async def _run():
            initial_state: GraphState = {
                "user_request": "What's the current number of open PRs?",
                "tenant_id": "org-freshness-test",
                "user_id": "usr-test-100",
                "auth_token": "mock-jwt-token",
                "conversation_id": "conv-fresh-1",
                "message_id": "msg-fresh-1"
            }

            final_state = await compiled_engineering_graph.ainvoke(initial_state)
            
            # Assertions
            self.assertIn("freshness_metadata", final_state)
            self.assertEqual(final_state.get("data_freshness_tier"), FreshnessTier.LIVE_CURRENT.value)
            self.assertTrue(final_state.get("force_fresh"))
            
            # Assert response exists and contains data source footnote
            response = final_state.get("final_response") or ""
            self.assertTrue(len(response) > 0)
            self.assertIn("Data Source:", response)

        self.loop.run_until_complete(_run())

    # =========================================================================
    # 8. Tool Layer get_repository_sync_status Registered & Read-Only
    # =========================================================================
    def test_get_repository_sync_status_tool_registered(self):
        """Verify get_repository_sync_status is registered in the read-only tool registry."""
        tool = read_only_tool_registry.get_tool("get_repository_sync_status")
        self.assertIsNotNone(tool, "get_repository_sync_status must be registered in ReadOnlyToolRegistry")
        self.assertTrue(tool.is_read_only)
        self.assertIn("sync", tool.description.lower())


if __name__ == "__main__":
    unittest.main()
