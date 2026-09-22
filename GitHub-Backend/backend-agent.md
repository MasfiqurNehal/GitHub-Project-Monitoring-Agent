# GitHub Project Monitoring Agent — Backend Implementation Plan

## 1. Document Purpose

This file is the **authoritative implementation guide for the backend** of the GitHub Project Monitoring Agent.

The coding agent must read this entire file before making backend changes.

The current project consists of three planned applications:

```text
GitHub-Project-Monitoring-Agent/
├── GitHub-Frontend/       # Next.js — already implemented
├── GitHub-Backend/        # Node.js + Express.js — implement now
└── GitHub-FastAPI/        # Python + FastAPI AI layer — implement later
```

For this phase, implement **only the backend and Neon PostgreSQL integration**.

Do NOT implement the FastAPI AI layer yet.

Do NOT introduce Redis.

Do NOT introduce Prisma.

Do NOT introduce Docker.

The backend must be designed so Redis, Docker, and FastAPI can be added later without rewriting the core system.

---

# 2. Product Overview

## Product Name

**GitHub Project Monitoring Agent**

## Purpose

A web-based engineering/project monitoring system for CTOs and senior management.

The system connects to existing GitHub repositories and collects engineering activity so management can see:

- Projects
- Repositories
- Developers/contributors
- Commits
- Push activity
- Pull requests
- Pull request reviews
- Issues
- Code additions/removals
- Developer activity
- Project activity over time
- Repository activity over time
- Daily/weekly/monthly activity
- Historical project activity
- Code churn/rework indicators
- Reports and analytics
- Activity timelines

The system must work with repositories that already existed before this application was created.

It must NOT modify or push code to monitored repositories.

The backend is primarily a **read-only monitoring/analytics system** with webhook ingestion for receiving GitHub events.

---

# 3. Critical Safety Rule

The application must NOT:

- push code
- create commits
- modify source files
- merge pull requests
- close issues
- delete branches
- modify repository code
- automatically approve pull requests
- automatically comment on developer work
- automatically change GitHub repository settings

The monitoring system should only:

1. authenticate/authorize with GitHub,
2. read repository/project activity,
3. receive GitHub webhook events,
4. store and analyze monitoring data,
5. expose data through backend APIs.

Any future write capability must be explicitly designed and separately authorized.

---

# 4. Current Technology Stack

## Backend

- Node.js
- Express.js
- JavaScript or TypeScript according to the existing backend project setup
- REST APIs
- PostgreSQL

## GitHub Integration

- GitHub REST API
- GitHub GraphQL API only where it provides a meaningful advantage
- GitHub Webhooks

## Testing

- Postman
- Automated backend tests where practical

## Not Used Now

Do NOT install or configure:

- Prisma
- Redis
- Docker
- Kubernetes
- FastAPI
- Gemini
- Ollama

These may be introduced later.

---

# 5. Architecture

The current architecture is:

```text
                         ┌─────────────────────────┐
                         │      GitHub User        │
                         │   CTO / Management      │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │   Next.js Frontend      │
                         │       :3000             │
                         └────────────┬────────────┘
                                      │
                               REST API / JSON
                                      │
                                      ▼
                 ┌─────────────────────────────────────────┐
                 │        Node.js + Express Backend        │
                 │                  :5000                  │
                 │                                         │
                 │  Auth / GitHub / Projects / Analytics  │
                 │  Developers / Activity / Reports       │
                 │  Webhooks / Synchronization            │
                 └───────────────┬──────────────┬──────────┘
                                 │              │
                              SQL │              │ HTTPS
                                 ▼              ▼
                    ┌──────────────────┐   ┌───────────────┐
                    │   PostgreSQL     │   │  GitHub APIs  │
                    │     :5432        │   │ REST/GraphQL  │
                    └──────────────────┘   └───────────────┘

                 FastAPI AI layer will be added later:

                 Express Backend
                       │
                       │ internal HTTP API
                       ▼
                 Python FastAPI
                       │
                       ▼
                    Gemini
```

---

# 6. Core Backend Responsibilities

The backend is responsible for:

1. Application configuration
2. Neon PostgreSQL connection
3. Database schema and migrations
4. GitHub authentication
5. GitHub repository access validation
6. Repository registration
7. Historical repository synchronization
8. GitHub REST API integration
9. GitHub GraphQL integration where useful
10. GitHub webhook ingestion
11. Commit synchronization
12. Pull request synchronization
13. Review synchronization
14. Issue synchronization
15. Contributor/developer synchronization
16. Activity timeline generation
17. Project-level analytics
18. Developer-level analytics
19. Date filtering
20. Repository filtering
21. Project filtering
22. Report data APIs
23. Code churn/rework analysis
24. API error handling
25. Rate-limit handling
26. Security
27. Logging
28. Postman testing support

---

# 7. Environment Variables

## Mandatory Rule

NO secrets or environment-specific configuration may be hardcoded.

Anything likely to change between:

- developer PC
- management PC
- staging
- production/cloud

must come from environment variables.

Examples include:

