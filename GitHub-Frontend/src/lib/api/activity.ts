import { fetchApi } from './client';
import { EngineeringActivityItem, ActivityFilters } from '../../types';

export const MOCK_ACTIVITIES: EngineeringActivityItem[] = [
  {
    id: 'act-101',
    type: 'commit',
    developer: { id: 'dev-1', name: 'Alex Mercer', login: 'alex_m', avatarUrl: 'https://github.com/github.png' },
    repository: { id: 'repo-1', name: 'beyondAI-backend', fullName: 'BetopiaLtd/beyondAI-backend' },
    project: { id: 'proj-1', name: 'BeyondAI Core Platform' },
    title: 'refactor: optimize Prisma connection pool parameters',
    description: 'Adjusted max connections and connection timeout parameters for burst traffic load.',
    occurredAt: '2026-09-22T10:42:00Z',
    formattedDate: '22 Sep 2026',
    formattedTime: '10:42 AM',
    githubItem: {
      type: 'commit',
      label: 'a1b2c3d',
      url: 'https://github.com/BetopiaLtd/beyondAI-backend/commit/a1b2c3d4',
    },
    additions: 82,
    deletions: 21,
    status: 'COMMITTED',
  },
  {
    id: 'act-102',
    type: 'pull_request',
    developer: { id: 'dev-1', name: 'Alex Mercer', login: 'alex_m', avatarUrl: 'https://github.com/github.png' },
    repository: { id: 'repo-1', name: 'beyondAI-backend', fullName: 'BetopiaLtd/beyondAI-backend' },
    project: { id: 'proj-1', name: 'BeyondAI Core Platform' },
    title: 'Implement OAuth authentication & token refresh flow',
    description: 'Adds JWT refresh rotation and OAuth callback validator middleware.',
    occurredAt: '2026-09-22T10:15:00Z',
    formattedDate: '22 Sep 2026',
    formattedTime: '10:15 AM',
    githubItem: {
      type: 'pr',
      label: 'PR #284',
      url: 'https://github.com/BetopiaLtd/beyondAI-backend/pull/284',
    },
    additions: 520,
    deletions: 180,
    status: 'OPEN',
  },
  {
    id: 'act-103',
    type: 'review',
    developer: { id: 'dev-2', name: 'Sarah Chen', login: 'sarah_dev', avatarUrl: 'https://github.com/github.png' },
    repository: { id: 'repo-2', name: 'beyondAI-new-website', fullName: 'BetopiaLtd/beyondAI-new-website' },
    project: { id: 'proj-1', name: 'BeyondAI Core Platform' },
    title: 'Reviewed PR #281 (Recharts activity stream)',
    description: 'Approved changes with non-blocking suggestions for memoizing tooltip formatting.',
    occurredAt: '2026-09-22T09:52:00Z',
    formattedDate: '22 Sep 2026',
    formattedTime: '09:52 AM',
    githubItem: {
      type: 'pr',
      label: 'PR #281',
      url: 'https://github.com/BetopiaLtd/beyondAI-new-website/pull/281',
    },
    status: 'APPROVED',
  },
  {
    id: 'act-104',
    type: 'issue',
    developer: { id: 'dev-1', name: 'Alex Mercer', login: 'alex_m', avatarUrl: 'https://github.com/github.png' },
    repository: { id: 'repo-1', name: 'beyondAI-backend', fullName: 'BetopiaLtd/beyondAI-backend' },
    project: { id: 'proj-1', name: 'BeyondAI Core Platform' },
    title: 'Closed #183 (PostgreSQL connection timeout)',
    description: 'Resolved database pool starvation under high concurrent webhook callbacks.',
    occurredAt: '2026-09-22T09:20:00Z',
    formattedDate: '22 Sep 2026',
    formattedTime: '09:20 AM',
    githubItem: {
      type: 'issue',
      label: 'Issue #183',
      url: 'https://github.com/BetopiaLtd/beyondAI-backend/issues/183',
    },
    status: 'CLOSED',
  },
  {
    id: 'act-105',
    type: 'merge',
    developer: { id: 'dev-3', name: 'John Doe', login: 'johndoe', avatarUrl: 'https://github.com/github.png' },
    repository: { id: 'repo-2', name: 'beyondAI-new-website', fullName: 'BetopiaLtd/beyondAI-new-website' },
    project: { id: 'proj-1', name: 'BeyondAI Core Platform' },
    title: 'Merged PR #142 (Layout provider state persistence)',
    description: 'Merged into main branch after successful automated CI integration tests.',
    occurredAt: '2026-09-22T08:18:00Z',
    formattedDate: '22 Sep 2026',
    formattedTime: '08:18 AM',
    githubItem: {
      type: 'pr',
      label: 'PR #142',
      url: 'https://github.com/BetopiaLtd/beyondAI-new-website/pull/142',
    },
    additions: 380,
    deletions: 45,
    status: 'MERGED',
  },
  {
    id: 'act-106',
    type: 'push',
    developer: { id: 'dev-2', name: 'Sarah Chen', login: 'sarah_dev', avatarUrl: 'https://github.com/github.png' },
    repository: { id: 'repo-3', name: 'enosis-api-gateway', fullName: 'BetopiaLtd/enosis-api-gateway' },
    project: { id: 'proj-2', name: 'Enosis Enterprise Suite' },
    title: 'Pushed 4 commits to feature/rate-limiter',
    description: 'Added Redis token bucket rate limiting middleware for public API endpoints.',
    occurredAt: '2026-09-21T17:40:00Z',
    formattedDate: '21 Sep 2026',
    formattedTime: '05:40 PM',
    githubItem: {
      type: 'branch',
      label: 'feature/rate-limiter',
      url: 'https://github.com/BetopiaLtd/enosis-api-gateway/tree/feature/rate-limiter',
    },
    additions: 240,
    deletions: 35,
    status: 'PUSHED',
  },
  {
    id: 'act-107',
    type: 'issue_comment',
    developer: { id: 'dev-4', name: 'Michael Scott', login: 'm_scott', avatarUrl: 'https://github.com/github.png' },
    repository: { id: 'repo-4', name: 'monitoring-agent-fastapi', fullName: 'BetopiaLtd/monitoring-agent-fastapi' },
    project: { id: 'proj-1', name: 'BeyondAI Core Platform' },
    title: 'Commented on Issue #44 (Celery worker memory growth)',
    description: '"Verified max-tasks-per-child option fixes worker heap accumulation in staging."',
    occurredAt: '2026-09-21T15:10:00Z',
    formattedDate: '21 Sep 2026',
    formattedTime: '03:10 PM',
    githubItem: {
      type: 'comment',
      label: 'Issue #44',
      url: 'https://github.com/BetopiaLtd/monitoring-agent-fastapi/issues/44#issuecomment-982',
    },
    status: 'COMMENTED',
  },
  {
    id: 'act-108',
    type: 'branch',
    developer: { id: 'dev-3', name: 'John Doe', login: 'johndoe', avatarUrl: 'https://github.com/github.png' },
    repository: { id: 'repo-1', name: 'beyondAI-backend', fullName: 'BetopiaLtd/beyondAI-backend' },
    project: { id: 'proj-1', name: 'BeyondAI Core Platform' },
    title: 'Created branch feature/projects-analytics',
    description: 'Created remote branch from main for Projects frontend REST API alignment.',
    occurredAt: '2026-09-21T11:05:00Z',
    formattedDate: '21 Sep 2026',
    formattedTime: '11:05 AM',
    githubItem: {
      type: 'branch',
      label: 'feature/projects-analytics',
      url: 'https://github.com/BetopiaLtd/beyondAI-backend/tree/feature/projects-analytics',
    },
    status: 'CREATED',
  },
];

