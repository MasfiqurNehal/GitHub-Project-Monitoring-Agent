import { fetchApi } from './client';
import { PullRequestWithMetrics, PullRequestDetailData } from '../../types';

export interface PullRequestFilters {
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  state?: string;
  reviewStatus?: string;
  search?: string;
}

export async function fetchPullRequests(filters: PullRequestFilters = {}): Promise<{ success: boolean; data: PullRequestWithMetrics[] }> {
  const query = new URLSearchParams();
  if (filters.projectId) query.append('projectId', filters.projectId);
  if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
  if (filters.developerId) query.append('developerId', filters.developerId);
  if (filters.state) query.append('state', filters.state);
  if (filters.reviewStatus) query.append('reviewStatus', filters.reviewStatus);
  if (filters.search) query.append('search', filters.search);

  const queryString = query.toString();
  const res = await fetchApi<any>(`/pull-requests${queryString ? `?${queryString}` : ''}`);

  const rawList = Array.isArray(res.data) ? res.data : res.data?.pullRequests || [];

  const list: PullRequestWithMetrics[] = rawList.map((pr: any) => ({
    id: pr.id,
    repositoryId: pr.repositoryId || pr.repository_id || 'repo-unknown',
    githubPrId: pr.githubPrId || pr.github_pr_id || pr.number,
    number: pr.number,
    title: pr.title,
    body: pr.body || '',
    state: (pr.state || 'OPEN').toUpperCase() as any,
    authorId: pr.authorId || pr.author_developer_id,
    additions: Number(pr.additions || pr.metrics?.additions || 0),
    deletions: Number(pr.deletions || pr.metrics?.deletions || 0),
    changedFiles: Number(pr.changedFiles || pr.changed_files || pr.metrics?.changedFiles || 0),
    createdAt: pr.createdAt || pr.created_at || new Date().toISOString(),
    updatedAt: pr.updatedAt || pr.updated_at || new Date().toISOString(),
    mergedAt: pr.mergedAt || pr.merged_at,
    closedAt: pr.closedAt || pr.closed_at,
    reviewStatus: (pr.reviewStatus || 'PENDING').toUpperCase() as any,
    commitsCount: Number(pr.commitsCount || pr.commits_count || pr.metrics?.commitsCount || 1),
    sourceBranch: pr.sourceBranch || pr.branch?.source || pr.head_branch || 'feature',
    targetBranch: pr.targetBranch || pr.branch?.target || pr.base_branch || 'main',
    project: pr.project ? {
      id: pr.project.id,
      name: pr.project.name,
    } : undefined,
    author: {
      id: pr.author?.id || pr.author_developer_id || 'dev-unknown',
      login: pr.author?.login || pr.author_username || 'unknown',
      name: pr.author?.name || pr.author_name || pr.author?.login || 'Contributor',
      avatarUrl: pr.author?.avatarUrl || pr.author?.avatar_url || 'https://github.com/github.png',
      createdAt: pr.author?.createdAt || pr.created_at || new Date().toISOString(),
      updatedAt: pr.author?.updatedAt || pr.updated_at || new Date().toISOString(),
    },
    repository: pr.repository ? {
      id: pr.repository.id,
      projectId: pr.repository.projectId || pr.repository.project_id,
      githubId: pr.repository.githubId || pr.repository.github_repository_id || 0,
      owner: pr.repository.owner || 'owner',
      name: pr.repository.name || 'repository',
      fullName: pr.repository.fullName || pr.repository.full_name || 'owner/repository',
      url: pr.repository.url || pr.repository.html_url || `https://github.com/${pr.repository.full_name || 'repo'}`,
      defaultBranch: pr.repository.defaultBranch || 'main',
      isActive: true,
      isPrivate: pr.repository.isPrivate ?? false,
      createdAt: pr.repository.createdAt || new Date().toISOString(),
      updatedAt: pr.repository.updatedAt || new Date().toISOString(),
    } : undefined,
  }));

  return { success: true, data: list };
}

export async function fetchPullRequestDetails(pullRequestId: string): Promise<{ success: boolean; data: PullRequestDetailData }> {
  const res = await fetchApi<any>(`/pull-requests/${pullRequestId}`);
  const prData = res.data?.pullRequest || res.data;

  const pr: PullRequestWithMetrics = {
    id: prData.id,
    repositoryId: prData.repositoryId || prData.repository_id || 'repo-unknown',
    githubPrId: prData.githubPrId || prData.github_pr_id || prData.number,
    number: prData.number,
    title: prData.title,
    body: prData.body || '',
    state: (prData.state || 'OPEN').toUpperCase() as any,
    authorId: prData.authorId || prData.author_developer_id,
    additions: Number(prData.additions || prData.metrics?.additions || 0),
    deletions: Number(prData.deletions || prData.metrics?.deletions || 0),
    changedFiles: Number(prData.changedFiles || prData.changed_files || prData.metrics?.changedFiles || 0),
    createdAt: prData.createdAt || prData.created_at || new Date().toISOString(),
    updatedAt: prData.updatedAt || prData.updated_at || new Date().toISOString(),
    mergedAt: prData.mergedAt || prData.merged_at,
    closedAt: prData.closedAt || prData.closed_at,
    reviewStatus: (prData.reviewStatus || 'PENDING').toUpperCase() as any,
    commitsCount: Number(prData.commitsCount || prData.commits_count || prData.metrics?.commitsCount || 1),
    sourceBranch: prData.sourceBranch || prData.branch?.source || prData.head_branch || 'feature',
    targetBranch: prData.targetBranch || prData.branch?.target || prData.base_branch || 'main',
    project: prData.project,
    author: {
      id: prData.author?.id || prData.author_developer_id || 'dev-unknown',
      login: prData.author?.login || prData.author_username || 'unknown',
      name: prData.author?.name || prData.author_name || 'Contributor',
      avatarUrl: prData.author?.avatarUrl || prData.author?.avatar_url || 'https://github.com/github.png',
      createdAt: prData.author?.createdAt || prData.created_at || new Date().toISOString(),
      updatedAt: prData.author?.updatedAt || prData.updated_at || new Date().toISOString(),
    },
    repository: prData.repository ? {
      id: prData.repository.id,
      projectId: prData.repository.projectId || prData.repository.project_id,
      githubId: prData.repository.githubId || prData.repository.github_repository_id || 0,
      owner: prData.repository.owner || 'owner',
      name: prData.repository.name || 'repository',
      fullName: prData.repository.fullName || prData.repository.full_name || 'owner/repository',
      url: prData.repository.url || prData.repository.html_url || `https://github.com/${prData.repository.full_name || 'repo'}`,
      defaultBranch: prData.repository.defaultBranch || 'main',
      isActive: true,
      isPrivate: prData.repository.isPrivate ?? false,
      createdAt: prData.repository.createdAt || new Date().toISOString(),
      updatedAt: prData.repository.updatedAt || new Date().toISOString(),
    } : undefined,
  };

  const detailData: PullRequestDetailData = {
    pullRequest: pr,
    reviewers: res.data?.reviewers || [],
    commits: res.data?.commits || [],
    files: res.data?.files || [],
    timeline: res.data?.timeline || [],
  };

  return { success: true, data: detailData };
}
