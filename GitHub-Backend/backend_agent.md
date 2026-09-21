# GitHub Project Monitoring AI Agent — Backend Implementation Plan

> **Folder:** `GitHub-Backend/`
>
> **Purpose:** Master implementation blueprint for the backend of the GitHub Project Monitoring AI Agent.
>
> **Primary backend stack:** Node.js + TypeScript + Express.js
>
> **Database:** PostgreSQL
>
> **ORM:** Prisma
>
> **Cache / Queue:** Redis + BullMQ
>
> **GitHub integration:** GitHub REST API + GitHub GraphQL API where useful + GitHub Webhooks
>
> **AI:** Gemini API
>
> **Architecture:** Modular monolith first, with background workers and a multi-agent AI layer coordinated by an Orchestrator.
>
> **Critical rule:** This system is strictly READ-ONLY against connected GitHub repositories/projects. It must never push code, commit, create/delete branches, create/modify/merge/close PRs or issues, or otherwise modify GitHub repository state.

---

# 1. Backend Product Definition

The backend is the core intelligence and data-processing layer of the GitHub Project Monitoring AI Agent.

It is responsible for:

```text
GitHub authentication
GitHub repository access
Historical synchronization
Webhook ingestion
GitHub API communication
Data normalization
PostgreSQL persistence
Activity analytics
Developer analytics
Project analytics
Repository analytics
Code-change analysis
Report generation
AI tools
AI agents
Agent orchestration
AI chatbot API
Authentication/session management
Authorization
Caching
Background jobs
```

The frontend must never directly communicate with privileged GitHub APIs.

Architecture:

```text
Next.js Frontend
       |
       v
Node.js + Express Backend
       |
       +---- PostgreSQL
       |
       +---- Redis / BullMQ
       |
       +---- GitHub APIs
       |
       +---- Gemini API
       |
       +---- AI Agents
       |
       +---- Orchestrator
```

---

# 2. Core Business Problem

The company has multiple GitHub projects and repositories where multiple developers work.

The CTO needs a centralized system to understand:

- What work happened?
- When did it happen?
- Which project was affected?
- Which repository was affected?
- Which developer performed the activity?
- How many commits happened?
- How many pushes happened?
- How many PRs were opened?
- How many PRs were merged?
- How many reviews happened?
- How many issues were opened/closed?
- How much code changed?
- Which files changed?
- What features or changes were represented by commits/PRs?
- Which repositories have activity or inactivity?
- What happened during a specific date range?
- What happened on a specific day?
- What happened during the current week?
- Can management ask these questions using natural language?

The backend transforms raw GitHub activity into structured engineering intelligence.

---

# 3. Primary User

The application is designed primarily for:

```text
CTO / Company Management
```

There is no requirement to build separate:

```text
Developer role
Project Manager role
QA role
Admin role
```

for the core MVP.

The application is a management-level engineering monitoring system.

However, backend authentication and authorization should still exist so that only authorized application users can access the system.

---

# 4. Backend Responsibilities

## Backend owns

```text
Authentication
Authorization
GitHub OAuth / GitHub App integration
GitHub API calls
Repository access verification
Historical data synchronization
Webhook processing
Data normalization
Database
Analytics
Aggregation
Developer metrics
Project metrics
Repository metrics
Code-change analysis
Reports
AI tools
AI agents
Orchestrator
Gemini integration
Queues
Caching
Audit logging
```

## Backend does NOT own

```text
Frontend UI
Charts rendering
Browser state
Browser secrets
Direct client-to-GitHub communication
```

---

# 5. High-Level Backend Architecture

```text
                         Next.js Frontend
                                |
                                | HTTPS
                                v
                    +-----------------------+
                    |   Express REST API    |
                    +-----------+-----------+
                                |
             +------------------+------------------+
             |                  |                  |
             v                  v                  v
       Auth Module        Analytics Module    AI Module
             |                  |                  |
             v                  v                  v
       GitHub Module       PostgreSQL       Orchestrator
             |                                     |
             v                         +-----------+-----------+
       GitHub APIs                     |           |           |
                                      v           v           v
                                Activity Agent  PR Agent  Report Agent
                                      |
                                      v
                                   AI Tools
                                      |
                         +------------+------------+
                         |                         |
                         v                         v
                    PostgreSQL                  Gemini
```

Background processing:

```text
GitHub Webhook
      |
      v
Webhook API
      |
      v
Redis / BullMQ
      |
      v
Worker
      |
      v
PostgreSQL
      |
      v
Analytics refresh
```

---

# 6. Recommended Backend Technology Stack

## Runtime

```text
Node.js
```

## Language

```text
TypeScript
```

## Web framework

```text
Express.js
```

Do not use NestJS for the first implementation if the requirement is to keep the backend simple and Express-based.

The architecture should still be modular enough to migrate to NestJS later if necessary.

## Database

```text
PostgreSQL
```

## ORM

```text
Prisma
```

## Cache

```text
Redis
```

## Background jobs

```text
BullMQ
```

## Validation

```text
Zod
```

or DTO validation with a consistent schema layer.

## Authentication

GitHub OAuth / GitHub App + application session/JWT depending on final auth design.

## AI

```text
Google Gemini API
```

## Logging

```text
Pino
```

## Testing

```text
Vitest or Jest
Supertest
```

## API documentation

```text
OpenAPI / Swagger
```

---

# 7. External APIs and Services

The backend can use the following:

| Service | Purpose |
|---|---|
| GitHub REST API | Repositories, commits, PRs, issues, reviews, users, releases, etc. |
| GitHub GraphQL API | Efficient complex queries and relationship-heavy data |
| GitHub Webhooks | Real-time repository activity |
| GitHub OAuth / GitHub App | User/repository authorization |
| Gemini API | Natural-language reasoning, summarization, classification |
| PostgreSQL | Persistent application/analytics data |
| Redis | Cache and job coordination |
| BullMQ | Background synchronization/report jobs |

The GitHub APIs themselves are not an additional paid AI service. API rate limits and GitHub plan/API rules still apply.

Gemini usage depends on the selected Google AI service/model and its current quota/pricing. Keep the model/API key configurable through environment variables.

---

# 8. GitHub Connection Model

A user may authenticate with their GitHub account.

Example:

```text
CTO
 |
 v
GitHub Login
 |
 v
GitHub authorization
 |
 v
Backend receives authorized GitHub identity/token
 |
 v
Backend checks accessible repositories
 |
 v
CTO selects repositories/projects
 |
 v
System synchronizes selected repositories
```

Important:

The connected GitHub account does not need to own the repository.

It only needs sufficient access to read the repository information required by the application.

Example:

```text
BetopiaLtd/beyondAI-new-website
```

If the authenticated GitHub account has access to this repository, the backend can use the authorized GitHub connection to retrieve permitted data.

---

# 9. GitHub Access Architecture

Prefer a GitHub App for production organization-wide deployment when appropriate.

Possible approaches:

## Development / MVP

```text
GitHub OAuth / user-authorized token
```

## Production

```text
GitHub App
```

A GitHub App is preferable for a multi-user organizational system because repository permissions can be explicitly scoped.

Required permissions should be read-only wherever possible.

Conceptually:

```text
Contents          Read
Metadata          Read
Pull requests     Read
Issues            Read
Actions           Read if required
Members           Read if required
Webhooks          Receive events
```

Do not request write permissions unless a future feature explicitly requires them.

For the current product:

```text
WRITE = OFF
```

---

# 10. Read-Only Safety Rule

This is a mandatory architecture requirement.

The backend must not expose tools that can mutate GitHub.

Forbidden operations include:

```text
git push
git commit
create branch
delete branch
modify branch
create PR
update PR
merge PR
close PR
create issue
modify issue
close issue
delete repository
modify repository settings
```

AI agents must never have access to mutation tools.

---

# 11. GitHub API Layer

Create:

```text
src/integrations/github/
```

Recommended:

```text
github.client.ts
github.rest.ts
github.graphql.ts
github.auth.ts
github.mapper.ts
github.rate-limit.ts
github.types.ts
```

The rest of the application must not call GitHub directly.

Bad:

```text
controller -> axios -> GitHub
```

Good:

```text
controller
   |
service
   |
GitHubService
   |
GitHubClient
   |
GitHub API
```

---

# 12. GitHub REST API Responsibilities

Use REST for straightforward resources such as:

```text
Repositories
Commits
Commit details
Pull requests
PR reviews
Issues
Issue comments
Repository metadata
Branches
Releases
Contributors
Events where appropriate
```

Example backend operations:

```text
listRepositories()
getRepository()
listCommits()
getCommit()
listPullRequests()
getPullRequest()
listReviews()
listIssues()
getIssue()
```

---

# 13. GitHub GraphQL API

Use GraphQL where it reduces multiple REST requests.

Good candidates:

```text
Repository relationships
Pull request review relationships
Timeline information
Nested objects
Contributor relationships
Commit/PR associations
```

Do not use GraphQL everywhere simply because it exists.

Choose the API based on:

```text
query complexity
pagination behavior
rate limits
response size
implementation simplicity
```

---

# 14. GitHub Webhooks

Webhooks are essential for near-real-time monitoring.

Recommended events:

```text
push
pull_request
pull_request_review
issues
issue_comment
repository
```

Additional events can be added later.

Webhook flow:

```text
GitHub
   |
   | POST webhook
   v
POST /api/webhooks/github
   |
   v
Verify signature
   |
   v
Identify event
   |
   v
Queue job
   |
   v
BullMQ worker
   |
   v
Normalize data
   |
   v
PostgreSQL
   |
   v
Refresh analytics
```

Never perform heavy processing directly inside the webhook HTTP request.

---

# 15. Webhook Security

Verify:

```text
X-Hub-Signature-256
```

using the configured webhook secret.

Do not trust:

```text
repository
author
action
payload
```

until the webhook signature is verified.

Also protect against:

```text
replay
duplicate delivery
malformed payload
oversized payload
unknown event
```

Store:

```text
delivery ID
event type
received time
processing status
```

---

# 16. Idempotency

GitHub webhook deliveries may be retried.

Every event should have an idempotency strategy.

Example:

```text
githubDeliveryId
```

Database:

```text
unique(deliveryId)
```

If already processed:

```text
return success
```

without duplicating data.

---

# 17. Historical Repository Synchronization

This is one of the most important parts of the system because the user may connect an existing repository that already has six months or more of history.

Example:

```text
Existing repository
        |
        v
Connect to monitoring system
        |
        v
Determine last available history
        |
        v
Fetch historical commits
        |
        v
Fetch historical PRs
        |
        v
Fetch reviews
        |
        v
Fetch issues
        |
        v
Fetch relevant metadata
        |
        v
Normalize
        |
        v
PostgreSQL
```

The system must not assume the repository was created today.

---

# 18. Sync Strategy

Use incremental synchronization.

Initial:

```text
FULL SYNC
```

After that:

```text
INCREMENTAL SYNC
```

Example:

```text
Initial sync:
January → current

Next sync:
Only data after lastSyncedAt
```

For safety, use a small overlap window if necessary to catch updates to existing PRs/issues.

Example:

```text
lastSyncedAt - overlap
```

---

# 19. Sync Jobs

Create queues:

```text
github-initial-sync
github-incremental-sync
github-webhook
analytics
reports
```

Workers:

```text
InitialSyncWorker
IncrementalSyncWorker
WebhookWorker
AnalyticsWorker
ReportWorker
```

---

# 20. Repository Sync State

Store:

```text
repositoryId
lastCommitSyncAt
lastPullRequestSyncAt
lastIssueSyncAt
lastReviewSyncAt
lastWebhookAt
syncStatus
syncError
```

Possible statuses:

```text
PENDING
SYNCING
COMPLETED
PARTIAL
FAILED
```

---

# 21. Project Model

A project is an application-level grouping.

Example:

```text
Project:
BeyondAI

Repositories:
beyondAI-backend
beyondAI-new-website
```

Another:

```text
Project:
VELQON

Repositories:
velqon-backend
velqon-frontend
```

The GitHub repository itself remains unchanged.

The project grouping is maintained in this monitoring application.

---

# 22. Core Database Entities

Minimum entities:

```text
User
GithubConnection
Project
Repository
ProjectRepository
Developer
Commit
CommitFile
PullRequest
PullRequestCommit
PullRequestReview
Issue
IssueComment
ActivityEvent
SyncJob
WebhookDelivery
Report
ReportSnapshot
AIConversation
AIMessage
AIExecution
AgentExecution
```

---

# 23. User

Example:

```text
User
----
id
email
name
avatarUrl
createdAt
updatedAt
```

Do not store unnecessary GitHub secrets here.

---

# 24. GitHub Connection

```text
GithubConnection
----------------
id
userId
githubUserId
githubLogin
accessTokenEncrypted
tokenType
scope
expiresAt
createdAt
updatedAt
```

If using GitHub App installation authentication, store the installation information instead of treating a user token as the universal credential.

Never store access tokens in plaintext.

---

# 25. Project

```text
Project
-------
id
name
description
organization
status
createdAt
updatedAt
```

Status is application-level.

Example:

```text
ACTIVE
ARCHIVED
```

Do not infer developer performance from project status.

---

# 26. Repository

```text
Repository
----------
id
githubRepositoryId
owner
name
fullName
description
defaultBranch
private
language
htmlUrl
githubCreatedAt
githubUpdatedAt
lastSyncedAt
createdAt
updatedAt
```

Unique:

```text
githubRepositoryId
```

---

# 27. ProjectRepository

Many-to-many relationship:

```text
Project
   |
   +--- ProjectRepository ---+
                              |
                              v
                         Repository
```

Fields:

```text
projectId
repositoryId
```

---

# 28. Developer

A developer represents a GitHub identity.

```text
Developer
---------
id
githubUserId
login
name
avatarUrl
emailHash
createdAt
updatedAt
```

Do not depend only on display name because names can change.

Primary identity:

```text
githubUserId
```

---

# 29. Commit

```text
Commit
------
id
githubSha
repositoryId
developerId
message
branch
committedAt
authoredAt
additions
deletions
changedFiles
htmlUrl
createdAt
```

Unique:

```text
repositoryId + githubSha
```

---

# 30. CommitFile

```text
CommitFile
----------
id
commitId
path
status
additions
deletions
changes
```

Status may be:

```text
added
modified
removed
renamed
```

Store only what is required for analytics.

Do not blindly store entire source code snapshots unless a future requirement specifically needs it.

---

# 31. Pull Request

```text
PullRequest
-----------
id
githubPrId
repositoryId
authorDeveloperId
number
title
body
state
draft
createdAtGithub
updatedAtGithub
closedAtGithub
mergedAtGithub
additions
deletions
changedFiles
htmlUrl
```

Unique:

```text
repositoryId + githubPrId
```

---

# 32. Pull Request Review

```text
PullRequestReview
-----------------
id
githubReviewId
pullRequestId
reviewerDeveloperId
state
submittedAt
htmlUrl
```

Possible states:

```text
APPROVED
CHANGES_REQUESTED
COMMENTED
DISMISSED
```

---

# 33. Issue

```text
Issue
-----
id
githubIssueId
repositoryId
authorDeveloperId
number
title
state
createdAtGithub
updatedAtGithub
closedAtGithub
commentsCount
htmlUrl
```

---

# 34. Activity Event

This is one of the most important tables.

```text
ActivityEvent
-------------
id
type
projectId
repositoryId
developerId
referenceType
referenceId
occurredAt
metadata
createdAt
```

Types:

```text
COMMIT
PUSH
PR_OPENED
PR_UPDATED
PR_CLOSED
PR_MERGED
PR_REVIEW
ISSUE_OPENED
ISSUE_UPDATED
ISSUE_CLOSED
ISSUE_COMMENT
```

This allows the frontend to build one unified activity timeline.

---

# 35. Why ActivityEvent Is Important

Instead of asking the dashboard to combine:

```text
commits
PRs
issues
reviews
```

every time, the backend can maintain a normalized activity stream.

Then:

```text
GET /api/activity
```

can return:

```text
09:00 Commit
10:30 PR opened
11:20 Review
14:00 Issue closed
```

---

# 36. Analytics Layer

Create:

```text
src/modules/analytics/
```

Responsibilities:

```text
Dashboard metrics
Project metrics
Repository metrics
Developer metrics
Activity trends
Code change metrics
PR metrics
Issue metrics
```

Analytics should query PostgreSQL, not GitHub, for normal dashboard requests.

GitHub is the source of raw activity.

PostgreSQL becomes the application's analytics source.

---

# 37. Dashboard Overview

Endpoint:

```text
GET /api/dashboard/overview
```

