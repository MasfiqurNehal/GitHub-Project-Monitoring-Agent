import { fetchApi } from './client';
import { IssueWithMetrics, IssueDetailData, IssueFilters } from '../../types';

export const MOCK_ISSUES: IssueWithMetrics[] = [
  {
    id: 'issue-1',
    repositoryId: 'repo-1',
    githubIssueId: 101,
    number: 101,
    title: 'High latency spiked during database connection pool exhaust under load',
    body: 'Investigate Prisma connection pool settings when background sync jobs and REST API webhooks fire simultaneously. Latency p99 spikes to 2.4s.',
    state: 'OPEN',
    author: {
      id: 'dev-1',
      login: 'alex_m',
      name: 'Alex Mercer',
      avatarUrl: 'https://github.com/github.png',
    },
    repository: {
      id: 'repo-1',
      name: 'beyondAI-backend',
      fullName: 'BetopiaLtd/beyondAI-backend',
    },
    project: {
      id: 'proj-1',
      name: 'BeyondAI Core Platform',
    },
    labels: [
      { id: 'lbl-1', name: 'bug', color: '#ef4444', description: 'Something isn\'t working' },
      { id: 'lbl-2', name: 'performance', color: '#10b981', description: 'Performance optimization' },
      { id: 'lbl-3', name: 'high-priority', color: '#f43f5e', description: 'Requires urgent attention' },
    ],
    assignees: [
      { id: 'dev-1', login: 'alex_m', name: 'Alex Mercer', avatarUrl: 'https://github.com/github.png' },
      { id: 'dev-3', login: 'johndoe', name: 'John Doe', avatarUrl: 'https://github.com/github.png' },
    ],
    commentsCount: 5,
    createdAt: '2026-09-21T09:15:00Z',
    updatedAt: '2026-09-22T11:20:00Z',
  },
  {
    id: 'issue-2',
    repositoryId: 'repo-2',
    githubIssueId: 102,
    number: 102,
    title: 'Dark theme contrast ratio accessibility review for CTO filter bar controls',
    body: 'Audit WCAG 2.1 AA compliance for text labels in dropdown selects and input placeholders on high DPI dark mode monitors.',
    state: 'OPEN',
    author: {
      id: 'dev-2',
      login: 'sarah_dev',
      name: 'Sarah Chen',
      avatarUrl: 'https://github.com/github.png',
    },
    repository: {
      id: 'repo-2',
      name: 'beyondAI-new-website',
      fullName: 'BetopiaLtd/beyondAI-new-website',
    },
    project: {
      id: 'proj-1',
      name: 'BeyondAI Core Platform',
    },
    labels: [
      { id: 'lbl-4', name: 'enhancement', color: '#a855f7', description: 'New feature or improvement' },
      { id: 'lbl-5', name: 'ui/ux', color: '#06b6d4', description: 'User interface design' },
    ],
    assignees: [
      { id: 'dev-2', login: 'sarah_dev', name: 'Sarah Chen', avatarUrl: 'https://github.com/github.png' },
    ],
    commentsCount: 2,
    createdAt: '2026-09-22T04:30:00Z',
    updatedAt: '2026-09-22T10:05:00Z',
  },
  {
    id: 'issue-3',
    repositoryId: 'repo-3',
    githubIssueId: 103,
    number: 103,
    title: 'Redis cache eviction strategy causes stale session tokens during failover',
    body: 'When primary Redis cluster fails over to replica, active session keys expire prematurely due to missing key TTL sync.',
    state: 'CLOSED',
    author: {
      id: 'dev-3',
      login: 'johndoe',
      name: 'John Doe',
      avatarUrl: 'https://github.com/github.png',
    },
    repository: {
      id: 'repo-3',
      name: 'enosis-api-gateway',
      fullName: 'BetopiaLtd/enosis-api-gateway',
    },
    project: {
      id: 'proj-2',
      name: 'Enosis Enterprise Suite',
    },
    labels: [
      { id: 'lbl-1', name: 'bug', color: '#ef4444', description: 'Something isn\'t working' },
      { id: 'lbl-6', name: 'security', color: '#f59e0b', description: 'Security issue' },
    ],
    assignees: [
      { id: 'dev-3', login: 'johndoe', name: 'John Doe', avatarUrl: 'https://github.com/github.png' },
    ],
    commentsCount: 8,
    createdAt: '2026-09-18T14:20:00Z',
    updatedAt: '2026-09-20T16:45:00Z',
    closedAt: '2026-09-20T16:45:00Z',
  },
  {
    id: 'issue-4',
    repositoryId: 'repo-1',
    githubIssueId: 104,
    number: 104,
    title: 'Add OpenAPI 3.1 Swagger spec generator for express REST endpoints',
    body: 'Auto-generate swagger.json documentation from TypeScript Zod schemas for all backend controller routes.',
    state: 'OPEN',
    author: {
      id: 'dev-1',
      login: 'alex_m',
      name: 'Alex Mercer',
      avatarUrl: 'https://github.com/github.png',
    },
    repository: {
      id: 'repo-1',
      name: 'beyondAI-backend',
      fullName: 'BetopiaLtd/beyondAI-backend',
    },
    project: {
      id: 'proj-1',
      name: 'BeyondAI Core Platform',
    },
    labels: [
      { id: 'lbl-7', name: 'documentation', color: '#3b82f6', description: 'Documentation update' },
      { id: 'lbl-4', name: 'enhancement', color: '#a855f7', description: 'New feature or improvement' },
    ],
    assignees: [
      { id: 'dev-1', login: 'alex_m', name: 'Alex Mercer', avatarUrl: 'https://github.com/github.png' },
    ],
    commentsCount: 3,
    createdAt: '2026-09-20T11:00:00Z',
    updatedAt: '2026-09-21T15:30:00Z',
  },
  {
    id: 'issue-5',
    repositoryId: 'repo-2',
    githubIssueId: 105,
    number: 105,
    title: 'Mobile navigation drawer gesture collapse issue on Safari iOS 17',
    body: 'Swiping to dismiss the mobile sidebar menu freezes touch scroll on background document body on Safari mobile devices.',
    state: 'CLOSED',
    author: {
      id: 'dev-2',
      login: 'sarah_dev',
      name: 'Sarah Chen',
      avatarUrl: 'https://github.com/github.png',
    },
    repository: {
      id: 'repo-2',
      name: 'beyondAI-new-website',
      fullName: 'BetopiaLtd/beyondAI-new-website',
    },
    project: {
      id: 'proj-1',
      name: 'BeyondAI Core Platform',
    },
    labels: [
      { id: 'lbl-1', name: 'bug', color: '#ef4444', description: 'Something isn\'t working' },
      { id: 'lbl-5', name: 'ui/ux', color: '#06b6d4', description: 'User interface design' },
    ],
    assignees: [
      { id: 'dev-2', login: 'sarah_dev', name: 'Sarah Chen', avatarUrl: 'https://github.com/github.png' },
    ],
    commentsCount: 4,
    createdAt: '2026-09-15T08:30:00Z',
    updatedAt: '2026-09-17T12:10:00Z',
    closedAt: '2026-09-17T12:10:00Z',
  },
  {
    id: 'issue-6',
    repositoryId: 'repo-3',
    githubIssueId: 106,
    number: 106,
    title: 'Implement rate limit header verification in integration test suite',
    body: 'Add automated end-to-end assertions ensuring X-RateLimit-Limit and X-RateLimit-Remaining headers match Redis counter state.',
    state: 'OPEN',
    author: {
      id: 'dev-3',
      login: 'johndoe',
      name: 'John Doe',
      avatarUrl: 'https://github.com/github.png',
    },
    repository: {
      id: 'repo-3',
      name: 'enosis-api-gateway',
      fullName: 'BetopiaLtd/enosis-api-gateway',
    },
    project: {
      id: 'proj-2',
      name: 'Enosis Enterprise Suite',
    },
    labels: [
      { id: 'lbl-8', name: 'testing', color: '#8b5cf6', description: 'Automated test suite' },
    ],
    assignees: [
      { id: 'dev-1', login: 'alex_m', name: 'Alex Mercer', avatarUrl: 'https://github.com/github.png' },
    ],
    commentsCount: 1,
    createdAt: '2026-09-22T08:15:00Z',
    updatedAt: '2026-09-22T09:40:00Z',
  },
];

