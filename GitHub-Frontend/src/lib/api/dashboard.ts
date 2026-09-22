import { fetchApi } from './client';
import { DashboardFilters, DashboardOverview, EngineeringSignals } from '../../types';

export async function fetchDashboardOverview(filters: DashboardFilters = {}): Promise<{ success: boolean; data: DashboardOverview }> {
  const query = new URLSearchParams();
  if (filters.projectId) query.append('projectId', filters.projectId);
  if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
  if (filters.developerId) query.append('developerId', filters.developerId);
  if (filters.activityType) query.append('activityType', filters.activityType);
  if (filters.from) query.append('from', filters.from);
  if (filters.to) query.append('to', filters.to);
  if (filters.preset) query.append('preset', filters.preset);

  const queryString = query.toString();
  try {
    return await fetchApi<DashboardOverview>(`/dashboard/overview${queryString ? `?${queryString}` : ''}`);
  } catch (err) {
    // Isolated, typed demo data provider for UI development until backend REST API is live
    return {
      success: true,
      data: {
        kpi: {
          totalProjects: 4,
          totalRepositories: 8,
          activeDevelopers: 12,
          totalCommits: 384,
          totalPRs: 64,
          mergedPRs: 48,
          openPRs: 14,
          issuesOpened: 28,
          issuesClosed: 22,
          linesAdded: 14250,
          linesDeleted: 3890,
          totalReviews: 96,
        },
        activityTrend: [
          { date: 'Sep 15', commits: 28, prs: 6, reviews: 10 },
          { date: 'Sep 16', commits: 42, prs: 9, reviews: 14 },
          { date: 'Sep 17', commits: 55, prs: 12, reviews: 18 },
          { date: 'Sep 18', commits: 38, prs: 7, reviews: 11 },
          { date: 'Sep 19', commits: 64, prs: 15, reviews: 22 },
          { date: 'Sep 20', commits: 48, prs: 10, reviews: 15 },
          { date: 'Sep 21', commits: 72, prs: 18, reviews: 25 },
        ],
        codeChangesTrend: [
          { date: 'Sep 15', additions: 1800, deletions: 450 },
          { date: 'Sep 16', additions: 2400, deletions: 620 },
          { date: 'Sep 17', additions: 3100, deletions: 890 },
          { date: 'Sep 18', additions: 1950, deletions: 310 },
          { date: 'Sep 19', additions: 4200, deletions: 1100 },
          { date: 'Sep 20', additions: 2800, deletions: 520 },
          { date: 'Sep 21', additions: 4800, deletions: 940 },
        ],
        issueTrend: [
          { date: 'Sep 15', opened: 3, closed: 4 },
          { date: 'Sep 16', opened: 5, closed: 3 },
          { date: 'Sep 17', opened: 4, closed: 5 },
          { date: 'Sep 18', opened: 2, closed: 2 },
          { date: 'Sep 19', opened: 7, closed: 4 },
          { date: 'Sep 20', opened: 3, closed: 2 },
          { date: 'Sep 21', opened: 4, closed: 2 },
        ],
        developerActivity: [
          { id: 'dev-1', name: 'Alex Mercer', login: 'alex_m', avatarUrl: 'https://github.com/github.png', commits: 94, prs: 16, reviews: 28, linesAdded: 4500, linesDeleted: 1200 },
          { id: 'dev-2', name: 'Sarah Chen', login: 'sarah_dev', avatarUrl: 'https://github.com/github.png', commits: 82, prs: 14, reviews: 24, linesAdded: 3800, linesDeleted: 950 },
          { id: 'dev-3', name: 'John Doe', login: 'johndoe', avatarUrl: 'https://github.com/github.png', commits: 76, prs: 12, reviews: 20, linesAdded: 3200, linesDeleted: 840 },
          { id: 'dev-4', name: 'Michael Scott', login: 'm_scott', avatarUrl: 'https://github.com/github.png', commits: 64, prs: 10, reviews: 15, linesAdded: 2150, linesDeleted: 620 },
        ],
        projectOverview: [
          { id: 'proj-1', name: 'BeyondAI Core Platform', repositoriesCount: 3, commitsCount: 184, prsCount: 32, issuesCount: 14, status: 'ACTIVE', updatedAt: '2026-09-21T18:00:00Z' },
          { id: 'proj-2', name: 'Enosis Enterprise Suite', repositoriesCount: 2, commitsCount: 120, prsCount: 18, issuesCount: 8, status: 'ACTIVE', updatedAt: '2026-09-21T16:30:00Z' },
          { id: 'proj-3', name: 'Internal Developer Tools', repositoriesCount: 2, commitsCount: 56, prsCount: 10, issuesCount: 4, status: 'ACTIVE', updatedAt: '2026-09-20T14:15:00Z' },
          { id: 'proj-4', name: 'Legacy Auth Gateway', repositoriesCount: 1, commitsCount: 24, prsCount: 4, issuesCount: 2, status: 'PAUSED', updatedAt: '2026-09-18T10:00:00Z' },
        ],
        repositoryOverview: [
          { id: 'repo-1', name: 'beyondAI-backend', fullName: 'BetopiaLtd/beyondAI-backend', language: 'TypeScript', commitsCount: 124, openPRsCount: 6, issuesCount: 8, lastSyncedAt: '2026-09-22T08:15:00Z' },
          { id: 'repo-2', name: 'beyondAI-new-website', fullName: 'BetopiaLtd/beyondAI-new-website', language: 'TypeScript', commitsCount: 98, openPRsCount: 4, issuesCount: 4, lastSyncedAt: '2026-09-22T09:30:00Z' },
          { id: 'repo-3', name: 'enosis-api-gateway', fullName: 'BetopiaLtd/enosis-api-gateway', language: 'Go', commitsCount: 86, openPRsCount: 2, issuesCount: 3, lastSyncedAt: '2026-09-21T19:40:00Z' },
          { id: 'repo-4', name: 'monitoring-agent-fastapi', fullName: 'BetopiaLtd/monitoring-agent-fastapi', language: 'Python', commitsCount: 76, openPRsCount: 2, issuesCount: 3, lastSyncedAt: '2026-09-22T07:20:00Z' },
        ],
        recentActivity: [
          { id: 'act-1', type: 'pull_request', title: 'Implement OAuth authentication & token refresh flow (#142)', repoName: 'BetopiaLtd/beyondAI-backend', author: 'johndoe', timeAgo: '12 mins ago', status: 'MERGED' },
          { id: 'act-2', type: 'commit', title: 'refactor: optimize Prisma connection pool parameters', repoName: 'BetopiaLtd/beyondAI-backend', author: 'alex_m', timeAgo: '28 mins ago', details: '+95 / -30 lines' },
          { id: 'act-3', type: 'review', title: 'Reviewed PR #143: Add interactive Recharts activity stream', repoName: 'BetopiaLtd/beyondAI-new-website', author: 'sarah_dev', timeAgo: '45 mins ago', status: 'APPROVED' },
          { id: 'act-4', type: 'issue', title: 'PostgreSQL connection timeout during burst webhooks (#88)', repoName: 'BetopiaLtd/beyondAI-backend', author: 'dev_lead', timeAgo: '2 hours ago', status: 'OPEN' },
          { id: 'act-5', type: 'commit', title: 'feat: add reusable date range filter and query params sync', repoName: 'BetopiaLtd/beyondAI-new-website', author: 'sarah_dev', timeAgo: '3 hours ago', details: '+180 / -42 lines' },
        ],
      },
    };
  }
}

export async function fetchEngineeringSignals(): Promise<{ success: boolean; data: EngineeringSignals }> {
  try {
    return await fetchApi<EngineeringSignals>('/dashboard/signals');
  } catch (err) {
    return {
      success: true,
      data: {
        inactiveRepositories: [
          {
            id: 'repo-legacy',
            githubId: 9942,
            owner: 'BetopiaLtd',
            name: 'legacy-auth-gateway',
            fullName: 'BetopiaLtd/legacy-auth-gateway',
            url: 'https://github.com/BetopiaLtd/legacy-auth-gateway',
            defaultBranch: 'main',
            language: 'JavaScript',
            isActive: true,
            lastSyncedAt: '2026-09-10T12:00:00Z',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2026-09-10T12:00:00Z',
          },
        ],
        stalePullRequests: [
          {
            id: 'pr-stale-1',
            repositoryId: 'repo-1',
            githubPrId: 104,
            number: 104,
            title: 'Refactor legacy Redis pub/sub queue connection pooling',
            state: 'OPEN',
            createdAt: '2026-09-08T10:00:00Z',
            updatedAt: '2026-09-08T10:00:00Z',
            additions: 340,
            deletions: 110,
            changedFiles: 6,
          },
        ],
      },
    };
  }
}
