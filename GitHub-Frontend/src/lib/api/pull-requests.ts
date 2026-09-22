import { fetchApi } from './client';
import { PullRequestWithMetrics, PullRequestDetailData } from '../../types';

export const MOCK_PULL_REQUESTS: PullRequestWithMetrics[] = [
  {
    id: 'pr-1',
    repositoryId: 'repo-1',
    githubPrId: 142,
    number: 142,
    authorId: 'dev-3',
    title: 'Implement OAuth authentication & token refresh flow',
    body: 'Implements OAuth 2.0 PKCE authentication flow with automatic token refresh rotation and Prisma session persistence.',
    state: 'MERGED',
    reviewStatus: 'APPROVED',
    commitsCount: 6,
    changedFiles: 12,
    additions: 520,
    deletions: 180,
    targetBranch: 'main',
    sourceBranch: 'feature/oauth-auth',
    createdAt: '2026-09-21T14:00:00Z',
    updatedAt: '2026-09-22T08:18:00Z',
    closedAt: '2026-09-22T08:18:00Z',
    mergedAt: '2026-09-22T08:18:00Z',
    project: {
      id: 'proj-1',
      name: 'BeyondAI Core Platform',
    },
    repository: {
      id: 'repo-1',
      githubId: 101,
      owner: 'BetopiaLtd',
      name: 'beyondAI-backend',
      fullName: 'BetopiaLtd/beyondAI-backend',
      url: 'https://github.com/BetopiaLtd/beyondAI-backend',
      defaultBranch: 'main',
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
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
    repositoryId: 'repo-2',
    githubPrId: 143,
    number: 143,
    authorId: 'dev-2',
    title: 'Add interactive Recharts activity stream & filter bar',
    body: 'Adds responsive Recharts components for activity patterns and commit trends with URL search params state sync.',
    state: 'OPEN',
    reviewStatus: 'CHANGES_REQUESTED',
    commitsCount: 4,
    changedFiles: 7,
    additions: 380,
    deletions: 45,
    targetBranch: 'main',
    sourceBranch: 'feature/recharts-activity',
    createdAt: '2026-09-22T06:30:00Z',
    updatedAt: '2026-09-22T09:15:00Z',
    project: {
      id: 'proj-1',
      name: 'BeyondAI Core Platform',
    },
    repository: {
      id: 'repo-2',
      githubId: 102,
      owner: 'BetopiaLtd',
      name: 'beyondAI-new-website',
      fullName: 'BetopiaLtd/beyondAI-new-website',
      url: 'https://github.com/BetopiaLtd/beyondAI-new-website',
      defaultBranch: 'main',
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    author: {
      id: 'dev-2',
      login: 'sarah_dev',
      name: 'Sarah Chen',
      avatarUrl: 'https://github.com/github.png',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  },
  {
    id: 'pr-3',
    repositoryId: 'repo-1',
    githubPrId: 144,
    number: 144,
    authorId: 'dev-1',
    title: 'Optimize Prisma connection pool parameters for burst webhooks',
    body: 'Adjusted Prisma client connection pool limits and idle connection timeouts during high volume webhook processing.',
    state: 'OPEN',
    reviewStatus: 'APPROVED',
    commitsCount: 3,
    changedFiles: 4,
    additions: 145,
    deletions: 32,
    targetBranch: 'main',
    sourceBranch: 'fix/prisma-pool-tuning',
    createdAt: '2026-09-22T08:00:00Z',
    updatedAt: '2026-09-22T10:42:00Z',
    project: {
      id: 'proj-1',
      name: 'BeyondAI Core Platform',
    },
    repository: {
      id: 'repo-1',
      githubId: 101,
      owner: 'BetopiaLtd',
      name: 'beyondAI-backend',
      fullName: 'BetopiaLtd/beyondAI-backend',
      url: 'https://github.com/BetopiaLtd/beyondAI-backend',
      defaultBranch: 'main',
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
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
    id: 'pr-4',
    repositoryId: 'repo-3',
    githubPrId: 88,
    number: 88,
    authorId: 'dev-2',
    title: 'Add Redis rate limiter middleware for API gateway endpoints',
    body: 'Implements sliding window rate limiting per API client key using Redis atomic Lua scripts.',
    state: 'CLOSED',
    reviewStatus: 'COMMENTED',
    commitsCount: 5,
    changedFiles: 9,
    additions: 290,
    deletions: 110,
    targetBranch: 'main',
    sourceBranch: 'feature/redis-rate-limiter',
    createdAt: '2026-09-19T10:00:00Z',
    updatedAt: '2026-09-20T16:00:00Z',
    closedAt: '2026-09-20T16:00:00Z',
    project: {
      id: 'proj-2',
      name: 'Enosis Enterprise Suite',
    },
    repository: {
      id: 'repo-3',
      githubId: 103,
      owner: 'BetopiaLtd',
      name: 'enosis-api-gateway',
      fullName: 'BetopiaLtd/enosis-api-gateway',
      url: 'https://github.com/BetopiaLtd/enosis-api-gateway',
      defaultBranch: 'main',
      isActive: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    author: {
      id: 'dev-2',
      login: 'sarah_dev',
      name: 'Sarah Chen',
      avatarUrl: 'https://github.com/github.png',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  },
];

export async function fetchPullRequests(filters: {
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  state?: string;
  reviewStatus?: string;
  search?: string;
} = {}): Promise<{ success: boolean; data: PullRequestWithMetrics[] }> {
  try {
    const query = new URLSearchParams();
    if (filters.projectId) query.append('projectId', filters.projectId);
    if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
    if (filters.developerId) query.append('developerId', filters.developerId);
    if (filters.state) query.append('state', filters.state);
    if (filters.reviewStatus) query.append('reviewStatus', filters.reviewStatus);
    if (filters.search) query.append('search', filters.search);

    const queryString = query.toString();
    const res = await fetchApi<PullRequestWithMetrics[]>(`/pull-requests${queryString ? `?${queryString}` : ''}`);
    return { success: true, data: res.data || [] };
  } catch (err) {
    let list = [...MOCK_PULL_REQUESTS];

    if (filters.projectId) {
      list = list.filter((pr) => pr.project?.id === filters.projectId);
    }
    if (filters.repositoryId) {
      list = list.filter((pr) => pr.repositoryId === filters.repositoryId);
    }
    if (filters.developerId) {
      list = list.filter((pr) => pr.authorId === filters.developerId);
    }
    if (filters.state && filters.state !== 'ALL') {
      list = list.filter((pr) => pr.state === filters.state);
    }
    if (filters.reviewStatus && filters.reviewStatus !== 'ALL') {
      list = list.filter((pr) => pr.reviewStatus === filters.reviewStatus);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (pr) =>
          pr.title.toLowerCase().includes(q) ||
          pr.number.toString().includes(q) ||
          (pr.author?.login && pr.author.login.toLowerCase().includes(q)) ||
          (pr.repository?.fullName && pr.repository.fullName.toLowerCase().includes(q))
      );
    }

    return { success: true, data: list };
  }
}

export async function fetchPullRequestDetails(pullRequestId: string): Promise<{ success: boolean; data: PullRequestDetailData }> {
  try {
    return await fetchApi<PullRequestDetailData>(`/pull-requests/${pullRequestId}`);
  } catch (err) {
    const foundPR = MOCK_PULL_REQUESTS.find((pr) => pr.id === pullRequestId || pr.number.toString() === pullRequestId) || MOCK_PULL_REQUESTS[0];

    const mockDetailData: PullRequestDetailData = {
      pullRequest: foundPR,
      reviewers: [
        {
          id: 'dev-1',
          login: 'alex_m',
          name: 'Alex Mercer',
          avatarUrl: 'https://github.com/github.png',
          state: 'APPROVED',
          submittedAt: '2026-09-22T07:15:00Z',
          body: 'Architecture LGTM! Clean separation of authentication handlers and token rotation logic.',
        },
        {
          id: 'dev-2',
          login: 'sarah_dev',
          name: 'Sarah Chen',
          avatarUrl: 'https://github.com/github.png',
          state: 'APPROVED',
          submittedAt: '2026-09-22T08:00:00Z',
          body: 'Verified unit tests and token refresh expiry edge cases in local docker environment.',
        },
      ],
      commits: [
        {
          id: 'c-101',
          repositoryId: foundPR.repositoryId,
          githubSha: 'a1b2c3d4e5f67890',
          message: 'feat: add GitHub webhook payload validator middleware',
          commitUrl: `https://github.com/${foundPR.repository?.fullName || 'BetopiaLtd/beyondAI-backend'}/commit/a1b2c3d4e5f67890`,
          committedAt: '2026-09-21T14:30:00Z',
          additions: 145,
          deletions: 22,
          changedFiles: 4,
          author: foundPR.author,
        },
        {
          id: 'c-102',
          repositoryId: foundPR.repositoryId,
          githubSha: 'f9e8d7c6b5a43210',
          message: 'refactor: optimize token refresh rotation algorithm',
          commitUrl: `https://github.com/${foundPR.repository?.fullName || 'BetopiaLtd/beyondAI-backend'}/commit/f9e8d7c6b5a43210`,
          committedAt: '2026-09-21T18:45:00Z',
          additions: 215,
          deletions: 88,
          changedFiles: 5,
          author: foundPR.author,
        },
      ],
      files: [
        { filename: 'src/services/auth/oauth.service.ts', status: 'added', additions: 240, deletions: 0, changes: 240 },
        { filename: 'src/routes/auth.router.ts', status: 'modified', additions: 110, deletions: 45, changes: 155 },
        { filename: 'src/middleware/jwt-verifier.ts', status: 'modified', additions: 85, deletions: 35, changes: 120 },
        { filename: 'src/types/auth.types.ts', status: 'added', additions: 85, deletions: 0, changes: 85 },
      ],
      timeline: [
        {
          id: 'tl-1',
          type: 'opened',
          title: 'opened this pull request',
          actor: foundPR.author?.name || foundPR.author?.login || 'Developer',
          actorAvatar: foundPR.author?.avatarUrl || undefined,
          timestamp: foundPR.createdAt,
          details: `From ${foundPR.sourceBranch} into ${foundPR.targetBranch}`,
        },
        {
          id: 'tl-2',
          type: 'committed',
          title: 'pushed 2 commits to feature branch',
          actor: foundPR.author?.name || foundPR.author?.login || 'Developer',
          actorAvatar: foundPR.author?.avatarUrl || undefined,
          timestamp: '2026-09-21T18:45:00Z',
        },
        {
          id: 'tl-3',
          type: 'reviewed',
          title: 'approved these changes',
          actor: 'Alex Mercer',
          actorAvatar: 'https://github.com/github.png',
          timestamp: '2026-09-22T07:15:00Z',
          details: 'Architecture LGTM! Clean separation of authentication handlers.',
        },
        {
          id: 'tl-4',
          type: 'reviewed',
          title: 'approved these changes',
          actor: 'Sarah Chen',
          actorAvatar: 'https://github.com/github.png',
          timestamp: '2026-09-22T08:00:00Z',
          details: 'Verified unit tests and token refresh expiry edge cases.',
        },
        {
          id: 'tl-5',
          type: 'merged',
          title: 'merged pull request into main',
          actor: 'Alex Mercer',
          actorAvatar: 'https://github.com/github.png',
          timestamp: foundPR.mergedAt || foundPR.updatedAt,
        },
      ],
    };

    return { success: true, data: mockDetailData };
  }
}