- database credentials
- database URL
- server port
- GitHub client ID
- GitHub client secret
- GitHub webhook secret
- JWT secret
- frontend URL
- GitHub API URL
- FastAPI URL
- encryption key
- API version
- rate-limit configuration

---

# 8. Backend .env

Create:

```text
GitHub-Backend/.env
```

Example:

```env
NODE_ENV=development
PORT=5000

DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require

GITHUB_API_URL=https://api.github.com
GITHUB_GRAPHQL_URL=https://api.github.com/graphql
GITHUB_API_VERSION=2022-11-28

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback

GITHUB_WEBHOOK_SECRET=

JWT_SECRET=
JWT_EXPIRES_IN=7d

TOKEN_ENCRYPTION_KEY=

FRONTEND_URL=http://localhost:3000

FASTAPI_URL=http://localhost:8000

LOG_LEVEL=info
```

Do not commit the real `.env`.

---

# 8A. Neon PostgreSQL Configuration

The current project uses **Neon PostgreSQL**, not a PostgreSQL server running locally.

The backend must connect to Neon using the connection string supplied by Neon.

Use:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

The actual Neon connection string must come from `.env`.

Example:

```env
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Do not copy this example literally. The real value must be obtained from the Neon dashboard.

Important:

- Do not install PostgreSQL locally just for this project.
- Do not hardcode the Neon connection string.
- Do not expose `DATABASE_URL` to Next.js/browser code.
- Do not prefix it with `NEXT_PUBLIC_`.
- Keep the Neon connection string only in the backend `.env`.
- Use SSL because Neon is a hosted PostgreSQL service.
- Use the standard `pg` package.
- Keep database access entirely inside the Express backend.
- PostgreSQL SQL syntax remains PostgreSQL syntax because Neon is PostgreSQL.

Recommended Node connection:

```js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
```

If the selected `pg` version/environment handles Neon SSL through the connection string alone, keep the configuration compatible with that setup. Do not disable SSL for production.

For production, prefer the Neon-provided pooled connection string when appropriate for the deployment environment.

# 9. .env.example

Create:

```text
.env.example
```

with placeholders:

```env
NODE_ENV=development
PORT=5000

DATABASE_URL=

GITHUB_API_URL=https://api.github.com
GITHUB_GRAPHQL_URL=https://api.github.com/graphql
GITHUB_API_VERSION=2022-11-28

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=

GITHUB_WEBHOOK_SECRET=

JWT_SECRET=
JWT_EXPIRES_IN=7d

TOKEN_ENCRYPTION_KEY=

FRONTEND_URL=http://localhost:3000

FASTAPI_URL=http://localhost:8000

LOG_LEVEL=info
```

---

# 10. Neon PostgreSQL

Use Neon as the hosted Neon PostgreSQL database through the standard Node PostgreSQL driver.

Use:

```text
pg
```

Do NOT use Prisma.

Do NOT use an ORM unless explicitly requested later.

Prefer parameterized SQL queries.

Never construct SQL using unsafe string concatenation.

Example:

```js
const result = await pool.query(
  'SELECT * FROM repositories WHERE id = $1',
  [repositoryId]
);
```

---

# 11. PostgreSQL Connection

Use a single connection pool.

Conceptually:

```js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

The database module should:

- create the pool
- export the pool
- expose a health check
- handle connection errors
- optionally support graceful shutdown

---

# 12. Database Schema

Implement the database around these core entities.

## users

Application users who authenticate to the monitoring system.

Suggested fields:

```text
id
github_user_id
github_login
name
email
avatar_url
access_token_encrypted
token_scope
created_at
updated_at
last_login_at
```

Do not store plaintext GitHub access tokens.

---

## projects

A logical monitoring project.

```text
id
name
description
organization
status
created_at
updated_at
```

A project can contain one or more repositories.

---

## repositories

```text
id
project_id
github_repository_id
owner
name
full_name
html_url
clone_url
default_branch
visibility
is_private
description
language
stars
forks
open_issues_count
github_created_at
github_updated_at
last_synced_at
sync_status
created_at
updated_at
```

A repository belongs to a project.

---

## developers

GitHub contributors.

```text
id
github_user_id
login
name
avatar_url
html_url
email
type
created_at
updated_at
```

Do not assume every GitHub contributor is a registered application user.

---

## repository_developers

Many-to-many relation:

```text
repository_id
developer_id
first_seen_at
last_seen_at
```

---

## commits

```text
id
repository_id
github_commit_sha
developer_id
branch
message
commit_url
committed_at
authored_at
additions
deletions
changed_files
parent_count
is_merge_commit
created_at
updated_at
```

The SHA must be unique per repository.

---

## commit_files

```text
id
commit_id
filename
status
additions
deletions
changes
patch
previous_filename
created_at
```

The `patch` may be null because GitHub does not always return patches.

Do not assume every commit has a complete patch.

---

## pull_requests

```text
id
repository_id
github_pr_id
number
author_developer_id
title
body
state
draft
merged
mergeable
base_branch
head_branch
created_at
updated_at
closed_at
merged_at
comments_count
review_comments_count
commits_count
additions
deletions
changed_files
html_url
```

Unique constraint:

```text
(repository_id, github_pr_id)
```

---

## pull_request_reviews

