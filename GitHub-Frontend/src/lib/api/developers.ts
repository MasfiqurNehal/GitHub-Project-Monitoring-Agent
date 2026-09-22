import { fetchApi } from './client';
import { Developer } from '../../types';

export async function fetchDevelopers(): Promise<{ success: boolean; data: Developer[] }> {
  return fetchApi<Developer[]>('/developers');
}

export async function fetchDeveloperDetails(developerId: string): Promise<{ success: boolean; data: any }> {
  return fetchApi<any>(`/developers/${developerId}`);
}
