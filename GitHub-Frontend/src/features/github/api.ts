import { ApiResponse } from '../../lib/api/types';
import { GitHubAccountInfo, ValidatedRepositoryInfo, MonitoredRepository } from '../../types';
import {
  fetchGitHubConnectionStatus,
  fetchMonitoredRepositories,
  validateGitHubRepository as validateRepoApi,
  addMonitoredRepository as addRepoApi,
  syncMonitoredRepository as syncRepoApi,
  removeMonitoredRepository as removeRepoApi,
} from '../../lib/api/github';

export async function getGitHubConnection(): Promise<ApiResponse<GitHubAccountInfo>> {
  return await fetchGitHubConnectionStatus();
}

export async function getMonitoredRepositories(): Promise<ApiResponse<MonitoredRepository[]>> {
  return await fetchMonitoredRepositories();
}

export async function validateGitHubRepository(url: string): Promise<ApiResponse<ValidatedRepositoryInfo>> {
  return await validateRepoApi(url);
}

export async function addMonitoredRepository(repoData: {
  url: string;
  projectId?: string;
}): Promise<ApiResponse<MonitoredRepository>> {
  const val = await validateRepoApi(repoData.url);
  return await addRepoApi(val.data);
}

export async function syncMonitoredRepository(id: string): Promise<ApiResponse<{ syncedAt: string }>> {
  await syncRepoApi(id);
  return { success: true, data: { syncedAt: new Date().toISOString() } };
}

export async function removeMonitoredRepository(id: string): Promise<ApiResponse<{ removedId: string }>> {
  await removeRepoApi(id);
  return { success: true, data: { removedId: id } };
}
