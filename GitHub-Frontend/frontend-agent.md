# Frontend Implementation Plan — GitHub Project Monitoring AI Agent

## 1. Frontend Purpose

The frontend is the CTO/Management dashboard for the GitHub Project Monitoring AI Agent.

It provides a modern web interface to:
- Monitor multiple projects and repositories
- View GitHub activity, commits, pushes, pull requests, reviews and issues
- Track developer activity and code-change statistics
- Filter by date, project, repository, developer and activity type
- View project progress and reports
- Communicate with the AI Agent through a chatbot
- Navigate from AI responses to relevant dashboard data

The frontend is read-oriented. It must not modify existing GitHub repositories or push/commit code.

## 2. Technology Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React
- TanStack Query
- TanStack Table
- Recharts
- React Hook Form
- Zod
- Zustand only when genuinely required
- Motion / Framer Motion
- date-fns
- Cypress
- Vitest + React Testing Library

Do not introduce unnecessary dependencies.

## 3. Folder Architecture

```text
GitHub-Frontend/
├── agent.md
├── README.md
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── components.json
├── eslint.config.mjs
├── .env.example
├── .env.local
├── .gitignore
│
├── public/
│   ├── logo/
│   ├── icons/
│   └── images/
│
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── (dashboard)/
    │       ├── layout.tsx
    │       ├── dashboard/page.tsx
    │       ├── projects/page.tsx
    │       ├── projects/[projectId]/page.tsx
    │       ├── repositories/page.tsx
    │       ├── repositories/[repositoryId]/page.tsx
    │       ├── developers/page.tsx
    │       ├── developers/[developerId]/page.tsx
    │       ├── activity/page.tsx
    │       ├── pull-requests/page.tsx
    │       ├── pull-requests/[pullRequestId]/page.tsx
    │       ├── issues/page.tsx
    │       ├── issues/[issueId]/page.tsx
    │       ├── reports/page.tsx
    │       ├── reports/[reportId]/page.tsx
    │       ├── ai/page.tsx
    │       └── settings/
    │           ├── page.tsx
    │           ├── github/page.tsx
    │           └── appearance/page.tsx
    │
    ├── components/
    │   ├── ui/
    │   ├── layout/
    │   ├── dashboard/
    │   ├── charts/
    │   ├── filters/
    │   ├── projects/
    │   ├── repositories/
    │   ├── developers/
    │   ├── activity/
    │   ├── pull-requests/
    │   ├── issues/
    │   ├── reports/
    │   ├── ai/
    │   └── common/
    │
    ├── features/
    │   ├── dashboard/
    │   ├── projects/
    │   ├── repositories/
    │   ├── developers/
    │   ├── activity/
    │   ├── reports/
    │   ├── github/
    │   └── ai/
    │
    ├── lib/
    │   ├── api/
    │   ├── auth/
    │   ├── query/
    │   ├── validations/
    │   ├── constants/
    │   ├── utils/
    │   └── animations/
    │
    ├── hooks/
    ├── store/
    ├── types/
    └── styles/
```

## 4. Application Layout

Use:

```text
App Shell
├── Sidebar
├── Topbar
├── Breadcrumbs
├── Global Filters
└── Main Content
```

Desktop should use a persistent sidebar. Mobile should use a responsive drawer.

Sidebar navigation:

```text
Dashboard

PROJECTS
  Projects
  Repositories
  Developers

MONITORING
  Activity
  Pull Requests
  Issues

REPORTING
  Reports

AI
  Engineering Agent

SYSTEM
  GitHub Connection
  Settings
```

Support collapsed and expanded sidebar states.

## 5. Dashboard

Route:

```text
/dashboard
```

The dashboard is the primary CTO overview.

### Global dashboard filters

- Project
- Repository
- Developer
- Date range
- Activity type

### KPI cards

- Total commits
- Pull requests
- Merged pull requests
- Open pull requests
- Issues opened
- Issues closed
- Active developers
- Code additions
- Code deletions
- Net code change

### Charts

- Overall activity over time
- Commit activity
- Pull request activity
- Issue activity
- Developer activity
- Project activity
- Code-change activity

### Tables/timelines

- Project overview
- Developer overview
- Recent activity

## 6. Projects

Route:

```text
/projects
/projects/[projectId]
```

Project cards show:
- Project name
- Description
- Repository count
- Developer count
- Commits
- PRs
- Issues
- Latest activity
- Activity status

Project details contain:
- Overview
- Repositories
- Developers
- Activity
- Commits
- Pull Requests
- Issues
- Code Changes

## 7. Repositories

Routes:

```text
/repositories
/repositories/[repositoryId]
```