```text
id
pull_request_id
github_review_id
reviewer_developer_id
state
body
submitted_at
html_url
```

---

## pull_request_reviewers

Optional supporting relation:

```text
pull_request_id
developer_id
requested_at
```

---

## issues

```text
id
repository_id
github_issue_id
number
author_developer_id
title
body
state
closed_at
created_at
updated_at
comments_count
html_url
```

---

## issue_events

```text
id
issue_id
github_event_id
event_type
actor_developer_id
event_at
metadata
```

---

## labels

```text
id
repository_id
github_label_id
name
color
description
```

---

## issue_labels

```text
issue_id
label_id
```

---

## activity_events

A normalized activity stream.

```text
id
repository_id
developer_id
event_type
entity_type
entity_id
occurred_at
metadata
source
created_at
```

Examples:

```text
commit
push
pull_request_opened
pull_request_closed
pull_request_merged
pull_request_reviewed
issue_opened
issue_closed
issue_reopened
branch_created
branch_deleted
```

---

## webhook_events

Store incoming webhook events for audit/debugging.

```text
id
github_delivery_id
event_name
repository_id
payload
received_at
processed_at
processing_status
error_message
```

`github_delivery_id` should be unique.

Do not expose raw webhook payloads through normal frontend endpoints unless explicitly needed.

---

## sync_jobs

Track repository synchronization.

```text
id
repository_id
job_type
status
started_at
completed_at
records_processed
error_message
created_at
```

Possible job types:

```text
repository
commits
pull_requests
reviews
issues
contributors
full_sync
```

---

# 13. Database Indexes

Add indexes for common filters.

At minimum:

```text
repositories.project_id
repositories.full_name
commits.repository_id
commits.developer_id
commits.committed_at
pull_requests.repository_id
pull_requests.author_developer_id
pull_requests.created_at
pull_requests.merged_at
issues.repository_id
issues.created_at
issues.closed_at
activity_events.repository_id
activity_events.developer_id
activity_events.occurred_at
webhook_events.github_delivery_id
```

Use unique constraints for GitHub IDs and SHAs where appropriate.

---

# 14. Migrations

Because Prisma is not being used, implement a simple migration system.

Use SQL migration files.

Example:

```text
database/
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_projects.sql
│   ├── 003_create_repositories.sql
│   ├── 004_create_developers.sql
│   ├── 005_create_commits.sql
│   ├── 006_create_pull_requests.sql
│   ├── 007_create_issues.sql
│   ├── 008_create_activity_events.sql
│   ├── 009_create_webhook_events.sql
│   └── 010_create_sync_jobs.sql
└── seed/
```

Implement a lightweight migration runner or use a simple migration package if appropriate.

Do not introduce Prisma.

---

# 15. Backend Folder Architecture

Use a maintainable feature-oriented architecture.

Suggested:

```text
GitHub-Backend/
│
├── src/
│   │
│   ├── config/
│   │   ├── env.js
│   │   ├── database.js
│   │   └── github.js
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── project.controller.js
│   │   ├── repository.controller.js
│   │   ├── developer.controller.js
│   │   ├── activity.controller.js
│   │   ├── commit.controller.js
│   │   ├── pullRequest.controller.js
│   │   ├── issue.controller.js
│   │   ├── report.controller.js
│   │   └── github.controller.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── project.routes.js
│   │   ├── repository.routes.js
│   │   ├── developer.routes.js
│   │   ├── activity.routes.js
│   │   ├── commit.routes.js
│   │   ├── pullRequest.routes.js
│   │   ├── issue.routes.js
│   │   ├── report.routes.js
│   │   ├── github.routes.js
│   │   └── webhook.routes.js
│   │
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── github.service.js
│   │   ├── repository.service.js
│   │   ├── project.service.js
│   │   ├── developer.service.js
│   │   ├── commit.service.js
│   │   ├── pullRequest.service.js
│   │   ├── issue.service.js
│   │   ├── activity.service.js
│   │   ├── analytics.service.js
│   │   ├── report.service.js
│   │   ├── sync.service.js
│   │   └── webhook.service.js
│   │
│   ├── repositories/
│   │   ├── user.repository.js
│   │   ├── project.repository.js
│   │   ├── repository.repository.js
│   │   ├── developer.repository.js
│   │   ├── commit.repository.js
│   │   ├── pullRequest.repository.js
│   │   ├── issue.repository.js
│   │   ├── activity.repository.js
│   │   ├── webhook.repository.js
│   │   └── syncJob.repository.js
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   ├── notFound.middleware.js
│   │   ├── rateLimit.middleware.js
│   │   └── requestId.middleware.js
│   │
│   ├── utils/
│   │   ├── logger.js
│   │   ├── githubSignature.js
│   │   ├── pagination.js
│   │   ├── dateRange.js
│   │   └── response.js
│   │
│   ├── app.js
│   └── server.js
│
├── database/
│   ├── migrations/
│   └── seed/
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

The exact extension may be `.js` or `.ts` depending on the chosen backend language setup. Do not mix conventions unnecessarily.

---

# 16. API Design

Use RESTful APIs.

Base URL:

```text
/api
```

Use JSON.

Standard response structure:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Repository not found"
  }
}
```

