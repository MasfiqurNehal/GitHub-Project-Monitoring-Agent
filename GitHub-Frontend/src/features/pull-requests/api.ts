import { fetchApi } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
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
  try {
    const query = new URLSearchParams();
    if (filters.projectId) query.append('projectId', filters.projectId);
    if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
    if (filters.developerId) query.append('developerId', filters.developerId);
    if (filters.state) query.append('state', filters.state);
    if (filters.reviewStatus) query.append('reviewStatus', filters.reviewStatus);
    if (filters.search) query.append('search', filters.search);

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.PULL_REQUESTS}${queryString ? `?${queryString}` : ''}`;
    return await fetchApi<PullRequestWithMetrics[]>(endpoint);
  } catch (err) {
    const res = await fetchPullRequests(filters);
    return { success: true, data: res.data };
  }
}

export async function getPullRequestDetail(pullRequestId: string): Promise<ApiResponse<PullRequestDetailData>> {
  try {
    return await fetchApi<PullRequestDetailData>(ENDPOINTS.PULL_REQUEST_DETAIL(pullRequestId));
  } catch (err) {
    const res = await fetchPullRequestDetails(pullRequestId);
    return { success: true, data: res.data };
  }
}
