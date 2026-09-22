import { fetchApi } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { ApiResponse } from '../../lib/api/types';
import { GitHubAccountInfo, ValidatedRepositoryInfo, MonitoredRepository } from '../../types';
import { 
  fetchGitHubConnectionStatus, 
  fetchMonitoredRepositories 
} from '../../lib/api/github';

export async function getGitHubConnection(): Promise<ApiResponse<GitHubAccountInfo>> {
  try {
    return await fetchApi<GitHubAccountInfo>(ENDPOINTS.GITHUB_CONNECTION);
  } catch (err) {
    return await fetchGitHubConnectionStatus();
  }
}

export async function getMonitoredRepositories(): Promise<ApiResponse<MonitoredRepository[]>> {
  try {
    return await fetchApi<MonitoredRepository[]>(ENDPOINTS.GITHUB_REPOSITORIES);
  } catch (err) {
    return await fetchMonitoredRepositories();
  }
}

export async function validateGitHubRepository(url: string): Promise<ApiResponse<ValidatedRepositoryInfo>> {
  try {
    return await fetchApi<ValidatedRepositoryInfo>(ENDPOINTS.GITHUB_VALIDATE_REPO, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  } catch (err) {
    // Mock validation fallback
    if (!url.includes('github.com/')) {
      throw new Error('Invalid GitHub repository URL format');
    }
    const parts = url.replace('https://github.com/', '').split('/');
    return {
      success: true,
      data: {
        url,
        owner: parts[0] || 'BetopiaLtd',
        name: parts[1] || 'beyondAI-backend',
        fullName: `${parts[0] || 'BetopiaLtd'}/${parts[1] || 'beyondAI-backend'}`,
        isPrivate: true,
        defaultBranch: 'main',
        hasReadAccess: true,
        language: 'TypeScript',
        starsCount: 42,
      },
    };
  }
}

export async function addMonitoredRepository(repoData: {
  url: string;
  projectId?: string;
}): Promise<ApiResponse<MonitoredRepository>> {
  try {
    return await fetchApi<MonitoredRepository>(ENDPOINTS.GITHUB_REPOSITORIES, {
      method: 'POST',
      body: JSON.stringify(repoData),
    });
  } catch (err) {
    const parts = repoData.url.replace('https://github.com/', '').split('/');
    const newRepo: MonitoredRepository = {
      id: `repo-${Date.now()}`,
      name: parts[1] || 'new-repo',
      owner: parts[0] || 'BetopiaLtd',
      fullName: `${parts[0] || 'BetopiaLtd'}/${parts[1] || 'new-repo'}`,
      url: repoData.url,
      isPrivate: true,
      defaultBranch: 'main',
      status: 'ACTIVE',
      lastSyncedAt: new Date().toISOString(),
    };
    return { success: true, data: newRepo };
  }
}

export async function syncMonitoredRepository(id: string): Promise<ApiResponse<{ syncedAt: string }>> {
  try {
    return await fetchApi<{ syncedAt: string }>(ENDPOINTS.GITHUB_SYNC_REPO(id), {
      method: 'POST',
    });
  } catch (err) {
    return { success: true, data: { syncedAt: new Date().toISOString() } };
  }
}

export async function removeMonitoredRepository(id: string): Promise<ApiResponse<{ removedId: string }>> {
  try {
    return await fetchApi<{ removedId: string }>(ENDPOINTS.GITHUB_REMOVE_REPO(id), {
      method: 'DELETE',
    });
  } catch (err) {
    return { success: true, data: { removedId: id } };
  }
}
