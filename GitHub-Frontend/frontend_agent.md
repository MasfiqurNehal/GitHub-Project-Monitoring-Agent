# GitHub Project Monitoring AI Agent — Frontend Implementation Plan

> **Folder:** `GitHub-Frontend/`
>
> **Purpose:** Complete implementation blueprint for the frontend application of the GitHub Project Monitoring AI Agent.
>
> **Primary user:** CTO / Management
>
> **Frontend stack:** Next.js + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query + Recharts/ECharts
>
> **Backend:** Node.js + Express.js REST API
>
> **AI:** Gemini-powered backend Agent/Orchestrator
>
> **Core principle:** The frontend is a management interface and AI workspace. It never talks directly to GitHub APIs and never stores GitHub secrets. All GitHub data comes through the backend.

---

# 1. Frontend Product Definition

The frontend is a web-based CTO dashboard for monitoring existing GitHub projects and repositories.

The frontend provides:

- Organization/project overview
- Repository overview
- Developer activity
- Commit history
- Pull request activity
- PR review activity
- Issue activity
- Code-change statistics
- Date-based filtering
- Project filtering
- Repository filtering
- Developer filtering
- Activity timeline
- Charts and visualizations
- AI Agent chatbot
- AI-generated reports
- Project/repository/developer drill-down
- Connection/synchronization status
- Activity signals and alerts

The frontend does not modify GitHub repositories.

---

# 2. Frontend Goals

The frontend should allow a CTO to answer:

- What is happening across all projects?
- Which projects are active?
- Which repositories are active?
- What happened on a specific date?
- What happened during a date range?
- Which developers worked on a project?
- What did a specific developer work on?
- How many commits/PRs/reviews/issues occurred?
- How much code changed?
- What are the major engineering activities?
- Are there repositories with little/no activity?
- Are there PRs that have remained open for a long time?
- Can I ask the AI Agent these questions directly?

---

# 3. Frontend Architecture

```text
                    CTO
                     |
                     v
          +----------------------+
          |    Next.js Frontend  |
          +----------+-----------+
                     |
        +------------+-------------+
        |                          |
        v                          v
   Dashboard UI               AI Chat UI
        |                          |
        +------------+-------------+
                     |
                     v
              API Client Layer
                     |
                     v
          Node.js / Express API
                     |
        +------------+-------------+
        |                          |
        v                          v
     PostgreSQL                AI Agent
                                   |
                              Orchestrator
                                   |
                              Gemini API
```

Important:

```text
Frontend
   |
   X ---> GitHub API directly
   |
   v
Backend API
   |
   v
GitHub / Database / AI
```

The browser must not directly use:

- GitHub personal access tokens
- GitHub App private keys
- Gemini API keys
- Database credentials

---

# 4. Recommended Technology Stack

## Core

- Next.js
- TypeScript
- React
- Tailwind CSS

## UI

- shadcn/ui
- Radix UI components through shadcn/ui
- Lucide icons

## Data fetching

- TanStack Query

## Forms

- React Hook Form
- Zod

## Charts

Choose one:

- Recharts
- Apache ECharts

Recommended initial choice:

```text
Recharts
```

Use ECharts later if advanced visualizations are required.

## Tables

Use:

- TanStack Table

## Dates

Use:

- date-fns

## State

Use:

- URL search parameters for dashboard filters
- React state for local UI state
- TanStack Query for server state
- Zustand only if global client state becomes necessary

Do not create a large global state store unnecessarily.

---

# 5. Next.js Architecture

Use the Next.js App Router.

Recommended:

```text
app/
  layout.tsx
  page.tsx
  dashboard/
  projects/
  repositories/
  developers/
  activity/
  reports/
  ai/
  settings/
```

Use Server Components by default.

Use Client Components only where interaction is required:

- Filters
- Charts requiring browser interaction
- Tables with sorting
- Chat interface
- Modals
- Dropdowns
- Date pickers
- Interactive timelines

---

# 6. Recommended Frontend Folder Structure

