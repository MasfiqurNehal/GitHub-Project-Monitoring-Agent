import { fetchApi } from './client';
import { 
  EngineeringReportMeta, 
  ReportDetailData, 
  ReportFilters 
} from '../../types';

export const MOCK_REPORTS: EngineeringReportMeta[] = [
  {
    id: 'rep-daily-1',
    title: 'Daily Engineering Digest — 22 Sep 2026',
    periodType: 'DAILY',
    fromDate: '2026-09-22',
    toDate: '2026-09-22',
    generatedAt: '2026-09-22T08:00:00Z',
    generatedBy: {
      name: 'CTO Telemetry Engine',
      role: 'Automated System',
    },
    status: 'COMPLETED',
  },
  {
    id: 'rep-weekly-1',
    title: 'Weekly Sprint Engineering Performance — Sep W3 2026',
    periodType: 'WEEKLY',
    fromDate: '2026-09-15',
    toDate: '2026-09-22',
    generatedAt: '2026-09-22T06:00:00Z',
    generatedBy: {
      name: 'CTO Telemetry Engine',
      role: 'Automated System',
    },
    projectName: 'BeyondAI Core Platform',
    status: 'COMPLETED',
  },
  {
    id: 'rep-monthly-1',
    title: 'Monthly CTO Engineering Velocity & Quality Audit — Aug 2026',
    periodType: 'MONTHLY',
    fromDate: '2026-08-01',
    toDate: '2026-08-31',
    generatedAt: '2026-09-01T00:00:00Z',
    generatedBy: {
      name: 'Masfiqur Nehal',
      role: 'Chief Technology Officer',
    },
    status: 'COMPLETED',
  },
  {
    id: 'rep-custom-1',
    title: 'Custom Audit: BeyondAI OAuth & Gateway Security Sprint',
    periodType: 'CUSTOM',
    fromDate: '2026-09-10',
    toDate: '2026-09-21',
    generatedAt: '2026-09-21T18:00:00Z',
    generatedBy: {
      name: 'Alex Mercer',
      role: 'Staff Tech Lead',
    },
    repositoryName: 'BetopiaLtd/beyondAI-backend',
    status: 'COMPLETED',
  },
];

export async function fetchReports(filters: ReportFilters = {}): Promise<{ success: boolean; data: EngineeringReportMeta[] }> {
  try {
    const query = new URLSearchParams();
    if (filters.periodType) query.append('periodType', filters.periodType);
    if (filters.projectId) query.append('projectId', filters.projectId);
    if (filters.repositoryId) query.append('repositoryId', filters.repositoryId);
    if (filters.developerId) query.append('developerId', filters.developerId);
    if (filters.search) query.append('search', filters.search);

    const queryString = query.toString();
    const res = await fetchApi<EngineeringReportMeta[]>(`/reports${queryString ? `?${queryString}` : ''}`);
    return { success: true, data: res.data || [] };
  } catch (err) {
    let list = [...MOCK_REPORTS];

    if (filters.periodType) {
      list = list.filter((r) => r.periodType === filters.periodType);
    }
    if (filters.projectId) {
      list = list.filter((r) => r.projectId === filters.projectId);
    }
    if (filters.repositoryId) {
      list = list.filter((r) => r.repositoryId === filters.repositoryId);
    }
    if (filters.developerId) {
      list = list.filter((r) => r.developerId === filters.developerId);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.periodType.toLowerCase().includes(q) ||
          (r.projectName && r.projectName.toLowerCase().includes(q))
      );
    }

    return { success: true, data: list };
  }
}

