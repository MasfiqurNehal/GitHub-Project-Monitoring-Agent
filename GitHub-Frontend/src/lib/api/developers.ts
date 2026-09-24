import { fetchApi } from './client';
import { DeveloperWithMetrics, DeveloperDetailData } from '../../types';

export async function fetchDevelopers(filters: {
  projectId?: string;
  repositoryId?: string;
  search?: string;
} = {}): Promise<{ success: boolean; data: DeveloperWithMetrics[] }> {
  const query = new URLSearchParams();
  if (filters.projectId) query.append('projectId', filters.projectId);
  if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
  if (filters.search) query.append('search', filters.search);

  const queryString = query.toString();
  const res = await fetchApi<any[]>(`/developers${queryString ? `?${queryString}` : ''}`);

  const rawList = Array.isArray(res.data) ? res.data : [];

  const developers: DeveloperWithMetrics[] = rawList.map((d: any) => ({
    id: d.id,
    githubUserId: d.githubUserId || d.github_user_id || 0,
    login: d.login || d.username || 'unknown',
    name: d.name || d.login || 'Developer',
    email: d.email || null,
    avatarUrl: d.avatarUrl || d.avatar_url || 'https://github.com/github.png',
    profileUrl: d.profileUrl || `https://github.com/${d.login || d.username || ''}`,
    createdAt: d.createdAt || d.created_at || new Date().toISOString(),
    updatedAt: d.updatedAt || d.updated_at || new Date().toISOString(),
    metrics: {
      projectsCount: Number(d.metrics?.projectsCount || d.projects_count || d.projects?.length || 1),
      repositoriesCount: Number(d.metrics?.repositoriesCount || d.repositories_count || d.repositories?.length || 1),
      commitsCount: Number(d.metrics?.commitsCount || d.commits_count || d.commits || 0),
      prsCount: Number(d.metrics?.prsCount || d.prs_count || d.prs || d.pull_requests || 0),
      reviewsCount: Number(d.metrics?.reviewsCount || d.reviews_count || d.reviews || 0),
      issuesCount: Number(d.metrics?.issuesCount || d.issues_count || d.issues || 0),
      linesAdded: Number(d.metrics?.linesAdded || d.lines_added || d.additions || 0),
      linesDeleted: Number(d.metrics?.linesDeleted || d.lines_deleted || d.deletions || 0),
      lastActivityAt: d.metrics?.lastActivityAt || d.metrics?.lastActiveAt || d.last_active_at || d.updated_at || new Date().toISOString(),
    },
    repositories: (d.repositories || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.fullName || r.full_name,
    })),
    projects: (d.projects || []).map((p: any) => ({
      id: p.id,
      name: p.name,
    })),
  }));

  return { success: true, data: developers };
}

export async function fetchDeveloperDetails(developerId: string): Promise<{ success: boolean; data: DeveloperDetailData }> {
  const res = await fetchApi<any>(`/developers/${developerId}`);
  const dev = res.data?.developer || res.data;

  const developer: DeveloperWithMetrics = {
    id: dev.id,
    githubUserId: dev.githubUserId || dev.github_user_id || 0,
    login: dev.login || dev.username || 'unknown',
    name: dev.name || dev.login || 'Developer',
    email: dev.email || null,
    avatarUrl: dev.avatarUrl || dev.avatar_url || 'https://github.com/github.png',
    profileUrl: dev.profileUrl || `https://github.com/${dev.login || dev.username || ''}`,
    createdAt: dev.createdAt || dev.created_at || new Date().toISOString(),
    updatedAt: dev.updatedAt || dev.updated_at || new Date().toISOString(),
    metrics: {
      projectsCount: Number(dev.metrics?.projectsCount || dev.projects_count || dev.projects?.length || 1),
      repositoriesCount: Number(dev.metrics?.repositoriesCount || dev.repositories_count || dev.repositories?.length || 1),
      commitsCount: Number(dev.metrics?.commitsCount || dev.commits_count || dev.commits || 0),
      prsCount: Number(dev.metrics?.prsCount || dev.prs_count || dev.prs || dev.pull_requests || 0),
      reviewsCount: Number(dev.metrics?.reviewsCount || dev.reviews_count || dev.reviews || 0),
      issuesCount: Number(dev.metrics?.issuesCount || dev.issues_count || dev.issues || 0),
      linesAdded: Number(dev.metrics?.linesAdded || dev.lines_added || dev.additions || 0),
      linesDeleted: Number(dev.metrics?.linesDeleted || dev.lines_deleted || dev.deletions || 0),
      lastActivityAt: dev.metrics?.lastActivityAt || dev.metrics?.lastActiveAt || dev.last_active_at || dev.updated_at || new Date().toISOString(),
    },
    repositories: dev.repositories || [],
    projects: dev.projects || [],
  };

  const detailData: DeveloperDetailData = {
    developer,
    commitStats: res.data?.commitStats || {
      totalCommits: developer.metrics.commitsCount,
      avgAdditionsPerCommit: Math.round(developer.metrics.linesAdded / (developer.metrics.commitsCount || 1)),
      topRepo: developer.repositories[0]?.name || 'Primary Repository',
      commitsByDay: [],
    },
    prStats: res.data?.prStats || {
      totalPRs: developer.metrics.prsCount,
      openPRs: 1,
      mergedPRs: Math.max(0, developer.metrics.prsCount - 1),
      closedPRs: 0,
    },
    reviewStats: res.data?.reviewStats || {
      totalReviews: developer.metrics.reviewsCount,
      approved: developer.metrics.reviewsCount,
      changesRequested: 0,
      commented: 0,
    },
    issueStats: res.data?.issueStats || {
      totalIssues: developer.metrics.issuesCount,
      opened: developer.metrics.issuesCount,
      closed: developer.metrics.issuesCount,
    },
    codeChangeStats: res.data?.codeChangeStats || {
      totalAdditions: developer.metrics.linesAdded,
      totalDeletions: developer.metrics.linesDeleted,
      netChanges: developer.metrics.linesAdded - developer.metrics.linesDeleted,
      trend: [],
    },
    activityTimeline: (res.data?.activityTimeline || res.data?.activity || []).map((act: any) => ({
      id: act.id || `act-${Math.random()}`,
      date: act.date || new Date().toISOString().split('T')[0],
      displayDate: act.displayDate || act.date || 'Recent',
      time: act.time || '12:00',
      type: act.type || 'commit',
      title: act.title || act.message || 'Activity',
      repoName: act.repoName || act.repository || 'repo',
      url: act.url || act.commit_url,
      linesAdded: act.linesAdded || act.additions,
      linesDeleted: act.linesDeleted || act.deletions,
    })),
    activityDistribution: res.data?.activityDistribution || [],
  };

  return { success: true, data: detailData };
}

export async function fetchFactualDeveloperAnalytics(developerId: string, filters: Record<string, string> = {}): Promise<{ success: boolean; data: any }> {
  const query = new URLSearchParams(filters).toString();
  return await fetchApi<any>(`/analytics/developers/${developerId}${query ? `?${query}` : ''}`);
}