Display:
- Repository name
- Project
- GitHub URL
- Developer count
- Commit count
- PR count
- Issue count
- Latest activity
- Sync status

Repository tabs:
- Overview
- Activity
- Commits
- Pull Requests
- Issues
- Developers
- Code Changes

Large-scale analytics must come from the backend rather than being calculated in the browser.

## 8. Developers

Routes:

```text
/developers
/developers/[developerId]
```

Developer table:
- Developer
- Project
- Repositories
- Commits
- PRs
- Reviews
- Issues
- Lines Added
- Lines Removed
- Last Activity

Developer details:
- GitHub profile
- Projects
- Repositories
- Commit count
- PR count
- Review count
- Issue activity
- Code additions/deletions
- Activity timeline
- Contribution chart
- Daily/weekly/monthly activity

## 9. Developer Activity

Show chronological activity such as:

```text
16 Aug 2026

10:42
Commit
Implement authentication
+82 -21

10:15
Pull Request
#284 Authentication update

09:52
Code Review
Reviewed PR #281

09:20
Issue
Closed #183
```

The frontend only displays activity returned by the backend.

## 10. Activity

Route:

```text
/activity
```

Activity types:
- Commit
- Push
- Pull Request
- Pull Request Review
- Issue
- Issue Comment
- Merge
- Branch Event
- Code Change

Support:
- Date filtering
- Project filtering
- Repository filtering
- Developer filtering
- Activity-type filtering
- Search
- Sorting
- Pagination

Provide both table and timeline views.

## 11. Pull Requests

Routes:

```text
/pull-requests
/pull-requests/[pullRequestId]
```

Display:
- PR number
- Title
- Repository
- Author
- Status
- Review status
- Created date
- Updated date
- Merged date
- Reviewers
- Commits
- Files changed
- Additions
- Deletions
- Timeline

Do not implement PR creation, merging, editing, or other GitHub write operations.

## 12. Issues

Routes:

```text
/issues
/issues/[issueId]
```

Display:
- Issue number
- Title
- Repository
- Author
- Status
- Assignees
- Labels
- Created date
- Closed date
- Timeline

## 13. Reports

Route:

```text
/reports
```

Support:
- Daily
- Weekly
- Monthly
- Custom date range

Report sections:
- Executive Summary
- Project Activity
- Repository Activity
- Developer Activity
- Commit Summary
- Pull Request Summary
- Issue Summary
- Code Change Summary
- Activity Timeline
- AI Insights

Actions:
- View Report
- Download Report

The frontend displays AI-generated insights from the AI service; it should not invent management conclusions.

## 14. Global Filters

Create reusable components:

```text
GlobalFilters
DateRangeFilter
ProjectFilter
RepositoryFilter
DeveloperFilter
ActivityTypeFilter
FilterBar
```

Synchronize filters with URL query parameters.

Example:

```text
/dashboard?project=enosis&repository=backend&developer=123&from=2026-08-01&to=2026-08-16
```

This allows filtered views to be refreshed and shared.

## 15. Charts

Use Recharts.

Components:

```text
CommitChart
ActivityChart
DeveloperChart
ProjectChart
PullRequestChart
IssueChart
CodeChangeChart
ContributionChart
```

Charts must support:
- Responsive layout
- Tooltips
- Legends
- Loading states
- Empty states
- Date-aware labels
- Accessibility
- Dark/light themes
- Subtle animation

## 16. AI Agent Chat

Route:

```text
/ai
```

Create a ChatGPT-style interface.

Components:

```text
ChatWindow
ChatHeader
ChatInput
ChatMessage
ConversationList
SuggestedPrompts
SourceList
SourceReference
AIThinkingIndicator
AIActionButton
```

Example:

```text
User:
Show me Enosis backend activity on August 16.

Agent:
Commits: 32
Pull Requests: 7
Active Developers: 8
Issues Closed: 4
```

The response may provide actions:

```text
[View Repository]
[View Activity]
[View Developer Activity]
[Apply Filters]
[Open Report]
```

## 17. AI Dashboard Actions

Only allow predefined structured actions returned by the AI service.

Supported actions:

```text
APPLY_FILTERS
OPEN_PROJECT
OPEN_REPOSITORY
OPEN_DEVELOPER
OPEN_ACTIVITY
OPEN_REPORT
```

Example:

```json
{
  "type": "APPLY_FILTERS",
  "payload": {
    "projectId": "project-1",
    "repositoryId": "repo-1",
    "from": "2026-08-16",
    "to": "2026-08-16"
  }
}
```

Never execute arbitrary code or arbitrary URLs from AI output.

## 18. AI Data Flow

