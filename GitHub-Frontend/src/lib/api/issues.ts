import { fetchApi } from './client';
import { IssueWithMetrics, IssueDetailData, IssueFilters } from '../../types';

export async function fetchIssues(filters: IssueFilters = {}): Promise<{ success: boolean; data: IssueWithMetrics[] }> {
  const query = new URLSearchParams();
  if (filters.projectId) query.append('projectId', filters.projectId);
  if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
  if (filters.developerId) query.append('developerId', filters.developerId);
  if (filters.state) query.append('state', filters.state);
  if (filters.label) query.append('label', filters.label);
  if (filters.search) query.append('search', filters.search);

  const queryString = query.toString();
  const res = await fetchApi<any>(`/issues${queryString ? `?${queryString}` : ''}`);

  const rawList = Array.isArray(res.data) ? res.data : res.data?.issues || [];

  const list: IssueWithMetrics[] = rawList.map((iss: any) => ({
    id: iss.id,
    repositoryId: iss.repositoryId || iss.repository_id,
    githubIssueId: iss.githubIssueId || iss.github_issue_id || iss.number,
    number: iss.number,
    title: iss.title,
    body: iss.body || '',
    state: (iss.state || 'OPEN').toUpperCase() as any,
    author: {
      id: iss.author?.id || iss.author_developer_id || 'dev-unknown',
      login: iss.author?.login || iss.author_username || 'unknown',
      name: iss.author?.name || iss.author_name || 'Reporter',
      avatarUrl: iss.author?.avatarUrl || iss.author?.avatar_url || 'https://github.com/github.png',
    },
    repository: {
      id: iss.repository?.id || iss.repository_id || 'repo-unknown',
      name: iss.repository?.name || iss.repo_name || 'repository',
      fullName: iss.repository?.fullName || iss.repository?.full_name || 'repository',
    },
    project: iss.project ? {
      id: iss.project.id,
      name: iss.project.name,
    } : undefined,
    labels: iss.labels || [],
    assignees: iss.assignees || [],
    commentsCount: Number(iss.commentsCount || iss.comments_count || 0),
    createdAt: iss.createdAt || iss.created_at || new Date().toISOString(),
    updatedAt: iss.updatedAt || iss.updated_at || new Date().toISOString(),
    closedAt: iss.closedAt || iss.closed_at,
  }));

  return { success: true, data: list };
}

export async function fetchIssueDetails(issueId: string): Promise<{ success: boolean; data: IssueDetailData }> {
  const res = await fetchApi<any>(`/issues/${issueId}`);
  const iss = res.data?.issue || res.data;

  const issue: IssueWithMetrics = {
    id: iss.id,
    repositoryId: iss.repositoryId || iss.repository_id,
    githubIssueId: iss.githubIssueId || iss.github_issue_id || iss.number,
    number: iss.number,
    title: iss.title,
    body: iss.body || '',
    state: (iss.state || 'OPEN').toUpperCase() as any,
    author: {
      id: iss.author?.id || iss.author_developer_id || 'dev-unknown',
      login: iss.author?.login || iss.author_username || 'unknown',
      name: iss.author?.name || iss.author_name || 'Reporter',
      avatarUrl: iss.author?.avatarUrl || iss.author?.avatar_url || 'https://github.com/github.png',
    },
    repository: {
      id: iss.repository?.id || iss.repository_id || 'repo-unknown',
      name: iss.repository?.name || iss.repo_name || 'repository',
      fullName: iss.repository?.fullName || iss.repository?.full_name || 'repository',
    },
    project: iss.project,
    labels: iss.labels || [],
    assignees: iss.assignees || [],
    commentsCount: Number(iss.commentsCount || iss.comments_count || 0),
    createdAt: iss.createdAt || iss.created_at || new Date().toISOString(),
    updatedAt: iss.updatedAt || iss.updated_at || new Date().toISOString(),
    closedAt: iss.closedAt || iss.closed_at,
  };

  const detailData: IssueDetailData = {
    issue,
    comments: res.data?.comments || [],
    timeline: res.data?.timeline || [],
    relatedPullRequests: res.data?.relatedPullRequests || [],
  };

  return { success: true, data: detailData };
}