```text
GitHub-Frontend/
|
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   │
│   ├── dashboard/
│   │   └── page.tsx
│   │
│   ├── projects/
│   │   ├── page.tsx
│   │   └── [projectId]/
│   │       └── page.tsx
│   │
│   ├── repositories/
│   │   ├── page.tsx
│   │   └── [repositoryId]/
│   │       └── page.tsx
│   │
│   ├── developers/
│   │   ├── page.tsx
│   │   └── [developerId]/
│   │       └── page.tsx
│   │
│   ├── activity/
│   │   └── page.tsx
│   │
│   ├── reports/
│   │   ├── page.tsx
│   │   └── [reportId]/
│   │       └── page.tsx
│   │
│   ├── ai/
│   │   └── page.tsx
│   │
│   └── settings/
│       └── page.tsx
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── dashboard/
│   ├── projects/
│   ├── repositories/
│   ├── developers/
│   ├── activity/
│   ├── reports/
│   ├── ai/
│   ├── filters/
│   ├── charts/
│   └── common/
│
├── features/
│   ├── dashboard/
│   ├── projects/
│   ├── repositories/
│   ├── developers/
│   ├── activity/
│   ├── reports/
│   └── ai/
│
├── lib/
│   ├── api/
│   ├── auth/
│   ├── query/
│   ├── utils/
│   ├── constants/
│   └── validators/
│
├── hooks/
│
├── types/
│
├── config/
│
├── public/
│
└── tests/
```

---

# 7. Application Layout

The application should have a persistent management layout.

```text
+-------------------------------------------------------------+
| Logo | GitHub Engineering Intelligence       Search | CTO  |
+-------------------------------------------------------------+
|         |                                                   |
| Dashboard|                                                   |
| Projects |                                                   |
| Repos    |              MAIN CONTENT                         |
| Developers|                                                  |
| Activity |                                                   |
| Reports  |                                                   |
| AI Agent |                                                   |
| Settings |                                                   |
|         |                                                   |
+---------+---------------------------------------------------+
```

Sidebar:

```text
Dashboard
Projects
Repositories
Developers
Activity
Reports
AI Agent
Settings
```

---

# 8. Visual Design Direction

The product is for a CTO/management audience.

Design goals:

- Professional
- Premium
- Clean
- Data-focused
- Modern
- High information density without visual clutter
- Responsive
- Accessible

Recommended:

```text
Light theme:
White / neutral background
Dark text
Subtle borders
Blue/indigo accent

Dark theme:
Dark navy/charcoal background
Light text
Subtle borders
Blue/indigo accent
```

Do not use excessive gradients, animations, or decorative elements.

The data should be the visual focus.

---

# 9. Main Dashboard

Route:

```text
/dashboard
```

The dashboard is the primary page.

Structure:

```text
Dashboard

[Date Filter] [Project] [Repository] [Developer]

---------------------------------------------------

Projects       Repositories       Developers
8              17                 42

Commits        PRs                Reviews
1,284          342                518

Issues Closed  Lines Added       Lines Deleted
194            84,210             31,420

---------------------------------------------------

Activity Trend

[Line Chart]

---------------------------------------------------

Project Activity

[Bar Chart]

---------------------------------------------------

Developer Activity

[Table]

---------------------------------------------------

Recent Activity

[Timeline]
```

---

# 10. Dashboard KPI Cards

Create reusable component:

```text
components/dashboard/KpiCard.tsx
```

Props:

```typescript
interface KpiCardProps {
  title: string;
  value: number | string;
  change?: number;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
}
```

KPI cards:

- Projects
- Repositories
- Developers
- Commits
- Pushes
- PRs
- PRs Merged
- Reviews
- Issues
- Lines Added
- Lines Deleted

Do not show fake values.

During loading:

```text
Skeleton
```

---

# 11. Global Filter System

Create:

```text
components/filters/
```

Components:

```text
DateRangeFilter
ProjectFilter
RepositoryFilter
DeveloperFilter
ActivityTypeFilter
ClearFiltersButton
```

The filters should be reusable across pages.

---

# 12. URL-Based Filters

Use URL search parameters.

Example:

```text
/dashboard?
from=2026-08-01
&to=2026-08-16
&projectId=project-123
&repositoryId=repo-456
&developerId=dev-789
```

Advantages:

- Refresh-safe
- Shareable URL
- Browser back/forward works
- AI can control filters
- Easy debugging

---

# 13. Date Filter

Date filter options:

```text
Today
Yesterday
Last 7 Days
Last 30 Days
This Month
Last Month
Custom
```

Custom:

```text
From: [date]
To:   [date]
```

Use `date-fns` for date calculations.

Always send dates to the backend in a consistent format.

Recommended:

```text
ISO 8601
UTC
```

Display dates in the user's local timezone.

---

# 14. Project Filter

Component:

```text
<ProjectFilter />
```

Data:

```text
All Projects
BeyondAI
Enosis
VELQON
...
```

Selecting a project should update:

- Dashboard
- Repository list
- Developer list
- Charts
- Activity
- Reports

---

# 15. Repository Filter

Repository filter depends on selected project.

Example:

