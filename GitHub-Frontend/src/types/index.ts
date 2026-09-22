export type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'PAUSED';
export type PullRequestState = 'OPEN' | 'CLOSED' | 'MERGED';
export type ReviewState = 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
export type IssueState = 'OPEN' | 'CLOSED';

export interface RepositoryMetrics {
  developersCount: number;
  commitsCount: number;
  prsCount: number;
  issuesCount: number;
  linesAdded: number;
  linesDeleted: number;
  lastActivityAt: string;
}

export interface Repository {
  id: string;
  projectId?: string | null;
  githubId: number | string;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  language?: string | null;
  isActive: boolean;
  isPrivate?: boolean;
  status?: 'ACTIVE' | 'SYNCING' | 'PAUSED';
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  metrics?: RepositoryMetrics;
  project?: Project | null;
}

export interface RepositoryWithMetrics extends Repository {
  isPrivate: boolean;
  status: 'ACTIVE' | 'SYNCING' | 'PAUSED';
  metrics: RepositoryMetrics;
}

export interface RepositoryDetailData {
  repository: RepositoryWithMetrics;
  overview: {
    openPRsCount: number;
    mergedPRsCount: number;
    openIssuesCount: number;
    closedIssuesCount: number;
    activeBranch: string;
    readOnlyStatus: boolean;
  };
  developers: DeveloperContributionItem[];
  recentActivity: RecentActivityItem[];
  commits: Commit[];
  pullRequests: PullRequest[];
  issues: ProjectIssue[];
  codeChanges: {
    trend: CodeChangeTrendItem[];
    totalAdditions: number;
    totalDeletions: number;
    netChanges: number;
    topFilesChanged: FileChangeItem[];
  };
}

export interface ProjectMetrics {
  repositoriesCount: number;
  developersCount: number;
  commitsCount: number;
  prsCount: number;
  issuesCount: number;
  linesAdded: number;
  linesDeleted: number;
  lastActivityAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  metrics?: ProjectMetrics;
  repositories?: Repository[];
}

export interface ProjectWithMetrics extends Project {
  metrics: ProjectMetrics;
}

export interface ProjectIssue {
  id: string;
  number: number;
  title: string;
  repoName: string;
  author: string;
  authorAvatar?: string;
  state: IssueState;
  createdAt: string;
  updatedAt: string;
}

export interface FileChangeItem {
  name: string;
  repoName: string;
  additions: number;
  deletions: number;
}

export interface ProjectDetailData {
  project: ProjectWithMetrics;
  repositories: Repository[];
  developers: DeveloperContributionItem[];
  recentActivity: RecentActivityItem[];
  commits: Commit[];
  pullRequests: PullRequest[];
  issues: ProjectIssue[];
  codeChanges: {
    trend: CodeChangeTrendItem[];
    totalAdditions: number;
    totalDeletions: number;
    netChanges: number;
    topFilesChanged: FileChangeItem[];
  };
}

export interface DeveloperMetrics {
  projectsCount: number;
  repositoriesCount: number;
  commitsCount: number;
  prsCount: number;
  reviewsCount: number;
  issuesCount: number;
  linesAdded: number;
  linesDeleted: number;
  lastActivityAt: string;
}

export interface Developer {
  id: string;
  githubUserId?: number | string | null;
  login: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  profileUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    commits: number;
    pullRequests: number;
    reviews: number;
  };
}

export interface DeveloperWithMetrics extends Developer {
  projects: { id: string; name: string }[];
  repositories: { id: string; name: string; fullName: string }[];
  metrics: DeveloperMetrics;
}

export interface TimelineEvent {
  id: string;
  date: string; // e.g. "2026-09-22"
  displayDate: string; // e.g. "16 Aug"
  time: string; // e.g. "10:42"
  type: 'commit' | 'pull_request' | 'review' | 'issue';
  title: string;
  repoName: string;
  additions?: number;
  deletions?: number;
  prNumber?: number;
  issueNumber?: number;
  status?: string;
  url?: string;
}

export interface ActivityDistributionItem {
  date: string;
  label: string;
  commits: number;
  prs: number;
  reviews: number;
  issues: number;
}

export interface DeveloperDetailData {
  developer: DeveloperWithMetrics;
  commitStats: {
    totalCommits: number;
    avgAdditionsPerCommit: number;
    topRepo: string;
    commitsByDay: { date: string; count: number }[];
  };
  prStats: {
    totalPRs: number;
    openPRs: number;
    mergedPRs: number;
    closedPRs: number;
  };
  reviewStats: {
    totalReviews: number;
    approved: number;
    changesRequested: number;
    commented: number;
  };
  issueStats: {
    totalIssues: number;
    opened: number;
    closed: number;
  };
  codeChangeStats: {
    totalAdditions: number;
    totalDeletions: number;
    netChanges: number;
    trend: CodeChangeTrendItem[];
  };
  activityTimeline: TimelineEvent[];
  activityDistribution: ActivityDistributionItem[];
}

