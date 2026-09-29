# AI Agent Phase 8: Data Freshness Strategy Report

**Generated Date:** September 29, 2026  
**Status:** Complete & Verified  
**Target Module:** `FastAPI-AI-Services/app/engineering_agent/freshness/`  
**Test Suite:** `FastAPI-AI-Services/tests/test_phase8_data_freshness.py` (8/8 tests passing, 91/91 total test suite passing)

---

## 1. Executive Summary

Phase 8 implements the **Data Freshness Strategy** for the Engineering AI Agent. The architecture prevents stale database data from answering real-time questions while avoiding unnecessary, rate-limited live GitHub queries for historical analytics.

The strategy classifies all queries into **Three Distinct Freshness Tiers**:

```
                                  User Request
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │   Data Freshness Classifier   │
                       │   & Policy Engine             │
                       └───────────────┬───────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│       HISTORICAL        │  │       RECENT_SYNC       │  │      LIVE_CURRENT       │
├─────────────────────────┤  ├─────────────────────────┤  ├─────────────────────────┤
│ - 'last month'          │  │ - 'dashboard overview'  │  │ - 'today'               │
│ - 'in 2025'             │  │ - 'workspace telemetry' │  │ - 'last 5 minutes'      │
│ - 'past 90 days'        │  │ - 'team velocity trends'│  │ - 'latest commit'       │
│ - 'historical churn'    │  │ - 'project statistics'  │  │ - 'current open PRs'    │
├─────────────────────────┤  ├─────────────────────────┤  ├─────────────────────────┤
│ Authoritative Store:    │  │ Authoritative Store:    │  │ Authoritative Store:    │
│ Neon Synced DB          │  │ Neon DB + Sync Freshness│  │ Authorized GitHub Live  │
│ (Historical Analytics)  │  │ (Verified Timestamps)   │  │ Read Stream (via Express│
└────────────┬────────────┘  └────────────┬────────────┘  └────────────┬────────────┘
             │                            │                            │
             └────────────────────────────┼────────────────────────────┘
                                          │
                                          ▼
                       ┌───────────────────────────────┐
                       │   Data Provenance Footnote    │
                       │   (Zero Chain-of-Thought)     │
                       └───────────────────────────────┘
```

---

## 2. Freshness Policy Architecture

### 2.1 Freshness Tiers & SLAs

| Tier | Trigger Keywords & Intent | Authoritative Source | Freshness SLA & Rules |
|---|---|---|---|
| **`HISTORICAL`** | *"last month"*, *"previous month"*, *"in 2024"*, *"past 90 days"*, *"historical trend"*, *"all time"* | **Neon Synced DB (Historical Store)** | Synchronized database aggregations are authoritative. No live API hits needed. |
| **`RECENT_SYNC`** | *"dashboard overview"*, *"workspace summary"*, *"team velocity"*, *"monitored repos"* | **Neon Synced DB (Recent Sync)** | Validates `last_synced_at` timestamp. Serves synchronized dashboard data with sync timestamp provenance. |
| **`LIVE_CURRENT`** | *"today"*, *"last 5 minutes"*, *"right now"*, *"latest commit"*, *"current open PRs"*, *"who is working"* | **Live GitHub Read API / Real-time Stream** | Evaluates real-time state. Forces fresh read queries with explicit live attribution. |

---

## 3. Core Freshness Components

### 3.1 Schemas & Data Models (`freshness/schemas.py`)
- **`FreshnessTier`**: Enum defining `HISTORICAL`, `RECENT_SYNC`, and `LIVE_CURRENT`.
- **`DataSourceType`**: Enum defining `NEON_SYNCED_DB`, `NEON_SYNC_METRICS`, `LIVE_GITHUB_READ_API`, and `GITHUB_ACTIVITY_STREAM`.
- **`FreshnessMetadata`**: Structured metadata envelope holding:
  - `tier`: `FreshnessTier`
  - `source_type`: `DataSourceType`
  - `source_label`: Human-readable source label (e.g. `Neon Synced DB (Historical Store)`, `Live GitHub Read API`)
  - `as_of`: Timestamp when data was retrieved / evaluated (e.g. `2026-09-29 15:30:00 UTC`)
  - `last_synced_at`: ISO timestamp of the last background sync job
  - `age_seconds`: Elapsed time since last synchronization
  - `is_live_requested`: Boolean flag
  - `is_stale`: Staleness flag for query requirements
  - `freshness_note`: Concise explanatory note

