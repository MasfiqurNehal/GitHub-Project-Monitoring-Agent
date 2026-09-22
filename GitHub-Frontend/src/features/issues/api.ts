import { fetchApi } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { ApiResponse } from '../../lib/api/types';
import { IssueWithMetrics, IssueDetailData, IssueFilters } from '../../types';
import { fetchIssues, fetchIssueDetails } from '../../lib/api/issues';

export async function getIssues(filters: IssueFilters = {}): Promise<ApiResponse<IssueWithMetrics[]>> {
  try {
    const query = new URLSearchParams();
    if (filters.projectId) query.append('projectId', filters.projectId);
    if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
    if (filters.developerId) query.append('developerId', filters.developerId);
    if (filters.state) query.append('state', filters.state);
    if (filters.label) query.append('label', filters.label);
    if (filters.search) query.append('search', filters.search);

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.ISSUES}${queryString ? `?${queryString}` : ''}`;
    return await fetchApi<IssueWithMetrics[]>(endpoint);
  } catch (err) {
    const res = await fetchIssues(filters);
    return { success: true, data: res.data };
  }
}

export async function getIssueDetail(issueId: string): Promise<ApiResponse<IssueDetailData>> {
  try {
    return await fetchApi<IssueDetailData>(ENDPOINTS.ISSUE_DETAIL(issueId));
  } catch (err) {
    const res = await fetchIssueDetails(issueId);
    return { success: true, data: res.data };
  }
}
