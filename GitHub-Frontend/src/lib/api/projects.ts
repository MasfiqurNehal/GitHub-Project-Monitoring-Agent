import { fetchApi } from './client';
import { Project, ProjectWithMetrics, ProjectDetailData, Repository } from '../../types';

export const MOCK_PROJECTS: ProjectWithMetrics[] = [
  {
    id: 'proj-1',
    name: 'BeyondAI Core Platform',
    description: 'Autonomous GitHub monitoring agent, real-time telemetry, and LLM intelligence pipeline.',
    status: 'ACTIVE',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-09-22T08:30:00Z',
    metrics: {
      repositoriesCount: 3,
      developersCount: 8,
      commitsCount: 248,
      prsCount: 38,
      issuesCount: 14,
      linesAdded: 18450,
      linesDeleted: 4120,
      lastActivityAt: '2026-09-22T08:30:00Z',
    },
    repositories: [
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
        lastSyncedAt: '2026-09-22T08:15:00Z',
        createdAt: '2026-01-15T08:00:00Z',
        updatedAt: '2026-09-22T08:15:00Z',
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
        lastSyncedAt: '2026-09-22T09:30:00Z',
        createdAt: '2026-02-01T08:00:00Z',
        updatedAt: '2026-09-22T09:30:00Z',
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
        lastSyncedAt: '2026-09-22T07:20:00Z',
        createdAt: '2026-03-10T08:00:00Z',
        updatedAt: '2026-09-22T07:20:00Z',
      },
    ],
  },
  {
    id: 'proj-2',
    name: 'Enosis Enterprise Suite',
    description: 'High-throughput microservices and API gateways for enterprise synchronization.',
    status: 'ACTIVE',
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-09-21T16:30:00Z',
    metrics: {
      repositoriesCount: 2,
      developersCount: 6,
      commitsCount: 142,
      prsCount: 22,
      issuesCount: 9,
      linesAdded: 11200,
      linesDeleted: 2850,
      lastActivityAt: '2026-09-21T16:30:00Z',
    },
    repositories: [
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
        lastSyncedAt: '2026-09-21T19:40:00Z',
        createdAt: '2026-03-01T08:00:00Z',
        updatedAt: '2026-09-21T19:40:00Z',
      },
    ],
  },
  {
    id: 'proj-3',
    name: 'Internal Developer Tools',
    description: 'CLI automation, CI/CD reusable workflows, and developer environment bootstrapper.',
    status: 'ACTIVE',
    createdAt: '2026-04-10T08:00:00Z',
    updatedAt: '2026-09-20T14:15:00Z',
    metrics: {
      repositoriesCount: 2,
      developersCount: 4,
      commitsCount: 68,
      prsCount: 12,
      issuesCount: 5,
      linesAdded: 4800,
      linesDeleted: 1150,
      lastActivityAt: '2026-09-20T14:15:00Z',
    },
    repositories: [],
  },
  {
    id: 'proj-4',
    name: 'Legacy Auth Gateway',
    description: 'Legacy OAuth 1.0/2.0 authentication service queued for deprecation.',
    status: 'PAUSED',
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2026-09-18T10:00:00Z',
    metrics: {
      repositoriesCount: 1,
      developersCount: 2,
      commitsCount: 34,
      prsCount: 5,
      issuesCount: 3,
      linesAdded: 2100,
      linesDeleted: 890,
      lastActivityAt: '2026-09-18T10:00:00Z',
    },
    repositories: [],
  },
];

export async function fetchProjects(): Promise<{ success: boolean; data: ProjectWithMetrics[] }> {
  try {
    return await fetchApi<ProjectWithMetrics[]>('/projects');
  } catch (err) {
    return {
      success: true,
      data: MOCK_PROJECTS,
    };
  }
}