### 3.2 Policy Engine (`freshness/policy.py`)
- **Deterministic Pattern Recognition**: Fast regex evaluation classifying timeframes and live indicators.
- **Staleness Threshold Calculation**:
  - `LIVE_CURRENT`: Stale if `age_seconds > 300` (5 minutes).
  - `RECENT_SYNC`: Stale if `age_seconds > 86400` (24 hours).
  - `HISTORICAL`: Always fresh from Neon database.

### 3.3 Evaluator & Response Annotator (`freshness/evaluator.py`)
- **`evaluate_request`**: Translates classified intent and user prompt into actionable execution directives (`recommended_tools`, `force_fresh`).
- **`format_provenance_footnote`**: Produces transparent markdown footers without exposing internal chain-of-thought (CoT).

Example output footers:
- Live query: `*Data Source: **Live GitHub Read API** (Retrieved live at 2026-09-29 15:58:11 UTC)*`
- Historical query: `*Data Source: **Neon Synced DB (Historical Store)** (Historical analytics baseline as of 2026-09-29 15:58:11 UTC)*`
- Synced query: `*Data Source: **Neon Synced DB (Recent Sync)** (As of 2026-09-29 15:58:11 UTC, last sync: 2026-09-29T15:45:00Z)*`

---

## 4. Key Engineering Invariants

1. **Strict Read-Only Non-Mutation**:
   - Live data queries through Express remain **strictly read-only**.
   - No database records are mutated during live queries, ensuring the application dashboard remains cleanly backed by background synchronization workers.
2. **Zero Chain-of-Thought (CoT) Leakage**:
   - Data provenance is communicated exclusively via concise, user-friendly markdown footers.
   - Internal reasoning steps, timing traces, and authentication keys are never leaked to the user.
3. **Tenant Context Forwarding**:
   - All live and synchronized requests strictly preserve `tenant_id` and `auth_token` authorization headers.

---

## 5. Test Suite & Verification Results

A dedicated test suite was implemented in `FastAPI-AI-Services/tests/test_phase8_data_freshness.py`.

### Test Summary:
| # | Test Case | Target Feature | Result |
|---|---|---|---|
| 1 | `test_historical_query_classification` | Validates historical queries ('last month', 'in 2024', 'past 90d') resolve to `HISTORICAL` tier | **PASS** |
| 2 | `test_live_current_query_classification` | Validates real-time queries ('today', 'last 5 mins', 'latest commit', 'open PRs') resolve to `LIVE_CURRENT` | **PASS** |
| 3 | `test_recent_sync_dashboard_classification` | Validates dashboard and overview queries resolve to `RECENT_SYNC` tier | **PASS** |
| 4 | `test_evaluate_sync_timestamp_fresh_vs_stale` | Validates staleness thresholds and elapsed age calculations | **PASS** |
| 5 | `test_freshness_evaluator_directives` | Validates `force_fresh` flag and recommended tool lists | **PASS** |
| 6 | `test_response_provenance_footnote` | Validates clean provenance generation without CoT exposure | **PASS** |
| 7 | `test_stategraph_freshness_propagation` | End-to-end StateGraph execution with freshness channel propagation | **PASS** |
| 8 | `test_get_repository_sync_status_tool_registered` | Confirms `get_repository_sync_status` is registered in read-only tool layer | **PASS** |

### Complete Regression Run:
- **FastAPI AI Suite:** `91/91 passed` (Phases 1 through 8).
- **Express Backend:** `npx tsc --noEmit` passed with 0 errors.
- **Next.js Frontend:** `npx tsc --noEmit` passed with 0 errors.