```text
CTO
 ↓
Next.js Chat UI
 ↓
Node.js Backend API
 ↓
FastAPI AI Service
 ↓
AI Orchestrator
 ↓
Specialized AI Agents
 ↓
Backend analytics/data APIs
 ↓
Verified GitHub data
 ↓
AI response
 ↓
Next.js
 ↓
Chat UI / Dashboard action
```

The frontend does not directly call Gemini.

The frontend does not directly call GitHub APIs.

## 19. GitHub Connection

Route:

```text
/settings/github
```

Display:
- Connected GitHub account
- GitHub username
- Accessible repositories
- Connected repositories
- Last sync
- Sync status

Actions:
- Connect GitHub
- Disconnect
- Sync Now

Repository selection:

```text
Available Repositories

☑ Backend Repository
☑ Frontend Repository
☐ Other Repository
```

OAuth and GitHub API communication are handled by the backend.

## 20. API Layer

Never make direct API requests throughout UI components.

Use:

```text
src/lib/api/client.ts
```

Feature API modules:

```text
src/features/dashboard/api.ts
src/features/projects/api.ts
src/features/repositories/api.ts
src/features/developers/api.ts
src/features/activity/api.ts
src/features/reports/api.ts
src/features/github/api.ts
src/features/ai/api.ts
```

Data flow:

```text
Component
   ↓
Hook
   ↓
Feature API
   ↓
API Client
   ↓
Node.js Backend
```

## 21. TanStack Query

Use TanStack Query for server state.

Create hooks:

```text
useDashboardOverview()
useProjects()
useProject()
useRepositories()
useRepository()
useDevelopers()
useDeveloper()
useActivity()
usePullRequests()
useIssues()
useReports()
useReport()
useGithubConnection()
useAIChat()
```

Do not duplicate server state in Zustand.

## 22. State Management

### URL state

Use for:
- Date
- Project
- Repository
- Developer
- Activity type

### TanStack Query

Use for:
- Projects
- Repositories
- Developers
- Activity
- Reports
- GitHub data
- AI conversation data

### React state

Use for local UI state.

### Zustand

Use only for genuinely global client-side state such as:
- Sidebar state
- AI chat UI state
- Temporary UI preferences

## 23. Loading States

Create:

```text
LoadingState
PageLoader
DashboardSkeleton
CardSkeleton
ChartSkeleton
TableSkeleton
TimelineSkeleton
ChatSkeleton
```

Every data-heavy page must have a loading state.

## 24. Empty States

Provide useful empty states:

```text
No projects connected.

Connect a GitHub repository to start monitoring activity.
```

```text
No activity found for this date range.
```

```text
No pull requests found.
```

```text
No developers found.
```

## 25. Error Handling

Create:

```text
ErrorState
ErrorBoundary
RetryButton
```

Example:

```text
Unable to load repository activity.

[Retry]
```

Never expose backend stack traces, tokens, or secrets.

## 26. Responsive Design

Support:
- Desktop
- Laptop
- Tablet
- Mobile

Desktop is the primary target for CTO/management.

Large tables should use horizontal scrolling or responsive card layouts where appropriate.

## 27. Visual Design

The application should look like a modern engineering intelligence/SaaS platform.

Design principles:
- Clean
- Professional
- Modern
- Minimal
- Data-focused
- High readability
- Strong visual hierarchy
- Consistent spacing
- Consistent typography
- Clear status indicators
- Responsive

Do not create a generic CRUD admin dashboard.

## 28. Theme

Support:

```text
Light
Dark
System
```

Charts, cards, tables, badges and AI chat must support all themes.

## 29. Animation

Use Motion/Framer Motion for:
- Page transitions
- Sidebar open/close
- Card appearance
- KPI transitions
- Chart appearance
- Dialogs
- Dropdowns
- AI thinking state
- Chat messages
- Filter changes

Keep animations subtle, generally around 150–300ms.

Respect `prefers-reduced-motion`.

## 30. Accessibility

Requirements:
- Keyboard navigation
- Proper labels
- ARIA where necessary
- Focus states
- Semantic HTML
- Color contrast
- Screen-reader-friendly controls
- Accessible charts
- Reduced-motion support

## 31. Security Rules

Never expose these to the browser:

```text
GitHub Personal Access Token
GitHub App Private Key
GitHub Client Secret
Gemini API Key
Database credentials
Internal service tokens
```

Architecture:

```text
Browser
   ↓
Node.js Backend
   ↓
GitHub / PostgreSQL / FastAPI
```

Never put secrets in `NEXT_PUBLIC_*`.

## 32. GitHub Safety Rule

This application is a monitoring and management system.

