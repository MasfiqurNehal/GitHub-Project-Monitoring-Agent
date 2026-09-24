import { ApiResponse } from '../../lib/api/types';
import { PullRequestWithMetrics, PullRequestDetailData } from '../../types';
import { fetchPullRequests, fetchPullRequestDetails } from '../../lib/api/pull-requests';

export async function getPullRequests(filters: {
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  state?: string;
  reviewStatus?: string;
  search?: string;
} = {}): Promise<ApiResponse<PullRequestWithMetrics[]>> {
  return await fetchPullRequests(filters);
}

export async function getPullRequestDetail(pullRequestId: string): Promise<ApiResponse<PullRequestDetailData>> {
  return await fetchPullRequestDetails(pullRequestId);
}
