import { useQuery } from '@tanstack/react-query';
import { getDevelopers, getDeveloperDetail } from '../features/developers/api';

export function useDevelopers(filters: { projectId?: string; repositoryId?: string; search?: string } = {}) {
  const developersQuery = useQuery({
    queryKey: ['developers-list', filters],
    queryFn: () => getDevelopers(filters),
  });

  return {
    developers: developersQuery.data?.data || [],
    isLoading: developersQuery.isLoading,
    isError: developersQuery.isError,
    refetch: developersQuery.refetch,
  };
}

export function useDeveloper(developerId: string) {
  const detailQuery = useQuery({
    queryKey: ['developer-detail', developerId],
    queryFn: () => getDeveloperDetail(developerId),
    enabled: !!developerId,
  });

  return {
    ...detailQuery,
    developerDetail: detailQuery.data?.data,
    developer: detailQuery.data?.data?.developer,
    data: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch,
  };
}

// Alias for backward compatibility
export const useDeveloperDetail = useDeveloper;