```text
Project:
BeyondAI

Repository:
All
beyondAI-frontend
beyondAI-backend
```

When project changes:

```text
Reset repository filter
```

unless the selected repository belongs to that project.

---

# 16. Developer Filter

Show developers relevant to:

```text
selected project
selected repository
selected date range
```

Optionally show avatar and GitHub username.

---

# 17. Activity Trend Chart

Use line chart.

Example:

```text
Activity
 ^
 |            *
 |       *   / \
 |   *  / \ /
 |  / \/
 |_/________________> Date
```

Allow metric selection:

```text
Commits
Pushes
PRs
Reviews
Issues
Lines Added
Lines Deleted
```

API:

```text
GET /api/dashboard/activity-trend
```

---

# 18. Project Activity Chart

Bar chart:

```text
Project A | ███████████
Project B | ███████
Project C | █████████
Project D | ██
```

Metric:

```text
Activity
Commits
PRs
Reviews
Issues
```

Clicking a project should navigate to:

```text
/projects/:projectId
```

or apply dashboard filtering.

---

# 19. Developer Activity Table

Columns:

```text
Developer
Commits
Pushes
PRs
Merged PRs
Reviews
Lines Added
Lines Deleted
Active Days
```

Example:

```text
Developer A | 42 | 51 | 8 | 6 | 15 | 8240 | 3120 | 14
```

Click row:

```text
/developers/:developerId
```

The current filters should be preserved when possible.

---

# 20. Activity Timeline

Create:

```text
components/activity/ActivityTimeline.tsx
```

Activity:

```text
09:12
Commit
"Implement payment validation"

10:43
Push
4 files changed

11:20
Pull Request #142 opened

13:05
PR #138 reviewed

15:42
Commit
"Fix validation error"
```

Each item should show:

- Time
- Activity type
- Developer
- Repository
- Description
- Link to GitHub where available

---

# 21. Projects Page

Route:

```text
/projects
```

Display:

```text
Projects

[Search]

Project
Repositories
Developers
Commits
PRs
Last Activity
Status
```

Click:

```text
/projects/:projectId
```

---

# 22. Project Detail Page

Route:

```text
/projects/[projectId]
```

Sections:

```text
Project Overview
Repositories
Developers
Activity
Commits
Pull Requests
Issues
Code Changes
Reports
AI Analysis
```

Top:

```text
Project Name
Description

Date Filter
```

---

# 23. Repository Page

Route:

```text
/repositories/[repositoryId]
```

Sections:

```text
Repository Overview
Activity
Commits
Pull Requests
Reviews
Issues
Developers
Code Changes
```

Display:

```text
Repository
Owner
Default Branch
Language
Last Activity
Last Sync
```

---

# 24. Developer List

Route:

```text
/developers
```

Table:

```text
Avatar
Developer
GitHub Username
Projects
Repositories
Commits
PRs
Reviews
Last Activity
```

Search:

```text
Search developer...
```

---

# 25. Developer Detail

Route:

```text
/developers/[developerId]
```

Top section:

```text
Developer
GitHub Username

Date range
Project
Repository
```

KPIs:

```text
Commits
Pushes
PRs
Merged PRs
Reviews
Lines Added
Lines Deleted
Active Days
```

Tabs:

```text
Overview
Activity
Commits
Pull Requests
Reviews
Code Changes
Projects
Repositories
```

---

# 26. Developer Activity Timeline

Example:

```text
August 16

09:12
Commit
Repository: BeyondAI Backend
"Implement payment validation"

11:20
PR #142 opened

13:05
PR #138 reviewed

15:42
Commit
"Fix validation error"
```

Clicking a GitHub activity should open the GitHub URL in a new tab.

---

# 27. Commit Detail

A commit row should show:

```text
Commit message
Author
Date/time
SHA
Files changed
Additions
Deletions
Repository
```

GitHub button:

```text
View on GitHub
```

Never expose raw credentials.

---

# 28. Pull Request Page

PR information:

```text
PR #
Title
Author
Repository
State
Created
Updated
Merged
Review count
Changed files
Additions
Deletions
```

Tabs:

```text
Overview
Commits
Reviews
Files
Activity
```

External GitHub link.

---

# 29. Issue Page

Show:

```text
Issue number
Title
Author
State
Created
Updated
Closed
Comments
Repository
```

Filter:

```text
Open
Closed
All
```

---

# 30. Global Activity Page

Route:

```text
/activity
```

Purpose:

A complete chronological view across monitored projects.

Filters:

```text
Date
Project
Repository
Developer
Activity Type
```

Activity types:

