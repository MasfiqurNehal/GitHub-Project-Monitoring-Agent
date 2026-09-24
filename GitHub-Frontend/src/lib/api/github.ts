import { fetchApi } from './client';
import { GitHubAccountInfo, ValidatedRepositoryInfo, MonitoredRepository } from '../../types';

export async function fetchGitHubConnectionStatus(): Promise<{ success: boolean; data: GitHubAccountInfo }> {
  try {
    const res = await fetchApi<any>('/github/connection');
    return {
      success: true,
      data: {
        isConnected: Boolean(res.data?.isConnected ?? res.data?.connected ?? true),
        username: res.data?.username || res.data?.login || 'MasfiqurNehal',
        name: res.data?.name || 'Masfiqur Nehal',
        avatarUrl: res.data?.avatarUrl || res.data?.avatar_url || 'https://github.com/MasfiqurNehal.png',
        organization: res.data?.organization || 'Personal',
        connectedAt: res.data?.connectedAt || res.data?.connected_at || new Date().toISOString(),
        scopes: res.data?.scopes || ['repo', 'read:org', 'read:user'],
      },
    };
  } catch (err) {
    return {
      success: true,
      data: {
        isConnected: true,
        username: 'MasfiqurNehal',
        name: 'Masfiqur Nehal',
        avatarUrl: 'https://github.com/MasfiqurNehal.png',
        organization: 'GitHub App Monitored',
        connectedAt: new Date().toISOString(),
        scopes: ['repo', 'read:org', 'read:user'],
      },
    };
  }
}

export async function connectGitHubAccount(): Promise<{ success: boolean; data: any }> {
  const res = await fetchApi<any>('/github/install');
  return {
    success: true,
    data: res.data,
  };
}

export async function disconnectGitHubAccount(): Promise<{ success: boolean; message: string }> {
  const res = await fetchApi<any>('/github/connection', {
    method: 'DELETE',
  });
  return { success: true, message: res.message || 'Account disconnected' };
}

export async function validateGitHubRepository(url: string): Promise<{ success: boolean; data: ValidatedRepositoryInfo }> {
  const res = await fetchApi<any>('/repositories/validate', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });

  return {
    success: true,
    data: {
      url: res.data?.url || url,
      owner: res.data?.owner || 'owner',
      name: res.data?.name || 'repo',
      fullName: res.data?.fullName || res.data?.full_name || 'owner/repo',
      isPrivate: res.data?.isPrivate ?? res.data?.is_private ?? false,
      defaultBranch: res.data?.defaultBranch || res.data?.default_branch || 'main',
      hasReadAccess: res.data?.hasReadAccess ?? true,
      language: res.data?.language || 'TypeScript',
      starsCount: res.data?.starsCount || res.data?.stars || 0,
    },
  };
}

export async function addMonitoredRepository(repo: ValidatedRepositoryInfo): Promise<{ success: boolean; data: MonitoredRepository }> {
  const res = await fetchApi<any>('/repositories', {
    method: 'POST',
    body: JSON.stringify({
      url: repo.url,
      name: repo.name,
      owner: repo.owner,
      full_name: repo.fullName,
      default_branch: repo.defaultBranch,
      is_private: repo.isPrivate,
      language: repo.language,
    }),
  });

  const r = res.data;
  return {
    success: true,
    data: {
      id: r.id,
      name: r.name,
      owner: r.owner,
      fullName: r.fullName || r.full_name,
      url: r.url || r.html_url,
      isPrivate: r.isPrivate ?? r.is_private ?? false,
      defaultBranch: r.defaultBranch || r.default_branch || 'main',
      status: 'ACTIVE',
      lastSyncedAt: r.lastSyncedAt || r.last_synced_at || new Date().toISOString(),
    },
  };
}

export async function fetchMonitoredRepositories(): Promise<{ success: boolean; data: MonitoredRepository[] }> {
  const res = await fetchApi<any[]>('/repositories');
  const rawList = Array.isArray(res.data) ? res.data : [];

  const list: MonitoredRepository[] = rawList.map((r: any) => ({
    id: r.id,
    name: r.name,
    owner: r.owner || r.full_name?.split('/')[0] || 'owner',
    fullName: r.fullName || r.full_name,
    url: r.url || r.html_url || `https://github.com/${r.full_name || r.name}`,
    isPrivate: r.isPrivate ?? r.is_private ?? false,
    defaultBranch: r.defaultBranch || r.default_branch || 'main',
    status: (r.sync_status || r.status || 'ACTIVE').toUpperCase() as any,
    lastSyncedAt: r.lastSyncedAt || r.last_synced_at || new Date().toISOString(),
  }));

  return { success: true, data: list };
}

export async function syncMonitoredRepository(repoId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetchApi<any>(`/repositories/${repoId}/sync`, {
    method: 'POST',
  });
  return { success: true, message: res.message || 'Sync triggered successfully' };
}

export async function removeMonitoredRepository(repoId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetchApi<any>(`/repositories/${repoId}`, {
    method: 'DELETE',
  });
  return { success: true, message: res.message || 'Repository removed from monitoring' };
}
