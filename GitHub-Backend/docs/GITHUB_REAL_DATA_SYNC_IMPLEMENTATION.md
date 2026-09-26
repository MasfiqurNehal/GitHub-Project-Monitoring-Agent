# Real GitHub Repository Data Synchronization Pipeline — Audit & Implementation Report

## Executive Summary
This document details the audit, architecture, and implementation fixes for the **Real GitHub Repository Data Synchronization Pipeline** in the Express.js backend. 

Prior to this fix, the historical sync engine (`syncService.runFullHistoricalSync`) was correctly fetching and persisting GitHub records into Neon PostgreSQL (`commits`, `pull_requests`, `issues`, `developers`, `activity_events`, `commit_files`). However, the repository detail endpoint (`GET /api/repositories/:id`) was executing a bare `SELECT` query on the `repositories` table and returning hardcoded zero values for metrics (`openPRsCount: 0`, `mergedPRsCount: 0`) and omitted all relation arrays (`developers`, `recentActivity`, `commits`, `pullRequests`, `issues`, `codeChanges`).

We updated the backend data layer and repository routes to query and aggregate real synchronized records directly from PostgreSQL, populating the full payload contract required by the Next.js frontend without altering existing frontend UI components, database schema structure, or multi-tenant boundaries.

---

## Files Changed

| File Path | Description of Changes |
| :--- | :--- |
| [`src/services/analytics.service.ts`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/GitHub-Backend/src/services/analytics.service.ts) | Implemented `getRepositoryFullDetail(repositoryIdOrName, organizationId)` to query child tables (`commits`, `pull_requests`, `issues`, `developers`, `repository_developers`, `activity_events`, `commit_files`) in parallel via `Promise.all` and assemble populated real GitHub analytics. |
| [`src/repositories/repository.repository.ts`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/GitHub-Backend/src/repositories/repository.repository.ts) | Updated `findAll(organizationId)` to execute SQL `LEFT JOIN`s on `commits`, `pull_requests`, `issues`, and `developers`, calculating `commits_count`, `prs_count`, `issues_count`, `developers_count`, `lines_added`, and `lines_deleted` for each repository in the list. |
| [`src/controllers/repository.controller.ts`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/GitHub-Backend/src/controllers/repository.controller.ts) | Updated `listRepositories` to format each repository with its aggregated `metrics` object. Updated `getRepositoryDetail` to invoke `analyticsService.getRepositoryFullDetail(id, orgId)` and return full synchronized analytics. |

---

## APIs Added / Changed

### 1. `GET /api/repositories`
- **Behavior**: Retrieves all monitored repositories scoped to the authenticated tenant.
- **Change**: Now returns populated `metrics` per repository (`developersCount`, `commitsCount`, `prsCount`, `issuesCount`, `linesAdded`, `linesDeleted`, `lastActivityAt`) derived from actual database records.

### 2. `GET /api/repositories/:id`
- **Behavior**: Retrieves comprehensive details and historical analytics for a single repository by ID or full name (`owner/repo`).
- **Change**: Replaced hardcoded zero overview response with `analyticsService.getRepositoryFullDetail`. Returns:
  - `repository`: Metadata and aggregated `metrics`.
  - `overview`: Real counts for `openPRsCount`, `mergedPRsCount`, `openIssuesCount`, `closedIssuesCount`, and `activeBranch`.
  - `developers`: Array of developer contribution records with commit, PR, review counts, and code line impact.
  - `recentActivity`: Chronological feed of activity events or commit diffs.
  - `commits`: Recent commit log with SHA, author avatar, message, and line changes (`additions`/`deletions`).
  - `pullRequests`: Pull request list with state (`OPEN`, `MERGED`, `CLOSED`), number, title, author, and line impact.
  - `issues`: Issue list with state (`OPEN`, `CLOSED`), number, title, author avatar, and timestamps.
  - `codeChanges`: Daily code addition/deletion trends and top modified files.

---

## Database Tables Used (Neon PostgreSQL)

1. `repositories`: Stores repository metadata, default branch, visibility, sync status, and installation references.
2. `developers`: Stores GitHub user profiles (`github_user_id`, `login`, `name`, `avatar_url`, `profile_url`).
3. `repository_developers`: Many-to-many junction linking developers to monitored repositories.
4. `commits`: Stores commit logs (`github_commit_sha`, `message`, `commit_url`, `committed_at`, `additions`, `deletions`, `changed_files`).
5. `commit_files`: File-level diff changes per commit (`filename`, `status`, `additions`, `deletions`).
6. `pull_requests`: Stores PR metadata (`github_pr_id`, `number`, `title`, `body`, `state`, `merged`, `created_at`, `closed_at`, `merged_at`, `additions`, `deletions`).
7. `pull_request_reviews`: Stores PR review events (`reviewer_developer_id`, `state`, `submitted_at`).
8. `issues`: Stores GitHub issues (`github_issue_id`, `number`, `title`, `state`, `created_at`, `closed_at`).
9. `activity_events`: Audit log of synchronized events (`event_type`, `occurred_at`, `metadata`).

