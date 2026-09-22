import { fetchApi } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { ApiResponse } from '../../lib/api/types';
import { ProjectWithMetrics, ProjectDetailData } from '../../types';
import { fetchProjects, fetchProjectDetails } from '../../lib/api/projects';

export async function getProjects(filters: {
  search?: string;
  status?: string;
} = {}): Promise<ApiResponse<ProjectWithMetrics[]>> {
  try {
    const query = new URLSearchParams();
    if (filters.search) query.append('search', filters.search);
    if (filters.status) query.append('status', filters.status);

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.PROJECTS}${queryString ? `?${queryString}` : ''}`;
    return await fetchApi<ProjectWithMetrics[]>(endpoint);
  } catch (err) {
    const res = await fetchProjects(filters);
    return { success: true, data: res.data };
  }
}

export async function getProjectDetail(projectId: string): Promise<ApiResponse<ProjectDetailData>> {
  try {
    return await fetchApi<ProjectDetailData>(ENDPOINTS.PROJECT_DETAIL(projectId));
  } catch (err) {
    const res = await fetchProjectDetails(projectId);
    return { success: true, data: res.data };
  }
}
