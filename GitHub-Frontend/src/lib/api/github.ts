import { fetchApi } from './client';
import { GitHubAccountInfo, ValidatedRepositoryInfo, MonitoredRepository } from '../../types';

export async function fetchGitHubConnectionStatus(): Promise<{ success: boolean; data: GitHubAccountInfo }> {
  try {
    const res = await fetchApi<any>('/github/connection/status');
    const data = res.data || {};
    const isConnected = Boolean(data.connected ?? data.isConnected ?? false);
    const account = data.githubAccount || data.account || {};

    return {
      success: true,
      data: {
        isConnected,
        connected: isConnected,
        username: account.login || data.username || data.name || null,
        name: data.name || account.login || data.username || null,
        avatarUrl: account.avatarUrl || data.avatarUrl || (account.login ? `https://github.com/${account.login}.png` : null),
        organization: data.organization || (account.type === 'Organization' ? account.login : null),
        installationId: data.installationId || account.installationId || null,
        accessibleRepositoryCount: data.accessibleRepositoryCount ?? 0,
        lastSynchronization: data.lastSynchronization || null,
        connectionStatus: data.connectionStatus || data.status || (isConnected ? 'ACTIVE' : 'NOT_CONNECTED'),
        connectedAt: data.connectedAt || account.installedAt || null,
        scopes: ['repo:read', 'read:org'],
        githubAccount: account.login ? {
          id: account.id,
          login: account.login,
          type: account.type,
          avatarUrl: account.avatarUrl || `https://github.com/${account.login}.png`,
        } : null,
      },
    };
  } catch (err) {
    return {
      success: true,
      data: {
        isConnected: false,
        connected: false,
        username: null,
        name: null,
        avatarUrl: null,
        organization: null,
        installationId: null,
        accessibleRepositoryCount: 0,
        lastSynchronization: null,
        connectionStatus: 'NOT_CONNECTED',
        connectedAt: null,
        scopes: [],
        githubAccount: null,
      },
    };
  }
}

export async function connectGitHubAccount(): Promise<{ success: boolean; data: any }> {
  const res = await fetchApi<any>('/github/app/install');
  const targetUrl = res.data?.installationUrl || res.data?.installUrl;
  if (targetUrl && typeof window !== 'undefined') {
    window.location.href = targetUrl;
  }
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