export async function fetchReportDetails(reportId: string): Promise<{ success: boolean; data: ReportDetailData }> {
  try {
    return await fetchApi<ReportDetailData>(`/reports/${reportId}`);
  } catch (err) {
    const foundReport = MOCK_REPORTS.find((r) => r.id === reportId) || MOCK_REPORTS[0];

    const mockDetailData: ReportDetailData = {
      meta: foundReport,
      executiveSummary: {
        headline: 'Overall engineering momentum remains high across 3 active repositories, driven by OAuth PKCE authentication implementation and Recharts monitoring dashboard release.',
        keyTakeaways: [
          'Pull Request review cycle latency decreased by 34% (avg 4.2 hours to review).',
          'Database connection pool tuning resolved high-concurrency P99 latency spikes.',
          'Zero critical security vulnerabilities detected in API Gateway sliding window rate limiter.',
          'Active developer contribution spread: 4 active engineers across 18 PR merges.',
        ],
        totalCommits: 48,
        totalPRs: 18,
        mergedPRs: 14,
        issuesClosed: 12,
        netCodeChanges: 3420,
        activeDevelopersCount: 4,
      },
      projectActivity: [
        {
          id: 'proj-1',
          name: 'BeyondAI Core Platform',
          repositoriesCount: 2,
          commitsCount: 32,
          prsCount: 12,
          issuesCount: 8,
          linesChanged: 2840,
        },
        {
          id: 'proj-2',
          name: 'Enosis Enterprise Suite',
          repositoriesCount: 1,
          commitsCount: 16,
          prsCount: 6,
          issuesCount: 4,
          linesChanged: 980,
        },
      ],
      repositoryActivity: [
        {
          id: 'repo-1',
          fullName: 'BetopiaLtd/beyondAI-backend',
          commitsCount: 20,
          prsCount: 7,
          issuesCount: 5,
          linesAdded: 1650,
          linesDeleted: 420,
        },
        {
          id: 'repo-2',
          fullName: 'BetopiaLtd/beyondAI-new-website',
          commitsCount: 12,
          prsCount: 5,
          issuesCount: 3,
          linesAdded: 980,
          linesDeleted: 150,
        },
        {
          id: 'repo-3',
          fullName: 'BetopiaLtd/enosis-api-gateway',
          commitsCount: 16,
          prsCount: 6,
          issuesCount: 4,
          linesAdded: 740,
          linesDeleted: 220,
        },
      ],
      developerActivity: [
        {
          id: 'dev-1',
          name: 'Alex Mercer',
          login: 'alex_m',
          avatarUrl: 'https://github.com/github.png',
          commits: 18,
          prs: 6,
          reviews: 8,
          linesAdded: 1420,
          linesDeleted: 310,
        },
        {
          id: 'dev-2',
          name: 'Sarah Chen',
          login: 'sarah_dev',
          avatarUrl: 'https://github.com/github.png',
          commits: 14,
          prs: 5,
          reviews: 6,
          linesAdded: 1100,
          linesDeleted: 180,
        },
        {
          id: 'dev-3',
          name: 'John Doe',
          login: 'johndoe',
          avatarUrl: 'https://github.com/github.png',
          commits: 16,
          prs: 7,
          reviews: 5,
          linesAdded: 850,
          linesDeleted: 300,
        },
      ],
      commitSummary: {
        totalCommits: 48,
        topCommitters: [
          { login: 'alex_m', count: 18 },
          { login: 'johndoe', count: 16 },
          { login: 'sarah_dev', count: 14 },
        ],
        avgCommitsPerDay: 6.8,
      },
      prSummary: {
        totalOpened: 18,
        totalMerged: 14,
        totalClosed: 2,
        avgMergeTimeHours: 4.2,
      },
      issueSummary: {
        totalOpened: 15,
        totalClosed: 12,
        resolutionRatePercent: 80,
      },
      codeChangeSummary: {
        totalAdditions: 3370,
        totalDeletions: 790,
        netChanges: 2580,
      },
      activityTrend: [
        { date: 'Sep 16', commits: 6, prs: 2, reviews: 3 },
        { date: 'Sep 17', commits: 8, prs: 3, reviews: 4 },
        { date: 'Sep 18', commits: 5, prs: 1, reviews: 2 },
        { date: 'Sep 19', commits: 10, prs: 4, reviews: 5 },
        { date: 'Sep 20', commits: 7, prs: 2, reviews: 3 },
        { date: 'Sep 21', commits: 9, prs: 3, reviews: 4 },
        { date: 'Sep 22', commits: 3, prs: 3, reviews: 2 },
      ],
      codeChangeTrend: [
        { date: 'Sep 16', additions: 450, deletions: 110 },
        { date: 'Sep 17', additions: 620, deletions: 180 },
        { date: 'Sep 18', additions: 310, deletions: 90 },
        { date: 'Sep 19', additions: 890, deletions: 210 },
        { date: 'Sep 20', additions: 440, deletions: 80 },
        { date: 'Sep 21', additions: 520, deletions: 120 },
        { date: 'Sep 22', additions: 140, deletions: 0 },
      ],
      activityTimeline: [
        {
          id: 'tl-rep-1',
          date: '2026-09-22',
          displayDate: '22 Sep',
          time: '08:18',
          type: 'pull_request',
          title: 'PR #142 Merged: Implement OAuth authentication & token refresh flow',
          repoName: 'BetopiaLtd/beyondAI-backend',
          additions: 520,
          deletions: 180,
          prNumber: 142,
          status: 'MERGED',
        },
        {
          id: 'tl-rep-2',
          date: '2026-09-22',
          displayDate: '22 Sep',
          time: '07:15',
          type: 'review',
          title: 'Reviewed PR #142 (Approved by Alex Mercer)',
          repoName: 'BetopiaLtd/beyondAI-backend',
          prNumber: 142,
          status: 'APPROVED',
        },
        {
          id: 'tl-rep-3',
          date: '2026-09-21',
          displayDate: '21 Sep',
          time: '14:30',
          type: 'commit',
          title: 'Commit a1b2c3d: feat: add GitHub webhook payload validator middleware',
          repoName: 'BetopiaLtd/beyondAI-backend',
          additions: 145,
          deletions: 22,
        },
        {
          id: 'tl-rep-4',
          date: '2026-09-20',
          displayDate: '20 Sep',
          time: '16:45',
          type: 'issue',
          title: 'Issue #103 Closed: Redis cache eviction strategy causes stale session tokens',
          repoName: 'BetopiaLtd/enosis-api-gateway',
          issueNumber: 103,
          status: 'CLOSED',
        },
      ],
    };

    return { success: true, data: mockDetailData };
  }
}
