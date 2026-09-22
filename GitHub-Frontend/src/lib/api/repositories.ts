import { fetchApi } from './client';
import { Repository } from '../../types';
import { fetchProjects } from './projects';

export async function fetchRepositories(): Promise<{ success: boolean; data: Repository[] }> {
  try {
    return await fetchApi<Repository[]>('/repositories');
  } catch (err) {
    const projects = await fetchProjects();
    const repos: Repository[] = [];
    projects.data.forEach((p) => {
      if (p.repositories) repos.push(...p.repositories);
    });
    return { success: true, data: repos };
  }
}

export async function fetchRepositoryDetails(repositoryId: string): Promise<{ success: boolean; data: Repository }> {
  try {
    return await fetchApi<Repository>(`/repositories/${repositoryId}`);
  } catch (err) {
    const repos = await fetchRepositories();
    const repo = repos.data.find((r) => r.id === repositoryId);
    if (!repo) throw new Error('Repository not found');
    return { success: true, data: repo };
  }
}

export async function triggerRepositorySync(repositoryId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetchApi<{ message: string }>(`/repositories/${repositoryId}/sync`, {
    method: 'POST',
  });
  return {
    success: res.success,
    message: res.data?.message || res.message || 'Sync triggered successfully',
  };
}