```text
Commit
Push
PR Opened
PR Updated
PR Merged
PR Closed
PR Review
Issue Opened
Issue Closed
Issue Comment
```

---

# 31. Reports Page

Route:

```text
/reports
```

Show:

```text
Daily Reports
Weekly Reports
Monthly Reports
Custom Reports
```

Table:

```text
Report
Type
Project
Date Range
Generated
Status
```

Actions:

```text
View
Generate
Download
```

---

# 32. Report Detail

Route:

```text
/reports/[reportId]
```

Sections:

```text
Executive Summary

Overall Activity

Project Activity

Repository Activity

Developer Activity

Pull Request Summary

Issue Summary

Code Change Summary

Engineering Signals

Detailed Activity
```

Report generation should be handled by backend.

Frontend only requests generation and displays results.

---

# 33. AI Agent Page

Route:

```text
/ai
```

ChatGPT-like interface.

```text
+----------------------------------------------------+
| AI Engineering Agent                               |
+----------------------------------------------------+
|                                                    |
| AI: Hello. What would you like to investigate?    |
|                                                    |
| CTO: Show BeyondAI backend activity on Aug 16.    |
|                                                    |
| AI:                                               |
| BeyondAI backend had 32 commits...                |
|                                                    |
| [View Dashboard] [View Repository]                |
|                                                    |
+----------------------------------------------------+
| Ask about projects, repositories or developers... |
|                                                [>] |
+----------------------------------------------------+
```

---

# 34. AI Chat Message Types

Support:

```typescript
type MessageRole =
  | "user"
  | "assistant"
  | "system";
```

Assistant response may include:

```typescript
interface AIResponse {
  answer: string;
  sources?: SourceReference[];
  uiActions?: UIAction[];
  data?: unknown;
}
```

---

# 35. AI Source References

The AI should provide source references.

Example:

```text
Based on:
• BeyondAI backend
• Aug 16, 2026
• 32 commits
• 7 PRs
```

Where possible, provide clickable GitHub links.

The frontend should distinguish:

```text
GitHub source
Internal analytics source
Generated summary
```

---

# 36. AI Dashboard Actions

The AI backend can return structured UI actions.

Example:

```json
{
  "type": "APPLY_FILTERS",
  "payload": {
    "projectId": "p1",
    "repositoryId": "r1",
    "from": "2026-08-10",
    "to": "2026-08-16"
  }
}
```

Frontend handler:

```text
AI response
   |
   v
uiActions
   |
   v
applyFilter()
   |
   v
URL changes
   |
   v
Dashboard refreshes
```

Supported actions:

```text
APPLY_FILTERS
OPEN_PROJECT
OPEN_REPOSITORY
OPEN_DEVELOPER
OPEN_REPORT
OPEN_ACTIVITY
```

Never allow arbitrary JavaScript/code execution from AI output.

---

# 37. AI Follow-Up Context

Conversation:

```text
CTO:
Show BeyondAI backend activity on Aug 16.

AI:
...

CTO:
Who did most of the work?

AI:
...

CTO:
Show his activity.
```

Frontend sends:

```text
conversationId
message
```

Backend owns conversation context.

Frontend should not attempt to infer "his".

---

# 38. AI Streaming

If supported by the backend, implement streaming responses.

Preferred UX:

```text
AI:
Analyzing...

Fetching project data...

Reviewing activity...

Final answer...
```

Use:

- Server-Sent Events (SSE), or
- WebSocket if future real-time functionality requires it.

For V1, SSE is simpler.

---

# 39. Loading States

Every page must support:

```text
Loading
Empty
Error
Success
```

Examples:

```text
Loading dashboard...

No activity found for this date range.

Unable to load repository data.

Retry
```

Do not leave blank screens.

---

# 40. Skeleton Components

Create reusable:

```text
KpiSkeleton
ChartSkeleton
TableSkeleton
TimelineSkeleton
ProfileSkeleton
ChatSkeleton
```

---

# 41. Empty States

Examples:

```text
No projects connected yet.

Connect a GitHub repository to start monitoring.
```

Developer:

```text
No developer activity found for the selected filters.
```

AI:

```text
No conversation yet.
Ask the Engineering Agent about your projects.
```

---

# 42. Error Handling

API error format expected:

```json
{
  "success": false,
  "message": "Unable to load dashboard",
  "code": "DASHBOARD_FETCH_FAILED"
}
```

Frontend should show:

```text
Unable to load dashboard.

[Retry]
```

Do not expose stack traces to users.

---

# 43. API Client Layer

Create:

```text
lib/api/
```

Example:

