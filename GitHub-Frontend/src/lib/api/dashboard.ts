import { fetchApi } from './client';
import { DashboardFilters, DashboardOverview, EngineeringSignals } from '../../types';

export async function fetchDashboardOverview(filters: DashboardFilters = {}): Promise<{ success: boolean; data: DashboardOverview }> {
  const query = new URLSearchParams();
  if (filters.projectId) query.append('projectId', filters.projectId);
  if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
  if (filters.developerId) query.append('developerId', filters.developerId);
  if (filters.from) query.append('from', filters.from);
  if (filters.to) query.append('to', filters.to);

  const queryString = query.toString();
  return fetchApi<DashboardOverview>(`/dashboard/overview${queryString ? `?${queryString}` : ''}`);
}

export async function fetchEngineeringSignals(): Promise<{ success: boolean; data: EngineeringSignals }> {
  return fetchApi<EngineeringSignals>('/dashboard/signals');
}
