import { fetchApi } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { ApiResponse } from '../../lib/api/types';
import { DeveloperWithMetrics, DeveloperDetailData } from '../../types';
import { fetchDevelopers, fetchDeveloperDetails } from '../../lib/api/developers';

export async function getDevelopers(filters: {
  projectId?: string;
  repositoryId?: string;
  search?: string;
} = {}): Promise<ApiResponse<DeveloperWithMetrics[]>> {
  try {
    const query = new URLSearchParams();
    if (filters.projectId) query.append('projectId', filters.projectId);
    if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
    if (filters.search) query.append('search', filters.search);

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.DEVELOPERS}${queryString ? `?${queryString}` : ''}`;
    return await fetchApi<DeveloperWithMetrics[]>(endpoint);
  } catch (err) {
    const res = await fetchDevelopers(filters);
    return { success: true, data: res.data };
  }
}

export async function getDeveloperDetail(developerId: string): Promise<ApiResponse<DeveloperDetailData>> {
  try {
    return await fetchApi<DeveloperDetailData>(ENDPOINTS.DEVELOPER_DETAIL(developerId));
  } catch (err) {
    const res = await fetchDeveloperDetails(developerId);
    return { success: true, data: res.data };
  }
}
