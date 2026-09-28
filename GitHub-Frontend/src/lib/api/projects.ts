import { fetchApi } from './client';
import { Project, ProjectWithMetrics, ProjectDetailData } from '../../types';

export async function fetchProjects(filters: {
  search?: string;
  status?: string;
} = {}): Promise<{ success: boolean; data: ProjectWithMetrics[] }> {
  const query = new URLSearchParams();
  if (filters.search) query.append('search', filters.search);
  if (filters.status) query.append('status', filters.status);

  const queryString = query.toString();
  const res = await fetchApi<any[]>(`/projects${queryString ? `?${queryString}` : ''}`);
  
  const rawList = Array.isArray(res.data) ? res.data : [];

  const projects: ProjectWithMetrics[] = rawList.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    status: p.status || 'ACTIVE',
    createdAt: p.createdAt || p.created_at || new Date().toISOString(),
    updatedAt: p.updatedAt || p.updated_at || new Date().toISOString(),
    metrics: {
      repositoriesCount: Number(p.metrics?.repositoriesCount || p.repositories_count || 0),
      developersCount: Number(p.metrics?.developersCount || p.developers_count || 0),
      commitsCount: Number(p.metrics?.commitsCount || p.commits_count || 0),
      prsCount: Number(p.metrics?.prsCount || p.prs_count || 0),
      issuesCount: Number(p.metrics?.issuesCount || p.issues_count || 0),
      linesAdded: Number(p.metrics?.linesAdded || p.lines_added || p.additions || 0),
      linesDeleted: Number(p.metrics?.linesDeleted || p.lines_deleted || p.deletions || 0),
      lastActivityAt: p.metrics?.lastActivityAt || p.updated_at || p.created_at || new Date().toISOString(),
    },
    repositories: (p.repositories || []).map((r: any) => ({
      id: r.id,
      projectId: r.projectId || r.project_id || p.id,
      githubId: r.githubId || r.github_repository_id || 0,
      owner: r.owner || r.full_name?.split('/')[0] || 'Organization',
      name: r.name,
      fullName: r.fullName || r.full_name,
      url: r.url || r.html_url || `https://github.com/${r.full_name || r.name}`,
      defaultBranch: r.defaultBranch || r.default_branch || 'main',
      language: r.language || 'TypeScript',
      isActive: r.isActive ?? true,
      lastSyncedAt: r.lastSyncedAt || r.last_synced_at,
      createdAt: r.createdAt || r.created_at || new Date().toISOString(),
      updatedAt: r.updatedAt || r.updated_at || new Date().toISOString(),
    })),
  }));

  return { success: true, data: projects };
}

export async function fetchProjectDetails(
  projectId: string,
  filters?: { preset?: string; from?: string; to?: string }
): Promise<{ success: boolean; data: ProjectDetailData }> {
  const query = new URLSearchParams();
  if (filters?.preset) query.append('preset', filters.preset);
  if (filters?.from) query.append('from', filters.from);
  if (filters?.to) query.append('to', filters.to);

  const queryString = query.toString();
  const res = await fetchApi<any>(`/projects/${projectId}${queryString ? `?${queryString}` : ''}`);
  const p = res.data?.project || res.data;

  const project: ProjectWithMetrics = {
    id: p.id,
    name: p.name,
    description: p.description || '',
    status: p.status || 'ACTIVE',
    createdAt: p.createdAt || p.created_at || new Date().toISOString(),
    updatedAt: p.updatedAt || p.updated_at || new Date().toISOString(),
    metrics: {
      repositoriesCount: Number(p.metrics?.repositoriesCount || p.repositories_count || 0),
      developersCount: Number(p.metrics?.developersCount || p.developers_count || 0),
      commitsCount: Number(p.metrics?.commitsCount || p.commits_count || 0),
      prsCount: Number(p.metrics?.prsCount || p.prs_count || 0),
      issuesCount: Number(p.metrics?.issuesCount || p.issues_count || 0),
      linesAdded: Number(p.metrics?.linesAdded || p.lines_added || p.additions || 0),
      linesDeleted: Number(p.metrics?.linesDeleted || p.lines_deleted || p.deletions || 0),
      lastActivityAt: p.metrics?.lastActivityAt || p.updated_at || p.created_at || new Date().toISOString(),
    },
  };

  const repositories = (res.data?.repositories || p.repositories || []).map((r: any) => ({
    id: r.id,
    projectId: r.projectId || r.project_id || p.id,
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
    description: r.description || null,
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

  const detailData: ProjectDetailData = {
    project,
    repositories,
    developers: res.data?.developers || [],
    recentActivity: res.data?.recentActivity || [],
    commits: res.data?.commits || [],
    pullRequests: res.data?.pullRequests || [],
    issues: res.data?.issues || [],
    codeChanges: res.data?.codeChanges || {
      trend: [],
      totalAdditions: project.metrics.linesAdded,
      totalDeletions: project.metrics.linesDeleted,
      netChanges: project.metrics.linesAdded - project.metrics.linesDeleted,
      topFilesChanged: [],
    },
  };

  return { success: true, data: detailData };
}

export async function createProject(data: { name: string; description?: string }): Promise<{ success: boolean; data: Project }> {
  return await fetchApi<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface ConnectRepositoryPayload {
  repositoryId?: string;
  repositoryUrl?: string;
  owner?: string;
  name?: string;
  nameOrDescription?: string;
}

export async function connectRepository(
  projectId: string,
  payload: ConnectRepositoryPayload | { owner: string; name: string }
): Promise<{ success: boolean; data: any; message?: string }> {
  return await fetchApi<any>(`/projects/${projectId}/repositories`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function removeRepositoryFromProject(
  projectId: string,
  repositoryId: string
): Promise<{ success: boolean; message?: string }> {
  return await fetchApi<any>(`/projects/${projectId}/repositories/${repositoryId}`, {
    method: 'DELETE',
  });
}

export async function deleteProject(
  projectId: string,
  password: string
): Promise<{ success: boolean; message?: string }> {
  return await fetchApi<any>(`/projects/${projectId}`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}
