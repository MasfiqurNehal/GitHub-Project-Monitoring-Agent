import { fetchApi } from '../../lib/api/client';
import { ENDPOINTS } from '../../lib/api/endpoints';
import { ApiResponse } from '../../lib/api/types';
import { EngineeringReportMeta, ReportDetailData, ReportFilters } from '../../types';
import { fetchReports, fetchReportDetails } from '../../lib/api/reports';

export async function getReports(filters: ReportFilters = {}): Promise<ApiResponse<EngineeringReportMeta[]>> {
  try {
    const query = new URLSearchParams();
    if (filters.periodType) query.append('periodType', filters.periodType);
    if (filters.projectId) query.append('projectId', filters.projectId);
    if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
    if (filters.developerId) query.append('developerId', filters.developerId);
    if (filters.search) query.append('search', filters.search);

    const queryString = query.toString();
    const endpoint = `${ENDPOINTS.REPORTS}${queryString ? `?${queryString}` : ''}`;
    return await fetchApi<EngineeringReportMeta[]>(endpoint);
  } catch (err) {
    const res = await fetchReports(filters);
    return { success: true, data: res.data };
  }
}

export async function getReportDetail(reportId: string): Promise<ApiResponse<ReportDetailData>> {
  try {
    return await fetchApi<ReportDetailData>(ENDPOINTS.REPORT_DETAIL(reportId));
  } catch (err) {
    const res = await fetchReportDetails(reportId);
    return { success: true, data: res.data };
  }
}
