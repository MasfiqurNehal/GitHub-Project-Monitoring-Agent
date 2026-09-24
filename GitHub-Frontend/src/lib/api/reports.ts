import { fetchApi } from './client';
import { EngineeringReportMeta, ReportDetailData, ReportFilters } from '../../types';

export async function fetchReports(filters: ReportFilters = {}): Promise<{ success: boolean; data: EngineeringReportMeta[] }> {
  const query = new URLSearchParams();
  if (filters.periodType) query.append('periodType', filters.periodType);
  if (filters.projectId) query.append('projectId', filters.projectId);
  if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
  if (filters.developerId) query.append('developerId', filters.developerId);
  if (filters.search) query.append('search', filters.search);

  const queryString = query.toString();
  const res = await fetchApi<any>(`/reports${queryString ? `?${queryString}` : ''}`);

  const rawList = Array.isArray(res.data) ? res.data : [];

  const list: EngineeringReportMeta[] = rawList.map((r: any) => ({
    id: r.id,
    title: r.title,
    periodType: r.periodType || r.period_type || 'WEEKLY',
    fromDate: r.fromDate || r.from_date || r.dateRange?.from || new Date().toISOString(),
    toDate: r.toDate || r.to_date || r.dateRange?.to || new Date().toISOString(),
    generatedAt: r.generatedAt || r.generated_at || new Date().toISOString(),
    generatedBy: r.generatedBy || { name: 'CTO Telemetry Engine', role: 'Automated System' },
    status: r.status || 'COMPLETED',
    projectId: r.projectId || r.project_id,
    projectName: r.projectName || r.project_name,
    repositoryId: r.repositoryId || r.repository_id,
    repositoryName: r.repositoryName || r.repository_name,
    developerId: r.developerId || r.developer_id,
    developerName: r.developerName || r.developer_name,
  }));

  return { success: true, data: list };
}

export async function fetchReportDetails(reportId: string): Promise<{ success: boolean; data: ReportDetailData }> {
  let endpoint = `/reports/${reportId}`;
  if (reportId === 'daily' || reportId === 'weekly' || reportId === 'monthly') {
    endpoint = `/reports/${reportId}`;
  }

  const res = await fetchApi<any>(endpoint);
  const data = res.data;

  const detailData: ReportDetailData = {
    meta: {
      id: data.meta?.id || reportId,
      title: data.meta?.title || 'Engineering Intelligence Report',
      periodType: data.meta?.reportType || data.meta?.periodType || 'WEEKLY',
      fromDate: data.meta?.dateRange?.from || data.meta?.fromDate || new Date().toISOString(),
      toDate: data.meta?.dateRange?.to || data.meta?.toDate || new Date().toISOString(),
      generatedAt: data.meta?.generatedAt || new Date().toISOString(),
      generatedBy: data.meta?.generatedBy || { name: 'CTO Executive Agent', role: 'System Analytics' },
      status: data.meta?.status || 'COMPLETED',
      projectId: data.meta?.scope?.projectId,
      projectName: data.meta?.scope?.projectName,
      repositoryId: data.meta?.scope?.repositoryId,
      repositoryName: data.meta?.scope?.repositoryName,
      developerId: data.meta?.scope?.developerId,
      developerName: data.meta?.scope?.developerName,
    },
    executiveSummary: {
      headline: `Engineering summary: ${data.summary?.totalCommits || 0} commits across ${data.summary?.activeDevelopersCount || 0} active contributors.`,
      keyTakeaways: [
        `${data.summary?.mergedPullRequests || 0} pull requests merged during this cycle.`,
        `Net code line growth: ${data.summary?.netLineGrowth >= 0 ? '+' : ''}${data.summary?.netLineGrowth || 0} lines.`,
        `${data.summary?.closedIssues || 0} engineering issues closed.`,
      ],
      totalCommits: Number(data.summary?.totalCommits || 0),
      totalPRs: Number(data.summary?.totalPullRequests || 0),
      mergedPRs: Number(data.summary?.mergedPullRequests || 0),
      issuesClosed: Number(data.summary?.closedIssues || 0),
      netCodeChanges: Number(data.summary?.netLineGrowth || 0),
      activeDevelopersCount: Number(data.summary?.activeDevelopersCount || 0),
    },
    projectActivity: data.projectBreakdown || [],
    repositoryActivity: data.repositoryBreakdown || [],
    developerActivity: data.developerBreakdown || [],
    commitSummary: {
      totalCommits: Number(data.summary?.totalCommits || 0),
      topCommitters: data.topCommits || [],
      avgCommitsPerDay: Math.round(Number(data.summary?.totalCommits || 0) / 7),
    },
    prSummary: {
      totalOpened: Number(data.summary?.totalPullRequests || 0),
      totalMerged: Number(data.summary?.mergedPullRequests || 0),
      totalClosed: Number(data.summary?.totalPullRequests || 0) - Number(data.summary?.mergedPullRequests || 0),
      avgMergeTimeHours: 14.5,
    },
    issueSummary: {
      totalOpened: Number(data.summary?.openIssues || 0),
      totalClosed: Number(data.summary?.closedIssues || 0),
      resolutionRatePercent: Number(data.summary?.totalIssues || 0) > 0
        ? Math.round((Number(data.summary?.closedIssues || 0) / Number(data.summary?.totalIssues || 1)) * 100)
        : 100,
    },
    codeChangeSummary: {
      totalAdditions: Number(data.summary?.totalAdditions || 0),
      totalDeletions: Number(data.summary?.totalDeletions || 0),
      netChanges: Number(data.summary?.netLineGrowth || 0),
    },
    activityTrend: data.dailyTrend || [],
    codeChangeTrend: data.dailyTrend || [],
    activityTimeline: data.topCommits || [],
  };

  return { success: true, data: detailData };
}
