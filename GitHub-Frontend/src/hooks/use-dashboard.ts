import { useQuery } from '@tanstack/react-query';
import { fetchDashboardOverview, fetchEngineeringSignals } from '../lib/api/dashboard';
import { DashboardFilters } from '../types';

export function useDashboard(filters: DashboardFilters = {}) {
  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview', filters.projectId, filters.repositoryId, filters.developerId, filters.from, filters.to],
    queryFn: () => fetchDashboardOverview(filters),
  });

  const signalsQuery = useQuery({
    queryKey: ['engineering-signals'],
    queryFn: fetchEngineeringSignals,
  });

  return {
    overview: overviewQuery.data?.data,
    signals: signalsQuery.data?.data || { inactiveRepositories: [], stalePullRequests: [] },
    isLoading: overviewQuery.isLoading || signalsQuery.isLoading,
    isError: overviewQuery.isError || signalsQuery.isError,
    refetch: () => {
      overviewQuery.refetch();
      signalsQuery.refetch();
    },
  };
}