export async function fetchIssues(filters: IssueFilters = {}): Promise<{ success: boolean; data: IssueWithMetrics[] }> {
  try {
    const query = new URLSearchParams();
    if (filters.projectId) query.append('projectId', filters.projectId);
    if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
    if (filters.developerId) query.append('developerId', filters.developerId);
    if (filters.state) query.append('state', filters.state);
    if (filters.label) query.append('label', filters.label);
    if (filters.search) query.append('search', filters.search);

    const queryString = query.toString();
    const res = await fetchApi<IssueWithMetrics[]>(`/issues${queryString ? `?${queryString}` : ''}`);
    return { success: true, data: res.data || [] };
  } catch (err) {
    let list = [...MOCK_ISSUES];

    if (filters.projectId) {
      list = list.filter((iss) => iss.project?.id === filters.projectId);
    }
    if (filters.repositoryId) {
      list = list.filter((iss) => iss.repositoryId === filters.repositoryId);
    }
    if (filters.developerId) {
      list = list.filter(
        (iss) =>
          iss.author.id === filters.developerId ||
          iss.assignees.some((a) => a.id === filters.developerId)
      );
    }
    if (filters.state && filters.state !== 'ALL') {
      list = list.filter((iss) => iss.state === filters.state);
    }
    if (filters.label) {
      const targetLabel = filters.label.toLowerCase();
      list = list.filter((iss) => iss.labels.some((l) => l.name.toLowerCase() === targetLabel));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (iss) =>
          iss.title.toLowerCase().includes(q) ||
          iss.number.toString().includes(q) ||
          iss.author.login.toLowerCase().includes(q) ||
          iss.repository.fullName.toLowerCase().includes(q) ||
          (iss.body && iss.body.toLowerCase().includes(q))
      );
    }

    return { success: true, data: list };
  }
}

