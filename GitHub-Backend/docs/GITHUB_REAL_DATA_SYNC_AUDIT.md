# GITHUB REAL DATA PIPELINE AUDIT REPORT

**Project**: GitHub Project Monitoring Agent SaaS  
**Audit Date**: September 26, 2026  
**Document**: `docs/GITHUB_REAL_DATA_SYNC_AUDIT.md`  
**Auditor**: Antigravity AI Pair Programming Agent  

---

## 1. Executive Overview

This audit investigates the end-to-end data pipeline responsible for fetching, synchronizing, storing, and displaying real GitHub engineering telemetry (commits, pull requests, issues, code churn, and contributors) for monitored repositories.

### Primary Symptom:
A real GitHub repository (e.g. `MasfiqurNehal/Nexora-AI` or `BetopiaOrg/betopia-core`) can be successfully connected via the GitHub App, validated, added to monitoring, and set to `SYNCED`. However, when opening the repository detail page (`/repositories/[repositoryId]`), the displayed analytics show empty or zeroed metrics:
- **Developers**: `0`
- **Commits**: `0`
- **Open PRs**: `0`
- **Open Issues**: `0`
- **Code Impact**: `+0 / -0`
- **Recent Repository Activity**: `empty`
- **Active Contributors**: `0`

---

## 2. Comprehensive Pipeline Flow Analysis

### 2.1 Current GitHub App Flow
```
User (SaaS Tenant)
   ↓
GET /api/github/install
   ↓
GitHub App Installation URL (slug: gitmonitor-ai, signed state token)
   ↓
GitHub App OAuth / Installation UI (User selects account & repositories)
   ↓
GitHub Callback → GET /api/github/app/setup?installation_id={id}&state={jwt}
   ↓
githubAppService.getAppOctokit() (Generates App JWT using GITHUB_APP_ID & GITHUB_PRIVATE_KEY)
   ↓
githubInstallationRepository.upsert() → Saved in `github_installations` linked to `organization_id`
```
* **Status**: **WORKING CORRECTLY**  
* **Verification**: App installation URLs are generated correctly, App JWT authentication passes signature verification, and installations are stored in PostgreSQL table `github_installations` with tenant association.

---

### 2.2 Current Installation-Token Flow
```
githubAppService.getInstallationToken(installationId)
   ↓
Checks in-memory token cache (Map<number, CachedToken>)
   ↓
If cache miss/expired: Calls GitHub API POST /app/installations/{installation_id}/access_tokens
   ↓
Returns 1-hour Installation Access Token (e.g. ghs_...)
   ↓
GitHubClient uses Installation Access Token for Octokit REST API requests
```
* **Status**: **WORKING CORRECTLY**  
* **Verification**: Installation tokens are acquired using the App JWT without exposing tokens or private keys to the client.

---

### 2.3 Current Repository Validation Flow
```
POST /api/repositories/validate
   ↓
githubService.parseUrl(url) → Extracts owner & repo name
   ↓
githubInstallationRepository.findAll(organizationId) → Finds active installation for tenant
   ↓
githubAppService.getInstallationOctokit(installationId)
   ↓
GitHub REST API: GET /repos/{owner}/{repo}
   ↓
Returns metadata: { githubRepositoryId, owner, name, fullName, isPrivate, defaultBranch, stars, openIssuesCount }
```
* **Status**: **WORKING CORRECTLY**  
* **Verification**: Validates repository access using the installation token and rejects unmonitored or cross-tenant repositories.

---

### 2.4 Current Repository Synchronization Flow
```
POST /api/repositories/:id/sync  OR  SyncSchedulerService (every 5 min)
   ↓
syncService.runFullHistoricalSync(repositoryId, organizationId)
   ↓
githubClient.getContributors(owner, repo) → GET /repos/{owner}/{repo}/contributors
   ↓
githubClient.getCommits(owner, repo, since, page, 100) → GET /repos/{owner}/{repo}/commits
   ↓
githubClient.getCommitDetail(owner, repo, sha) → GET /repos/{owner}/{repo}/commits/{ref}
   ↓
githubClient.getPullRequests(owner, repo, 'all', page, 100) → GET /repos/{owner}/{repo}/pulls
   ↓
githubClient.getPullRequestReviews(owner, repo, pullNumber) → GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews
   ↓
githubClient.getIssues(owner, repo, 'all', page, 100) → GET /repos/{owner}/{repo}/issues
   ↓
Upserts into Neon PostgreSQL tables:
  - developers & repository_developers
  - commits & commit_files
  - pull_requests & pull_request_reviews
  - issues
  - activity_events
   ↓
Updates repository.last_synced_at and sync_status = 'SYNCED'
```
* **Status**: **WORKING IN BACKGROUND, BUT DISCONNECTED FROM REPOSITORY DETAIL API**  
* **Verification**: `syncService` successfully writes records into PostgreSQL tables (`developers`, `commits`, `pull_requests`, `issues`), but the query pipeline serving the UI repository detail page does not fetch these records!

