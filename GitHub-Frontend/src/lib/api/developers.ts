import { fetchApi } from './client';
import { DeveloperWithMetrics, DeveloperDetailData } from '../../types';

export const MOCK_DEVELOPERS: DeveloperWithMetrics[] = [
  {
    id: 'dev-1',
    githubUserId: 1001,
    login: 'alex_m',
    name: 'Alex Mercer',
    email: 'alex.mercer@betopia.io',
    avatarUrl: 'https://github.com/github.png',
    profileUrl: 'https://github.com/alex_m',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-09-22T10:42:00Z',
    projects: [
      { id: 'proj-1', name: 'BeyondAI Core Platform' },
      { id: 'proj-3', name: 'Internal Developer Tools' },
    ],
    repositories: [
      { id: 'repo-1', name: 'beyondAI-backend', fullName: 'BetopiaLtd/beyondAI-backend' },
      { id: 'repo-4', name: 'monitoring-agent-fastapi', fullName: 'BetopiaLtd/monitoring-agent-fastapi' },
    ],
    metrics: {
      projectsCount: 2,
      repositoriesCount: 2,
      commitsCount: 94,
      prsCount: 16,
      reviewsCount: 28,
      issuesCount: 6,
      linesAdded: 8500,
      linesDeleted: 2100,
      lastActivityAt: '2026-09-22T10:42:00Z',
    },
    _count: {
      commits: 94,
      pullRequests: 16,
      reviews: 28,
    },
  },
  {
    id: 'dev-2',
    githubUserId: 1002,
    login: 'sarah_dev',
    name: 'Sarah Chen',
    email: 'sarah.chen@betopia.io',
    avatarUrl: 'https://github.com/github.png',
    profileUrl: 'https://github.com/sarah_dev',
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-09-22T09:30:00Z',
    projects: [
      { id: 'proj-1', name: 'BeyondAI Core Platform' },
      { id: 'proj-2', name: 'Enosis Enterprise Suite' },
    ],
    repositories: [
      { id: 'repo-2', name: 'beyondAI-new-website', fullName: 'BetopiaLtd/beyondAI-new-website' },
      { id: 'repo-3', name: 'enosis-api-gateway', fullName: 'BetopiaLtd/enosis-api-gateway' },
    ],
    metrics: {
      projectsCount: 2,
      repositoriesCount: 2,
      commitsCount: 82,
      prsCount: 14,
      reviewsCount: 24,
      issuesCount: 4,
      linesAdded: 6200,
      linesDeleted: 1450,
      lastActivityAt: '2026-09-22T09:30:00Z',
    },
    _count: {
      commits: 82,
      pullRequests: 14,
      reviews: 24,
    },
  },
  {
    id: 'dev-3',
    githubUserId: 1003,
    login: 'johndoe',
    name: 'John Doe',
    email: 'john.doe@betopia.io',
    avatarUrl: 'https://github.com/github.png',
    profileUrl: 'https://github.com/johndoe',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-09-22T08:18:00Z',
    projects: [{ id: 'proj-1', name: 'BeyondAI Core Platform' }],
    repositories: [
      { id: 'repo-1', name: 'beyondAI-backend', fullName: 'BetopiaLtd/beyondAI-backend' },
      { id: 'repo-2', name: 'beyondAI-new-website', fullName: 'BetopiaLtd/beyondAI-new-website' },
    ],
    metrics: {
      projectsCount: 1,
      repositoriesCount: 2,
      commitsCount: 46,
      prsCount: 8,
      reviewsCount: 12,
      issuesCount: 3,
      linesAdded: 3750,
      linesDeleted: 570,
      lastActivityAt: '2026-09-22T08:18:00Z',
    },
    _count: {
      commits: 46,
      pullRequests: 8,
      reviews: 12,
    },
  },
  {
    id: 'dev-4',
    githubUserId: 1004,
    login: 'm_scott',
    name: 'Michael Scott',
    email: 'm.scott@betopia.io',
    avatarUrl: 'https://github.com/github.png',
    profileUrl: 'https://github.com/m_scott',
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2026-09-20T14:15:00Z',
    projects: [
      { id: 'proj-3', name: 'Internal Developer Tools' },
      { id: 'proj-4', name: 'Legacy Auth Gateway' },
    ],
    repositories: [{ id: 'repo-5', name: 'legacy-auth-gateway', fullName: 'BetopiaLtd/legacy-auth-gateway' }],
    metrics: {
      projectsCount: 2,
      repositoriesCount: 1,
      commitsCount: 34,
      prsCount: 4,
      reviewsCount: 8,
      issuesCount: 2,
      linesAdded: 2100,
      linesDeleted: 890,
      lastActivityAt: '2026-09-20T14:15:00Z',
    },
    _count: {
      commits: 34,
      pullRequests: 4,
      reviews: 8,
    },
  },
];

export async function fetchDevelopers(): Promise<{ success: boolean; data: DeveloperWithMetrics[] }> {
  try {
    return await fetchApi<DeveloperWithMetrics[]>('/developers');
  } catch (err) {
    return { success: true, data: MOCK_DEVELOPERS };
  }
}