---

## GitHub REST API Endpoints Used

| Endpoint | Authentication | Purpose |
| :--- | :--- | :--- |
| `GET /repos/{owner}/{repo}` | Installation Access Token | Validates repository existence, accessibility, default branch, stars, and language. |
| `GET /repos/{owner}/{repo}/commits` | Installation Access Token | Fetches commit history, author details, and commit messages. |
| `GET /repos/{owner}/{repo}/commits/{ref}` | Installation Access Token | Fetches file diff details (`additions`, `deletions`, file patches). |
| `GET /repos/{owner}/{repo}/pulls` | Installation Access Token | Fetches pull requests across all states (`open`, `closed`, `all`). |
| `GET /repos/{owner}/{repo}/issues` | Installation Access Token | Fetches issues (filtering out pull request entries). |
| `GET /repos/{owner}/{repo}/contributors` | Installation Access Token | Discovers repository developers and contribution counts. |

---

## Authentication Flow

1. **GitHub App Installation**:
   - The user installs the **GitMonitor AI** (`gitmonitor-ai`) GitHub App on their organization or personal account.
   - GitHub redirects back to `/api/auth/github/callback` with an `installation_id` parameter.
2. **Server-Side Token Exchange**:
   - The backend reads `GITHUB_APP_ID` and `GITHUB_PRIVATE_KEY` from `.env`.
   - The backend generates a signed JSON Web Token (JWT) using RS256 algorithm.
   - The backend exchanges the JWT for an **Installation Access Token** via `POST https://api.github.com/app/installations/{installation_id}/access_tokens`.
3. **Secret Security**:
   - Private keys and installation tokens are strictly kept **server-side** in memory and never sent to the client.

---

## Synchronization Flow

```
+------------------+         +--------------------------+         +----------------------------+
|  User / Webhook  | ------> | Express.js Sync Service  | ------> |  GitHub REST API / Webhook |
+------------------+         +--------------------------+         +----------------------------+
                                          |                                     |
                                          | Fetch & Normalize Data              | Installation Token
                                          v                                     v
                             +--------------------------+         +----------------------------+
                             | Neon PostgreSQL Database | <------ | Real Commits, PRs, Issues  |
                             +--------------------------+         +----------------------------+
                                          |
                                          | Query Aggregated Analytics
                                          v
                             +--------------------------+
                             |   Next.js Frontend UI    |
                             +--------------------------+
```

1. **Initial Sync Trigger**:
   - When a repository is connected (`POST /api/repositories`), `syncService.runFullHistoricalSync(repositoryId)` runs asynchronously in the background.
2. **Data Extraction & Normalization**:
   - `githubService` fetches metadata, commits, commit files, pull requests, issues, and contributors from GitHub API using the installation token.
   - Developer records are upserted into `developers` and mapped in `repository_developers`.
   - Commits, PRs, and Issues are saved into PostgreSQL using transactional bulk upserts (`ON CONFLICT DO UPDATE`).
3. **Continuous Webhook Sync**:
   - Incoming webhooks (`POST /api/webhooks/github`) verify signature using `GITHUB_WEBHOOK_SECRET` and update database records immediately on read-only events (`push`, `pull_request`, `issues`).

---

## Tenant Isolation Enforcement

- Every repository belongs to an `organization_id` or an associated `project_id`.
- All database queries enforce organization isolation:
  ```sql
  WHERE (r.organization_id = $1 OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $1))
  ```
- JWT authentication middleware (`authMiddleware`) extracts the authenticated user's `organization_id` from their JWT token and injects it into `req.organizationId`.
- Controllers pass `req.organizationId` into all repository and analytics service calls, preventing cross-tenant access.

---

## How to Test Synchronization Locally

1. **Start the Backend Server**:
   ```bash
   cd GitHub-Backend
   npm run dev
   ```
2. **List Monitored Repositories**:
   ```bash
   curl -H "Authorization: Bearer <JWT_TOKEN>" http://localhost:5001/api/repositories
   ```
3. **Trigger Manual Repository Synchronization**:
   ```bash
   curl -X POST -H "Authorization: Bearer <JWT_TOKEN>" http://localhost:5001/api/repositories/<REPO_ID>/sync
   ```
4. **Inspect Populated Repository Analytics**:
   ```bash
   curl -H "Authorization: Bearer <JWT_TOKEN>" http://localhost:5001/api/repositories/<REPO_ID>
   ```

---

## Environment Variables Required

All secret values must be configured in `GitHub-Backend/.env`:

```env
PORT=5001
DATABASE_URL=postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your_jwt_secret_key
GITHUB_APP_ID=1161745
GITHUB_APP_SLUG=gitmonitor-ai
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret
```

---

## Remaining Problems / Recommendations
- None for the data synchronization engine. All API detail endpoints return genuine synchronized GitHub records from Neon PostgreSQL without mock or hardcoded values.