Do not leak stack traces in production responses.

---

# 17. Health APIs

Implement:

```http
GET /api/health
```

Response:

```json
{
  "success": true,
  "service": "github-project-monitoring-backend",
  "status": "healthy"
}
```

Also implement a database health check:

```http
GET /api/health/database
```

Response should verify PostgreSQL connectivity.

---

# 18. Authentication

The system is intended for CTO/management use.

Do not create role-based application functionality at this stage.

There is effectively one application purpose:

```text
Management / CTO Monitoring Console
```

However, authentication should still exist so only authorized users can access the system.

Preferred GitHub authentication flow:

```text
Frontend
   ↓
Backend
   ↓
GitHub OAuth authorization
   ↓
GitHub
   ↓
Callback to Backend
   ↓
Encrypted GitHub token storage
   ↓
Application session/JWT
   ↓
Frontend
```

The GitHub account must have access to the repositories being monitored.

For private repositories, the authenticated GitHub identity must have appropriate repository access.

Do not assume a repository is public.

---

# 19. GitHub Authentication Security

Never expose:

```text
GITHUB_CLIENT_SECRET
GITHUB_WEBHOOK_SECRET
GITHUB_TOKEN
DATABASE_URL
JWT_SECRET
TOKEN_ENCRYPTION_KEY
```

to the frontend.

Never use:

```text
NEXT_PUBLIC_GITHUB_CLIENT_SECRET
NEXT_PUBLIC_GITHUB_TOKEN
```

Do not put secrets in Git.

---

# 20. Development Authentication Option

For local backend development, it may be useful to support a development-only GitHub token through:

```env
GITHUB_DEV_TOKEN=
```

This must be disabled or ignored in production.

The production architecture should use a proper GitHub authorization flow.

If implemented, document clearly that this is only for development/testing.

---

# 21. GitHub API Client

Create a centralized GitHub API client.

Do not scatter GitHub HTTP calls throughout controllers.

Conceptually:

```text
Controller
   ↓
Service
   ↓
GitHub Client
   ↓
GitHub API
```

The client should handle:

- Authorization headers
- API version
- Accept headers
- pagination
- rate-limit information
- retries where safe
- error normalization
- timeouts

---

# 22. GitHub REST API

Use REST for most data collection.

Expected endpoints include:

```text
GET /repos/{owner}/{repo}
GET /repos/{owner}/{repo}/contributors
GET /repos/{owner}/{repo}/commits
GET /repos/{owner}/{repo}/commits/{sha}
GET /repos/{owner}/{repo}/pulls
GET /repos/{owner}/{repo}/pulls/{pull_number}
GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews
GET /repos/{owner}/{repo}/issues
GET /repos/{owner}/{repo}/issues/{issue_number}
GET /repos/{owner}/{repo}/events
```

Use the official GitHub API documentation and current API version configured through `.env`.

Do not hardcode a personal token.

---

# 23. GitHub GraphQL

GraphQL is optional.

Use it only when it meaningfully reduces API calls or simplifies complex queries.

Do not force GraphQL everywhere.

The backend must remain functional primarily through REST.

---

# 24. Repository Connection

Frontend should allow management to connect an existing repository.

Example:

```text
https://github.com/BetopiaLtd/beyondAI-new-website
```

The frontend sends:

```http
POST /api/github/repositories/validate
```

Body:

```json
{
  "repositoryUrl": "https://github.com/BetopiaLtd/beyondAI-new-website"
}
```

Backend should:

1. parse owner and repository
2. validate URL format
3. authenticate against GitHub
4. request repository metadata
5. verify access
6. determine private/public status
7. return repository information

Do not assume repository ownership.

---

# 25. Add Repository to Monitoring

After validation:

```http
POST /api/repositories
```

Example:

```json
{
  "projectName": "BeyondAI",
  "repositoryUrl": "https://github.com/BetopiaLtd/beyondAI-new-website"
}
```

Backend should:

1. validate access
2. fetch repository metadata
3. create or find project
4. create repository record
5. start initial synchronization
6. return synchronization status

---

# 26. Existing Repository Historical Sync

This is a major requirement.

The repository may already have six months or more of activity before this monitoring application existed.

When a repository is connected:

```text
Existing GitHub repository
          ↓
Initial synchronization
          ↓
Historical commits
Historical PRs
Historical reviews
Historical issues
Historical contributors
          ↓
PostgreSQL
```

Do NOT only collect data from the date the monitoring system was installed.

The system should support historical analysis based on the available GitHub history and API permissions.

---

# 27. Synchronization Strategy

Initial synchronization:

```text
Repository
   ↓
Metadata
   ↓
Contributors
   ↓
Commits
   ↓
Commit details/files
   ↓
Pull requests
   ↓
Reviews
   ↓
Issues
   ↓
Activity events
```

Use pagination.

Do not assume one API request returns everything.

Store progress in `sync_jobs`.

---

# 28. Incremental Synchronization

After the initial sync, do not repeatedly download the entire repository.

Use:

```text
last_synced_at
```

and webhook events.

Periodic/manual sync can be used as a reconciliation mechanism.

