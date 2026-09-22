import { useQuery } from '@tanstack/react-query';
import { fetchIssues, fetchIssueDetails } from '../lib/api/issues';
import { IssueFilters } from '../types';

export function useIssues(filters: IssueFilters = {}) {
  const query = useQuery({
    queryKey: ['issues-list', filters],
    queryFn: () => fetchIssues(filters),
  });

  return {
    issues: query.data?.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useIssueDetail(issueId: string) {
  const detailQuery = useQuery({
    queryKey: ['issue-detail', issueId],
    queryFn: () => fetchIssueDetails(issueId),
    enabled: !!issueId,
  });

  return {
    ...detailQuery,
    issueDetail: detailQuery.data?.data,
    data: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch,
  };
}