export async function fetchProjectDetails(projectId: string): Promise<{ success: boolean; data: ProjectDetailData }> {
  try {
    return await fetchApi<ProjectDetailData>(`/projects/${projectId}`);
  } catch (err) {
    const foundProject = MOCK_PROJECTS.find((p) => p.id === projectId) || MOCK_PROJECTS[0];

    const mockDetailData: ProjectDetailData = {
      project: foundProject,
      repositories: foundProject.repositories || [],
      developers: [
        {
          id: 'dev-1',
          name: 'Alex Mercer',
          login: 'alex_m',
          avatarUrl: 'https://github.com/github.png',
          commits: 94,
          prs: 16,
          reviews: 28,
          linesAdded: 8500,
          linesDeleted: 2100,
        },
        {
          id: 'dev-2',
          name: 'Sarah Chen',
          login: 'sarah_dev',
          avatarUrl: 'https://github.com/github.png',
          commits: 82,
          prs: 14,
          reviews: 24,
          linesAdded: 6200,
          linesDeleted: 1450,
        },
        {
          id: 'dev-3',
          name: 'John Doe',
          login: 'johndoe',
          avatarUrl: 'https://github.com/github.png',
          commits: 46,
          prs: 8,
          reviews: 12,
          linesAdded: 3750,
          linesDeleted: 570,
        },
      ],
      recentActivity: [
        {
          id: 'act-1',
          type: 'pull_request',
          title: 'Implement OAuth authentication & token refresh flow (#142)',
          repoName: 'BetopiaLtd/beyondAI-backend',
          author: 'johndoe',
          timeAgo: '12 mins ago',
          status: 'MERGED',
        },
        {
          id: 'act-2',
          type: 'commit',
          title: 'refactor: optimize Prisma connection pool parameters',
          repoName: 'BetopiaLtd/beyondAI-backend',
          author: 'alex_m',
          timeAgo: '28 mins ago',
          details: '+95 / -30 lines',
        },
        {
          id: 'act-3',
          type: 'review',
          title: 'Reviewed PR #143: Add interactive Recharts activity stream',
          repoName: 'BetopiaLtd/beyondAI-new-website',
          author: 'sarah_dev',
          timeAgo: '45 mins ago',
          status: 'APPROVED',
        },
        {
          id: 'act-4',
          type: 'issue',
          title: 'PostgreSQL connection timeout during burst webhooks (#88)',
          repoName: 'BetopiaLtd/beyondAI-backend',
          author: 'alex_m',
          timeAgo: '2 hours ago',
          status: 'OPEN',
        },
      ],
      commits: [
        {
          id: 'c-1',
          repositoryId: 'repo-1',
          githubSha: 'a1b2c3d4e5f67890',
          message: 'feat: add GitHub webhook payload validator middleware',
          commitUrl: 'https://github.com/BetopiaLtd/beyondAI-backend/commit/a1b2c3d4e5f67890',
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
          id: 'c-2',
          repositoryId: 'repo-2',
          githubSha: 'f9e8d7c6b5a43210',
          message: 'fix: resolve layout shift on project details loading skeleton',
          commitUrl: 'https://github.com/BetopiaLtd/beyondAI-new-website/commit/f9e8d7c6b5a43210',
          committedAt: '2026-09-22T07:15:00Z',
          additions: 42,
          deletions: 15,
          changedFiles: 2,
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
          id: 'c-3',
          repositoryId: 'repo-1',
          githubSha: '3c4d5e6f7a8b9c0d',
          message: 'refactor: isolate Prisma client singleton for serverless handlers',
          commitUrl: 'https://github.com/BetopiaLtd/beyondAI-backend/commit/3c4d5e6f7a8b9c0d',
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
          repositoryId: 'repo-1',
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
          repositoryId: 'repo-2',
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
          repoName: 'BetopiaLtd/beyondAI-backend',
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
          repoName: 'BetopiaLtd/beyondAI-backend',
          author: 'sarah_dev',
          authorAvatar: 'https://github.com/github.png',
          state: 'CLOSED',
          createdAt: '2026-09-20T10:00:00Z',
          updatedAt: '2026-09-21T18:00:00Z',
        },
      ],
      codeChanges: {
        trend: [
          { date: 'Sep 16', additions: 2400, deletions: 620 },
          { date: 'Sep 17', additions: 3100, deletions: 890 },
          { date: 'Sep 18', additions: 1950, deletions: 310 },
          { date: 'Sep 19', additions: 4200, deletions: 1100 },
          { date: 'Sep 20', additions: 2800, deletions: 520 },
          { date: 'Sep 21', additions: 4800, deletions: 940 },
          { date: 'Sep 22', additions: 3200, deletions: 750 },
        ],
        totalAdditions: foundProject.metrics.linesAdded,
        totalDeletions: foundProject.metrics.linesDeleted,
        netChanges: foundProject.metrics.linesAdded - foundProject.metrics.linesDeleted,
        topFilesChanged: [
          { name: 'src/services/github-sync.service.ts', repoName: 'beyondAI-backend', additions: 1420, deletions: 380 },
          { name: 'src/components/dashboard/OverviewGrid.tsx', repoName: 'beyondAI-new-website', additions: 980, deletions: 210 },
          { name: 'src/routes/webhook.router.ts', repoName: 'beyondAI-backend', additions: 740, deletions: 190 },
          { name: 'src/lib/database/prisma-client.ts', repoName: 'beyondAI-backend', additions: 520, deletions: 410 },
        ],
      },
    };

    return {
      success: true,
      data: mockDetailData,
    };
  }
}

export async function createProject(name: string, description?: string): Promise<{ success: boolean; data: Project }> {
  try {
    return await fetchApi<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  } catch (err) {
    const newProj: ProjectWithMetrics = {
      id: `proj-${Date.now()}`,
      name,
      description: description || '',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metrics: {
        repositoriesCount: 0,
        developersCount: 1,
        commitsCount: 0,
        prsCount: 0,
        issuesCount: 0,
        linesAdded: 0,
        linesDeleted: 0,
        lastActivityAt: new Date().toISOString(),
      },
      repositories: [],
    };
    MOCK_PROJECTS.unshift(newProj);
    return { success: true, data: newProj };
  }
}

export async function connectRepository(projectId: string, owner: string, name: string): Promise<{ success: boolean; data: Repository }> {
  try {
    return await fetchApi<Repository>(`/projects/${projectId}/repositories`, {
      method: 'POST',
      body: JSON.stringify({ owner, name }),
    });
  } catch (err) {
    const newRepo: Repository = {
      id: `repo-${Date.now()}`,
      projectId,
      githubId: Math.floor(Math.random() * 100000),
      owner,
      name,
      fullName: `${owner}/${name}`,
      url: `https://github.com/${owner}/${name}`,
      defaultBranch: 'main',
      language: 'TypeScript',
      isActive: true,
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const proj = MOCK_PROJECTS.find((p) => p.id === projectId);
    if (proj) {
      if (!proj.repositories) proj.repositories = [];
      proj.repositories.push(newRepo);
      proj.metrics.repositoriesCount = proj.repositories.length;
    }
    return { success: true, data: newRepo };
  }
}