---

# 29. GitHub Webhooks

Webhooks provide near-real-time updates.

Important events:

```text
push
pull_request
pull_request_review
issues
issue_comment
repository
```

Start with the events actually required.

Webhook endpoint:

```http
POST /api/webhooks/github
```

Verify:

```text
X-Hub-Signature-256
X-GitHub-Event
X-GitHub-Delivery
```

using:

```env
GITHUB_WEBHOOK_SECRET=
```

Never trust an incoming webhook without signature verification.

---

# 30. Webhook Processing

Do not put all processing directly inside the HTTP request.

Preferred:

```text
GitHub
  ↓
Webhook endpoint
  ↓
Verify signature
  ↓
Store webhook event
  ↓
Return 200 quickly
  ↓
Process event
  ↓
Update PostgreSQL
```

Because Redis is not being used now, processing can initially use a simple application-level service strategy.

Design the service so a proper queue can be introduced later.

---

# 31. Push Event Processing

For push events:

Extract:

```text
repository
branch/ref
sender
commits
commit SHAs
before
after
```

Then update:

```text
commits
activity_events
developers
repository last activity
```

Do not trust webhook payloads to contain every piece of historical information required by the dashboard.

Fetch additional GitHub data when necessary.

---

# 32. Pull Request Processing

Track:

```text
opened
edited
reopened
closed
merged
synchronize
review_requested
```

Store:

```text
author
reviewers
state
timestamps
additions
deletions
changed files
commits
```

---

# 33. Review Processing

Track:

```text
approved
changes_requested
commented
dismissed
```

Store reviewer and timestamp.

---

# 34. Issue Processing

Track:

```text
opened
closed
reopened
edited
labeled
unlabeled
```

The system should allow management to filter issues by date and repository.

---

# 35. Developer Analytics

The developer page shown by the frontend must eventually use real backend data.

Metrics can include:

```text
commits
pull requests
reviews
issues
lines added
lines removed
files changed
active days
first activity
last activity
repositories contributed to
```

Important:

Do NOT treat raw commit count as a quality score.

The system should present factual engineering activity.

Avoid automatically declaring that a developer is "good", "bad", "productive", or "unproductive" based solely on GitHub metrics.

---

# 36. Developer Activity Endpoint

Example:

```http
GET /api/developers
```

Filters:

```text
projectId
repositoryId
from
to
search
```

Example:

```http
GET /api/developers?repositoryId=12&from=2026-08-01&to=2026-08-31
```

---

# 37. Developer Detail

Implement:

```http
GET /api/developers/:id
```

Return:

```text
developer information
repositories
commits
pull requests
reviews
issues
activity summary
daily activity
code additions/removals
```

Date filters must be supported.

---

# 38. Dashboard APIs

Implement APIs needed by the existing dashboard.

Example:

```http
GET /api/dashboard/summary
```

Return:

```json
{
  "projects": 0,
  "repositories": 0,
  "commits": 0,
  "pullRequests": 0,
  "activeDevelopers": 0,
  "linesAdded": 0,
  "linesRemoved": 0
}
```

Also:

```http
GET /api/dashboard/activity-trends
```

Support:

```text
today
last 7 days
last 30 days
all time
custom date range
```

---

# 39. Date Filtering

Date filtering is a core feature.

Support:

```text
today
last 7 days
last 30 days
all time
custom range
```

Backend should accept:

```text
from
to
```

Example:

```http
GET /api/activity?from=2026-08-16&to=2026-08-16
```

Always use clear timezone handling.

Store timestamps in UTC.

Convert for presentation as required by the frontend.

---

# 40. Project Filtering

Example:

```http
GET /api/projects
```

Project detail:

```http
GET /api/projects/:id
```

Project activity:

```http
GET /api/projects/:id/activity
```

Project analytics:

```http
GET /api/projects/:id/analytics
```

---

# 41. Repository APIs

Implement:

```http
GET /api/repositories
GET /api/repositories/:id
POST /api/repositories
DELETE /api/repositories/:id
POST /api/repositories/:id/sync
GET /api/repositories/:id/activity
GET /api/repositories/:id/commits
GET /api/repositories/:id/pull-requests
GET /api/repositories/:id/issues
```

`DELETE` should mean removing the repository from monitoring, not deleting anything from GitHub.

---

# 42. Activity Stream

The frontend has an Activity Stream.

Implement:

```http
GET /api/activity
```

Filters:

```text
projectId
repositoryId
developerId
eventType
from
to
page
limit
```

Example:

```http
GET /api/activity?repositoryId=3&from=2026-09-15&to=2026-09-21
```

---

# 43. Pull Request APIs

Implement:

```http
GET /api/pull-requests
GET /api/pull-requests/:id
```

Filters:

```text
project
repository
developer
state
from
to
```

Return:

```text
PR number
title
author
state
merged
created
updated
closed
merged
reviews
additions
deletions
changed files
URL
```

---

# 44. Issue APIs

Implement:

```http
GET /api/issues
GET /api/issues/:id
```

Filters:

```text
project
repository
developer
state
label
from
to
```

---

# 45. Commit APIs

Implement:

