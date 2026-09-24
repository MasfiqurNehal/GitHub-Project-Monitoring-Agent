import { ApiResponse } from '../../lib/api/types';
import { IssueWithMetrics, IssueDetailData, IssueFilters } from '../../types';
import { fetchIssues, fetchIssueDetails } from '../../lib/api/issues';

export async function getIssues(filters: IssueFilters = {}): Promise<ApiResponse<IssueWithMetrics[]>> {
  return await fetchIssues(filters);
}

export async function getIssueDetail(issueId: string): Promise<ApiResponse<IssueDetailData>> {
  return await fetchIssueDetails(issueId);
}
