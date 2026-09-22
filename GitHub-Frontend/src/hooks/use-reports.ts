import { useQuery } from '@tanstack/react-query';
import { fetchReports, fetchReportDetails } from '../lib/api/reports';
import { ReportFilters } from '../types';

export function useReports(filters: ReportFilters = {}) {
  const query = useQuery({
    queryKey: ['reports-list', filters],
    queryFn: () => fetchReports(filters),
  });

  return {
    reports: query.data?.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useReportDetail(reportId: string) {
  const detailQuery = useQuery({
    queryKey: ['report-detail', reportId],
    queryFn: () => fetchReportDetails(reportId),
    enabled: !!reportId,
  });

  return {
    ...detailQuery,
    reportDetail: detailQuery.data?.data,
    data: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch,
  };
}