```http
GET /api/commits
GET /api/commits/:id
```

Return:

```text
SHA
message
author
date
branch
additions
deletions
changed files
URL
```

---

# 46. Code Change / Churn Analysis

The system needs to detect activity such as:

```text
developer adds code
developer removes code
developer changes same area repeatedly
```

A basic non-AI implementation should calculate:

```text
lines added
lines removed
net lines
files changed
commit count
change frequency
```

Also implement a basic "rework/churn" indicator.

Example:

```text
Code added
Code removed shortly afterward
Similar/identical normalized lines added again
```

This should be presented as:

```text
Code churn / rework indicator
```

not as a claim of misconduct or poor performance.

---

# 47. Exact Re-added Code Detection

Where commit patches are available:

1. parse added lines
2. parse removed lines
3. normalize whitespace
4. create hashes for normalized lines or small blocks
5. compare across nearby commits
6. identify repeated line/block patterns
7. store evidence

Possible table:

```text
code_rework_events
```

Fields:

```text
id
repository_id
developer_id
commit_id
related_commit_id
file_path
match_type
matched_hash
detected_at
```

This is a heuristic.

Do not claim semantic duplicate-code detection.

GitHub patches may be incomplete or unavailable, so the UI should indicate when analysis is based on available patch data.

---

# 48. Analytics

Implement backend analytics using SQL.

Examples:

```text
daily commit count
daily PR count
daily review count
daily issue count
daily lines added
daily lines removed
developer activity
repository activity
project activity
```

Example:

```http
GET /api/analytics/daily?from=2026-09-01&to=2026-09-21
```

Response:

```json
{
  "data": [
    {
      "date": "2026-09-15",
      "commits": 12,
      "pullRequests": 3,
      "reviews": 5,
      "linesAdded": 1200,
      "linesRemoved": 450
    }
  ]
}
```

---

# 49. Reports

The backend should provide report-ready data.

Implement:

```http
GET /api/reports
GET /api/reports/project/:id
GET /api/reports/developer/:id
```

Filters:

```text
from
to
project
repository
developer
```

Reports can contain:

```text
summary
activity trends
commit metrics
PR metrics
issue metrics
review metrics
code changes
developer activity
repository activity
```

PDF generation is not required in this first backend implementation unless specifically requested.

The frontend can initially render the report.

---

# 50. AI Integration Placeholder

AI is NOT implemented now.

Do not call Gemini now.

Do not create FastAPI now.

However, keep the architecture ready.

Later:

```text
Express
   ↓
FastAPI
   ↓
AI Orchestrator
   ↓
Specialized agents
   ↓
Gemini
```

The backend may eventually expose:

```http
POST /api/ai/chat
```

but for this phase it should either remain unimplemented or return a clear "AI service not configured" response.

Do not fake AI responses and present them as real analysis.

---

# 51. Future Multi-Agent Layer

This backend is NOT the multi-agent system.

Later FastAPI may contain:

```text
AI Orchestrator
       │
       ├── Activity Analysis Agent
       ├── Developer Activity Agent
       ├── Project Analytics Agent
       └── Report Agent
```

The agents will use backend APIs/data.

Do not implement these agents in the Node.js backend.

---

# 52. GitHub API Rate Limits

GitHub API rate limits must be respected.

The GitHub service should capture response headers where available.

Track:

```text
limit
remaining
reset
```

Avoid unnecessary repeated API requests.

Use database data for dashboard reads instead of calling GitHub on every frontend page load.

This is important.

Correct architecture:

```text
GitHub
   ↓
Sync/Webhook
   ↓
PostgreSQL
   ↓
Express
   ↓
Frontend
```

NOT:

```text
Frontend
   ↓
GitHub API
```

for every dashboard request.

---

# 53. Caching

Redis is not being used now.

Do not add Redis.

Database indexes and PostgreSQL queries should be sufficient for the first implementation.

Design service boundaries so Redis can be added later if required.

---

# 54. Error Handling

Implement centralized error handling.

Handle:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
429 Rate Limited
500 Internal Server Error
502 GitHub API Error
503 External Service Unavailable
```

Normalize GitHub errors before returning them to frontend.

Never expose secrets.

---

# 55. Input Validation

Validate:

```text
repository URL
project name
repository IDs
developer IDs
date ranges
pagination
GitHub usernames
query parameters
```

Reject malformed dates.

Reject invalid repository URLs.

Prevent SQL injection through parameterized queries.

---

# 56. Pagination

All large collection APIs should support pagination.

Example:

```text
?page=1&limit=25
```

Response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 100,
    "totalPages": 4
  }
}
```

Do not load thousands of records into memory unnecessarily.

---

# 57. Logging

Implement structured backend logging.

Log:

```text
request
request ID
endpoint
status
duration
GitHub API errors
sync status
webhook processing status
database errors
```

Do NOT log:

```text
GitHub access tokens
OAuth client secrets
database passwords
JWT secrets
encryption keys
```

Do not log complete sensitive OAuth payloads.

---

# 58. CORS

Allow the configured frontend URL.

Use:

```env
FRONTEND_URL=http://localhost:3000
```

Do not use unrestricted CORS in production.

