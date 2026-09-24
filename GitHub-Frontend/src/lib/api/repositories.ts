import { fetchApi } from './client';
import { RepositoryWithMetrics, RepositoryDetailData } from '../../types';

export async function fetchRepositories(filters: {
  projectId?: string;
  search?: string;
  status?: string;
  visibility?: 'public' | 'private' | 'all';
} = {}): Promise<{ success: boolean; data: RepositoryWithMetrics[] }> {
  const query = new URLSearchParams();
  if (filters.projectId) query.append('projectId', filters.projectId);
  if (filters.search) query.append('search', filters.search);
  if (filters.status) query.append('status', filters.status);
  if (filters.visibility) query.append('visibility', filters.visibility);

  const queryString = query.toString();
  const res = await fetchApi<any[]>(`/repositories${queryString ? `?${queryString}` : ''}`);
  
  const rawList = Array.isArray(res.data) ? res.data : [];

  const list: RepositoryWithMetrics[] = rawList.map((r: any) => ({
    id: r.id,
    projectId: r.projectId || r.project_id,
    githubId: r.githubId || r.github_repository_id || 0,
    owner: r.owner || r.full_name?.split('/')[0] || 'Organization',
    name: r.name,
    fullName: r.fullName || r.full_name,
    url: r.url || r.html_url || `https://github.com/${r.full_name || r.name}`,
    defaultBranch: r.defaultBranch || r.default_branch || 'main',
    language: r.language || 'TypeScript',
    isActive: r.isActive ?? true,
    isPrivate: r.isPrivate ?? r.is_private ?? false,
    status: (r.sync_status || r.status || 'ACTIVE').toUpperCase() as any,
    lastSyncedAt: r.lastSyncedAt || r.last_synced_at,
    createdAt: r.createdAt || r.created_at || new Date().toISOString(),
    updatedAt: r.updatedAt || r.updated_at || new Date().toISOString(),
    metrics: {
      developersCount: Number(r.metrics?.developersCount || r.developers_count || 0),
      commitsCount: Number(r.metrics?.commitsCount || r.commits_count || 0),
      prsCount: Number(r.metrics?.prsCount || r.prs_count || 0),
      issuesCount: Number(r.metrics?.issuesCount || r.issues_count || 0),
      linesAdded: Number(r.metrics?.linesAdded || r.lines_added || r.additions || 0),
      linesDeleted: Number(r.metrics?.linesDeleted || r.lines_deleted || r.deletions || 0),
      lastActivityAt: r.metrics?.lastActivityAt || r.last_synced_at || r.updated_at || r.created_at || new Date().toISOString(),
    },
  }));

  return { success: true, data: list };
}

export async function fetchRepositoryDetails(repositoryId: string): Promise<{ success: boolean; data: RepositoryDetailData }> {
  const res = await fetchApi<any>(`/repositories/${repositoryId}`);
  const r = res.data?.repository || res.data;

  const repository: RepositoryWithMetrics = {
    id: r.id,
    projectId: r.projectId || r.project_id,
    githubId: r.githubId || r.github_repository_id || 0,
    owner: r.owner || r.full_name?.split('/')[0] || 'Organization',
    name: r.name,
    fullName: r.fullName || r.full_name,
    url: r.url || r.html_url || `https://github.com/${r.full_name || r.name}`,
    defaultBranch: r.defaultBranch || r.default_branch || 'main',
    language: r.language || 'TypeScript',
    isActive: r.isActive ?? true,
    isPrivate: r.isPrivate ?? r.is_private ?? false,
    status: (r.sync_status || r.status || 'ACTIVE').toUpperCase() as any,
    lastSyncedAt: r.lastSyncedAt || r.last_synced_at,
    createdAt: r.createdAt || r.created_at || new Date().toISOString(),
    updatedAt: r.updatedAt || r.updated_at || new Date().toISOString(),
    metrics: {
      developersCount: Number(r.metrics?.developersCount || r.developers_count || 0),
      commitsCount: Number(r.metrics?.commitsCount || r.commits_count || 0),
      prsCount: Number(r.metrics?.prsCount || r.prs_count || 0),
      issuesCount: Number(r.metrics?.issuesCount || r.issues_count || 0),
      linesAdded: Number(r.metrics?.linesAdded || r.lines_added || r.additions || 0),
      linesDeleted: Number(r.metrics?.linesDeleted || r.lines_deleted || r.deletions || 0),
      lastActivityAt: r.metrics?.lastActivityAt || r.last_synced_at || r.updated_at || r.created_at || new Date().toISOString(),
    },
  };

  const detailData: RepositoryDetailData = {
    repository,
    overview: res.data?.overview || {
      openPRsCount: Number(repository.metrics.prsCount),
      mergedPRsCount: 0,
      openIssuesCount: Number(repository.metrics.issuesCount),
      closedIssuesCount: 0,
      activeBranch: repository.defaultBranch,
      readOnlyStatus: true,
    },
    developers: res.data?.developers || [],
    recentActivity: res.data?.recentActivity || [],
    commits: res.data?.commits || [],
    pullRequests: res.data?.pullRequests || [],
    issues: res.data?.issues || [],
    codeChanges: res.data?.codeChanges || {
      trend: [],
      totalAdditions: repository.metrics.linesAdded,
      totalDeletions: repository.metrics.linesDeleted,
      netChanges: repository.metrics.linesAdded - repository.metrics.linesDeleted,
      topFilesChanged: [],
    },
  };

  return { success: true, data: detailData };
}

export async function triggerRepositorySync(repositoryId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetchApi<{ message: string }>(`/repositories/${repositoryId}/sync`, {
    method: 'POST',
  });
  return { success: true, message: res.message || 'Repository sync triggered successfully.' };
}
