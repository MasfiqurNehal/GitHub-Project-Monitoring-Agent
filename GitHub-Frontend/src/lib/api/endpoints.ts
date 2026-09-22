export const ENDPOINTS = {
  // Dashboard
  DASHBOARD_OVERVIEW: '/dashboard/overview',

  // Projects
  PROJECTS: '/projects',
  PROJECT_DETAIL: (id: string) => `/projects/${id}`,

  // Repositories
  REPOSITORIES: '/repositories',
  REPOSITORY_DETAIL: (id: string) => `/repositories/${id}`,

  // Developers
  DEVELOPERS: '/developers',
  DEVELOPER_DETAIL: (id: string) => `/developers/${id}`,

  // Activity Stream
  ACTIVITY: '/activity',

  // Pull Requests
  PULL_REQUESTS: '/pull-requests',
  PULL_REQUEST_DETAIL: (id: string) => `/pull-requests/${id}`,

  // Issues
  ISSUES: '/issues',
  ISSUE_DETAIL: (id: string) => `/issues/${id}`,

  // Reports
  REPORTS: '/reports',
  REPORT_DETAIL: (id: string) => `/reports/${id}`,

  // GitHub Integration & Connection
  GITHUB_CONNECTION: '/github/connection',
  GITHUB_REPOSITORIES: '/github/repositories',
  GITHUB_VALIDATE_REPO: '/github/repositories/validate',
  GITHUB_SYNC_REPO: (id: string) => `/github/repositories/${id}/sync`,
  GITHUB_REMOVE_REPO: (id: string) => `/github/repositories/${id}`,

  // AI Agent Workspace
  AI_CHAT: '/ai/chat',
} as const;
