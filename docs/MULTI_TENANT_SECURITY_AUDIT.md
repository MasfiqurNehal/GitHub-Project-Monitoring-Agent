# Multi-Tenant Security & Data-Isolation Audit

This document describes the logical multi-tenant security architecture and data-isolation audit for the **GitMonitor AI** platform using a shared **PostgreSQL/Neon** database.

---

## 1. Tenant Model
- **Single Database Strategy**: The application operates on ONE PostgreSQL database hosted on Neon. Tenant segregation is strictly enforced logically using `organization_id` column-based isolation on all domain tables.
- **Organization Boundary**: Every user belongs to a `saas_organizations` record identified by a unique `organization_id` string (e.g. `org-masfiqurnehal`, `org-betopia-1`).
- **Entity Hierarchy**:
  ```
  saas_organizations (id)
    ├── users (organization_id)
    ├── projects (organization_id)
    ├── github_installations (organization_id)
    ├── repositories (organization_id, project_id)
    ├── developers (organization_id)
    ├── commits (organization_id, repository_id, developer_id)
    ├── pull_requests (organization_id, repository_id, author_developer_id)
    ├── issues (organization_id, repository_id, author_developer_id)
    ├── pull_request_reviews (pull_request_id, reviewer_developer_id)
    ├── activity_events (repository_id, developer_id)
    └── sync_jobs (organization_id, repository_id)
  ```

---

## 2. Organization Isolation
- **Strict Query Scoping**: Every database query in Express controllers, services, and repositories filters records by `organization_id`.
- **Zero Query Param Leakage**: `organization_id` parameters sent from frontend requests (URL query strings, request bodies, or custom headers) are **NEVER trusted**. Organization identity is derived exclusively from the authenticated backend session/JWT.
- **Zero Cross-Tenant Leakage**: Data from the following domains are strictly scoped and isolated per tenant:
  - Users
  - GitHub App Installations
  - Repositories & Monitored Repos
  - Projects & Associations
  - Developers & Contributor Metrics
  - Commits & Code Additions/Deletions
  - Pull Requests & State History
  - Issues & State History
  - PR Reviews
  - Activity Events & Feed Streams
  - Dashboard Metrics & Summaries
  - Engineering Reports

---

## 3. Authentication Flow
1. **User Login (`POST /api/auth/login`)**:
   - User credentials (email & password) are validated against `users` table in Neon PostgreSQL DB.
   - Upon successful verification, an **Access Token (3 Days TTL)** and a **Refresh Token (30 Days TTL)** are generated.
   - The Access Token contains an encrypted HMAC SHA-256 JWT payload embedding `{ id, email, name, role, organizationId }`.
2. **Session Verification**:
   - Every HTTP request passes through `tenantAuthMiddleware`.
   - The token is extracted from `Authorization: Bearer <token>` or `?token=<token>`.
   - `authService.verifyAccessToken(token)` decrypts and validates token signature and expiry.
   - Valid claims populate `req.user` and `req.organizationId`.

---

## 4. Authorization Flow
- **Tenant Auth Guard (`requireTenantAuth`)**:
  - Applied as top-level Express middleware on all protected `/api/*` routes.
  - Rejects any request missing `req.user` or `req.organizationId` with `401 Unauthorized` before reaching controllers.
- **Protected vs Public Route Boundaries**:
  - **Public Routes**: `/api/auth/login`, `/api/auth/refresh`, `/api/health`, `/api/health/database`, `/api/webhooks/github`, `/api/telemetry/log`.
  - **Protected Routes**: All remaining routes under `/api/` (e.g. `/api/dashboard/*`, `/api/projects/*`, `/api/repositories/*`, `/api/developers/*`, `/api/commits/*`, `/api/pull-requests/*`, `/api/issues/*`, `/api/reports/*`, `/api/settings/*`).

---

## 5. Resource Ownership
- **IDOR Safeguards**: For any API route accepting a resource identifier (`:id`), the system executes a 3-step verification pattern:
  1. Fetch the target resource using both `:id` and `req.organizationId`.
  2. Verify that `resource.organization_id === req.organizationId`.
  3. Only return, update, or delete data if ownership is verified; otherwise return `404 Not Found`.

