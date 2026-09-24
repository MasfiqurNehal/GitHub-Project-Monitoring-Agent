import { ApiResponse } from '../../lib/api/types';
import { EngineeringReportMeta, ReportDetailData, ReportFilters } from '../../types';
import { fetchReports, fetchReportDetails } from '../../lib/api/reports';

export async function getReports(filters: ReportFilters = {}): Promise<ApiResponse<EngineeringReportMeta[]>> {
  return await fetchReports(filters);
}

export async function getReportDetail(reportId: string): Promise<ApiResponse<ReportDetailData>> {
  return await fetchReportDetails(reportId);
}
