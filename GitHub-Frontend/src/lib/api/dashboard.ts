import { fetchApi } from './client';
import { DashboardFilters, DashboardOverview, EngineeringSignals } from '../../types';

export async function fetchDashboardOverview(filters: DashboardFilters = {}): Promise<{ success: boolean; data: DashboardOverview }> {
  const query = new URLSearchParams();
  if (filters.projectId) query.append('projectId', filters.projectId);
  if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
  if (filters.developerId) query.append('developerId', filters.developerId);
  if (filters.activityType) query.append('activityType', filters.activityType);
  if (filters.from) query.append('date_from', filters.from);
  if (filters.to) query.append('date_to', filters.to);
  if (filters.preset) query.append('preset', filters.preset);

  const queryString = query.toString();
  const res = await fetchApi<any>(`/dashboard/overview${queryString ? `?${queryString}` : ''}`);
  
  // Normalize response structure if needed
  const overviewData: DashboardOverview = {
    kpi: res.data?.kpi || {
      totalProjects: 0,
      totalRepositories: 0,
      activeDevelopers: 0,
      totalCommits: 0,
      totalPRs: 0,
      mergedPRs: 0,
      openPRs: 0,
      issuesOpened: 0,
      issuesClosed: 0,
      linesAdded: 0,
      linesDeleted: 0,
      totalReviews: 0,
    },
    activityTrend: res.data?.activityTrend || [],
    codeChangesTrend: res.data?.codeChangesTrend || [],
    issueTrend: res.data?.issueTrend || [],
    developerActivity: (res.data?.developerActivity || []).map((dev: any) => ({
      id: dev.id || dev.developer_id,
      name: dev.name || dev.login || 'Unknown Developer',
      login: dev.login || dev.username || 'unknown',
      avatarUrl: dev.avatarUrl || dev.avatar_url || 'https://github.com/github.png',
      commits: Number(dev.commits || 0),
      prs: Number(dev.prs || dev.pull_requests || 0),
      reviews: Number(dev.reviews || 0),
      linesAdded: Number(dev.linesAdded || dev.additions || 0),
      linesDeleted: Number(dev.linesDeleted || dev.deletions || 0),
    })),
    projectOverview: (res.data?.projectOverview || []).map((p: any) => ({
      id: p.id || p.project_id,
      name: p.name || p.project_name,
      repositoriesCount: Number(p.repositoriesCount || p.repositories_count || 0),
      commitsCount: Number(p.commitsCount || p.commits_count || 0),
      prsCount: Number(p.prsCount || p.prs_count || 0),
      issuesCount: Number(p.issuesCount || p.issues_count || 0),
      status: p.status || 'ACTIVE',
      updatedAt: p.updatedAt || p.updated_at || new Date().toISOString(),
    })),
    repositoryOverview: (res.data?.repositoryOverview || []).map((r: any) => ({
      id: r.id || r.repository_id,
      name: r.name,
      fullName: r.fullName || r.full_name,
      language: r.language || 'TypeScript',
      commitsCount: Number(r.commitsCount || r.commits_count || 0),
      openPRsCount: Number(r.openPRsCount || r.open_prs_count || 0),
      issuesCount: Number(r.issuesCount || r.issues_count || 0),
      lastSyncedAt: r.lastSyncedAt || r.last_synced_at || new Date().toISOString(),
    })),
    recentActivity: (res.data?.recentActivity || []).map((act: any) => ({
      id: act.id,
      type: act.type,
      title: act.title,
      repoName: act.repoName || act.repository || act.repo_name,
      author: act.author || 'system',
      authorAvatar: act.authorAvatar || act.avatar_url,
      timeAgo: act.timeAgo || act.timestamp || 'Recently',
      status: act.status || act.state,
      details: act.details,
    })),
  };

  return { success: true, data: overviewData };
}

export async function fetchEngineeringSignals(): Promise<{ success: boolean; data: EngineeringSignals }> {
  try {
    const res = await fetchApi<any>('/dashboard/signals');
    return {
      success: true,
      data: res.data || { inactiveRepositories: [], stalePullRequests: [] },
    };
  } catch (err) {
    // Return empty signals safely if endpoint is absent
    return {
      success: true,
      data: { inactiveRepositories: [], stalePullRequests: [] },
    };
  }
}