Development may be configured appropriately.

---

# 59. Security Headers

Use appropriate Express security middleware such as Helmet.

Implement reasonable:

```text
CORS
Helmet
rate limiting
request validation
secure cookies/session strategy if applicable
```

Do not over-engineer authentication before the core monitoring flow works.

---

# 60. API Documentation

Create a backend API reference in:

```text
docs/API.md
```

Document:

- endpoint
- method
- authentication
- request body
- query parameters
- response
- errors

Optionally add OpenAPI/Swagger after the core APIs work.

---

# 61. Postman

Create a Postman collection for:

```text
Health
Auth
GitHub
Projects
Repositories
Developers
Commits
Pull Requests
Issues
Activity
Analytics
Reports
Webhooks
```

Environment variables:

```text
baseUrl
authToken
repositoryId
projectId
developerId
```

Example:

```text
baseUrl = http://localhost:5000/api
```

No API secrets should be embedded in the collection.

---

# 62. Backend Development Order

Implement in this exact order.

## Step 1 — Backend foundation

Create:

```text
Express app
.env
.env.example
config
server
error middleware
logging
health endpoint
```

---

## Step 2 — PostgreSQL

Implement:

```text
database connection
migration system
schema
indexes
constraints
health check
```

Test PostgreSQL before continuing.

---

## Step 3 — Application authentication

Implement:

```text
GitHub OAuth
user storage
secure token storage
application session/JWT
```

---

## Step 4 — GitHub client

Implement:

```text
GitHub REST client
authentication
pagination
error handling
rate-limit handling
repository access validation
```

---

## Step 5 — Repository connection

Implement:

```text
validate repository
add repository
project association
repository metadata
```

---

## Step 6 — Historical synchronization

Implement:

```text
contributors
commits
commit files
PRs
reviews
issues
activity
```

with pagination and sync status.

---

## Step 7 — Webhooks

Implement:

```text
signature validation
push
pull_request
pull_request_review
issues
```

Store webhook deliveries and process them.

---

## Step 8 — Analytics

Implement:

```text
dashboard summary
daily trends
developer metrics
repository metrics
project metrics
code churn
```

---

## Step 9 — REST API

Implement all frontend-required endpoints.

---

## Step 10 — Postman

Test all endpoints independently.

---

## Step 11 — Frontend integration

Replace seed/mock data with real backend API responses.

Do not change backend data just to make fake frontend numbers look correct.

---

# 63. Frontend Integration Contract

The existing Next.js frontend already contains screens for:

```text
Dashboard
Projects
Repositories
Developers
Activity Stream
Pull Requests
Issues
Reports
Engineering Agent
GitHub Connection
Settings
```

The backend must provide real APIs for these screens.

The frontend should not directly access PostgreSQL or GitHub credentials.

Architecture:

```text
Next.js
   │
   ▼
Express API
   │
   ├── Neon PostgreSQL
   │
   └── GitHub
```

---

# 64. No Seed/Fake Data in Production

Seed data may be used during frontend-only development.

Once the backend is connected:

```text
GitHub → PostgreSQL → Express → Next.js
```

should be the source of truth.

Do not return fake developer names such as:

```text
Alex Mercer
Sarah Chen
John Doe
Michael Scott
```

unless they actually exist in the connected GitHub data.

---

# 65. Real Example Flow

Suppose management connects:

```text
https://github.com/BetopiaLtd/beyondAI-new-website
```

Flow:

```text
CTO
 ↓
Next.js
 ↓
GitHub Connection
 ↓
Express
 ↓
GitHub authorization
 ↓
Validate repository access
 ↓
Repository exists
 ↓
Create monitoring repository record
 ↓
Initial synchronization
 ↓
GitHub REST API
 ↓
Commits / PRs / Reviews / Issues / Contributors
 ↓
PostgreSQL
 ↓
Dashboard APIs
 ↓
Next.js
```

---

# 66. Example Developer Query

Management selects:

```text
Project: BeyondAI
Repository: beyondAI-new-website
Developer: someDeveloper
Date: 2026-08-16
```

Frontend calls:

```http
GET /api/developers/:id/activity?repositoryId=...&from=2026-08-16&to=2026-08-16
```

Backend queries PostgreSQL.

It returns factual activity:

```text
commits
pull requests
reviews
issues
lines added
lines removed
files changed
timestamps
```

---

# 67. Example CTO Question for Future AI

Later the CTO may ask:

> "On August 16, how much activity happened in the Enosis backend repository?"

Future flow:

```text
Next.js Chat
      ↓
Express
      ↓
FastAPI
      ↓
Orchestrator
      ↓
Analytics Agent
      ↓
Express data APIs / PostgreSQL
      ↓
Gemini
      ↓
FastAPI
      ↓
Express
      ↓
Next.js
```

Do not implement this now.

---

# 68. Deployment Preparation

Even though Docker is not being used now, write the application so it can later run in:

```text
local PC
management PC
cloud server
Docker container
```

Do not depend on local absolute paths.

Do not hardcode:

```text
C:\Users\Nehal\...
```

Do not hardcode:

```text
localhost
```

except as development defaults in `.env.example`.