export interface Commit {
  id: string;
  repositoryId: string;
  githubSha: string;
  authorId?: string | null;
  message: string;
  commitUrl: string;
  committedAt: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  repository?: Repository;
  author?: Developer | null;
}

export interface PullRequest {
  id: string;
  repositoryId: string;
  githubPrId: number | string;
  number: number;
  authorId?: string | null;
  title: string;
  body?: string | null;
  state: PullRequestState;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  mergedAt?: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  repository?: Repository;
  author?: Developer | null;
}

export interface PullRequestReview {
  id: string;
  pullRequestId: string;
  reviewerId?: string | null;
  state: ReviewState;
  body?: string | null;
  submittedAt: string;
  reviewer?: Developer | null;
}

export interface ActivityEvent {
  id: string;
  repositoryId: string;
  developerId?: string | null;
  eventType: string; // commit, push, pr_opened, pr_merged, pr_closed, pr_reviewed, issue_opened
  sourceId: string;
  occurredAt: string;
  metadataJson?: any;
  repository?: Repository;
  developer?: Developer | null;
}

export type DateRangePreset = '1d' | '7d' | '30d' | 'all' | 'custom';
export type ActivityTypeOption = 'all' | 'commit' | 'push' | 'pull_request' | 'review' | 'issue';

export interface DashboardFilters {
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  activityType?: ActivityTypeOption;
  preset?: DateRangePreset;
  from?: string;
  to?: string;
}

export interface DashboardKPI {
  totalProjects: number;
  totalRepositories: number;
  activeDevelopers: number;
  totalCommits: number;
  totalPRs: number;
  mergedPRs: number;
  openPRs: number;
  issuesOpened: number;
  issuesClosed: number;
  linesAdded: number;
  linesDeleted: number;
  totalReviews: number;
}

export interface ActivityTrendItem {
  date: string;
  commits: number;
  prs: number;
  reviews: number;
}

export interface CodeChangeTrendItem {
  date: string;
  additions: number;
  deletions: number;
}

export interface IssueTrendItem {
  date: string;
  opened: number;
  closed: number;
}

export interface DeveloperContributionItem {
  id: string;
  name: string;
  login: string;
  avatarUrl?: string;
  commits: number;
  prs: number;
  reviews: number;
  linesAdded: number;
  linesDeleted: number;
}

export interface ProjectOverviewItem {
  id: string;
  name: string;
  repositoriesCount: number;
  commitsCount: number;
  prsCount: number;
  issuesCount: number;
  status: ProjectStatus;
  updatedAt: string;
}

export interface RepositoryOverviewItem {
  id: string;
  name: string;
  fullName: string;
  language?: string | null;
  commitsCount: number;
  openPRsCount: number;
  issuesCount: number;
  lastSyncedAt?: string | null;
}

export interface RecentActivityItem {
  id: string;
  type: 'commit' | 'pull_request' | 'review' | 'issue';
  title: string;
  repoName: string;
  author: string;
  authorAvatar?: string;
  timeAgo: string;
  status?: string;
  details?: string;
  url?: string;
}

export interface DashboardOverview {
  kpi: DashboardKPI;
  activityTrend: ActivityTrendItem[];
  codeChangesTrend: CodeChangeTrendItem[];
  issueTrend: IssueTrendItem[];
  developerActivity: DeveloperContributionItem[];
  projectOverview: ProjectOverviewItem[];
  repositoryOverview: RepositoryOverviewItem[];
  recentActivity: RecentActivityItem[];
}

export interface EngineeringSignals {
  inactiveRepositories: Repository[];
  stalePullRequests: PullRequest[];
}

export interface UIAction {
  type: 'APPLY_FILTERS' | 'OPEN_PROJECT' | 'OPEN_REPOSITORY' | 'OPEN_DEVELOPER' | 'OPEN_REPORT';
  projectId?: string;
  projectName?: string;
  repositoryId?: string;
  developerId?: string;
  from?: string;
  to?: string;
}

export interface AIResponseData {
  messageId?: string;
  conversationId: string;
  answer: string;
  uiActions?: UIAction[];
  contextSummary?: any;
}

// GitHub Connection Settings Interfaces
export interface GitHubAccountInfo {
  isConnected: boolean;
  username?: string;
  name?: string;
  avatarUrl?: string;
  organization?: string;
  connectedAt?: string;
  scopes?: string[];
}

export interface ValidatedRepositoryInfo {
  url: string;
  owner: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  hasReadAccess: boolean;
  language?: string;
  starsCount?: number;
}

export interface MonitoredRepository {
  id: string;
  name: string;
  owner: string;
  fullName: string;
  url: string;
  isPrivate: boolean;
  defaultBranch: string;
  status: 'ACTIVE' | 'SYNCING' | 'PAUSED';
  lastSyncedAt?: string;
}
