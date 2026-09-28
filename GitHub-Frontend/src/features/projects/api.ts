import { ApiResponse } from '../../lib/api/types';
import { ProjectWithMetrics, ProjectDetailData } from '../../types';
import { fetchProjects, fetchProjectDetails } from '../../lib/api/projects';

export async function getProjects(filters: {
  search?: string;
  status?: string;
} = {}): Promise<ApiResponse<ProjectWithMetrics[]>> {
  return await fetchProjects(filters);
}

export async function getProjectDetail(
  projectId: string,
  filters?: { preset?: string; from?: string; to?: string }
): Promise<ApiResponse<ProjectDetailData>> {
  return await fetchProjectDetails(projectId, filters);
}