---

# 69. Production Configuration

Later production may have:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=production_database_url
GITHUB_CLIENT_ID=production_client_id
GITHUB_CLIENT_SECRET=production_client_secret
GITHUB_WEBHOOK_SECRET=production_webhook_secret
FRONTEND_URL=https://your-domain.com
FASTAPI_URL=https://ai-api.your-domain.com
```

The source code should remain unchanged.

---

# 70. Important Non-Goals

Do NOT implement now:

- Redis
- Prisma
- Docker
- Kubernetes
- FastAPI
- Gemini
- Ollama
- autonomous GitHub code modification
- automatic PR merging
- automatic issue closing
- developer scoring
- developer ranking
- employee performance judgment
- code quality judgment based solely on commit counts

The backend should focus on **accurate factual engineering activity data and analytics**.

---

# 71. Definition of Done

The backend phase is complete when:

### Infrastructure

- [ ] Node.js backend starts successfully
- [ ] `.env` configuration works
- [ ] Neon PostgreSQL connects
- [ ] migrations run successfully
- [ ] health endpoint works

### GitHub

- [ ] GitHub authentication works
- [ ] private repository access can be validated
- [ ] existing repository can be connected
- [ ] repository metadata is stored
- [ ] historical data can be synchronized
- [ ] pagination works
- [ ] rate limits are handled
- [ ] webhook signatures are verified
- [ ] webhook events are stored
- [ ] incremental updates work

### Data

- [ ] projects stored
- [ ] repositories stored
- [ ] developers stored
- [ ] commits stored
- [ ] commit files stored where available
- [ ] PRs stored
- [ ] reviews stored
- [ ] issues stored
- [ ] activity events stored
- [ ] sync jobs tracked

### Analytics

- [ ] dashboard summary API
- [ ] daily trends
- [ ] developer activity
- [ ] repository activity
- [ ] project activity
- [ ] date filtering
- [ ] code additions/removals
- [ ] basic code churn/rework detection

### API

- [ ] REST APIs implemented
- [ ] pagination implemented
- [ ] validation implemented
- [ ] error handling implemented
- [ ] Postman collection created
- [ ] API documentation created

### Frontend

- [ ] frontend can connect to backend
- [ ] mock data can be removed/disabled
- [ ] real GitHub data appears on dashboard
- [ ] real repository data appears
- [ ] real developer data appears
- [ ] real activity appears
- [ ] real PR/issue data appears
- [ ] date/project/repository/developer filters work

---

# 72. Final Architecture Target for This Phase

```text
                         CTO / MANAGEMENT
                                │
                                ▼
                    ┌─────────────────────┐
                    │   Next.js Frontend  │
                    │       :3000         │
                    └──────────┬──────────┘
                               │
                               │ REST / JSON
                               ▼
                    ┌─────────────────────┐
                    │ Node.js / Express   │
                    │       :5000         │
                    │                     │
                    │ Auth                │
                    │ GitHub Integration  │
                    │ Sync                │
                    │ Webhooks            │
                    │ Analytics           │
                    │ REST APIs           │
                    └──────┬───────┬──────┘
                           │       │
                    SQL    │       │ HTTPS
                           ▼       ▼
                ┌──────────────┐  ┌───────────────┐
                │ Neon PostgreSQL │  │    GitHub     │
                │    :5432     │  │ REST/GraphQL  │
                └──────────────┘  └───────┬───────┘
                                          │
                                          │ Webhooks
                                          ▼
                                  Express Webhook API

                    FUTURE — NOT NOW
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Python / FastAPI    │
                    │ AI Orchestrator     │
                    │ Multi-Agent Layer   │
                    └──────────┬──────────┘
                               │
                               ▼
                           Gemini API
```

---

# 73. Coding Agent Instructions

Before implementing:

1. Read this entire `backend-agent.md`.
2. Inspect the existing `GitHub-Backend` directory.
3. Do not modify `GitHub-Frontend` unless explicitly required for API integration.
4. Do not create `GitHub-FastAPI`.
5. Do not install Prisma.
6. Do not install Redis.
7. Do not install/configure Docker.
8. Preserve a clean separation between backend and frontend.
9. Use environment variables for all secrets/configuration.
10. Never hardcode API keys.
11. Never hardcode database credentials.
12. Never hardcode GitHub OAuth secrets.
13. Never expose backend secrets to the frontend.
14. Do not fabricate GitHub data.
15. Use PostgreSQL as the backend source of truth after synchronization.
16. Use GitHub as the external source of engineering activity.
17. Keep the system read-only with respect to repository code.
18. Build incrementally and test each layer before moving forward.
19. Use Postman to verify backend APIs.
20. Keep the implementation ready for future FastAPI AI integration.

The implementation should prioritize:

```text
Correctness
Security
Maintainability
Real GitHub data
Clear API contracts
PostgreSQL integrity
Future extensibility
```

Do not optimize prematurely.

The immediate goal is to produce a **working, demonstrable GitHub Project Monitoring backend** that can connect existing repositories, synchronize their engineering history, store it in PostgreSQL, expose useful REST APIs, and provide the real data required by the already-built Next.js management dashboard.