Filters:

```text
from
to
projectId
repositoryId
developerId
```

Return:

```text
projects
repositories
developers
commits
pushes
pullRequests
mergedPullRequests
reviews
issuesOpened
issuesClosed
linesAdded
linesDeleted
activeDays
```

---

# 38. Activity Trend

Endpoint:

```text
GET /api/dashboard/activity-trend
```

Return daily aggregation:

```json
[
  {
    "date": "2026-08-16",
    "commits": 32,
    "pullRequests": 7,
    "reviews": 12,
    "issues": 4,
    "linesAdded": 5200,
    "linesDeleted": 1800
  }
]
```

---

# 39. Project Analytics

Endpoint:

```text
GET /api/projects/:projectId/metrics
```

Metrics:

```text
commits
PRs
mergedPRs
reviews
issues
linesAdded
linesDeleted
activeDays
contributors
repositories
```

---

# 40. Repository Analytics

Endpoint:

```text
GET /api/repositories/:repositoryId/metrics
```

Metrics:

```text
commits
PRs
reviews
issues
contributors
linesChanged
activityByDay
```

---

# 41. Developer Analytics

Endpoint:

```text
GET /api/developers/:developerId/metrics
```

Metrics:

```text
commits
pushes
PRs
mergedPRs
reviews
issues
linesAdded
linesDeleted
activeDays
repositories
projects
```

Important:

The backend should provide descriptive activity metrics.

Do not convert raw activity counts into an automatic "developer score" unless a clearly defined, separately approved business methodology is implemented.

---

# 42. Date Filtering

All analytics endpoints should support:

```text
from
to
```

Example:

```text
GET /api/dashboard/overview?from=2026-08-01&to=2026-08-16
```

Additional filters:

```text
projectId
repositoryId
developerId
```

Use UTC internally.

Convert for display at the frontend/user timezone.

---

# 43. Filter Validation

Validate:

```text
from <= to
valid UUIDs
valid dates
allowed activity types
pagination limits
```

Reject unreasonable ranges if necessary.

Example:

```text
limit <= 100
```

---

# 44. Code Change Analytics

The system should calculate:

```text
lines added
lines deleted
files changed
commits
```

At:

```text
Project
Repository
Developer
Date
```

Example:

```text
Developer A
Aug 16

Lines added: 1,240
Lines deleted: 430
Files changed: 22
Commits: 8
```

These are activity measurements, not a direct measure of software quality or individual performance.

---

# 45. Repeated Code-Change Detection

The user wants to detect situations where code is:

```text
added
removed
added again
```

This should be treated as an advanced analytics signal.

Do not implement a naive:

```text
same line number
```

comparison.

Line numbers change.

Possible approach:

```text
Commit A
   |
added code block
   |
Commit B
   |
removed similar block
   |
Commit C
   |
similar block added again
```

Use normalized code fingerprints or diff similarity.

---

# 46. Code Fingerprinting

Potential V1 strategy:

```text
Normalize changed code
   |
remove insignificant whitespace
   |
normalize line endings
   |
hash blocks
   |
compare hashes/similarity
```

For more advanced analysis:

```text
AST parsing
token similarity
language-specific normalization
```

Keep this feature behind an analytics module because it can become computationally expensive.

---

# 47. Code Similarity Signal

Example:

```text
Repeated Code Change Detected

Repository:
backend

Developer:
Developer A

Period:
Aug 12 - Aug 16

Signal:
A similar code block appears to have been
removed and later reintroduced.
```

Do not automatically label this as:

```text
bad coding
wasted work
developer misconduct
```

It is an observable engineering signal.

---

# 48. Feature Detection

The system may infer likely feature work from:

```text
PR title
PR description
commit messages
changed files
issue titles
labels
```

Example:

```text
PR:
Implement subscription payment flow
```

AI may classify:

```text
Likely feature:
Subscription payment
```

Store:

```text
AI-generated classification
confidence
source references
```

Never present AI-inferred information as a guaranteed fact.

---

# 49. AI Layer

The AI layer is not responsible for collecting all raw GitHub data.

Correct architecture:

```text
GitHub
   |
   v
Data ingestion
   |
   v
PostgreSQL
   |
   v
Analytics / tools
   |
   v
AI Agent
   |
   v
Gemini
```

The AI reasons over trusted application data.

---

# 50. Why Gemini Is Needed

Normal dashboard statistics do not require an LLM.

Example:

```text
How many commits happened?
```

Backend SQL can answer it.

Gemini becomes useful for:

```text
Natural language questions
Summarization
Report narrative
Activity explanation
Feature classification
Cross-project analysis
Follow-up questions
Management-level summaries
```

---

# 51. AI Agent Architecture

Use multiple specialized agents only where they provide clear separation.

Recommended:

```text
                 Orchestrator
                      |
      +---------------+----------------+
      |               |                |
      v               v                v
 Activity Agent   Project Agent    Developer Agent
      |               |                |
      +---------------+----------------+
                      |
             +--------+--------+
             |        |        |
             v        v        v
           PR Agent Issue Agent Report Agent
```

---

# 52. Orchestrator

The Orchestrator is the main AI coordinator.

Responsibilities:

```text
Understand user request
Determine required information
Select agents/tools
Execute tasks
Combine results
Ask follow-up if necessary
Generate final structured response
```

Example:

```text
User:
"Show BeyondAI backend activity on August 16
and tell me who worked on it."
```

Orchestrator:

```text
1. Resolve project
2. Resolve repository
3. Resolve date
4. Ask Activity Agent
5. Ask Developer Agent
6. Combine results
7. Ask Gemini to summarize
8. Return response
```

---

# 53. Agent Communication

Agents should communicate through structured task messages.

Example:

```json
{
  "taskId": "task-123",
  "type": "DEVELOPER_ACTIVITY_ANALYSIS",
  "context": {
    "projectId": "p1",
    "repositoryId": "r1",
    "from": "2026-08-16",
    "to": "2026-08-16"
  }
}
```

Agent result:

```json
{
  "taskId": "task-123",
  "success": true,
  "data": {
    "commits": 32,
    "pullRequests": 7,
    "developers": 6
  },
  "sources": [
    "repository:r1",
    "date:2026-08-16"
  ]
}
```

Agents should not call each other through arbitrary HTTP endpoints inside the same backend.

Use an internal service/agent interface first.

---

# 54. Agent Registry

Create:

```text
src/ai/agents/
```

Example:

```text
agent.registry.ts
activity.agent.ts
project.agent.ts
repository.agent.ts
developer.agent.ts
pr.agent.ts
issue.agent.ts
report.agent.ts
```

Registry:

```typescript
{
  activity: ActivityAgent,
  project: ProjectAgent,
  repository: RepositoryAgent,
  developer: DeveloperAgent,
  pullRequest: PullRequestAgent,
  issue: IssueAgent,
  report: ReportAgent
}
```

---

# 55. Agent Interface

All agents should follow a common interface.

Example:

```typescript
interface Agent {
  name: string;

  canHandle(task: AgentTask): boolean;

  execute(task: AgentTask): Promise<AgentResult>;
}
```

This makes the multi-agent system replaceable and testable.

---

# 56. Activity Agent

Responsibilities:

```text
Activity timeline
Daily activity
Activity counts
Activity trends
Repository activity
Date-range activity
```

Tools:

```text
getActivity()
getActivityTrend()
getDailyActivity()
```

---

# 57. Project Agent

Responsibilities:

```text
Project overview
Project metrics
Repository relationships
Project activity
Project progress signals
```

Tools:

```text
getProject()
getProjectMetrics()
getProjectRepositories()
```

---

# 58. Repository Agent

Responsibilities:

```text
Repository overview
Repository activity
Repository contributors
Repository PRs
Repository issues
```

Tools:

```text
getRepository()
getRepositoryMetrics()
getRepositoryActivity()
```

---

# 59. Developer Agent

Responsibilities:

```text
Developer activity
Commit history
PR activity
Review activity
Code change statistics
Active days
Project/repository participation
```

Tools:

```text
getDeveloper()
getDeveloperMetrics()
getDeveloperActivity()
getDeveloperCommits()
getDeveloperPullRequests()
```

---

# 60. Pull Request Agent

Responsibilities:

```text
PR statistics
Open PRs
Merged PRs
PR duration
Review activity
PR activity by developer
```

Tools:

```text
getPullRequests()
getPullRequestMetrics()
getPRReviews()
```