```text
client.ts
dashboard.ts
projects.ts
repositories.ts
developers.ts
activity.ts
reports.ts
ai.ts
```

Do not write fetch calls repeatedly inside components.

Example:

```typescript
getDashboardOverview(filters)
getProjectMetrics(projectId, filters)
getDeveloperActivity(developerId, filters)
sendAIMessage(conversationId, message)
```

---

# 44. TanStack Query

Use React Query for:

- Dashboard data
- Projects
- Repositories
- Developers
- Activity
- Reports
- AI conversation history where appropriate

Example query keys:

```text
["dashboard", filters]

["project", projectId, filters]

["repository", repositoryId, filters]

["developer", developerId, filters]

["activity", filters]
```

---

# 45. Cache Strategy

Dashboard:

```text
staleTime = short
```

Historical project data:

```text
staleTime = longer
```

After a webhook updates data, backend may invalidate/cache-bust affected metrics.

Frontend should refetch intelligently rather than constantly polling.

---

# 46. Responsive Design

Desktop is the primary target because CTO/management dashboards are likely to be used on desktop.

Still support:

```text
Desktop
Laptop
Tablet
Mobile
```

Desktop:

```text
Sidebar + content
```

Tablet:

```text
Collapsible sidebar
```

Mobile:

```text
Drawer navigation
Stacked cards
Scrollable tables
```

---

# 47. Accessibility

Follow WCAG-oriented practices:

- Keyboard navigation
- Focus states
- Accessible labels
- Semantic HTML
- Screen-reader-friendly buttons
- Sufficient contrast
- Tooltips with meaningful text
- No information conveyed by color alone

Example:

Do not show:

```text
Green = merged
Red = closed
```

without text labels.

---

# 48. Search

Global search can search:

```text
Projects
Repositories
Developers
Pull Requests
Issues
```

Example:

```text
Search "BeyondAI"
```

Results:

```text
Project
BeyondAI

Repository
beyondAI-backend

Repository
beyondAI-new-website
```

AI search remains separate because it performs semantic investigation.

---

# 49. Navigation Rules

Project:

```text
/projects/:projectId
```

Repository:

```text
/repositories/:repositoryId
```

Developer:

```text
/developers/:developerId
```

Report:

```text
/reports/:reportId
```

AI:

```text
/ai
```

When navigating from a filtered dashboard, preserve filters where useful.

---

# 50. Frontend Authentication

If backend authentication is implemented, frontend should use the backend authentication/session mechanism.

Do not store GitHub access tokens in:

```text
localStorage
sessionStorage
URL
React state
```

The browser should only have the application session.

---

# 51. GitHub Connection UI

Settings page:

```text
GitHub Connection

Status: Connected

Account:
@username

Repositories accessible:
17

Last sync:
2 minutes ago

[Sync Now]
[Disconnect]
```

Repository selection:

```text
Available repositories

[x] beyondAI-new-website
[x] beyondAI-backend
[ ] another-repository
```

The backend determines which repositories the GitHub connection can access.

---

# 52. Synchronization UI

Show:

```text
Sync Status

Repository:
beyondAI-backend

Status:
Synchronizing...

Progress:
Commits       80%
Pull Requests 100%
Issues        65%

Last synced:
...
```

The backend should provide sync status.

Frontend polls or receives updates through SSE when appropriate.

---

# 53. Activity Signals UI

Create:

```text
components/signals/
```

Examples:

```text
Repository inactive
PR open for 8 days
Large change detected
Unusual activity spike
Repeated code-change pattern
```

Use neutral language.

Example:

```text
Attention Signal

No recorded activity in repository X
during the selected date range.
```

Do not automatically interpret this as poor developer performance.

---

# 54. Code Change Visualization

Show:

```text
Lines Added
Lines Deleted
Files Changed
```

Charts:

```text
Added    █████████████
Deleted  █████
```

Time trend:

```text
Lines changed per day
```

For detailed code changes:

```text
File
Status
Added
Deleted
```

---

# 55. Developer Code Change View

Example:

```text
Developer A

Code Changes

File                          +     -
src/payment/service.ts       420   80
src/payment/controller.ts    110   25
src/payment/types.ts          40   10
```

GitHub link:

```text
View commit
```

---

# 56. Performance Safety

Do not load thousands of activities at once.

Use:

```text
Pagination
Cursor pagination
Infinite scrolling
Virtualized lists
```

For dashboard charts, request aggregated data.

Bad:

```text
Frontend downloads 100,000 commits
```

Good:

```text
GET /api/dashboard/activity-trend
```

Backend returns:

```json
[
  { "date": "2026-08-10", "commits": 20 },
  { "date": "2026-08-11", "commits": 31 }
]
```

