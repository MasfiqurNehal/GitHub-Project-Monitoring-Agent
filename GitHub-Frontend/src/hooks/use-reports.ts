import { useQuery } from '@tanstack/react-query';
import { getReports, getReportDetail } from '../features/reports/api';
import { ReportFilters } from '../types';

export function useReports(filters: ReportFilters = {}) {
  const query = useQuery({
    queryKey: ['reports-list', filters],
    queryFn: () => getReports(filters),
  });

  return {
    reports: query.data?.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useReport(reportId: string) {
  const detailQuery = useQuery({
    queryKey: ['report-detail', reportId],
    queryFn: () => getReportDetail(reportId),
    enabled: !!reportId,
  });

  return {
    ...detailQuery,
    reportDetail: detailQuery.data?.data,
    report: detailQuery.data?.data,
    data: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch,
  };
}

// Alias for backward compatibility
export const useReportDetail = useReport;
