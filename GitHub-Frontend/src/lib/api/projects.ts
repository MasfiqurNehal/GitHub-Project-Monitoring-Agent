import { fetchApi } from './client';
import { Project, Repository } from '../../types';

export async function fetchProjects(): Promise<{ success: boolean; data: Project[] }> {
  return fetchApi<Project[]>('/projects');
}

export async function fetchProjectDetails(projectId: string): Promise<{ success: boolean; data: Project }> {
  try {
    return await fetchApi<Project>(`/projects/${projectId}`);
  } catch (err) {
    const projects = await fetchProjects();
    const found = projects.data.find((p) => p.id === projectId);
    if (found) return { success: true, data: found };
    throw new Error('Project not found');
  }
}

export async function createProject(name: string, description?: string): Promise<{ success: boolean; data: Project }> {
  return fetchApi<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
}

export async function connectRepository(projectId: string, owner: string, name: string): Promise<{ success: boolean; data: Repository }> {
  return fetchApi<Repository>(`/projects/${projectId}/repositories`, {
    method: 'POST',
    body: JSON.stringify({ owner, name }),
  });
}
