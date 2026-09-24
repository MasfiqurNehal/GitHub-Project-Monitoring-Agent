import { fetchApi } from './client';
import { EngineeringActivityItem, ActivityFilters } from '../../types';

export async function fetchActivityStream(filters: ActivityFilters = {}): Promise<{
  success: boolean;
  data: EngineeringActivityItem[];
  total: number;
}> {
  const query = new URLSearchParams();
  if (filters.projectId) query.append('projectId', filters.projectId);
  if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
  if (filters.developerId) query.append('developerId', filters.developerId);
  if (filters.activityType && filters.activityType !== 'all') query.append('activity_type', filters.activityType);
  if (filters.preset) query.append('preset', filters.preset);
  if (filters.search) query.append('search', filters.search);
  if (filters.sortBy) query.append('sortBy', filters.sortBy);
  if ((filters as any).page) query.append('page', String((filters as any).page));
  if ((filters as any).limit) query.append('limit', String((filters as any).limit));

  const queryString = query.toString();
  const res = await fetchApi<any>(`/activity${queryString ? `?${queryString}` : ''}`);

  const rawData = Array.isArray(res.data) ? res.data : res.data?.activities || [];

  const items: EngineeringActivityItem[] = rawData.map((item: any) => ({
    id: item.id || `act-${Math.random()}`,
    type: item.type || 'commit',
    timestamp: item.timestamp || item.created_at || item.committed_at || new Date().toISOString(),
    title: item.title || item.message || 'GitHub Activity',
    url: item.url || item.commit_url || item.html_url,
    developer: {
      id: item.developer?.id || item.developer_id || 'dev-unknown',
      login: item.developer?.login || item.developer?.username || item.author || 'unknown',
      name: item.developer?.name || item.author || 'Unknown Contributor',
      avatarUrl: item.developer?.avatarUrl || item.developer?.avatar_url || 'https://github.com/github.png',
    },
    repository: {
      id: item.repository?.id || item.repository_id || 'repo-unknown',
      name: item.repository?.name || item.repo_name || 'repository',
      fullName: item.repository?.fullName || item.repository?.full_name || item.repo_name || 'repository',
    },
    project: item.project ? {
      id: item.project.id,
      name: item.project.name,
    } : undefined,
    githubItem: item.githubItem || {
      type: item.type,
      label: item.title,
      url: item.url,
    },
    status: item.status || item.state,
    linesAdded: item.linesAdded || item.additions,
    linesDeleted: item.linesDeleted || item.deletions,
  }));

  return {
    success: true,
    data: items,
    total: res.data?.total || items.length,
  };
}