The frontend must not modify developers' repositories.

Do not implement:

```text
git push
git commit
create commit
merge PR
delete branch
modify source code
```

The primary system is read-only monitoring.

## 33. Performance

Optimize for large GitHub projects.

Use:
- Server-side pagination
- Backend filtering
- Backend aggregation
- TanStack Query caching
- Lazy loading
- Dynamic imports where appropriate
- Virtualized lists for very large datasets
- Debounced search
- Chart data aggregation

The frontend should receive summarized analytics instead of raw GitHub history whenever possible.

## 34. Frontend Data Boundary

The frontend receives:

```text
Projects
Repositories
Developers
Commits
Pull Requests
Issues
Activity
Analytics
Reports
AI Responses
```

from the backend.

The frontend does not directly communicate with:

```text
GitHub REST API
GitHub GraphQL API
GitHub Webhooks
PostgreSQL
Redis
Gemini API
```

Those belong to backend, infrastructure, or AI services.

## 35. Environment Variables

Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Never put these in the frontend environment:

```env
GITHUB_CLIENT_SECRET=
GITHUB_TOKEN=
GEMINI_API_KEY=
DATABASE_URL=
```

## 36. Testing

### Unit Tests

Test:
- Utility functions
- Formatters
- Validation
- Filter logic
- State logic

### Component Tests

Test:
- KPI cards
- Filters
- Tables
- Charts
- Chat components
- Dialogs

### Cypress E2E

Test:

```text
Open Dashboard
↓
Select Project
↓
Select Repository
↓
Filter Date
↓
View Activity
↓
Open Developer
↓
View Developer Activity
↓
Open AI Agent
↓
Ask Question
↓
Apply AI Filter
↓
View Report
```

## 37. Implementation Order

### Phase 1 — Foundation

Set up:

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
ESLint
Prettier
```

Create:
- App layout
- Theme
- Sidebar
- Topbar
- Responsive shell

### Phase 2 — UI System

Create reusable:
- Button
- Card
- Badge
- Dialog
- Dropdown
- Input
- Select
- Tabs
- Table
- Tooltip
- Skeleton

Create design tokens and typography.

### Phase 3 — API Infrastructure

Implement:
- API client
- TanStack Query provider
- Query keys
- Error handling
- Authentication/session handling

### Phase 4 — Dashboard

Implement:
- Dashboard header
- Global filters
- KPI cards
- Charts
- Project overview
- Developer overview
- Recent activity

### Phase 5 — Project & Repository

Implement:
- Projects
- Project details
- Repositories
- Repository details
- Repository activity

### Phase 6 — Developer Monitoring

Implement:
- Developer list
- Developer details
- Developer metrics
- Developer activity
- Developer timeline
- Code-change statistics

### Phase 7 — Activity / PR / Issues

Implement:
- Activity
- Pull Requests
- Issues
- Detail pages

### Phase 8 — Reports

Implement:
- Daily reports
- Weekly reports
- Monthly reports
- Custom reports
- Report details
- Report export UI

### Phase 9 — AI Agent

Implement:
- AI page
- Conversation list
- Chat window
- Chat messages
- Prompt suggestions
- Thinking indicator
- Source references
- AI actions
- Dashboard navigation actions

### Phase 10 — GitHub Connection

Implement:
- GitHub connection page
- Repository selection
- Sync status
- Connection status

### Phase 11 — Polish

Add:
- Animations
- Loading states
- Empty states
- Error states
- Responsive improvements
- Accessibility
- Dark mode
- Performance optimization

### Phase 12 — Testing

Implement:
- Unit tests
- Component tests
- Cypress E2E

Test the complete CTO workflow.

## 38. Final Frontend Responsibility

The frontend has five major responsibilities:

```text
1. VISUALIZE
   GitHub project data

2. FILTER
   Project / Repository / Developer / Date / Activity

3. ANALYZE
   Display backend-provided analytics

4. INTERACT
   Allow CTO to explore projects and developers

5. COMMUNICATE
   Provide the AI Agent interface
```

Final relationship:

```text
                    CTO
                     │
                     ▼
                Next.js UI
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
      Dashboard   Analytics   AI Chat
          │          │          │
          └──────────┼──────────┘
                     ▼
                 API Client
                     │
                     ▼
              Node.js Backend
                     │
            ┌────────┴────────┐
            ▼                 ▼
       PostgreSQL        FastAPI AI
                              │
                         Orchestrator
                              │
                       Multiple Agents
                              │
                            Gemini
```

The frontend must remain modular, responsive, visually polished, read-oriented, secure, and completely separated from GitHub write operations and AI/API secrets.