---

# 57. Pagination

Use cursor pagination where possible.

Example:

```text
GET /api/activity?limit=50&cursor=abc
```

Response:

```json
{
  "data": [],
  "nextCursor": "xyz"
}
```

---

# 58. Frontend Performance

Optimize:

- Server Components
- Dynamic imports
- Lazy-load heavy charts
- Image optimization
- Memoization only when useful
- Pagination
- Query caching
- Avoid unnecessary global state
- Avoid rendering huge tables

Do not prematurely optimize.

Measure first.

---

# 59. Security Rules

Frontend must:

- Never contain GitHub secrets
- Never contain Gemini API key
- Never directly call privileged GitHub APIs
- Sanitize/render AI content safely
- Avoid `dangerouslySetInnerHTML` unless strictly sanitized
- Validate route parameters
- Handle unauthorized responses
- Handle expired sessions

---

# 60. AI Content Rendering

AI may return Markdown.

Use a safe Markdown renderer.

Allowed:

```text
Headings
Lists
Tables
Code blocks
Links
```

Sanitize HTML.

Never render arbitrary HTML from AI.

---

# 61. Frontend Environment Variables

Use only public configuration in browser:

```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_NAME=
```

Never:

```env
GITHUB_CLIENT_SECRET=
GITHUB_TOKEN=
GEMINI_API_KEY=
DATABASE_URL=
```

Those belong to backend.

---

# 62. Frontend API Contract

Backend response structure should be consistent.

Recommended:

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
  "message": "Request failed",
  "code": "REQUEST_FAILED"
}
```

Frontend API client should understand this contract.

---

# 63. Dashboard API Contracts

Example:

```text
GET /api/dashboard/overview
```

Response:

```json
{
  "success": true,
  "data": {
    "projects": 8,
    "repositories": 17,
    "developers": 42,
    "commits": 1284,
    "pullRequests": 342,
    "reviews": 518,
    "issuesClosed": 194,
    "linesAdded": 84210,
    "linesDeleted": 31420
  }
}
```

---

# 64. Activity API Contract

```text
GET /api/activity
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "activity-1",
      "type": "commit",
      "developer": {
        "id": "dev-1",
        "name": "Developer A"
      },
      "repository": {
        "id": "repo-1",
        "name": "beyondAI-backend"
      },
      "message": "Implement payment validation",
      "occurredAt": "2026-08-16T09:12:00Z",
      "githubUrl": "https://github.com/..."
    }
  ],
  "meta": {
    "nextCursor": "abc"
  }
}
```

---

# 65. AI API Contract

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
    "message": {
      "role": "assistant",
      "content": "BeyondAI backend had..."
    },
    "sources": [],
    "uiActions": [
      {
        "type": "APPLY_FILTERS",
        "payload": {
          "projectId": "p1",
          "repositoryId": "r1",
          "from": "2026-08-16",
          "to": "2026-08-16"
        }
      }
    ]
  }
}
```

---

# 66. AI UI Action Security

Frontend should have a strict whitelist:

```typescript
const allowedActions = [
  "APPLY_FILTERS",
  "OPEN_PROJECT",
  "OPEN_REPOSITORY",
  "OPEN_DEVELOPER",
  "OPEN_REPORT",
  "OPEN_ACTIVITY"
];
```

Never execute arbitrary action names returned by AI.

Never execute:

```text
JavaScript
HTML
URLs without validation
arbitrary API calls
```

---

# 67. Testing

Use:

- Vitest or Jest for unit tests
- React Testing Library
- Playwright or Cypress for E2E

Test:

```text
Dashboard
Filters
Navigation
Tables
Charts
Developer detail
Project detail
Repository detail
Reports
AI chat
AI UI actions
Authentication
Error states
Loading states
Responsive layout
```

---

# 68. Dashboard E2E Test Example

Scenario:

```text
1. Open dashboard
2. Select project "BeyondAI"
3. Select repository "Backend"
4. Select date Aug 16
5. Verify KPI updates
6. Verify activity chart
7. Click Developer A
8. Verify developer detail
```

---

# 69. AI E2E Test Example

```text
1. Open AI Agent
2. Enter:
   "Show BeyondAI backend activity on August 16"
3. Wait for response
4. Verify answer exists
5. Verify sources exist
6. Verify APPLY_FILTERS action
7. Verify dashboard filters update
```

---

# 70. Visual Testing

Important pages:

```text
Dashboard
Project
Repository
Developer
Reports
AI Agent
```

Test:

