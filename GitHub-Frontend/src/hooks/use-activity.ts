import { useQuery } from '@tanstack/react-query';
import { fetchActivityStream } from '../lib/api/activity';
import { ActivityFilters } from '../types';

export function useActivityStream(filters: ActivityFilters = {}) {
  const query = useQuery({
    queryKey: ['activity-stream', filters],
    queryFn: () => fetchActivityStream(filters),
  });

  return {
    activities: query.data?.data || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
