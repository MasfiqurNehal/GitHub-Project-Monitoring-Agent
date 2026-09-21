const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface DashboardFilters {
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  from?: string;
  to?: string;
}

export async function fetchDashboardOverview(filters: DashboardFilters = {}) {
  const query = new URLSearchParams();
  if (filters.projectId) query.append('projectId', filters.projectId);
  if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
  if (filters.developerId) query.append('developerId', filters.developerId);
  if (filters.from) query.append('from', filters.from);
  if (filters.to) query.append('to', filters.to);

  const res = await fetch(`${API_BASE_URL}/dashboard/overview?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch dashboard overview');
  return res.json();
}

export async function fetchEngineeringSignals() {
  const res = await fetch(`${API_BASE_URL}/dashboard/signals`);
  if (!res.ok) throw new Error('Failed to fetch engineering signals');
  return res.json();
}

export async function fetchProjects() {
  const res = await fetch(`${API_BASE_URL}/projects`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function createProject(name: string, description?: string) {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json();
}

export async function connectRepository(projectId: string, owner: string, name: string) {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/repositories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner, name }),
  });
  if (!res.ok) throw new Error('Failed to connect repository');
  return res.json();
}

export async function fetchDevelopers() {
  const res = await fetch(`${API_BASE_URL}/developers`);
  if (!res.ok) throw new Error('Failed to fetch developers');
  return res.json();
}

export async function fetchDeveloperDetails(developerId: string) {
  const res = await fetch(`${API_BASE_URL}/developers/${developerId}`);
  if (!res.ok) throw new Error('Failed to fetch developer details');
  return res.json();
}

export async function sendAIChatMessage(conversationId: string, message: string) {
  const res = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, message }),
  });
  if (!res.ok) throw new Error('Failed to process AI request');
  return res.json();
}
