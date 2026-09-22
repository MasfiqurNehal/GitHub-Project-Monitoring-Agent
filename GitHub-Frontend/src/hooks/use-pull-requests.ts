import { useQuery } from '@tanstack/react-query';
import { getPullRequests, getPullRequestDetail } from '../features/pull-requests/api';

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
    queryFn: () => getPullRequests(filters),
  });

  return {
    pullRequests: query.data?.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function usePullRequest(pullRequestId: string) {
  const detailQuery = useQuery({
    queryKey: ['pull-request-detail', pullRequestId],
    queryFn: () => getPullRequestDetail(pullRequestId),
    enabled: !!pullRequestId,
  });

  return {
    ...detailQuery,
    pullRequestDetail: detailQuery.data?.data,
    pullRequest: detailQuery.data?.data?.pullRequest,
    data: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch,
  };
}

// Alias for backward compatibility
export const usePullRequestDetail = usePullRequest;
