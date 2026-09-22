import { useQuery } from '@tanstack/react-query';
import { getActivityStream } from '../features/activity/api';
import { ActivityFilters } from '../types';

export function useActivity(filters: ActivityFilters = {}) {
  const query = useQuery({
    queryKey: ['activity-stream', filters],
    queryFn: () => getActivityStream(filters),
  });

  return {
    activities: query.data?.data || [],
    total: query.data?.data?.length || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// Alias for backward compatibility
export const useActivityStream = useActivity;
