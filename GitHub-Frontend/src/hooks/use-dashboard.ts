import { useQuery } from '@tanstack/react-query';
import { getDashboardOverview } from '../features/dashboard/api';
import { fetchEngineeringSignals } from '../lib/api/dashboard';
import { DashboardFilters } from '../types';

export function useDashboardOverview(filters: DashboardFilters = {}) {
  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview', filters],
    queryFn: () => getDashboardOverview(filters),
  });

  const signalsQuery = useQuery({
    queryKey: ['engineering-signals'],
    queryFn: () => fetchEngineeringSignals(),
  });

  return {
    overview: overviewQuery.data?.data,
    signals: signalsQuery.data?.data || { inactiveRepositories: [], stalePullRequests: [] },
    isLoading: overviewQuery.isLoading,
    isSignalsLoading: signalsQuery.isLoading,
    isError: overviewQuery.isError,
    refetch: () => {
      overviewQuery.refetch();
      signalsQuery.refetch();
    },
  };
}

// Alias for backward compatibility
export const useDashboard = useDashboardOverview;