export async function fetchActivityStream(filters: ActivityFilters = {}): Promise<{
  success: boolean;
  data: EngineeringActivityItem[];
  total: number;
}> {
  try {
    const query = new URLSearchParams();
    if (filters.projectId) query.append('projectId', filters.projectId);
    if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
    if (filters.developerId) query.append('developerId', filters.developerId);
    if (filters.activityType) query.append('activityType', filters.activityType);
    if (filters.preset) query.append('preset', filters.preset);
    if (filters.search) query.append('search', filters.search);
    if (filters.sortBy) query.append('sortBy', filters.sortBy);

    const queryString = query.toString();
    const res = await fetchApi<EngineeringActivityItem[]>(`/activity${queryString ? `?${queryString}` : ''}`);
    return {
      success: true,
      data: res.data || [],
      total: (res.data || []).length,
    };
  } catch (err) {
    // Isolated, typed mock fallback for development
    let list = [...MOCK_ACTIVITIES];

    if (filters.projectId) {
      list = list.filter((a) => a.project?.id === filters.projectId);
    }
    if (filters.repositoryId) {
      list = list.filter((a) => a.repository.id === filters.repositoryId);
    }
    if (filters.developerId) {
      list = list.filter((a) => a.developer.id === filters.developerId);
    }
    if (filters.activityType && filters.activityType !== 'all') {
      list = list.filter((a) => a.type === filters.activityType);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q)) ||
          a.developer.name.toLowerCase().includes(q) ||
          a.developer.login.toLowerCase().includes(q) ||
          a.repository.fullName.toLowerCase().includes(q)
      );
    }

    if (filters.sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
    } else {
      list.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    }

    return {
      success: true,
      data: list,
      total: list.length,
    };
  }
}
