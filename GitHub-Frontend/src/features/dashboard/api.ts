import { fetchApi } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { ApiResponse } from '../../lib/api/types';
import { DashboardOverview, DashboardFilters } from '../../types';
import { fetchDashboardOverview } from '../../lib/api/dashboard';

export async function getDashboardOverview(filters: DashboardFilters = {}): Promise<ApiResponse<DashboardOverview>> {
  try {
    const query = new URLSearchParams();
    if (filters.projectId) query.append('projectId', filters.projectId);
    if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
    if (filters.developerId) query.append('developerId', filters.developerId);
    if (filters.preset) query.append('preset', filters.preset);
    if (filters.from) query.append('from', filters.from);
    if (filters.to) query.append('to', filters.to);

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.DASHBOARD_OVERVIEW}${queryString ? `?${queryString}` : ''}`;
    return await fetchApi<DashboardOverview>(endpoint);
  } catch (err) {
    return await fetchDashboardOverview(filters);
  }
}
