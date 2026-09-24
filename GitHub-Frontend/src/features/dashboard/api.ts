import { fetchApi } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { ApiResponse } from '../../lib/api/types';
import { DashboardOverview, DashboardFilters } from '../../types';
import { fetchDashboardOverview } from '../../lib/api/dashboard';

export async function getDashboardOverview(filters: DashboardFilters = {}): Promise<ApiResponse<DashboardOverview>> {
  return await fetchDashboardOverview(filters);
}