---

# 61. Issue Agent

Responsibilities:

```text
Issue counts
Opened/closed issues
Issue activity
Issue trends
```

Tools:

```text
getIssues()
getIssueMetrics()
```

---

# 62. Report Agent

Responsibilities:

```text
Daily report
Weekly report
Monthly report
Custom report
Executive summary
Activity summary
```

The Report Agent should receive structured analytics rather than directly querying GitHub.

---

# 63. AI Tools

Create:

```text
src/ai/tools/
```

Possible tools:

```text
resolveProject
resolveRepository
resolveDeveloper
getDashboardMetrics
getActivity
getActivityTrend
getProjectMetrics
getRepositoryMetrics
getDeveloperMetrics
getPullRequestMetrics
getIssueMetrics
getCodeChangeMetrics
generateReport
getReport
```

All tools must be read-only.

---

# 64. AI Tool Security

No AI tool may:

```text
push
commit
merge
create PR
close PR
create issue
close issue
delete branch
modify repository
```

The tool registry should contain only approved read-only tools.

---

# 65. Gemini Integration

Create:

```text
src/integrations/gemini/
```

Files:

```text
gemini.client.ts
gemini.service.ts
gemini.prompts.ts
gemini.schemas.ts
```

The Gemini API key must exist only on the backend.

Environment:

```env
GEMINI_API_KEY=
GEMINI_MODEL=
```

Do not expose either to Next.js.

---

# 66. Gemini Should Not Be the Database

Do not send the entire project history to Gemini.

Bad:

```text
6 months of commits
+
all PRs
+
all issues
+
all diffs
= huge prompt
```

Good:

```text
User question
   |
Orchestrator
   |
Tools
   |
PostgreSQL aggregates
   |
Relevant subset
   |
Gemini
```

---

# 67. AI Context Construction

Example user request:

```text
How much work happened in BeyondAI backend
on August 16?
```

Backend first resolves:

```text
Project = BeyondAI
Repository = beyondAI-backend
Date = 2026-08-16
```

Then queries:

```text
commits
PRs
reviews
issues
lines changed
developers
```

Then provides structured data to Gemini.

---

# 68. AI Response Structure

Return:

```json
{
  "answer": "On August 16...",
  "sources": [],
  "data": {},
  "uiActions": []
}
```

This allows the frontend to display:

```text
Answer
+
Sources
+
Charts/data
+
Navigation actions
```

---

# 69. AI Conversation

Database:

```text
AIConversation
--------------
id
userId
title
createdAt
updatedAt
```

Messages:

```text
AIMessage
---------
id
conversationId
role
content
createdAt
```

Execution:

```text
AIExecution
-----------
id
conversationId
query
intent
agentsUsed
toolsUsed
duration
status
createdAt
```

---

# 70. AI Chat Endpoint

```text
POST /api/ai/chat
```

Request:

```json
{
  "conversationId": "conv-123",
  "message": "Show BeyondAI backend activity on August 16"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "conversationId": "conv-123",
    "answer": "...",
    "sources": [],
    "uiActions": []
  }
}
```

---

# 71. AI Streaming Endpoint

Optional:

```text
GET /api/ai/chat/stream
```

or POST-based SSE implementation depending on the API client.

Streaming should communicate:

```text
thinking status
tool execution status
partial answer
final answer
```

Never expose internal secrets or chain-of-thought.

The UI should receive concise execution/status events, not private reasoning traces.

---

# 72. AI Intent Detection

The Orchestrator should resolve intents such as:

```text
DASHBOARD_QUERY
PROJECT_QUERY
REPOSITORY_QUERY
DEVELOPER_QUERY
ACTIVITY_QUERY
PR_QUERY
ISSUE_QUERY
CODE_CHANGE_QUERY
REPORT_QUERY
```

Example:

```text
"Who worked on the backend yesterday?"

Intent:
DEVELOPER_ACTIVITY_QUERY
```

---

# 73. Entity Resolution

Natural language:

```text
"BeyondAI backend"
```

should resolve to:

```text
Project:
BeyondAI

Repository:
beyondAI-backend
```

Natural language:

```text
"Rahim"
```

should resolve against:

```text
developer login
developer name
GitHub ID
```

If ambiguous:

```text
Multiple developers found.
Which one do you mean?
```

Do not guess.

---

# 74. AI Date Resolution

Examples:

```text
today
yesterday
this week
last week
August 16
August 1 to August 16
```

The backend must resolve these into explicit UTC date/time ranges.

Use the user's configured timezone.

---

# 75. Report Generation

Endpoint:

```text
POST /api/reports
```

Request:

```json
{
  "type": "WEEKLY",
  "projectId": "p1",
  "from": "2026-08-10",
  "to": "2026-08-16"
}
```

Backend:

```text
API
 |
Queue
 |
Report Worker
 |
Analytics
 |
Report Agent
 |
Gemini summary
 |
PostgreSQL
```

---

# 76. Report Types

MVP:

```text
DAILY
WEEKLY
MONTHLY
CUSTOM
```

Future:

```text
PROJECT
REPOSITORY
DEVELOPER_ACTIVITY
EXECUTIVE
```

---

# 77. Report Contents

Example:

```text
Executive Summary

Overall Activity

Commits

Pull Requests

Reviews

Issues

Code Changes

Project Activity

Repository Activity

Developer Activity

Important Signals

AI Summary
```

All factual metrics should come from backend analytics.

AI should summarize, not invent metrics.

---

# 78. Report Snapshot

Reports should store the data snapshot used to generate them.

Example:

```text
Report
  |
  +-- metric snapshot
  +-- AI summary
  +-- date range
  +-- project
  +-- repositories
```

This prevents historical reports from changing unexpectedly when live data later changes.

---

# 79. Background Job Architecture

Use BullMQ.

Queues:

```text
github-sync
github-webhook
analytics
reports
ai-heavy
```

Workers:

```text
SyncWorker
WebhookWorker
AnalyticsWorker
ReportWorker
AIWorker
```

---

# 80. Queue Rules

Never perform large synchronization inside:

```text
HTTP request
```

Instead:

```text
POST /sync
   |
create job
   |
return jobId
```

Then:

```text
Worker
   |
process
   |
update status
```

---

# 81. Sync API

Example:

```text
POST /api/repositories/:repositoryId/sync
```

Response:

```json
{
  "success": true,
  "data": {
    "jobId": "job-123",
    "status": "QUEUED"
  }
}
```

Frontend can then monitor:

```text
GET /api/sync/jobs/:jobId
```

---

# 82. Caching

Use Redis for:

```text
Dashboard aggregate cache
Project metrics
Repository metrics
Developer metrics
GitHub rate-limit state
Short-lived AI context
```

Do not cache sensitive data longer than necessary.

Use cache keys such as:

```text
dashboard:{hash(filters)}
project:{id}:metrics:{hash(filters)}
developer:{id}:metrics:{hash(filters)}
```

---

# 83. Cache Invalidation

When new webhook data arrives:

```text
Webhook
  |
Database update
  |
Invalidate affected cache
  |
Dashboard gets fresh data
```

Do not invalidate the entire cache for every event.

---

# 84. GitHub Rate Limits

GitHub API calls must respect rate limits.

Track:

```text
remaining
limit
resetAt
```

When rate limit is low:

```text
slow down
queue requests
retry after reset
```

Never create uncontrolled retry loops.

---

# 85. Retry Strategy

For temporary errors:

```text
network failure
429
5xx
```

Use exponential backoff.

Example:

```text
1s
2s
4s
8s
```

with maximum attempts.

Do not retry permanent errors indefinitely.

---

# 86. API Rate Limit Architecture

Create:

```text
GitHubRequestManager
```

Responsibilities:

```text
rate-limit tracking
retry
backoff
request logging
request throttling
```

All GitHub API clients should use it.

---

# 87. REST API Structure

Base:

```text
/api
```

Routes:

```text
/api/auth
/api/github
/api/projects
/api/repositories
/api/developers
/api/activity
/api/dashboard
/api/reports
/api/ai
/api/sync
/api/webhooks
/api/health
```

---

# 88. Auth Routes

Example:

```text
GET  /api/auth/github
GET  /api/auth/github/callback
GET  /api/auth/me
POST /api/auth/logout
```

If GitHub App authentication is used, adapt the flow accordingly.

---

# 89. GitHub Routes