- Desktop
- Tablet
- Mobile
- Dark mode if implemented
- Long project names
- Long developer names
- Large numbers
- Empty states
- Error states

---

# 71. Development Phase Order

Do not implement all pages simultaneously.

Recommended order:

```text
Phase 1
Next.js foundation
    ↓
Phase 2
Application layout
    ↓
Phase 3
API client + TanStack Query
    ↓
Phase 4
Dashboard
    ↓
Phase 5
Global filters
    ↓
Phase 6
Projects
    ↓
Phase 7
Repositories
    ↓
Phase 8
Developers
    ↓
Phase 9
Activity
    ↓
Phase 10
Reports
    ↓
Phase 11
GitHub connection/settings
    ↓
Phase 12
AI Agent UI
    ↓
Phase 13
AI UI actions
    ↓
Phase 14
Loading/error/empty states
    ↓
Phase 15
Testing
    ↓
Phase 16
Performance/security
```

---

# 72. Phase 1 — Initialize Frontend

Inside:

```text
GitHub-Frontend/
```

Create Next.js application.

Expected:

```text
Next.js
TypeScript
ESLint
Tailwind
```

Install:

```text
shadcn/ui
TanStack Query
TanStack Table
Recharts
date-fns
React Hook Form
Zod
Lucide
```

---

# 73. Phase 2 — Layout

Implement:

```text
Root layout
Sidebar
Topbar
Main content
Responsive navigation
User menu
```

Do not build dashboard statistics yet.

First make navigation stable.

---

# 74. Phase 3 — API Infrastructure

Implement:

```text
lib/api/client.ts
```

Features:

- Base URL
- Headers
- Authentication/session handling
- JSON parsing
- Error handling
- Request timeout
- Consistent response parsing

Then:

```text
lib/api/dashboard.ts
lib/api/projects.ts
lib/api/repositories.ts
lib/api/developers.ts
lib/api/activity.ts
lib/api/reports.ts
lib/api/ai.ts
```

---

# 75. Phase 4 — Dashboard

Build:

```text
DashboardHeader
DashboardFilters
KpiGrid
ActivityTrendChart
ProjectActivityChart
DeveloperActivityTable
RecentActivityTimeline
SignalsPanel
```

Use mocked API data only temporarily.

Once backend APIs exist, replace mocks.

---

# 76. Phase 5 — Filters

Implement URL synchronization.

Example:

```text
/dashboard?projectId=p1&from=2026-08-01&to=2026-08-16
```

When filter changes:

```text
URL
 ↓
TanStack Query
 ↓
Backend
 ↓
New dashboard data
```

---

# 77. Phase 6 — Projects

Implement:

```text
ProjectList
ProjectCard/Table
ProjectDetail
ProjectMetrics
ProjectRepositories
ProjectDevelopers
ProjectActivity
```

---

# 78. Phase 7 — Repositories

Implement:

```text
RepositoryList
RepositoryDetail
RepositoryMetrics
RepositoryActivity
RepositoryDevelopers
RepositoryPRs
RepositoryIssues
```

---

# 79. Phase 8 — Developers

Implement:

```text
DeveloperList
DeveloperDetail
DeveloperOverview
DeveloperActivity
DeveloperCommits
DeveloperPRs
DeveloperReviews
DeveloperCodeChanges
```

---

# 80. Phase 9 — Activity

Implement:

```text
ActivityFilters
ActivityTimeline
ActivityTable
ActivityDetails
```

Support pagination.

---

# 81. Phase 10 — Reports

Implement:

```text
ReportList
ReportCard
ReportDetail
ReportFilters
GenerateReportModal
```

Report generation:

```text
Frontend
   |
POST /api/reports
   |
Backend
   |
Queue
   |
Report Worker
   |
Database
   |
Frontend polls/status
```

---

# 82. Phase 11 — GitHub Connection

Settings:

```text
GitHub
  |
  +-- Connection status
  +-- Account
  +-- Accessible repositories
  +-- Connected repositories
  +-- Sync status
```

Actions:

```text
Connect GitHub
Disconnect
Sync Now
Add Repository
Remove Repository
```

---

# 83. Phase 12 — AI Agent UI

Implement:

```text
AIPage
ChatWindow
ChatMessage
ChatInput
ConversationList
SuggestedPrompts
SourceList
AIActionHandler
```

Suggested prompts:

```text
"Show today's project activity"

"Show BeyondAI backend activity this week"

"What did Developer A work on yesterday?"

"Generate this week's engineering report"

"Show repositories with no activity this week"
```

---

# 84. Phase 13 — AI Dashboard Integration

Implement:

