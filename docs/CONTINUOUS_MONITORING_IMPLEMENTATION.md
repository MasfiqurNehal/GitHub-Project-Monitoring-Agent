# Continuous GitHub Monitoring Implementation Report

## Overview

This document describes the design, architecture, and empirical verification of the **Continuous GitHub Monitoring System**. The system implements real-time update handling via GitHub Webhooks and fallback periodic scheduled synchronization, while maintaining strict **READ-ONLY** access toward GitHub.

---

## Key System Principles

1. **Strict Read-Only Enforcement**:
   - The GitHub App integration is configured strictly for read-only analytics ingestion.
   - The backend contains **zero** code paths for committing code, creating/modifying branches, opening/modifying PRs, merging PRs, or opening/modifying GitHub issues.

2. **Dual Update Architecture**:
   - **Mechanism A (Primary)**: Real-time event handling via GitHub Webhooks.
   - **Mechanism B (Fallback)**: Periodic interval synchronization for monitored repositories.

---

## 1. GitHub Webhooks Integration

### Webhook Verification & Security
- Webhook signatures are verified using HMAC SHA-256 via `X-Hub-Signature-256` header and `GITHUB_WEBHOOK_SECRET`.
- **Unsigned or invalid signatures are rejected immediately with HTTP 401 Unauthorized**.
- Signature comparisons use constant-time buffer comparison (`crypto.timingSafeEqual`) to prevent timing attacks.

### Handled Webhook Events
- `push`: Ingests real-time commits, file diff metrics (additions/deletions/changed files), links commit authors to developers, and records `COMMIT_PUSHED` activity events.
- `pull_request`: Ingests PR creation, state changes (`OPEN`, `CLOSED`, `MERGED`), additions/deletions, author developers, and records `PULL_REQUEST_*` activity events.
- `pull_request_review`: Ingests PR review submissions (`APPROVED`, `CHANGES_REQUESTED`, `COMMENTED`), reviewer developers, and records `REVIEW_SUBMITTED` activity events.
- `issues`: Ingests issue creation and state updates (`OPEN`, `CLOSED`), authors, assignees, labels, and records `ISSUE_*` activity events.
- `issue_comment`: Ingests issue comments, author developers, body snippets, and records `ISSUE_COMMENT_CREATED` activity events.
- `installation`: Handles GitHub App installation actions (`created`, `deleted`, `suspend`) and updates installation lifecycle status (`ACTIVE`, `DELETED`, `SUSPENDED`).
- `installation_repositories`: Tracks addition/removal of repositories to the GitHub App installation context.

### Idempotency & Duplicate Prevention
- Every incoming webhook includes a unique `X-GitHub-Delivery` GUID.
- Webhook deliveries are stored in the `webhook_events` table with unique constraint on `delivery_id`.
- Duplicate deliveries return `HTTP 200 { duplicate: true }` instantly, preventing double-counting of commits, PRs, or activity events.

---

## 2. Scheduled Synchronization Fallback

### Configurable Interval
- Controlled via `GITHUB_SYNC_INTERVAL_MINUTES` environment variable (defaults to `5` minutes).
- Automatically triggers incremental background synchronization across all monitored repositories.

### Synchronization State & Tracking Columns
The `repositories` table tracks complete synchronization lifecycle metadata:
- `last_sync_started_at` (`TIMESTAMPTZ`): Timestamp when synchronization started.
- `last_sync_completed_at` (`TIMESTAMPTZ`): Timestamp when synchronization completed or failed.
- `last_sync_status` / `sync_status` (`VARCHAR(50)`): `SYNCING` / `SYNCED` / `FAILED`.
- `last_sync_error` / `sync_error` (`TEXT`): Error detail string if failure occurs.

### Concurrent Sync Prevention
- A synchronization lock check prevents duplicate background sync jobs from executing concurrently for the same repository.
- If a sync job is already in progress (`sync_status = 'SYNCING'`), subsequent sync requests are skipped unless the existing job has exceeded a 10-minute timeout threshold (stale lock recovery).

---

## 3. Express API Endpoints Exposed

| Endpoint | Method | Purpose |
| :--- | :--- | :--- |
| `/api/repositories/:id/sync` | `POST` | Triggers immediate real-time synchronization for a repository. |
| `/api/repositories/:id/sync-status` | `GET` | Returns synchronization state, tracking timestamps (`started_at`, `completed_at`), and latest sync job info. |
| `/api/repositories/sync-all` | `POST` | Triggers background sync across all connected repositories in the organization. |
| `/api/dashboard/refresh` | `POST` | Clears analytics in-memory cache and returns updated real-time dashboard data. |

---

## 4. Automated Test Verification Results

All 9 test scenarios were validated via `scratch/test_continuous_monitoring.ts`:

1. **Webhook Signature Validation**: `PASSED` (valid HMAC accepted, invalid & missing HMAC rejected).
2. **Push Event Processing**: `PASSED` (commit persisted to DB and linked to author developer).
3. **Pull Request Event Processing**: `PASSED` (PR state, author, and metrics persisted to DB).
4. **Issue Event Processing**: `PASSED` (Issue title, author, and labels persisted to DB).
5. **Duplicate Webhook Delivery Idempotency**: `PASSED` (duplicate `deliveryId` returned `duplicate: true`).
6. **Unknown Repository Handling**: `PASSED` (unmonitored repos safely ignored without crashing).
7. **Unauthorized / Installation Status Event**: `PASSED` (installation status updated to `DELETED`).
8. **Scheduled Sync Execution & Status Updates**: `PASSED` (`last_sync_started_at` and `last_sync_completed_at` updated in DB).
9. **Concurrent Sync Prevention**: `PASSED` (duplicate sync request skipped when lock active).

---

## Conclusion

Continuous GitHub monitoring is fully operational via secure Webhooks and background Scheduled Sync, with complete idempotency, locking, state tracking, and Express endpoints.