```text
GET /api/github/account
GET /api/github/repositories
GET /api/github/installations
POST /api/github/repositories/connect
DELETE /api/github/repositories/:id
```

`connect` means connect the repository to the monitoring system.

It does not modify GitHub.

---

# 90. Project Routes

```text
GET /api/projects
POST /api/projects
GET /api/projects/:id
PATCH /api/projects/:id
DELETE /api/projects/:id
GET /api/projects/:id/metrics
GET /api/projects/:id/activity
```

Project creation/editing is application-level only.

It must not create a GitHub repository.

---

# 91. Repository Routes

```text
GET /api/repositories
GET /api/repositories/:id
GET /api/repositories/:id/metrics
GET /api/repositories/:id/activity
GET /api/repositories/:id/commits
GET /api/repositories/:id/pulls
GET /api/repositories/:id/issues
POST /api/repositories/:id/sync
```

---

# 92. Developer Routes

```text
GET /api/developers
GET /api/developers/:id
GET /api/developers/:id/metrics
GET /api/developers/:id/activity
GET /api/developers/:id/commits
GET /api/developers/:id/pulls
GET /api/developers/:id/reviews
GET /api/developers/:id/code-changes
```

---

# 93. Activity Routes

```text
GET /api/activity
GET /api/activity/:id
GET /api/activity/trend
```

Filters:

```text
from
to
projectId
repositoryId
developerId
type
cursor
limit
```

---

# 94. Dashboard Routes

```text
GET /api/dashboard/overview
GET /api/dashboard/activity-trend
GET /api/dashboard/project-activity
GET /api/dashboard/developer-activity
GET /api/dashboard/signals
```

---

# 95. Report Routes

```text
GET  /api/reports
GET  /api/reports/:id
POST /api/reports
GET  /api/reports/:id/status
```

Optional later:

```text
GET /api/reports/:id/export/pdf
GET /api/reports/:id/export/csv
```

---

# 96. AI Routes

```text
POST /api/ai/chat
GET  /api/ai/conversations
GET  /api/ai/conversations/:id
DELETE /api/ai/conversations/:id
```

Optional:

```text
POST /api/ai/analyze
```

---

# 97. Webhook Route

```text
POST /api/webhooks/github
```

This endpoint must:

```text
verify signature
check delivery ID
identify event
enqueue processing
return quickly
```

---

# 98. Health Routes

```text
GET /api/health
GET /api/health/ready
GET /api/health/live
```

Health checks:

```text
Node
PostgreSQL
Redis
Queue
GitHub configuration
Gemini configuration
```

Do not expose secrets.

---

# 99. Middleware

Recommended:

```text
auth.middleware.ts
error.middleware.ts
request-id.middleware.ts
rate-limit.middleware.ts
validation.middleware.ts
webhook.middleware.ts
```

Request flow:

```text
Request
 ↓
Request ID
 ↓
Security
 ↓
Auth
 ↓
Validation
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
Response
```

---

# 100. Controller/Service/Repository Pattern

Example:

```text
dashboard.controller.ts
        |
        v
dashboard.service.ts
        |
        v
dashboard.repository.ts
        |
        v
PostgreSQL
```

Controller should not contain complex business logic.

---

# 101. Recommended Source Structure

```text
GitHub-Backend/
|
├── src/
│   ├── app.ts
│   ├── server.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── github.ts
│   │
│   ├── routes/
│   │
│   ├── middleware/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── github/
│   │   ├── projects/
│   │   ├── repositories/
│   │   ├── developers/
│   │   ├── activity/
│   │   ├── analytics/
│   │   ├── reports/
│   │   └── sync/
│   │
│   ├── ai/
│   │   ├── orchestrator/
│   │   ├── agents/
│   │   ├── tools/
│   │   ├── prompts/
│   │   └── schemas/
│   │
│   ├── integrations/
│   │   ├── github/
│   │   └── gemini/
│   │
│   ├── queues/
│   │
│   ├── workers/
│   │
│   ├── utils/
│   │
│   └── types/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── tests/
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

# 102. Environment Variables

Example:

```env
NODE_ENV=development
PORT=4000

DATABASE_URL=

REDIS_URL=

APP_URL=
FRONTEND_URL=

SESSION_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=

GEMINI_API_KEY=
GEMINI_MODEL=

LOG_LEVEL=info
```

Never commit `.env`.

Provide:

```text
.env.example
```

without real secrets.

---

# 103. Database Development

Initialize Prisma.

Create:

```text
prisma/schema.prisma
```

Then:

```text
migration
seed
```

Seed only test/demo data.

Production GitHub data must come from GitHub synchronization.

---

# 104. Database Indexing

Important indexes:

```text
Commit(repositoryId, committedAt)
Commit(developerId, committedAt)

PullRequest(repositoryId, createdAtGithub)
PullRequest(authorDeveloperId, createdAtGithub)

PullRequestReview(reviewerDeveloperId, submittedAt)

Issue(repositoryId, createdAtGithub)

ActivityEvent(projectId, occurredAt)
ActivityEvent(repositoryId, occurredAt)
ActivityEvent(developerId, occurredAt)
ActivityEvent(type, occurredAt)
```

Indexes should be based on actual query patterns.

---

# 105. Time Handling

Store timestamps in:

```text
UTC
```

Example:

```text
2026-08-16T09:12:00Z
```

Frontend converts to user timezone.

Date-range queries must define whether the endpoint uses:

```text
date boundaries
```

or:

```text
exact timestamps
```

Do not mix semantics.

---

# 106. Data Normalization

GitHub data may have different representations.

Normalize:

```text
GitHub user
Repository
Commit
PR
Review
Issue
Event
```

before persistence.

Do not let every module understand raw GitHub payloads.

Use mappers:

```text
GitHubCommitMapper
GitHubPRMapper
GitHubIssueMapper
```

---

# 107. Data Source of Truth

For raw GitHub activity:

```text
GitHub
```

For synchronized application data:

```text
PostgreSQL
```

For live incoming changes:

```text
GitHub Webhooks
```

For AI:

```text
PostgreSQL + analytics tools
```

Gemini is not the source of truth.

---

# 108. Data Freshness

Show:

```text
Last synchronized:
2 minutes ago
```

and:

```text
Webhook status
```

If data is stale:

```text
Data may be delayed.
Last sync: ...
```

Do not present stale data as live.

---

# 109. Synchronization Conflict Handling

A PR may change after initial synchronization.

Example:

```text
PR opened
   |
review added
   |
PR updated
   |
PR merged
```

The database record must be updated rather than creating unrelated duplicate PR records.

Use GitHub IDs as stable identifiers.

---

# 110. Audit Logging

Application audit logs should track:

```text
User login
GitHub connection
Repository connected
Repository disconnected
Sync started
Sync completed
Report generated
AI query executed
```

Do not log:

```text
access tokens
API keys
secrets
sensitive raw credentials
```

---

# 111. Application Security

Implement:

```text
Helmet
CORS
Rate limiting
Input validation
Authentication
Authorization
Secure cookies/session
CSRF protection where applicable
Webhook signature verification
Parameterized database queries
Secret management
```

---

# 112. API Rate Limiting

Protect AI endpoint especially.

Example concept:

```text
Normal API:
reasonable per-user rate

AI:
stricter rate

Webhook:
GitHub-controlled endpoint with signature verification
```

Do not allow one user/request source to exhaust Gemini quota.

---

# 113. AI Cost Control

Use Gemini efficiently.

Rules:

```text
Do SQL first
Aggregate first
Send only relevant context
Limit conversation history
Summarize long context
Cache repeated queries where appropriate
Set token limits
Set request timeouts
```

Do not send raw six-month history for every question.

---

# 114. AI Hallucination Protection

The AI response should be grounded in tool output.

For example:

```text
Metric:
32 commits
```

must come from:

```text
database query
```

not from Gemini's memory.

Prompt should instruct:

```text
Use only supplied structured data.
Do not invent metrics.
If information is unavailable, say so.
```

---

# 115. Source Attribution

AI results should include internal source references.

Example:

```json
{
  "source": {
    "type": "analytics",
    "repositoryId": "r1",
    "from": "2026-08-16",
    "to": "2026-08-16"
  }
}
```

For GitHub entities:

```json
{
  "source": {
    "type": "github",
    "url": "https://github.com/..."
  }
}
```

---

# 116. AI Failure Handling

If Gemini fails:

```text
Do not fail the entire analytics system.
```

For example:

```text
Dashboard metrics:
still available

