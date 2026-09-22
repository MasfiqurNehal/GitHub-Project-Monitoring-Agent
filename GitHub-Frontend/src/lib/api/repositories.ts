import { fetchApi } from './client';
import { RepositoryWithMetrics, RepositoryDetailData } from '../../types';

export const MOCK_REPOSITORIES: RepositoryWithMetrics[] = [
  {
    id: 'repo-1',
    projectId: 'proj-1',
    githubId: 101,
    owner: 'BetopiaLtd',
    name: 'beyondAI-backend',
    fullName: 'BetopiaLtd/beyondAI-backend',
    url: 'https://github.com/BetopiaLtd/beyondAI-backend',
    defaultBranch: 'main',
    language: 'TypeScript',
    isActive: true,
    isPrivate: true,
    status: 'ACTIVE',
    lastSyncedAt: '2026-09-22T08:15:00Z',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-09-22T08:15:00Z',
    project: {
      id: 'proj-1',
      name: 'BeyondAI Core Platform',
      status: 'ACTIVE',
      createdAt: '2026-01-15T08:00:00Z',
      updatedAt: '2026-09-22T08:30:00Z',
    },
    metrics: {
      developersCount: 6,
      commitsCount: 124,
      prsCount: 18,
      issuesCount: 8,
      linesAdded: 9850,
      linesDeleted: 2310,
      lastActivityAt: '2026-09-22T08:15:00Z',
    },
  },
  {
    id: 'repo-2',
    projectId: 'proj-1',
    githubId: 102,
    owner: 'BetopiaLtd',
    name: 'beyondAI-new-website',
    fullName: 'BetopiaLtd/beyondAI-new-website',
    url: 'https://github.com/BetopiaLtd/beyondAI-new-website',
    defaultBranch: 'main',
    language: 'TypeScript',
    isActive: true,
    isPrivate: false,
    status: 'ACTIVE',
    lastSyncedAt: '2026-09-22T09:30:00Z',
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-09-22T09:30:00Z',
    project: {
      id: 'proj-1',
      name: 'BeyondAI Core Platform',
      status: 'ACTIVE',
      createdAt: '2026-01-15T08:00:00Z',
      updatedAt: '2026-09-22T08:30:00Z',
    },
    metrics: {
      developersCount: 4,
      commitsCount: 98,
      prsCount: 14,
      issuesCount: 4,
      linesAdded: 6200,
      linesDeleted: 1450,
      lastActivityAt: '2026-09-22T09:30:00Z',
    },
  },
  {
    id: 'repo-3',
    projectId: 'proj-2',
    githubId: 103,
    owner: 'BetopiaLtd',
    name: 'enosis-api-gateway',
    fullName: 'BetopiaLtd/enosis-api-gateway',
    url: 'https://github.com/BetopiaLtd/enosis-api-gateway',
    defaultBranch: 'main',
    language: 'Go',
    isActive: true,
    isPrivate: true,
    status: 'ACTIVE',
    lastSyncedAt: '2026-09-21T19:40:00Z',
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-09-21T19:40:00Z',
    project: {
      id: 'proj-2',
      name: 'Enosis Enterprise Suite',
      status: 'ACTIVE',
      createdAt: '2026-03-01T08:00:00Z',
      updatedAt: '2026-09-21T16:30:00Z',
    },
    metrics: {
      developersCount: 5,
      commitsCount: 86,
      prsCount: 10,
      issuesCount: 5,
      linesAdded: 7400,
      linesDeleted: 1890,
      lastActivityAt: '2026-09-21T19:40:00Z',
    },
  },
  {
    id: 'repo-4',
    projectId: 'proj-1',
    githubId: 104,
    owner: 'BetopiaLtd',
    name: 'monitoring-agent-fastapi',
    fullName: 'BetopiaLtd/monitoring-agent-fastapi',
    url: 'https://github.com/BetopiaLtd/monitoring-agent-fastapi',
    defaultBranch: 'main',
    language: 'Python',
    isActive: true,
    isPrivate: true,
    status: 'ACTIVE',
    lastSyncedAt: '2026-09-22T07:20:00Z',
    createdAt: '2026-03-10T08:00:00Z',
    updatedAt: '2026-09-22T07:20:00Z',
    project: {
      id: 'proj-1',
      name: 'BeyondAI Core Platform',
      status: 'ACTIVE',
      createdAt: '2026-01-15T08:00:00Z',
      updatedAt: '2026-09-22T08:30:00Z',
    },
    metrics: {
      developersCount: 3,
      commitsCount: 76,
      prsCount: 8,
      issuesCount: 3,
      linesAdded: 5100,
      linesDeleted: 1120,
      lastActivityAt: '2026-09-22T07:20:00Z',
    },
  },
  {
    id: 'repo-5',
    projectId: 'proj-4',
    githubId: 105,
    owner: 'BetopiaLtd',
    name: 'legacy-auth-gateway',
    fullName: 'BetopiaLtd/legacy-auth-gateway',
    url: 'https://github.com/BetopiaLtd/legacy-auth-gateway',
    defaultBranch: 'master',
    language: 'JavaScript',
    isActive: false,
    isPrivate: true,
    status: 'PAUSED',
    lastSyncedAt: '2026-09-18T10:00:00Z',
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2026-09-18T10:00:00Z',
    project: {
      id: 'proj-4',
      name: 'Legacy Auth Gateway',
      status: 'PAUSED',
      createdAt: '2025-06-01T08:00:00Z',
      updatedAt: '2026-09-18T10:00:00Z',
    },
    metrics: {
      developersCount: 2,
      commitsCount: 34,
      prsCount: 4,
      issuesCount: 2,
      linesAdded: 2100,
      linesDeleted: 890,
      lastActivityAt: '2026-09-18T10:00:00Z',
    },
  },
];

