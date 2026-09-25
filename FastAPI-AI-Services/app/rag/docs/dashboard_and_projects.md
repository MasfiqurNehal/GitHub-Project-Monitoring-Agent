# Dashboard, Projects, and Repositories

## Dashboard
The GitMonitor Dashboard is the main control center for engineering managers and technical leads.
It features:
- **Executive Summary Cards**: Total active projects, connected repositories, monitored developers, and recent code churn velocity.
- **Visual Analytics**: Interactive charts showing commit frequency over time, code addition vs deletion trends, and pull request review times.
- **Activity Streams**: Real-time event feed of recent commits, pull requests, and webhooks.

## Projects
Projects represent top-level organizational software initiatives grouping multiple GitHub repositories together.
- Users can create, update, and organize projects per SaaS organization tenant.
- Project analytics aggregate commits, PRs, and issues across all underlying repositories.

## Repositories
Repositories map directly to monitored GitHub Git repositories.
- Displays commit history, file-level code churn (lines added, deleted, modified), branch tracking, and language breakdown.
- Synchronized automatically via GitHub webhooks or manual triggers.