AI summary:
temporarily unavailable
```

The system should degrade gracefully.

---

# 117. AI Agent Failure Handling

If one agent fails:

```text
Orchestrator
   |
   +--- Activity Agent ✓
   +--- Developer Agent ✓
   +--- PR Agent ✗
```

Return:

```text
Partial result
```

with a clear indication:

```text
PR information could not be retrieved.
```

Do not invent missing data.

---

# 118. Orchestrator Execution Model

Recommended:

```text
User query
   |
Intent extraction
   |
Entity resolution
   |
Task planning
   |
Agent selection
   |
Parallel execution where possible
   |
Result validation
   |
Aggregation
   |
Gemini summary
   |
Structured response
```

Parallel example:

```text
Activity Agent
Developer Agent
PR Agent
Issue Agent
```

can execute concurrently if independent.

---

# 119. Agent Result Contract

Every agent should return:

```typescript
interface AgentResult<T> {
  success: boolean;
  data?: T;
  sources: SourceReference[];
  errors?: AgentError[];
  metadata?: {
    durationMs?: number;
    records?: number;
  };
}
```

This makes orchestration predictable.

---

# 120. Orchestrator Safety

The Orchestrator must have:

```text
maximum steps
maximum agents
maximum tool calls
timeout
retry policy
```

Example:

```text
maxAgentCalls = 8
maxToolCalls = 20
timeout = 30 seconds
```

Adjust based on actual requirements.

---

# 121. AI Tool Calling

Preferred flow:

```text
Gemini
   |
structured tool request
   |
backend validates tool
   |
tool executes
   |
structured result
   |
Gemini
   |
final answer
```

Never allow the model to execute arbitrary backend functions.

---

# 122. Tool Registry

Create an explicit registry:

```typescript
const readOnlyTools = {
  getDashboardMetrics,
  getProjectMetrics,
  getRepositoryMetrics,
  getDeveloperMetrics,
  getActivity,
  getPullRequestMetrics,
  getIssueMetrics,
  getCodeChangeMetrics,
  generateReport
};
```

No dynamic tool loading from user input.

---

# 123. API Response Standard

Success:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Failure:

```json
{
  "success": false,
  "message": "Repository not found",
  "code": "REPOSITORY_NOT_FOUND"
}
```

Use consistent HTTP status codes.

---

# 124. Error Classes

Create:

```text
AppError
ValidationError
AuthenticationError
AuthorizationError
NotFoundError
GitHubApiError
RateLimitError
AIServiceError
DatabaseError
SyncError
```

Central error middleware converts them into safe responses.

---

# 125. Logging

Use structured logs.

Example:

```json
{
  "level": "info",
  "requestId": "req-123",
  "event": "github_sync_completed",
  "repositoryId": "repo-1",
  "durationMs": 4210
}
```

Never:

```text
console.log(accessToken)
```

---

# 126. Testing Strategy

## Unit tests

Test:

```text
analytics calculations
date filtering
GitHub mappers
entity resolution
agent selection
tool validation
report calculations
code similarity
```

## Integration tests

Test:

```text
PostgreSQL
Redis
GitHub service mocks
Gemini service mocks
API routes
```

## E2E tests

Test:

```text
authentication
repository connection
sync
dashboard
developer tracking
reports
AI chatbot
```

---

# 127. GitHub API Mocking

Do not make thousands of real GitHub requests during tests.

Mock:

```text
GitHub REST
GitHub GraphQL
GitHub Webhooks
```

Use fixture payloads.

Example:

```text
tests/fixtures/github/
    repository.json
    commits.json
    pull-request.json
    reviews.json
    issues.json
```

---

# 128. AI Testing

Do not depend on live Gemini responses for every test.

Mock Gemini:

```text
GeminiMock
```

Test:

```text
tool selection
orchestrator
structured response
failure handling
hallucination safeguards
```

Use a small number of optional integration tests against the real API.

---

# 129. Sync Testing

Test:

```text
initial sync
incremental sync
duplicate event
failed API request
rate limit
pagination
repository with zero commits
repository with thousands of commits
```

---

# 130. Pagination Testing

GitHub APIs paginate.

The sync layer must continue until:

```text
next page = none
```

or an explicit sync limit is reached.

Never assume one API request returns all commits/PRs/issues.

---

# 131. Large Repository Handling

For large repositories:

```text
queue work
paginate
batch database writes
limit concurrency
track progress
retry failed pages
```

Do not load an entire repository history into memory.

---

# 132. Database Batch Processing

Use:

```text
batch insert
upsert
transactions where appropriate
```

Do not insert one database row per HTTP request.

---

# 133. Sync Progress

Track:

```text
total discovered
processed
failed
skipped
```

Example:

```text
Commits:
processed 12,420

PRs:
processed 540

Issues:
processed 320
```

Frontend can display this.

---

# 134. Project Connection Workflow

Example:

```text
1. CTO authenticates GitHub
2. Backend retrieves accessible repositories
3. CTO selects repository
4. Backend stores repository metadata
5. CTO optionally associates repository with project
6. Initial sync job starts
7. Worker imports historical data
8. Webhook monitoring starts
9. Analytics become available
```

No GitHub repository is created by this process.

---

# 135. Existing Six-Month Project Workflow

Example:

```text
Existing GitHub repo
       |
       v
Connect
       |
       v
Repository metadata
       |
       v
Initial historical sync
       |
       +---- commits
       +---- PRs
       +---- reviews
       +---- issues
       +---- relevant metadata
       |
       v
PostgreSQL
       |
       v
Analytics
       |
       v
Dashboard
       |
       v
AI Agent
```

This is a first-class requirement.

---

# 136. Multi-Project Architecture

The database must support:

```text
Project A
  ├── Backend Repo
  └── Frontend Repo

Project B
  ├── Backend Repo
  └── Frontend Repo

Project C
  └── Single Repo
```

A repository can be connected to a project through:

```text
ProjectRepository
```

Avoid hard-coding:

```text
one project = two repositories
```

because the product must support any number.

---

# 137. Multi-Repository Architecture

A project can have:

```text
1 repository
2 repositories
10 repositories
```

The dashboard aggregates across selected repositories.

---

# 138. Multi-Organization Future Support

The architecture should not assume one GitHub organization forever.

Support:

```text
GitHub user
GitHub organization
GitHub App installation
multiple repositories
```

in the data model.

---

# 139. Deployment Architecture

Recommended production:

```text
                    Internet
                       |
                       v
                 Reverse Proxy
                       |
              +--------+--------+
              |                 |
              v                 v
        Next.js Frontend   Express API
                                |
                  +-------------+-------------+
                  |             |             |
                  v             v             v
             PostgreSQL      Redis       Worker
                                               |
                                     +---------+---------+
                                     |                   |
                                     v                   v
                                  GitHub              Gemini
```

Frontend and backend may be deployed separately.

---

# 140. Docker

Recommended:

```text
Docker
Docker Compose
```

Development services:

```text
frontend
backend
postgres
redis
worker
```

Optional:

```text
nginx
```

---

# 141. Development Docker Compose

Conceptually:

```text
docker-compose.yml

services:
  postgres
  redis
  backend
  worker
  frontend
```

Do not place secrets directly in the compose file.

Use `.env`.

---

# 142. Production Separation

Production should allow:

```text
API instances
Worker instances
PostgreSQL
Redis
Frontend
```

to scale independently.

---

# 143. Observability

Track:

```text
API latency
GitHub API errors
GitHub rate limits
Sync duration
Queue depth
Worker failures
Database performance
AI request latency
AI failures
```

Later integrate:

```text
Sentry
OpenTelemetry
Prometheus/Grafana
```

if required.

---

# 144. Monitoring Dashboard

Internal operational metrics can include:

```text
Last GitHub sync
Webhook health
Queue status
Database health
Redis health
AI availability
API error rate
```

These are separate from engineering activity analytics.

---

# 145. MVP Scope

The first production-capable MVP should include:

```text
GitHub authentication
Repository connection
Historical sync
Webhook ingestion
PostgreSQL
Dashboard APIs
Project APIs
Repository APIs
Developer APIs
Activity APIs
Date filtering
Project filtering
Repository filtering
Developer filtering
Basic reports
AI chatbot
Orchestrator
Basic specialized agents
Gemini integration
Read-only security
```

---

# 146. Post-MVP

Later implement:

```text
Advanced code similarity
AST analysis
Advanced anomaly detection
More sophisticated engineering signals
Scheduled reports
Email delivery
Slack notifications
Advanced executive reports
Forecasting
ML-based classification
Organization-wide analytics
Advanced permissions
```

Do not build all of these before the core pipeline works.

---

# 147. Implementation Order

Follow this exact sequence.

```text
Phase 1
Project initialization
        ↓
