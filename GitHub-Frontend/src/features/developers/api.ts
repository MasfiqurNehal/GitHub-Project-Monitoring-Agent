import { ApiResponse } from '../../lib/api/types';
import { DeveloperWithMetrics, DeveloperDetailData } from '../../types';
import { fetchDevelopers, fetchDeveloperDetails } from '../../lib/api/developers';

export async function getDevelopers(filters: {
  projectId?: string;
  repositoryId?: string;
  search?: string;
} = {}): Promise<ApiResponse<DeveloperWithMetrics[]>> {
  return await fetchDevelopers(filters);
}

export async function getDeveloperDetail(
  developerId: string,
  filters: {
    projectId?: string;
    repositoryId?: string;
    dateFrom?: string;
    dateTo?: string;
    activityType?: string;
  } = {}
): Promise<ApiResponse<DeveloperDetailData>> {
  return await fetchDeveloperDetails(developerId, filters);
}
