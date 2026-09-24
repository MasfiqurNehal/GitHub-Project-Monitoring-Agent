import { ApiResponse } from '../../lib/api/types';
import { EngineeringActivityItem, ActivityFilters } from '../../types';
import { fetchActivityStream } from '../../lib/api/activity';

export async function getActivityStream(filters: ActivityFilters = {}): Promise<ApiResponse<EngineeringActivityItem[]>> {
  const res = await fetchActivityStream(filters);
  return { success: true, data: res.data };
}
