import { useQuery } from '@tanstack/react-query';
import { fetchDevelopers, fetchDeveloperDetails } from '../lib/api/developers';

export function useDevelopers() {
  const developersQuery = useQuery({
    queryKey: ['developers-list'],
    queryFn: fetchDevelopers,
  });

  return {
    developers: developersQuery.data?.data || [],
    isLoading: developersQuery.isLoading,
    isError: developersQuery.isError,
  };
}

export function useDeveloperDetail(developerId: string) {
  return useQuery({
    queryKey: ['developer-detail', developerId],
    queryFn: () => fetchDeveloperDetails(developerId),
    enabled: !!developerId,
  });
}
