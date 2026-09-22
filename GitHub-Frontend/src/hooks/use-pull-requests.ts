import { useQuery } from '@tanstack/react-query';
import { fetchPullRequests, fetchPullRequestDetails } from '../lib/api/pull-requests';

export function usePullRequests(filters: {
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  state?: string;
  reviewStatus?: string;
  search?: string;
} = {}) {
  const query = useQuery({
    queryKey: ['pull-requests-list', filters],
    queryFn: () => fetchPullRequests(filters),
  });

  return {
    pullRequests: query.data?.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function usePullRequestDetail(pullRequestId: string) {
  const detailQuery = useQuery({
    queryKey: ['pull-request-detail', pullRequestId],
    queryFn: () => fetchPullRequestDetails(pullRequestId),
    enabled: !!pullRequestId,
  });

  return {
    ...detailQuery,
    pullRequestDetail: detailQuery.data?.data,
    data: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch,
  };
}