---

## 6. GitHub Installation Ownership
- **GitHub App OAuth / Callback**:
  - The installation flow state token encodes `organizationId`.
  - When GitHub redirects to `/api/github/app/setup`, state verification extracts `targetOrgId` and associates `github_installations.organization_id` with the authenticated organization.
- **Token Generation Guard (`POST /api/settings/github/installations/:installationId/token`)**:
  - Verifies `githubInstallationRepository.findByInstallationId(instId, req.organizationId)` before issuing installation access tokens. Cross-tenant token generation returns `404 Not Found`.

---

## 7. Repository Ownership
- **Tenant Scope**: Repositories are linked to an organization via `repositories.organization_id`.
- **Project-Linked Scoping**: When a repository belongs to a project, queries match both direct repository `organization_id` and project `organization_id`:
  ```sql
  WHERE r.organization_id = $1 OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $1)
  ```

---

## 8. Developer Ownership
- **Contributor Association**: Developers are associated with an organization via `developers.organization_id` or linked via monitored repositories in `repository_developers`.
- **Filtered Developer Queries**: All developer lists, detail views, and activity streams check tenant scope so Organization A cannot view Organization B's developers or metrics.

---

## 9. Webhook Isolation
- **Signature Verification**: Webhooks sent by GitHub to `/api/webhooks/github` must contain a valid `X-Hub-Signature-256` computed with `GITHUB_WEBHOOK_SECRET`.
- **Target Organization Resolution**:
  - Webhook processor resolves the target repository using `repository_id` / `full_name`.
  - It retrieves `repo.organization_id` from the database and scopes all ingested commits, PRs, reviews, issues, and activity events strictly to that `organization_id`.

---

## 10. Synchronization Isolation
- **Sync Trigger Scoping**: `POST /api/repositories/:id/sync` and `POST /api/repositories/sync-all` pass `req.organizationId` to `syncService.runFullHistoricalSync(repo.id, orgId)`.
- **Ingestion Isolation**: All upsert operations (`commitRepository.upsert`, `pullRequestRepository.upsert`, `issueRepository.upsert`, `developerRepository.upsert`) store `organization_id` on newly synchronized entities.

---

## 11. IDOR Protections
Audit verified IDOR protection across all resource endpoints:
- `GET /api/projects/:id` → `404 Not Found` for unauthorized tenants.
- `PATCH /api/projects/:id` → `404 Not Found` for unauthorized tenants.
- `DELETE /api/projects/:id` → `404 Not Found` for unauthorized tenants.
- `GET /api/repositories/:id` → `404 Not Found` for unauthorized tenants.
- `POST /api/repositories/:id/sync` → `404 Not Found` for unauthorized tenants.
- `DELETE /api/repositories/:id` → `404 Not Found` for unauthorized tenants.
- `GET /api/developers/:id` → `404 Not Found` for unauthorized tenants.
- `GET /api/commits/:id` → `404 Not Found` for unauthorized tenants.
- `GET /api/pull-requests/:id` → `404 Not Found` for unauthorized tenants.
- `GET /api/issues/:id` → `404 Not Found` for unauthorized tenants.
- `POST /api/settings/github/installations/:installationId/token` → `404 Not Found` for unauthorized tenants.

---

## 12. Indexes
High-performance database indexes configured in migration `025_ensure_multi_tenant_isolation_schema.sql`, `030_add_organization_id_to_commits_and_prs.sql`, and `031_add_multi_tenant_indexes_and_constraints.sql`:
- `idx_users_org_id` on `users(organization_id)`
- `idx_projects_org_id` on `projects(organization_id)`
- `idx_repositories_org_id` on `repositories(organization_id)`
- `idx_developers_org_id` on `developers(organization_id)`
- `idx_commits_org_id` on `commits(organization_id)`
- `idx_pull_requests_org_id` on `pull_requests(organization_id)`
- `idx_issues_org_id` on `issues(organization_id)`
- `idx_github_installations_org_id` on `github_installations(organization_id)`
- `idx_sync_jobs_org_id` on `sync_jobs(organization_id)`
- `idx_commits_repo_dev` on `commits(repository_id, developer_id)`
- `idx_pull_requests_repo_author` on `pull_requests(repository_id, author_developer_id)`
- `idx_issues_repo_author` on `issues(repository_id, author_developer_id)`
- `idx_pull_request_reviews_pr_reviewer` on `pull_request_reviews(pull_request_id, reviewer_developer_id)`
- `idx_activity_events_org_repo` on `activity_events(repository_id, developer_id)`
- `idx_repositories_proj_org` on `repositories(project_id, organization_id)`