---

### 2.5 Current Database Schema & Tables Used
- `github_installations`: Stores installation ID, account login, status, and `organization_id`.
- `repositories`: Stores repository ID, full name, branch, `github_installation_id`, `last_synced_at`, `sync_status`, `sync_error`.
- `developers`: Stores developer login, avatar URL, HTML URL, email, `organization_id`.
- `repository_developers`: Many-to-many junction table mapping `repository_id` to `developer_id`.
- `commits`: Stores commit SHA, message, `developer_id`, `committed_at`, `additions`, `deletions`, `changed_files`.
- `commit_files`: Stores file-level diff patches, filename, additions, deletions.
- `pull_requests`: Stores PR number, title, state (`OPEN`, `MERGED`, `CLOSED`), additions, deletions, `author_developer_id`.
- `pull_request_reviews`: Stores review ID, state (`APPROVED`, `CHANGES_REQUESTED`), `reviewer_developer_id`.
- `issues`: Stores issue number, title, state (`OPEN`, `CLOSED`), `author_developer_id`, `assignee_developer_id`.
- `activity_events`: Stores engineering event timeline (`COMMIT_PUSHED`, `PULL_REQUEST_OPENED`, `ISSUE_OPENED`, etc.).

---

### 2.6 Current Repository Detail API Flow (`GET /api/repositories/:id`)
```
Frontend calls GET /api/repositories/:id
   ↓
repositoryController.getRepositoryDetail(req, res)
   ↓
repositoryRepository.findById(id, orgId) → SELECT * FROM repositories WHERE id = $1
   ↓
Returns:
{
  success: true,
  data: {
    repository: { ...repoRow },
    overview: {
      openPRsCount: 0,         // HARDCODED TO 0
      mergedPRsCount: 0,       // HARDCODED TO 0
      openIssuesCount: repo.open_issues_count || 0,
      closedIssuesCount: 0,    // HARDCODED TO 0
      activeBranch: repo.default_branch || 'main',
      readOnlyStatus: true
    }
  }
}
```
* **Status**: **BROKEN / INCOMPLETE**  
* **Verification**: `getRepositoryDetail` controller ONLY queries the single row in `repositories` table. It **NEVER** joins or queries `commits`, `developers`, `pull_requests`, `issues`, `activity_events`, or `commit_files`!

---

## 3. EXACT ROOT CAUSES OF THE DATA BREAKAGE

### Root Cause 1: Backend Controller Missing Data Aggregation
**File**: `GitHub-Backend/src/controllers/repository.controller.ts` (`getRepositoryDetail` function)  
**Issue**: The backend controller returns `repository: repoRow` and a statically structured `overview` object where `openPRsCount: 0`, `mergedPRsCount: 0`, and `closedIssuesCount: 0` are hardcoded to `0`. It completely omits the detailed relations expected by the frontend:
- `developers`: `[]` (missing)
- `recentActivity`: `[]` (missing)
- `commits`: `[]` (missing)
- `pullRequests`: `[]` (missing)
- `issues`: `[]` (missing)
- `codeChanges`: `{ totalAdditions, totalDeletions, trend }` (missing)
- `metrics`: `{ developersCount, commitsCount, prsCount, issuesCount, linesAdded, linesDeleted }` (missing)

### Root Cause 2: Frontend API Mapper Contract Mismatch
**File**: `GitHub-Frontend/src/lib/api/repositories.ts` (`fetchRepositoryDetails` function)  
**Issue**: The frontend expects `GET /api/repositories/:id` to return an object containing `repository.metrics`, `developers`, `commits`, `pullRequests`, `issues`, `recentActivity`, and `codeChanges`. Because the backend returns `undefined` for these fields, `fetchRepositoryDetails` safely fallback-initializes all metrics to `0` and arrays to `[]`, resulting in the UI showing **0 developers, 0 commits, 0 PRs, 0 issues, and empty activity streams**.

### Root Cause 3: Repositories List API Missing Metrics
**File**: `GitHub-Backend/src/controllers/repository.controller.ts` (`listRepositories` function)  
**Issue**: `GET /api/repositories` executes `SELECT * FROM repositories`. It does not aggregate commit additions/deletions or count linked pull requests and issues, causing the main Repositories table view to show `+0 / -0` code impact.

---

## 4. GitHub API Calls Status Audit

