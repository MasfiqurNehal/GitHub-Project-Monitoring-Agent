import { fetchApi } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { ApiResponse } from '../../lib/api/types';
import { EngineeringActivityItem, ActivityFilters } from '../../types';
import { fetchActivityStream } from '../../lib/api/activity';

export async function getActivityStream(filters: ActivityFilters = {}): Promise<ApiResponse<EngineeringActivityItem[]>> {
  try {
    const query = new URLSearchParams();
    if (filters.projectId) query.append('projectId', filters.projectId);
    if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
    if (filters.developerId) query.append('developerId', filters.developerId);
    if (filters.activityType) query.append('activityType', filters.activityType);
    if (filters.preset) query.append('preset', filters.preset);
    if (filters.from) query.append('from', filters.from);
    if (filters.to) query.append('to', filters.to);
    if (filters.search) query.append('search', filters.search);
    if (filters.sortBy) query.append('sortBy', filters.sortBy);

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.ACTIVITY}${queryString ? `?${queryString}` : ''}`;
    return await fetchApi<EngineeringActivityItem[]>(endpoint);
  } catch (err) {
    const res = await fetchActivityStream(filters);
    return { success: true, data: res.data };
  }
}