export async function fetchIssueDetails(issueId: string): Promise<{ success: boolean; data: IssueDetailData }> {
  try {
    return await fetchApi<IssueDetailData>(`/issues/${issueId}`);
  } catch (err) {
    const foundIssue = MOCK_ISSUES.find((iss) => iss.id === issueId || iss.number.toString() === issueId) || MOCK_ISSUES[0];

    const mockDetailData: IssueDetailData = {
      issue: foundIssue,
      comments: [
        {
          id: 'c-1',
          author: {
            id: 'dev-1',
            login: 'alex_m',
            name: 'Alex Mercer',
            avatarUrl: 'https://github.com/github.png',
          },
          body: 'Identified connection leak during heavy parallel webhook parsing. The pool idle connection timeout was set to infinity in production environment config.',
          createdAt: '2026-09-21T10:45:00Z',
        },
        {
          id: 'c-2',
          author: {
            id: 'dev-3',
            login: 'johndoe',
            name: 'John Doe',
            avatarUrl: 'https://github.com/github.png',
          },
          body: 'We tested reducing pool max lifetime to 600s in staging. Latency spikes dropped from 2.4s down to 85ms.',
          createdAt: '2026-09-21T14:20:00Z',
        },
        {
          id: 'c-3',
          author: {
            id: 'dev-2',
            login: 'sarah_dev',
            name: 'Sarah Chen',
            avatarUrl: 'https://github.com/github.png',
          },
          body: 'PR #144 has been submitted with updated connection pool settings for review.',
          createdAt: '2026-09-22T08:05:00Z',
        },
      ],
      timeline: [
        {
          id: 'tl-1',
          type: 'opened',
          title: 'opened this issue',
          actor: foundIssue.author,
          timestamp: foundIssue.createdAt,
        },
        {
          id: 'tl-2',
          type: 'labeled',
          title: 'added labels bug, performance',
          actor: foundIssue.author,
          timestamp: '2026-09-21T09:20:00Z',
          details: 'Labels: bug, performance, high-priority',
        },
        {
          id: 'tl-3',
          type: 'assigned',
          title: 'assigned Alex Mercer and John Doe',
          actor: foundIssue.author,
          timestamp: '2026-09-21T09:30:00Z',
        },
        {
          id: 'tl-4',
          type: 'commented',
          title: 'commented on this issue',
          actor: {
            id: 'dev-1',
            login: 'alex_m',
            name: 'Alex Mercer',
            avatarUrl: 'https://github.com/github.png',
          },
          timestamp: '2026-09-21T10:45:00Z',
        },
        {
          id: 'tl-5',
          type: 'referenced',
          title: 'referenced in PR #144 "Optimize Prisma connection pool parameters"',
          actor: {
            id: 'dev-1',
            login: 'alex_m',
            name: 'Alex Mercer',
            avatarUrl: 'https://github.com/github.png',
          },
          timestamp: '2026-09-22T08:00:00Z',
          details: 'PR #144',
        },
      ],
      relatedPullRequests: [
        {
          id: 'pr-3',
          number: 144,
          title: 'Optimize Prisma connection pool parameters for burst webhooks',
          state: 'OPEN',
          repositoryName: foundIssue.repository.name,
        },
      ],
    };

    return { success: true, data: mockDetailData };
  }
}