```text
AI -> APPLY_FILTERS
AI -> OPEN_PROJECT
AI -> OPEN_REPOSITORY
AI -> OPEN_DEVELOPER
AI -> OPEN_REPORT
AI -> OPEN_ACTIVITY
```

Example:

```text
AI:
"Show BeyondAI backend activity from Aug 10 to Aug 16."

Frontend:
Apply:
Project = BeyondAI
Repository = Backend
From = Aug 10
To = Aug 16
```

---

# 85. Phase 14 — UX Completion

Add:

- Toast notifications
- Loading states
- Skeletons
- Empty states
- Error states
- Confirmation dialogs
- Tooltips
- Responsive behavior
- Keyboard support

---

# 86. Phase 15 — Testing

Implement:

```text
Unit
Integration
Component
E2E
Visual
Accessibility
```

Minimum E2E:

```text
Dashboard
Filters
Project
Repository
Developer
Reports
AI
GitHub connection
```

---

# 87. Phase 16 — Production Readiness

Check:

```text
Environment variables
API URL
Authentication
Security headers
Error boundaries
Logging
Performance
Accessibility
SEO where appropriate
Bundle size
Image optimization
```

---

# 88. Frontend Definition of Done

The frontend MVP is complete when:

- Dashboard works
- Date filtering works
- Project filtering works
- Repository filtering works
- Developer filtering works
- KPI cards show backend data
- Charts show backend data
- Activity timeline works
- Project pages work
- Repository pages work
- Developer pages work
- Reports work
- GitHub connection page works
- AI chatbot works
- AI sources are visible
- AI UI actions work
- No GitHub/Gemini secret is exposed
- Loading states exist
- Error states exist
- Empty states exist
- E2E tests pass
- Responsive layouts work

---

# 89. Frontend-to-Backend Boundary

The frontend owns:

```text
UI
Navigation
Filters
Charts
Tables
User interaction
Chat interface
Display logic
UI state
```

The backend owns:

```text
GitHub API
Authentication
Authorization
Database
Analytics
Synchronization
Webhooks
Queue
AI
Agents
Orchestrator
Reports
Secrets
```

Never move backend responsibilities into the frontend just for convenience.

---

# 90. Important Architecture Rule

The frontend should never calculate important management metrics from raw GitHub data.

Bad:

```text
Frontend downloads 5,000 commits
Frontend counts commits
```

Good:

```text
Frontend
   |
GET /api/dashboard/overview
   |
Backend
   |
PostgreSQL
   |
Analytics
   |
Aggregated result
```

The frontend visualizes trusted backend results.

---

# 91. AI Architecture Boundary

The frontend does not implement the Agent reasoning.

Frontend:

```text
User message
     |
     v
AI Chat API
     |
     v
Backend Orchestrator
     |
     v
Agents
     |
     v
Tools
     |
     v
Database/GitHub
     |
     v
Gemini
     |
     v
Structured AI response
     |
     v
Frontend
```

This keeps the AI secure and maintainable.

---

# 92. Final Frontend Architecture

```text
                         CTO
                          |
                          v
                 +----------------+
                 |   Next.js App  |
                 +-------+--------+
                         |
       +-----------------+------------------+
       |                 |                  |
       v                 v                  v
  Dashboard          Management          AI Agent
       |                Pages                |
       |                 |                   |
       +-----------------+-------------------+
                         |
                         v
                  Filter / State
                         |
                         v
                   API Client
                         |
                         v
              TanStack Query Cache
                         |
                         v
                Express Backend API
                         |
        +----------------+----------------+
        |                |                |
        v                v                v
    PostgreSQL       Analytics         AI/Agent
                                        |
                                   Orchestrator
                                        |
                                  Specialized Agents
                                        |
                                      Gemini
```

---

# 93. Final Implementation Principle

Build the frontend as a **professional management console**, not as a simple GitHub clone.

The CTO should be able to go from:

```text
Organization
   ↓
Project
   ↓
Repository
   ↓
Date
   ↓
Developer
   ↓
Activity
   ↓
Commit / PR / Issue
```

And alternatively:

```text
CTO
 ↓
AI Agent
 ↓
Natural-language question
 ↓
Orchestrator
 ↓
Specialized agents
 ↓
Trusted backend analytics
 ↓
AI answer
 ↓
Dashboard navigation/filter
```

The dashboard and AI Agent must use the same backend data source.

The frontend must remain read-only with respect to GitHub.

The final user experience should feel like:

> **GitHub Engineering Intelligence — one management dashboard where a CTO can visually monitor every connected project/repository and investigate the same data through an AI Agent.**