Phase 2
Express + TypeScript architecture
        ↓
Phase 3
PostgreSQL + Prisma
        ↓
Phase 4
Redis + BullMQ
        ↓
Phase 5
GitHub authentication
        ↓
Phase 6
GitHub API client
        ↓
Phase 7
Repository connection
        ↓
Phase 8
Historical synchronization
        ↓
Phase 9
Webhook ingestion
        ↓
Phase 10
Activity normalization
        ↓
Phase 11
Analytics services
        ↓
Phase 12
Dashboard APIs
        ↓
Phase 13
Project/Repository APIs
        ↓
Phase 14
Developer analytics
        ↓
Phase 15
Report engine
        ↓
Phase 16
Gemini integration
        ↓
Phase 17
AI tools
        ↓
Phase 18
Specialized agents
        ↓
Phase 19
Orchestrator
        ↓
Phase 20
AI chatbot API
        ↓
Phase 21
Security hardening
        ↓
Phase 22
Testing
        ↓
Phase 23
Docker/deployment
        ↓
Phase 24
Production monitoring
```

---

# 148. Phase 1 — Initialize

Inside:

```text
GitHub-Backend/
```

Initialize:

```text
Node.js
TypeScript
Express
ESLint
Prettier
```

Scripts:

```text
dev
build
start
lint
test
test:e2e
```

---

# 149. Phase 2 — Express Architecture

Implement:

```text
app.ts
server.ts
routes
middleware
config
modules
```

First endpoint:

```text
GET /api/health
```

Expected:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

---

# 150. Phase 3 — PostgreSQL

Implement:

```text
Prisma
schema
migrations
repositories
```

Create initial models:

```text
User
GithubConnection
Project
Repository
ProjectRepository
Developer
Commit
PullRequest
PullRequestReview
Issue
ActivityEvent
```

---

# 151. Phase 4 — Redis and Queues

Implement:

```text
Redis connection
BullMQ
queue definitions
worker bootstrap
```

Test with:

```text
test job
```

before implementing GitHub synchronization.

---

# 152. Phase 5 — GitHub Authentication

Implement:

```text
GitHub OAuth
```

or the selected GitHub App flow.

Test:

```text
login
callback
identity retrieval
logout
```

Store credentials securely.

---

# 153. Phase 6 — GitHub Client

Implement:

```text
REST client
GraphQL client
rate-limit manager
pagination helper
error mapper
```

Test using mocked GitHub responses.

---

# 154. Phase 7 — Repository Connection

Implement:

```text
list accessible repositories
connect repository
store repository metadata
associate with project
```

No repository creation is required.

---

# 155. Phase 8 — Historical Sync

Implement:

```text
InitialSyncService
```

Sequence:

```text
Repository
  ↓
Metadata
  ↓
Commits
  ↓
PRs
  ↓
PR reviews
  ↓
Issues
  ↓
Activity events
```

Run through BullMQ.

---

# 156. Phase 9 — Webhooks

Implement:

```text
signature verification
delivery ID
event mapping
queue
worker
```

Handle:

```text
push
pull_request
pull_request_review
issues
issue_comment
repository
```

---

# 157. Phase 10 — Normalization

Create:

```text
GitHub -> internal models
```

Every event must be normalized before analytics.

---

# 158. Phase 11 — Analytics

Implement:

```text
DashboardAnalyticsService
ProjectAnalyticsService
RepositoryAnalyticsService
DeveloperAnalyticsService
ActivityAnalyticsService
CodeChangeAnalyticsService
```

Each service must support date/filter parameters.

---

# 159. Phase 12 — Dashboard APIs

Implement:

```text
overview
activity trend
project activity
developer activity
signals
```

Test against actual synchronized data.

---

# 160. Phase 13 — Management APIs

Implement:

```text
projects
repositories
developers
activity
```

Add:

```text
pagination
filters
sorting
```

where appropriate.

---

# 161. Phase 14 — Developer Analytics

Implement:

```text
developer overview
developer activity
developer commits
developer PRs
developer reviews
developer code changes
```

Use descriptive metrics.

Avoid unsupported judgments about developer quality.

---

# 162. Phase 15 — Report Engine

Implement:

```text
report request
report queue
analytics snapshot
AI summary
report storage
report retrieval
```

Start with:

```text
daily
weekly
custom
```

---

# 163. Phase 16 — Gemini

Implement:

```text
Gemini client
timeout
retry
token limits
structured output
error handling
```

Do not expose Gemini credentials.

---

# 164. Phase 17 — AI Tools

Build read-only tools:

```text
getDashboardMetrics
getActivity
getProjectMetrics
getRepositoryMetrics
getDeveloperMetrics
getPRMetrics
getIssueMetrics
getCodeChangeMetrics
generateReport
```

Test every tool independently.

---

# 165. Phase 18 — Agents

Implement:

```text
ActivityAgent
ProjectAgent
RepositoryAgent
DeveloperAgent
PullRequestAgent
IssueAgent
ReportAgent
```

Every agent must use approved tools.

---

# 166. Phase 19 — Orchestrator

Implement:

```text
IntentResolver
EntityResolver
TaskPlanner
AgentRegistry
AgentExecutor
ResultAggregator
ResponseGenerator
```

Flow:

```text
User question
 ↓
Intent
 ↓
Entities
 ↓
Plan
 ↓
Agents
 ↓
Tools
 ↓
Results
 ↓
Gemini
 ↓
Structured response
```

---

# 167. Phase 20 — AI Chat API

Implement:

```text
conversation
message
execution
source
UI action
```

Support follow-up questions.

---

# 168. Phase 21 — Security Hardening

Verify:

```text
No GitHub write permissions
No GitHub token in frontend
No Gemini key in frontend
Webhook signatures
Authentication
Authorization
Rate limits
Input validation
Secure cookies
CORS
Helmet
Audit logs
```

---

# 169. Phase 22 — Testing

Required:

```text
Unit tests
Integration tests
API tests
Sync tests
Webhook tests
Analytics tests
AI tool tests
Agent tests
Orchestrator tests
E2E tests
```

---

# 170. Phase 23 — Deployment

Create:

```text
Dockerfile
docker-compose.yml
.env.example
README.md
```

Build:

```text
backend
worker
```

Deploy with:

```text
PostgreSQL
Redis
API
Worker
```

---

# 171. Phase 24 — Production Monitoring

Monitor:

```text
API
database
Redis
workers
GitHub rate limits
webhooks
sync
AI
```

Add alerts for:

```text
sync failure
webhook failure
queue backlog
GitHub rate-limit exhaustion
database unavailable
AI unavailable
```

---

# 172. Frontend Integration Contract

The backend must support the frontend architecture defined in:

```text
GitHub-Frontend/agent.md
```

The backend should provide APIs for:

```text
Dashboard
Projects
Repositories
Developers
Activity
Reports
GitHub Connection
AI
```

Do not build frontend-specific business logic into backend responses.

Return clean structured data.

---

# 173. Frontend Filter Contract

Every relevant endpoint should accept:

```text
from
to
projectId
repositoryId
developerId
```

Example:

```text
GET /api/dashboard/overview
    ?from=2026-08-01
    &to=2026-08-16
    &projectId=p1
    &repositoryId=r1
    &developerId=d1
