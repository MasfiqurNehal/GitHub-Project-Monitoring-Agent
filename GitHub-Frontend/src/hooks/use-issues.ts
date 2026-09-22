import { useQuery } from '@tanstack/react-query';
import { getIssues, getIssueDetail } from '../features/issues/api';
import { IssueFilters } from '../types';

export function useIssues(filters: IssueFilters = {}) {
  const query = useQuery({
    queryKey: ['issues-list', filters],
    queryFn: () => getIssues(filters),
  });

  return {
    issues: query.data?.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useIssue(issueId: string) {
  const detailQuery = useQuery({
    queryKey: ['issue-detail', issueId],
    queryFn: () => getIssueDetail(issueId),
    enabled: !!issueId,
  });

  return {
    ...detailQuery,
    issueDetail: detailQuery.data?.data,
    issue: detailQuery.data?.data?.issue,
    data: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch,
  };
}

// Alias for backward compatibility
export const useIssueDetail = useIssue;
