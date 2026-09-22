import { fetchApi } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { ApiResponse } from '../../lib/api/types';
import { RepositoryWithMetrics, RepositoryDetailData } from '../../types';
import { fetchRepositories, fetchRepositoryDetails } from '../../lib/api/repositories';

export async function getRepositories(filters: {
  projectId?: string;
  search?: string;
  status?: string;
  visibility?: 'public' | 'private' | 'all';
} = {}): Promise<ApiResponse<RepositoryWithMetrics[]>> {
  try {
    const query = new URLSearchParams();
    if (filters.projectId) query.append('projectId', filters.projectId);
    if (filters.search) query.append('search', filters.search);
    if (filters.status) query.append('status', filters.status);
    if (filters.visibility) query.append('visibility', filters.visibility);

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.REPOSITORIES}${queryString ? `?${queryString}` : ''}`;
    return await fetchApi<RepositoryWithMetrics[]>(endpoint);
  } catch (err) {
    const res = await fetchRepositories(filters);
    return { success: true, data: res.data };
  }
}

export async function getRepositoryDetail(repositoryId: string): Promise<ApiResponse<RepositoryDetailData>> {
  try {
    return await fetchApi<RepositoryDetailData>(ENDPOINTS.REPOSITORY_DETAIL(repositoryId));
  } catch (err) {
    const res = await fetchRepositoryDetails(repositoryId);
    return { success: true, data: res.data };
  }
}