```

---

# 174. API Versioning

Recommended:

```text
/api/v1/
```

Example:

```text
/api/v1/dashboard/overview
```

This makes future API changes safer.

If V1 is not introduced initially, structure the routing layer so versioning can be added without rewriting business logic.

---

# 175. API Documentation

Use OpenAPI.

Document:

```text
authentication
projects
repositories
developers
activity
dashboard
reports
AI
sync
webhooks
```

Every endpoint should define:

```text
request
response
query params
errors
authentication
```

---

# 176. Backend Definition of Done

The backend MVP is complete when:

- Express server runs
- PostgreSQL works
- Prisma migrations work
- Redis works
- BullMQ works
- GitHub authentication works
- Existing repositories can be connected
- Historical repository data can be synchronized
- Webhooks are verified and processed
- GitHub data is normalized
- Data is stored in PostgreSQL
- Dashboard metrics API works
- Project API works
- Repository API works
- Developer API works
- Activity API works
- Date filters work
- Project filters work
- Repository filters work
- Developer filters work
- Reports work
- Gemini integration works
- Read-only AI tools work
- Specialized agents work
- Orchestrator works
- AI chat API works
- Secrets are protected
- GitHub mutation operations are unavailable
- Tests pass
- Docker deployment works

---

# 177. Critical Read-Only Architecture Verification

Before production, verify that the application cannot:

```text
git push                 NO
git commit               NO
create branch            NO
delete branch            NO
create PR                NO
modify PR                NO
merge PR                 NO
close PR                 NO
create issue             NO
modify issue             NO
close issue              NO
delete repository        NO
modify repository        NO
```

The backend should only retrieve, analyze, store, aggregate, report, and visualize GitHub information.

---

# 178. Final Backend Architecture

```text
                         CTO / Management
                                |
                                v
                         Next.js Frontend
                                |
                                v
                     Node.js + Express API
                                |
       +------------------------+-------------------------+
       |                        |                         |
       v                        v                         v
   Auth Module             Analytics Module            AI Module
       |                        |                         |
       v                        v                         v
GitHub Integration         PostgreSQL              Orchestrator
       |                                                  |
       |                                  +---------------+---------------+
       |                                  |       |       |       |       |
       v                                  v       v       v       v       v
 GitHub REST/GraphQL                 Activity Project Developer PR    Report
       |
       +----------------------+
       |
       v
   GitHub Webhooks
       |
       v
  BullMQ / Redis
       |
       v
 Background Workers
       |
       v
 PostgreSQL
```

---

# 179. Complete Data Flow

## Existing repository

```text
GitHub Repository
       |
       v
GitHub Authentication
       |
       v
Repository Access Check
       |
       v
Connect Repository
       |
       v
Initial Sync Queue
       |
       v
GitHub API
       |
       +---- Commits
       +---- PRs
       +---- Reviews
       +---- Issues
       +---- Metadata
       |
       v
Normalization
       |
       v
PostgreSQL
       |
       v
Analytics
       |
       v
Dashboard
```

---

# 180. Real-Time Data Flow

```text
Developer pushes code
        |
        v
GitHub
        |
        v
Webhook
        |
        v
Express Webhook Endpoint
        |
        v
Signature Verification
        |
        v
BullMQ
        |
        v
Webhook Worker
        |
        v
PostgreSQL
        |
        v
Invalidate Cache
        |
        v
Frontend gets updated data
```

---

# 181. AI Data Flow

```text
CTO
 |
 | "What happened in BeyondAI backend yesterday?"
 |
 v
Next.js
 |
 v
POST /api/v1/ai/chat
 |
 v
Orchestrator
 |
 +--> Resolve project
 |
 +--> Resolve repository
 |
 +--> Resolve date
 |
 +--> Activity Agent
 |
 +--> Developer Agent
 |
 +--> PR Agent
 |
 v
Read-only tools
 |
 v
PostgreSQL analytics
 |
 v
Structured results
 |
 v
Gemini
 |
 v
Grounded summary
 |
 v
Sources + UI actions
 |
 v
Next.js
 |
 v
CTO
```

---

# 182. The Most Important Architectural Principle

Do not build the system as:

```text
CTO
 ↓
Gemini
 ↓
GitHub
```

Build it as:

```text
GitHub
 ↓
Data Ingestion
 ↓
PostgreSQL
 ↓
Analytics
 ↓
Read-only AI Tools
 ↓
Specialized Agents
 ↓
Orchestrator
 ↓
Gemini
 ↓
Management Answer
```

This makes the system:

```text
Reliable
Auditable
Faster
Cheaper
Secure
Scalable
```

---

# 183. What the AI Actually Does

The AI is not responsible for:

```text
counting database rows
calculating commits
storing GitHub data
fetching six months of raw history for every question
```

The backend does those things.

The AI is responsible for:

```text
understanding natural language
resolving intent
selecting tools/agents
combining information
summarizing results
explaining patterns
generating management reports
```

---

# 184. What the Multi-Agent System Actually Does

Example:

```text
Question:
"Tell me what happened in the Enosis backend
on August 16 and who worked on it."
```

Orchestrator:

```text
                    Orchestrator
                         |
          +--------------+--------------+
          |                             |
          v                             v
    Activity Agent                Developer Agent
          |                             |
          v                             v
   Activity Tool                  Developer Tool
          |                             |
          +--------------+--------------+
                         |
                         v
                    Result Merge
                         |
                         v
                       Gemini
                         |
                         v
                  Final Response
```

Agents do not need separate servers.

They can initially be modules inside the same Express backend.

---

# 185. When to Split Agents into Separate Services

Do not start with microservices.

Start:

```text
One Express backend
    |
    +-- Orchestrator
    +-- Activity Agent
    +-- Developer Agent
    +-- PR Agent
    +-- Report Agent
```

Later, if scale requires:

```text
AI Orchestrator Service
Activity Agent Service
Report Agent Service
Analytics Service
```

This reduces initial complexity.

---

# 186. Optional FastAPI Layer

The project already contains:

```text
GitHub-FastAPI/
```

Do not make FastAPI mandatory for the first backend.

Keep:

```text
Node.js + Express
```

as the main application backend.

Use FastAPI later only if the project needs Python-specific functionality such as:

```text
AST/code analysis
machine learning
advanced similarity models
NLP pipelines
custom ML inference
```

Architecture later:

```text
Express
   |
   v
Python FastAPI
   |
   v
ML / code analysis
```

Do not introduce it just because the project contains AI.

---

# 187. Final Project Relationship

```text
GitHub-Project-Monitoring-Agent/
|
├── GitHub-Frontend/
│      |
│      └── Next.js CTO Dashboard
│
├── GitHub-Backend/
│      |
│      ├── Express API
│      ├── GitHub Integration
│      ├── PostgreSQL
│      ├── Redis/BullMQ
│      ├── Analytics
│      ├── Reports
│      └── AI Agents + Orchestrator
│
├── GitHub-FastAPI/
│      |
│      └── Optional future ML/code-analysis service
│
└── agent.md
```

---

# 188. Final Implementation Rule for the Coding Agent

When implementing this backend:

1. Read this `agent.md` completely.
2. Inspect the existing `GitHub-Backend/` code before creating files.
3. Do not overwrite working code without understanding it.
4. Implement incrementally by phase.
5. Keep TypeScript strict.
6. Keep modules separated.
7. Keep controllers thin.
8. Put business logic in services.
9. Keep database access in repositories/data-access modules.
10. Centralize GitHub API communication.
11. Centralize Gemini communication.
12. Keep all AI tools read-only.
13. Never expose secrets.
14. Never create GitHub mutation functionality.
15. Use PostgreSQL as the application's synchronized data source.
16. Use BullMQ for long-running sync/report operations.
17. Use webhooks for near-real-time updates.
18. Use historical synchronization for existing repositories.
19. Never assume a project has exactly two repositories.
20. Never assume a project was created after this monitoring system.
21. Never fabricate GitHub activity.
22. Never fabricate AI metrics.
23. If information is unavailable, return an explicit "not available" result.
24. Add tests for every major module.
25. Keep the backend compatible with the frontend API contract.
26. Do not introduce FastAPI unless a real Python/ML requirement exists.
27. Keep the architecture modular so the AI agent layer can evolve without rewriting the core analytics system.

---

# 189. Final Backend Goal

The completed backend should provide one reliable platform where:

```text
Any authorized CTO
       |
       v
Connects accessible GitHub repositories
       |
       v
Existing historical data is synchronized
       |
       v
New GitHub activity arrives through webhooks
       |
       v
All data is normalized and stored
       |
       v
Analytics are calculated
       |
       +----------------------+
       |                      |
       v                      v
Management Dashboard       AI Agent
       |                      |
       |                      v
       |                 Orchestrator
       |                      |
       |               Specialized Agents
       |                      |
       |                  Read-only Tools
       |                      |
       +----------+-----------+
                  |
                  v
          Same trusted data
```

The end result is a **read-only GitHub Engineering Intelligence backend** that can monitor multiple projects and repositories, preserve historical activity, calculate engineering metrics, generate reports, and provide a grounded multi-agent AI interface for CTO-level investigation.