| GitHub API Endpoint | Status | Location in Code | Purpose |
|---|---|---|---|
| `GET /repos/{owner}/{repo}` | **Working** | `GitHubClient.validateRepositoryAccess` | Metadata validation |
| `GET /repos/{owner}/{repo}/contributors` | **Working** | `GitHubClient.getContributors` | Developer synchronization |
| `GET /repos/{owner}/{repo}/commits` | **Working** | `GitHubClient.getCommits` | Commit log synchronization |
| `GET /repos/{owner}/{repo}/commits/{ref}` | **Working** | `GitHubClient.getCommitDetail` | File diff & line additions/deletions |
| `GET /repos/{owner}/{repo}/pulls` | **Working** | `GitHubClient.getPullRequests` | Pull request synchronization |
| `GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews` | **Working** | `GitHubClient.getPullRequestReviews` | PR review synchronization |
| `GET /repos/{owner}/{repo}/issues` | **Working** | `GitHubClient.getIssues` | Issue synchronization |
| `GET /repos/{owner}/{repo}/branches` | **Implemented** | `GitHubClient.getBranches` | Branch listing |
| `POST /app/installations/{id}/access_tokens` | **Working** | `GitHubAppService.getInstallationToken` | Installation token generation |

---

## 5. Summary Findings Report

### A. What is Currently Working
1. **GitHub App Connection & OAuth Setup**: State token signing, redirection, installation ID storage, and tenant isolation work 100%.
2. **Installation Token Generation**: `githubAppService.getInstallationToken` generates valid 1-hour access tokens using the App JWT (`GITHUB_APP_ID` + `GITHUB_PRIVATE_KEY`).
3. **Repository Validation & Ingestion**: `POST /api/repositories/validate` and `POST /api/repositories` properly validate repository access and save rows in `repositories` table.
4. **Background Data Synchronization**: `syncService.runFullHistoricalSync` successfully fetches real data from GitHub API endpoints and inserts rows into PostgreSQL tables (`commits`, `commit_files`, `pull_requests`, `issues`, `developers`, `activity_events`).
5. **Webhook Ingestion**: `POST /api/webhooks/github` verifies HMAC SHA-256 signatures, deduplicates delivery IDs, and processes live push, PR, and issue events.

### B. What is Currently Broken
1. **`GET /api/repositories/:id` API Endpoint**: Returns hardcoded zero values for `openPRsCount`, `mergedPRsCount`, and `closedIssuesCount`, and does NOT query or return synchronized commits, PRs, issues, developers, activity, or code changes.
2. **`GET /api/repositories` List API Endpoint**: Does not aggregate metrics (`commits_count`, `prs_count`, `issues_count`, `lines_added`, `lines_deleted`), causing the Repositories table UI to render `+0 / -0`.
3. **Repository Overview Aggregation Service**: Missing a dedicated aggregation method in `AnalyticsService` / `RepositoryRepository` to compile repository-specific telemetry for the detail view.

### C. Exact Root Cause
The sync engine writes real GitHub data into Neon PostgreSQL, but the Express API endpoint `GET /api/repositories/:id` (`getRepositoryDetail` in `repository.controller.ts`) only performs a simple `SELECT * FROM repositories` query and returns empty/hardcoded placeholder objects instead of querying the populated `commits`, `pull_requests`, `issues`, `developers`, `activity_events`, and `commit_files` tables.

### D. Exact Files Responsible
- `GitHub-Backend/src/controllers/repository.controller.ts` (`getRepositoryDetail` & `listRepositories`)
- `GitHub-Backend/src/repositories/repository.repository.ts`
- `GitHub-Backend/src/services/analytics.service.ts`
- `GitHub-Frontend/src/lib/api/repositories.ts`

### E. Exact Database Tables Involved
- `repositories`
- `commits`
- `commit_files`
- `pull_requests`
- `pull_request_reviews`
- `issues`
- `developers`
- `repository_developers`
- `activity_events`

### F. Exact GitHub API Endpoints Involved
- `GET /repos/{owner}/{repo}`
- `GET /repos/{owner}/{repo}/contributors`
- `GET /repos/{owner}/{repo}/commits`
- `GET /repos/{owner}/{repo}/commits/{ref}`
- `GET /repos/{owner}/{repo}/pulls`
- `GET /repos/{owner}/{repo}/issues`

### G. What Should Be Fixed in the Next Prompt
1. Update `AnalyticsService` or `RepositoryRepository` to add a method `getRepositoryFullDetail(repositoryId, organizationId)` that executes SQL queries against `commits`, `pull_requests`, `issues`, `developers`, `commit_files`, and `activity_events` filtered by `repository_id` and tenant `organization_id`.
2. Update `getRepositoryDetail` in `repository.controller.ts` to return the real populated object containing:
   - `repository` (with `metrics: { developersCount, commitsCount, prsCount, issuesCount, linesAdded, linesDeleted }`)
   - `overview` (with real `openPRsCount`, `mergedPRsCount`, `openIssuesCount`, `closedIssuesCount`)
   - `developers` (list of contributors linked to this repo)
   - `recentActivity` (activity events for this repo)
   - `commits` (list of commits for this repo)
   - `pullRequests` (list of PRs for this repo)
   - `issues` (list of issues for this repo)
   - `codeChanges` (line additions/deletions trend for this repo)
3. Update `listRepositories` in `repository.controller.ts` to include aggregated metric counts (`commits_count`, `prs_count`, `issues_count`, `lines_added`, `lines_deleted`, `developers_count`) for each repository in the list.