export async function fetchDeveloperDetails(developerId: string): Promise<{ success: boolean; data: DeveloperDetailData }> {
  try {
    return await fetchApi<DeveloperDetailData>(`/developers/${developerId}`);
  } catch (err) {
    const foundDev = MOCK_DEVELOPERS.find((d) => d.id === developerId || d.login === developerId) || MOCK_DEVELOPERS[0];

    const mockDetailData: DeveloperDetailData = {
      developer: foundDev,
      commitStats: {
        totalCommits: foundDev.metrics.commitsCount,
        avgAdditionsPerCommit: 48,
        topRepo: foundDev.repositories[0]?.name || 'beyondAI-backend',
        commitsByDay: [
          { date: 'Sep 16', count: 12 },
          { date: 'Sep 17', count: 18 },
          { date: 'Sep 18', count: 9 },
          { date: 'Sep 19', count: 22 },
          { date: 'Sep 20', count: 14 },
          { date: 'Sep 21', count: 28 },
          { date: 'Sep 22', count: 16 },
        ],
      },
      prStats: {
        totalPRs: foundDev.metrics.prsCount,
        openPRs: 3,
        mergedPRs: foundDev.metrics.prsCount - 4,
        closedPRs: 1,
      },
      reviewStats: {
        totalReviews: foundDev.metrics.reviewsCount,
        approved: Math.floor(foundDev.metrics.reviewsCount * 0.75),
        changesRequested: Math.floor(foundDev.metrics.reviewsCount * 0.15),
        commented: Math.floor(foundDev.metrics.reviewsCount * 0.1),
      },
      issueStats: {
        totalIssues: foundDev.metrics.issuesCount,
        opened: 2,
        closed: foundDev.metrics.issuesCount - 2,
      },
      codeChangeStats: {
        totalAdditions: foundDev.metrics.linesAdded,
        totalDeletions: foundDev.metrics.linesDeleted,
        netChanges: foundDev.metrics.linesAdded - foundDev.metrics.linesDeleted,
        trend: [
          { date: 'Sep 16', additions: 1400, deletions: 320 },
          { date: 'Sep 17', additions: 2100, deletions: 540 },
          { date: 'Sep 18', additions: 950, deletions: 210 },
          { date: 'Sep 19', additions: 3400, deletions: 890 },
          { date: 'Sep 20', additions: 1800, deletions: 420 },
          { date: 'Sep 21', additions: 2900, deletions: 680 },
          { date: 'Sep 22', additions: 2200, deletions: 510 },
        ],
      },
      activityTimeline: [
        {
          id: 'ev-1',
          date: '2026-09-22',
          displayDate: '22 Sep',
          time: '10:42',
          type: 'commit',
          title: 'refactor: optimize Prisma connection pool parameters',
          repoName: 'BetopiaLtd/beyondAI-backend',
          additions: 82,
          deletions: 21,
          url: 'https://github.com/BetopiaLtd/beyondAI-backend/commit/a1b2c3d4',
        },
        {
          id: 'ev-2',
          date: '2026-09-22',
          displayDate: '22 Sep',
          time: '10:15',
          type: 'pull_request',
          title: 'Authentication update (#284)',
          repoName: 'BetopiaLtd/beyondAI-backend',
          prNumber: 284,
          status: 'OPEN',
        },
        {
          id: 'ev-3',
          date: '2026-09-22',
          displayDate: '22 Sep',
          time: '09:52',
          type: 'review',
          title: 'Reviewed PR #281 (Recharts activity stream)',
          repoName: 'BetopiaLtd/beyondAI-new-website',
          status: 'APPROVED',
        },
        {
          id: 'ev-4',
          date: '2026-09-22',
          displayDate: '22 Sep',
          time: '09:20',
          type: 'issue',
          title: 'Closed #183 (PostgreSQL connection timeout)',
          repoName: 'BetopiaLtd/beyondAI-backend',
          issueNumber: 183,
          status: 'CLOSED',
        },
        {
          id: 'ev-5',
          date: '2026-09-21',
          displayDate: '21 Sep',
          time: '17:30',
          type: 'commit',
          title: 'feat: add GitHub webhook payload validator middleware',
          repoName: 'BetopiaLtd/beyondAI-backend',
          additions: 145,
          deletions: 22,
        },
        {
          id: 'ev-6',
          date: '2026-09-21',
          displayDate: '21 Sep',
          time: '14:15',
          type: 'pull_request',
          title: 'Implement OAuth authentication & token refresh flow (#142)',
          repoName: 'BetopiaLtd/beyondAI-backend',
          prNumber: 142,
          status: 'MERGED',
        },
      ],
      activityDistribution: [
        { date: 'Sep 16', label: 'Mon', commits: 12, prs: 2, reviews: 4, issues: 1 },
        { date: 'Sep 17', label: 'Tue', commits: 18, prs: 3, reviews: 5, issues: 2 },
        { date: 'Sep 18', label: 'Wed', commits: 9, prs: 1, reviews: 3, issues: 0 },
        { date: 'Sep 19', label: 'Thu', commits: 22, prs: 4, reviews: 6, issues: 1 },
        { date: 'Sep 20', label: 'Fri', commits: 14, prs: 2, reviews: 4, issues: 1 },
        { date: 'Sep 21', label: 'Sat', commits: 28, prs: 5, reviews: 8, issues: 2 },
        { date: 'Sep 22', label: 'Sun', commits: 16, prs: 3, reviews: 5, issues: 1 },
      ],
    };

    return { success: true, data: mockDetailData };
  }
}