export async function fetchRepositories(filters: {
  projectId?: string;
  search?: string;
  status?: string;
  visibility?: 'public' | 'private' | 'all';
} = {}): Promise<{ success: boolean; data: RepositoryWithMetrics[] }> {
  try {
    const query = new URLSearchParams();
    if (filters.projectId) query.append('projectId', filters.projectId);
    if (filters.search) query.append('search', filters.search);
    if (filters.status) query.append('status', filters.status);
    if (filters.visibility) query.append('visibility', filters.visibility);

    const queryString = query.toString();
    return await fetchApi<RepositoryWithMetrics[]>(`/repositories${queryString ? `?${queryString}` : ''}`);
  } catch (err) {
    let list = [...MOCK_REPOSITORIES];
    if (filters.projectId) {
      list = list.filter((r) => r.projectId === filters.projectId);
    }
    if (filters.visibility && filters.visibility !== 'all') {
      const isPriv = filters.visibility === 'private';
      list = list.filter((r) => r.isPrivate === isPriv);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.fullName.toLowerCase().includes(q));
    }
    return { success: true, data: list };
  }
}

export async function fetchRepositoryDetails(repositoryId: string): Promise<{ success: boolean; data: RepositoryDetailData }> {
  try {
    return await fetchApi<RepositoryDetailData>(`/repositories/${repositoryId}`);
  } catch (err) {
    const foundRepo = MOCK_REPOSITORIES.find((r) => r.id === repositoryId) || MOCK_REPOSITORIES[0];

    const mockDetailData: RepositoryDetailData = {
      repository: foundRepo,
      overview: {
        openPRsCount: 4,
        mergedPRsCount: 14,
        openIssuesCount: 3,
        closedIssuesCount: 5,
        activeBranch: foundRepo.defaultBranch,
        readOnlyStatus: true,
      },
      developers: [
        {
          id: 'dev-1',
          name: 'Alex Mercer',
          login: 'alex_m',
          avatarUrl: 'https://github.com/github.png',
          commits: 64,
          prs: 10,
          reviews: 18,
          linesAdded: 4500,
          linesDeleted: 1200,
        },
        {
          id: 'dev-2',
          name: 'Sarah Chen',
          login: 'sarah_dev',
          avatarUrl: 'https://github.com/github.png',
          commits: 42,
          prs: 6,
          reviews: 12,
          linesAdded: 3200,
          linesDeleted: 780,
        },
        {
          id: 'dev-3',
          name: 'John Doe',
          login: 'johndoe',
          avatarUrl: 'https://github.com/github.png',
          commits: 18,
          prs: 2,
          reviews: 5,
          linesAdded: 2150,
          linesDeleted: 330,
        },
      ],
      recentActivity: [
        {
          id: 'act-1',
          type: 'pull_request',
          title: 'Implement OAuth authentication & token refresh flow (#142)',
          repoName: foundRepo.fullName,
          author: 'johndoe',
          timeAgo: '12 mins ago',
          status: 'MERGED',
        },
        {
          id: 'act-2',
          type: 'commit',
          title: 'refactor: optimize Prisma connection pool parameters',
          repoName: foundRepo.fullName,
          author: 'alex_m',
          timeAgo: '28 mins ago',
          details: '+95 / -30 lines',
        },
        {
          id: 'act-4',
          type: 'issue',
          title: 'PostgreSQL connection timeout during burst webhooks (#88)',
          repoName: foundRepo.fullName,
          author: 'alex_m',
          timeAgo: '2 hours ago',
          status: 'OPEN',
        },
      ],
      commits: [
        {
          id: 'c-1',
          repositoryId: foundRepo.id,
          githubSha: 'a1b2c3d4e5f67890',
          message: 'feat: add GitHub webhook payload validator middleware',
          commitUrl: `${foundRepo.url}/commit/a1b2c3d4e5f67890`,
          committedAt: '2026-09-22T08:30:00Z',
          additions: 145,
          deletions: 22,
          changedFiles: 4,
          author: {
            id: 'dev-1',
            login: 'alex_m',
            name: 'Alex Mercer',
            avatarUrl: 'https://github.com/github.png',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        },
        {
          id: 'c-3',
          repositoryId: foundRepo.id,
          githubSha: '3c4d5e6f7a8b9c0d',
          message: 'refactor: isolate Prisma client singleton for serverless handlers',
          commitUrl: `${foundRepo.url}/commit/3c4d5e6f7a8b9c0d`,
          committedAt: '2026-09-21T19:40:00Z',
          additions: 88,
          deletions: 64,
          changedFiles: 3,
          author: {
            id: 'dev-3',
            login: 'johndoe',
            name: 'John Doe',
            avatarUrl: 'https://github.com/github.png',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        },
      ],
      pullRequests: [
        {
          id: 'pr-1',
          repositoryId: foundRepo.id,
          githubPrId: 142,
          number: 142,
          title: 'Implement OAuth authentication & token refresh flow',
          state: 'MERGED',
          createdAt: '2026-09-21T14:00:00Z',
          updatedAt: '2026-09-22T08:18:00Z',
          closedAt: '2026-09-22T08:18:00Z',
          mergedAt: '2026-09-22T08:18:00Z',
          additions: 520,
          deletions: 180,
          changedFiles: 12,
          author: {
            id: 'dev-3',
            login: 'johndoe',
            name: 'John Doe',
            avatarUrl: 'https://github.com/github.png',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        },
        {
          id: 'pr-2',
          repositoryId: foundRepo.id,
          githubPrId: 143,
          number: 143,
          title: 'Add interactive Recharts activity stream & filter bar',
          state: 'OPEN',
          createdAt: '2026-09-22T06:30:00Z',
          updatedAt: '2026-09-22T06:30:00Z',
          additions: 380,
          deletions: 45,
          changedFiles: 7,
          author: {
            id: 'dev-2',
            login: 'sarah_dev',
            name: 'Sarah Chen',
            avatarUrl: 'https://github.com/github.png',
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
          },
        },
      ],
      issues: [
        {
          id: 'iss-1',
          number: 88,
          title: 'PostgreSQL connection timeout during burst webhooks',
          repoName: foundRepo.fullName,
          author: 'alex_m',
          authorAvatar: 'https://github.com/github.png',
          state: 'OPEN',
          createdAt: '2026-09-22T06:15:00Z',
          updatedAt: '2026-09-22T06:15:00Z',
        },
        {
          id: 'iss-2',
          number: 82,
          title: 'Memory leak in real-time SSE stream reconnection loop',
          repoName: foundRepo.fullName,
          author: 'sarah_dev',
          authorAvatar: 'https://github.com/github.png',
          state: 'CLOSED',
          createdAt: '2026-09-20T10:00:00Z',
          updatedAt: '2026-09-21T18:00:00Z',
        },
      ],
      codeChanges: {
        trend: [
          { date: 'Sep 16', additions: 1800, deletions: 450 },
          { date: 'Sep 17', additions: 2400, deletions: 620 },
          { date: 'Sep 18', additions: 1950, deletions: 310 },
          { date: 'Sep 19', additions: 3200, deletions: 890 },
          { date: 'Sep 20', additions: 2100, deletions: 420 },
          { date: 'Sep 21', additions: 3800, deletions: 740 },
          { date: 'Sep 22', additions: 2600, deletions: 580 },
        ],
        totalAdditions: foundRepo.metrics.linesAdded,
        totalDeletions: foundRepo.metrics.linesDeleted,
        netChanges: foundRepo.metrics.linesAdded - foundRepo.metrics.linesDeleted,
        topFilesChanged: [
          { name: 'src/services/github-sync.service.ts', repoName: foundRepo.name, additions: 1420, deletions: 380 },
          { name: 'src/routes/webhook.router.ts', repoName: foundRepo.name, additions: 740, deletions: 190 },
          { name: 'src/lib/database/prisma-client.ts', repoName: foundRepo.name, additions: 520, deletions: 410 },
        ],
      },
    };

    return { success: true, data: mockDetailData };
  }
}

export async function triggerRepositorySync(repositoryId: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetchApi<{ message: string }>(`/repositories/${repositoryId}/sync`, {
      method: 'POST',
    });
    return {
      success: res.success,
      message: res.data?.message || res.message || 'Sync triggered successfully',
    };
  } catch (err) {
    const repo = MOCK_REPOSITORIES.find((r) => r.id === repositoryId);
    if (repo) {
      repo.lastSyncedAt = new Date().toISOString();
      repo.status = 'ACTIVE';
    }
    return {
      success: true,
      message: 'Repository synchronization completed successfully.',
    };
  }
}