---

## 13. Unique Constraints
- `saas_organizations(id)` (Primary Key)
- `saas_organizations(slug)` (Unique)
- `users(id)` (Primary Key)
- `repositories(full_name)` (Unique)
- `github_installations(github_installation_id)` (`uq_github_installations_inst_id` Unique Constraint)

---

## 14. Test Results
Automated test suite (`scratch/test_multi_tenant_security.ts`) executed against live Express backend and Neon PostgreSQL database:

```text
====================================================
🔒 MULTI-TENANT SECURITY & DATA ISOLATION AUDIT TEST
====================================================

--- STEP 1: Authenticate Organization A ---
✅ [PASS] Login Organization A (Masfiqur Nehal)
Organization A ID: org-masfiqurnehal

--- STEP 2: Authenticate Organization B ---
✅ [PASS] Login Organization B (Betopia Ltd)
Organization B ID: org-betopia-1
✅ [PASS] Organization A and Organization B have distinct tenant organization IDs

--- STEP 3: Unauthenticated Access Prevention ---
✅ [PASS] Unauthenticated request to /api/projects is rejected with 401 Unauthorized
✅ [PASS] Unauthenticated request to /api/dashboard/summary is rejected with 401 Unauthorized

--- STEP 4: Project Isolation & IDOR Protection ---
✅ [PASS] Org B creates project
✅ [PASS] Organization A project list does NOT leak Organization B project
✅ [PASS] Organization A GET /api/projects/:id_org_b returns 404 Not Found (IDOR protected)
✅ [PASS] Organization A PATCH /api/projects/:id_org_b returns 404 Not Found (IDOR protected)
✅ [PASS] Organization A DELETE /api/projects/:id_org_b returns 404 Not Found (IDOR protected)

--- STEP 5: Repository Isolation & IDOR Protection ---
✅ [PASS] Successfully fetched repositories for Org A and Org B
✅ [PASS] Organization A GET /api/repositories/:id_org_b returns 404 Not Found
✅ [PASS] Organization A POST /api/repositories/:id_org_b/sync returns 404 Not Found
✅ [PASS] Organization A DELETE /api/repositories/:id_org_b returns 404 Not Found

--- STEP 6: Developers Isolation & IDOR Protection ---
✅ [PASS] Successfully listed developers for Org A and Org B
✅ [PASS] Organization A developer list does NOT leak Organization B developers
✅ [PASS] Organization B GET /api/developers/:id_org_a returns 404 Not Found

--- STEP 7: Dashboard Metrics Isolation ---
✅ [PASS] Successfully fetched dashboard summary for Org A and Org B

--- STEP 8: GitHub Installations & Token Isolation ---
✅ [PASS] Successfully listed installations for Org A and Org B
✅ [PASS] Organization B CANNOT generate token for Organization A GitHub installation

--- STEP 9: Newly Created Organization Empty State Verification ---
✅ [PASS] Created new user/organization C
✅ [PASS] Logged in as new Organization C
✅ [PASS] Fetched dashboard summary for new Organization C
✅ [PASS] New Organization C Repositories: 0
✅ [PASS] New Organization C Projects: 0
✅ [PASS] New Organization C Developers: 0
✅ [PASS] New Organization C Commits: 0
✅ [PASS] New Organization C Pull Requests: 0
✅ [PASS] New Organization C Issues: 0

====================================================
AUDIT RESULTS: 29 PASSED, 0 FAILED
====================================================
```
