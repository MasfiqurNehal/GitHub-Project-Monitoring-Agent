import { ApiResponse } from '../../lib/api/types';
import { RepositoryWithMetrics, RepositoryDetailData } from '../../types';
import { fetchRepositories, fetchRepositoryDetails } from '../../lib/api/repositories';

export async function getRepositories(filters: {
  projectId?: string;
  search?: string;
  status?: string;
  visibility?: 'public' | 'private' | 'all';
} = {}): Promise<ApiResponse<RepositoryWithMetrics[]>> {
  return await fetchRepositories(filters);
}

export async function getRepositoryDetail(repositoryId: string): Promise<ApiResponse<RepositoryDetailData>> {
  return await fetchRepositoryDetails(repositoryId);
}
