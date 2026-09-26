import { pool } from '../db/connection.js';
import { projectRepository } from '../repositories/project.repository.js';
import { repositoryRepository } from '../repositories/repository.repository.js';
import { developerRepository } from '../repositories/developer.repository.js';
import { codeChurnService } from './codeChurn.service.js';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  date?: string;
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  organizationId?: string;
}

export interface ReportMetadata {
  id: string;
  reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PROJECT' | 'REPOSITORY' | 'DEVELOPER' | 'CUSTOM';
  title: string;
  scope: {
    projectId?: string;
    projectName?: string;
    repositoryId?: string;
    repositoryName?: string;
    developerId?: string;
    developerName?: string;
    developerUsername?: string;
  };
  dateRange: {
    from: string;
    to: string;
  };
  generatedAt: string;
  status: 'COMPLETED';
}

export interface ReportFactualSummary {
  totalCommits: number;
  totalPullRequests: number;
  mergedPullRequests: number;
  openPullRequests: number;
  totalIssues: number;
  closedIssues: number;
  openIssues: number;
  totalAdditions: number;
  totalDeletions: number;
  netLineGrowth: number;
  totalReviews: number;
  activeDevelopersCount: number;
  activeRepositoriesCount: number;
}

export interface ReportProjectBreakdown {
  projectId: string;
  projectName: string;
  commits: number;
  additions: number;
  deletions: number;
  pullRequests: number;
  issues: number;
}

export interface ReportRepositoryBreakdown {
  repositoryId: string;
  name: string;
  fullName: string;
  commits: number;
  additions: number;
  deletions: number;
  pullRequests: number;
  issues: number;
  activeDevelopers: number;
}

export interface ReportDeveloperBreakdown {
  developerId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  commits: number;
  additions: number;
  deletions: number;
  pullRequests: number;
  mergedPRs: number;
  reviews: number;
  issues: number;
}

export interface ReportDailyTrend {
  date: string;
  commits: number;
  additions: number;
  deletions: number;
  pullRequests: number;
  reviews: number;
  issues: number;
}

export interface StructuredReport {
  meta: ReportMetadata;
  summary: ReportFactualSummary;
  projectBreakdown: ReportProjectBreakdown[];
  repositoryBreakdown: ReportRepositoryBreakdown[];
  developerBreakdown: ReportDeveloperBreakdown[];
  dailyTrend: ReportDailyTrend[];
  topCommits: any[];
  recentPullRequests: any[];
  recentIssues: any[];
  codeChurnSummary?: any;
}

export class ReportService {
  /**
   * List historical or preset available reports
   */
  async listReports(filters: { periodType?: string; projectId?: string; repositoryId?: string; developerId?: string; search?: string; organizationId?: string }) {

    const now = new Date();
    const reports = [
      {
        id: 'rep-daily-today',
        title: 'Daily Engineering Digest',
        periodType: 'DAILY',
        fromDate: new Date(now.setHours(0,0,0,0)).toISOString(),
        toDate: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
        status: 'COMPLETED',
      },
      {
        id: 'rep-weekly-current',
        title: 'Weekly Sprint Engineering Performance',
        periodType: 'WEEKLY',
        fromDate: new Date(Date.now() - 7 * 86400000).toISOString(),
        toDate: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
        status: 'COMPLETED',
      },
      {
        id: 'rep-monthly-current',
        title: 'Monthly Engineering Velocity Audit',
        periodType: 'MONTHLY',
        fromDate: new Date(Date.now() - 30 * 86400000).toISOString(),
        toDate: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
        status: 'COMPLETED',
      },
    ];

    let result = reports;
    if (filters.periodType && filters.periodType !== 'ALL') {
      result = result.filter((r) => r.periodType === filters.periodType);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q));
    }
    return result;
  }

  /**
   * Core generator method building structured JSON report strictly from database records
   */
  public async buildReport(
    reportType: ReportMetadata['reportType'],
    title: string,
    dFrom: Date,
    dTo: Date,
    filters: ReportFilters,
    scope: ReportMetadata['scope'] = {}
  ): Promise<StructuredReport> {
    const fromIso = dFrom.toISOString();
    const toIso = dTo.toISOString();

    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];
    let pIdx = 1;

    // Date range filter
    whereConditions.push(`c.committed_at >= $${pIdx}`);
    params.push(dFrom);
    pIdx++;

    whereConditions.push(`c.committed_at <= $${pIdx}`);
    params.push(dTo);
    pIdx++;

    if (filters.organizationId) {
      whereConditions.push(`(r.organization_id = $${pIdx} OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $${pIdx}))`);
      params.push(filters.organizationId);
      pIdx++;
    }

    if (filters.projectId || scope.projectId) {
      whereConditions.push(`r.project_id = $${pIdx}`);
      params.push(filters.projectId || scope.projectId);
      pIdx++;
    }

    if (filters.repositoryId || scope.repositoryId) {
      whereConditions.push(`(r.id = $${pIdx} OR r.full_name = $${pIdx} OR r.name = $${pIdx})`);
      params.push(filters.repositoryId || scope.repositoryId);
      pIdx++;
    }

    if (filters.developerId || scope.developerId) {
      whereConditions.push(`(c.developer_id = $${pIdx} OR d.login = $${pIdx})`);
      params.push(filters.developerId || scope.developerId);
      pIdx++;
    }

    const commitWhereSql = `WHERE ${whereConditions.join(' AND ')}`;
    const prWhereSql = commitWhereSql
      .replace(/c\.committed_at/g, 'pr.created_at')
      .replace(/c\.developer_id/g, 'pr.author_developer_id')
      .replace(/c\./g, 'pr.');

    const issueWhereSql = commitWhereSql
      .replace(/c\.committed_at/g, 'i.created_at')
      .replace(/c\.developer_id/g, 'i.author_developer_id')
      .replace(/c\./g, 'i.');

    const prrWhereSql = commitWhereSql
      .replace(/c\.committed_at/g, 'prr.submitted_at')
      .replace(/c\.developer_id/g, 'prr.reviewer_developer_id')
      .replace(/c\./g, 'prr.');

    // Execute all report breakdown, summary, trend, and churn queries concurrently with Promise.all
    const [
      commitsRes,
      prsRes,
      issuesRes,
      reviewsRes,
      projectBreakdownRes,
      repoBreakdownRes,
      devBreakdownRes,
      commitTrendRes,
      prTrendRes,
      topCommitsRes,
      recentPrsRes,
      recentIssuesRes,
      churnData,
    ] = await Promise.all([
      // 1. Commits Summary Query
      pool.query(
        `SELECT 
          COUNT(*) as total_commits,
          COALESCE(SUM(c.additions), 0) as total_additions,
          COALESCE(SUM(c.deletions), 0) as total_deletions,
          COUNT(DISTINCT c.developer_id) as active_devs,
          COUNT(DISTINCT c.repository_id) as active_repos
         FROM commits c
         JOIN repositories r ON c.repository_id = r.id
         LEFT JOIN developers d ON c.developer_id = d.id
         ${commitWhereSql}`,
        params
      ),
      // 2. PRs Summary Query
      pool.query(
        `SELECT 
          COUNT(*) as total_prs,
          COUNT(*) FILTER (WHERE pr.merged = true OR UPPER(pr.state) = 'MERGED') as merged_prs,
          COUNT(*) FILTER (WHERE UPPER(pr.state) = 'OPEN') as open_prs
         FROM pull_requests pr
         JOIN repositories r ON pr.repository_id = r.id
         LEFT JOIN developers d ON pr.author_developer_id = d.id
         ${prWhereSql}`,
        params
      ),
      // 3. Issues Summary Query
      pool.query(
        `SELECT 
          COUNT(*) as total_issues,
          COUNT(*) FILTER (WHERE UPPER(i.state) = 'CLOSED') as closed_issues,
          COUNT(*) FILTER (WHERE UPPER(i.state) = 'OPEN') as open_issues
         FROM issues i
         JOIN repositories r ON i.repository_id = r.id
         LEFT JOIN developers d ON i.author_developer_id = d.id
         ${issueWhereSql}`,
        params
      ),
      // 4. Reviews Summary Query
      pool.query(
        `SELECT 
          COUNT(*) as total_reviews
         FROM pull_request_reviews prr
         JOIN pull_requests pr ON prr.pull_request_id = pr.id
         JOIN repositories r ON pr.repository_id = r.id
         LEFT JOIN developers d ON prr.reviewer_developer_id = d.id
         ${prrWhereSql}`,
        params
      ),
      // 5. Project Breakdown
      pool.query(
        `SELECT 
          p.id as project_id,
          p.name as project_name,
          COUNT(DISTINCT c.id) as commits,
          COALESCE(SUM(c.additions), 0) as additions,
          COALESCE(SUM(c.deletions), 0) as deletions
         FROM projects p
         JOIN repositories r ON r.project_id = p.id
         LEFT JOIN commits c ON c.repository_id = r.id AND c.committed_at >= $1 AND c.committed_at <= $2
         GROUP BY p.id, p.name
         ORDER BY commits DESC`,
        [dFrom, dTo]
      ),
      // 6. Repository Breakdown
      pool.query(
        `SELECT 
          r.id as repository_id,
          r.name,
          r.full_name,
          COUNT(DISTINCT c.id) as commits,
          COALESCE(SUM(c.additions), 0) as additions,
          COALESCE(SUM(c.deletions), 0) as deletions,
          COUNT(DISTINCT c.developer_id) as active_developers
         FROM repositories r
         LEFT JOIN commits c ON c.repository_id = r.id AND c.committed_at >= $1 AND c.committed_at <= $2
         ${scope.projectId ? 'WHERE r.project_id = $3' : ''}
         GROUP BY r.id, r.name, r.full_name
         ORDER BY commits DESC`,
        scope.projectId ? [dFrom, dTo, scope.projectId] : [dFrom, dTo]
      ),
      // 7. Developer Breakdown
      pool.query(
        `SELECT 
          d.id as developer_id,
          d.login as username,
          d.name,
          d.avatar_url,
          COUNT(DISTINCT c.id) as commits,
          COALESCE(SUM(c.additions), 0) as additions,
          COALESCE(SUM(c.deletions), 0) as deletions
         FROM developers d
         JOIN commits c ON c.developer_id = d.id
         JOIN repositories r ON c.repository_id = r.id
         ${commitWhereSql}
         GROUP BY d.id, d.login, d.name, d.avatar_url
         ORDER BY commits DESC, additions DESC`,
        params
      ),
      // 8. Commit Trend
      pool.query(
        `SELECT 
          TO_CHAR(c.committed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date_key,
          COUNT(*) as commits,
          COALESCE(SUM(c.additions), 0) as additions,
          COALESCE(SUM(c.deletions), 0) as deletions
         FROM commits c
         JOIN repositories r ON c.repository_id = r.id
         LEFT JOIN developers d ON c.developer_id = d.id
         ${commitWhereSql}
         GROUP BY date_key`,
        params
      ),
      // 9. PR Trend
      pool.query(
        `SELECT 
          TO_CHAR(pr.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') as date_key,
          COUNT(*) as prs
         FROM pull_requests pr
         JOIN repositories r ON pr.repository_id = r.id
         LEFT JOIN developers d ON pr.author_developer_id = d.id
         ${prWhereSql}
         GROUP BY date_key`,
        params
      ),
      // 10. Top Commits
      pool.query(
        `SELECT 
          c.github_commit_sha as sha,
          c.message,
          c.committed_at as "committedAt",
          c.additions,
          c.deletions,
          COALESCE(d.name, d.login, 'Unknown') as author,
          r.name as repository
         FROM commits c
         JOIN repositories r ON c.repository_id = r.id
         LEFT JOIN developers d ON c.developer_id = d.id
         ${commitWhereSql}
         ORDER BY c.committed_at DESC
         LIMIT 10`,
        params
      ),
      // 11. Recent PRs
      pool.query(
        `SELECT 
          pr.id,
          pr.number,
          pr.title,
          pr.state,
          pr.created_at as "createdAt",
          COALESCE(d.name, d.login, 'Unknown') as author,
          r.name as repository
         FROM pull_requests pr
         JOIN repositories r ON pr.repository_id = r.id
         LEFT JOIN developers d ON pr.author_developer_id = d.id
         ${prWhereSql}
         ORDER BY pr.created_at DESC
         LIMIT 10`,
        params
      ),
      // 12. Recent Issues
      pool.query(
        `SELECT 
          i.id,
          i.number,
          i.title,
          i.state,
          i.created_at as "createdAt",
          COALESCE(d.name, d.login, 'Unknown') as author,
          r.name as repository
         FROM issues i
         JOIN repositories r ON i.repository_id = r.id
         LEFT JOIN developers d ON i.author_developer_id = d.id
         ${issueWhereSql}
         ORDER BY i.created_at DESC
         LIMIT 10`,
        params
      ),
      // 13. Code Churn Summary
      codeChurnService.analyzeCodeChurn({
        projectId: scope.projectId || filters.projectId,
        repositoryId: scope.repositoryId || filters.repositoryId,
        developerId: scope.developerId || filters.developerId,
        dateFrom: fromIso,
        dateTo: toIso,
        limit: 10,
      }).catch(() => null),
    ]);

    const cRow = commitsRes.rows[0] || {};
    const prRow = prsRes.rows[0] || {};
    const iRow = issuesRes.rows[0] || {};
    const rRow = reviewsRes.rows[0] || {};

    const totalCommits = parseInt(cRow.total_commits || 0, 10);
    const totalAdditions = parseInt(cRow.total_additions || 0, 10);
    const totalDeletions = parseInt(cRow.total_deletions || 0, 10);
    const activeDevelopersCount = parseInt(cRow.active_devs || 0, 10);
    const activeRepositoriesCount = parseInt(cRow.active_repos || 0, 10);

    const totalPullRequests = parseInt(prRow.total_prs || 0, 10);
    const mergedPullRequests = parseInt(prRow.merged_prs || 0, 10);
    const openPullRequests = parseInt(prRow.open_prs || 0, 10);

    const totalIssues = parseInt(iRow.total_issues || 0, 10);
    const closedIssues = parseInt(iRow.closed_issues || 0, 10);
    const openIssues = parseInt(iRow.open_issues || 0, 10);

    const totalReviews = parseInt(rRow.total_reviews || 0, 10);

    const summary: ReportFactualSummary = {
      totalCommits,
      totalPullRequests,
      mergedPullRequests,
      openPullRequests,
      totalIssues,
      closedIssues,
      openIssues,
      totalAdditions,
      totalDeletions,
      netLineGrowth: totalAdditions - totalDeletions,
      totalReviews,
      activeDevelopersCount,
      activeRepositoriesCount,
    };

    const projectBreakdown: ReportProjectBreakdown[] = projectBreakdownRes.rows.map((row) => ({
      projectId: row.project_id,
      projectName: row.project_name,
      commits: parseInt(row.commits, 10),
      additions: parseInt(row.additions, 10),
      deletions: parseInt(row.deletions, 10),
      pullRequests: 0,
      issues: 0,
    }));

    const repositoryBreakdown: ReportRepositoryBreakdown[] = repoBreakdownRes.rows.map((row) => ({
      repositoryId: row.repository_id,
      name: row.name,
      fullName: row.full_name,
      commits: parseInt(row.commits, 10),
      additions: parseInt(row.additions, 10),
      deletions: parseInt(row.deletions, 10),
      pullRequests: 0,
      issues: 0,
      activeDevelopers: parseInt(row.active_developers, 10),
    }));

    const developerBreakdown: ReportDeveloperBreakdown[] = devBreakdownRes.rows.map((row) => ({
      developerId: row.developer_id,
      username: row.username,
      name: row.name,
      avatarUrl: row.avatar_url,
      commits: parseInt(row.commits, 10),
      additions: parseInt(row.additions, 10),
      deletions: parseInt(row.deletions, 10),
      pullRequests: 0,
      mergedPRs: 0,
      reviews: 0,
      issues: 0,
    }));

    // 8. Daily Trend
    const dailyMap = new Map<string, ReportDailyTrend>();

    // Seed dates in interval
    const curr = new Date(dFrom);
    while (curr <= dTo) {
      const dateStr = curr.toISOString().split('T')[0];
      dailyMap.set(dateStr, {
        date: dateStr,
        commits: 0,
        additions: 0,
        deletions: 0,
        pullRequests: 0,
        reviews: 0,
        issues: 0,
      });
      curr.setDate(curr.getDate() + 1);
    }

    for (const row of commitTrendRes.rows) {
      if (row.date_key && dailyMap.has(row.date_key)) {
        const item = dailyMap.get(row.date_key)!;
        item.commits = parseInt(row.commits, 10);
        item.additions = parseInt(row.additions, 10);
        item.deletions = parseInt(row.deletions, 10);
      }
    }

    for (const row of prTrendRes.rows) {
      if (row.date_key && dailyMap.has(row.date_key)) {
        dailyMap.get(row.date_key)!.pullRequests = parseInt(row.prs, 10);
      }
    }

    const dailyTrend = Array.from(dailyMap.values());

    const codeChurnSummary = churnData?.summary;

    const reportId = `rep-${reportType.toLowerCase()}-${Date.now()}`;

    return {
      meta: {
        id: reportId,
        reportType,
        title,
        scope,
        dateRange: {
          from: fromIso,
          to: toIso,
        },
        generatedAt: new Date().toISOString(),
        status: 'COMPLETED',
      },
      summary,
      projectBreakdown,
      repositoryBreakdown,
      developerBreakdown,
      dailyTrend,
      topCommits: topCommitsRes.rows,
      recentPullRequests: recentPrsRes.rows,
      recentIssues: recentIssuesRes.rows,
      codeChurnSummary,
    };
  }

  // --- Specific Report Generators ---

  /**
   * Daily Report
   */
  async getDailyReport(filters: ReportFilters): Promise<StructuredReport> {
    let dFrom: Date;
    let dTo: Date;

    const targetDateStr = filters.date || filters.dateFrom;
    if (targetDateStr) {
      dFrom = new Date(targetDateStr);
      if (/^\d{4}-\d{2}-\d{2}$/.test(targetDateStr.trim())) {
        dFrom = new Date(`${targetDateStr.trim()}T00:00:00.000Z`);
        dTo = new Date(`${targetDateStr.trim()}T23:59:59.999Z`);
      } else {
        dTo = filters.dateTo ? new Date(filters.dateTo) : new Date(dFrom.getTime() + 86400000);
      }
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      dFrom = new Date(`${todayStr}T00:00:00.000Z`);
      dTo = new Date(`${todayStr}T23:59:59.999Z`);
    }

    const title = `Daily Engineering Report (${dFrom.toISOString().split('T')[0]})`;
    return this.buildReport('DAILY', title, dFrom, dTo, filters);
  }

  /**
   * Weekly Report
   */
  async getWeeklyReport(filters: ReportFilters): Promise<StructuredReport> {
    let dFrom: Date;
    let dTo: Date;

    if (filters.dateFrom && filters.dateTo) {
      dFrom = new Date(filters.dateFrom);
      dTo = new Date(filters.dateTo);
    } else {
      dTo = new Date();
      dFrom = new Date(dTo.getTime() - 7 * 86400000);
    }

    const title = `Weekly Engineering Performance Report (${dFrom.toISOString().split('T')[0]} to ${dTo.toISOString().split('T')[0]})`;
    return this.buildReport('WEEKLY', title, dFrom, dTo, filters);
  }

  /**
   * Monthly Report
   */
  async getMonthlyReport(filters: ReportFilters): Promise<StructuredReport> {
    let dFrom: Date;
    let dTo: Date;

    if (filters.dateFrom && filters.dateTo) {
      dFrom = new Date(filters.dateFrom);
      dTo = new Date(filters.dateTo);
    } else {
      dTo = new Date();
      dFrom = new Date(dTo.getTime() - 30 * 86400000);
    }

    const title = `Monthly Engineering Velocity & Quality Audit (${dFrom.toISOString().split('T')[0]} to ${dTo.toISOString().split('T')[0]})`;
    return this.buildReport('MONTHLY', title, dFrom, dTo, filters);
  }

  /**
   * Project Report
   */
  async getProjectReport(projectId: string, filters: ReportFilters): Promise<StructuredReport> {
    const project = await projectRepository.findById(projectId, filters.organizationId);
    const projectName = project ? project.name : projectId;

    let dTo = filters.dateTo ? new Date(filters.dateTo) : new Date();
    let dFrom = filters.dateFrom ? new Date(filters.dateFrom) : new Date(dTo.getTime() - 30 * 86400000);

    const title = `Project Engineering Report: ${projectName}`;
    const scope = { projectId, projectName };

    return this.buildReport('PROJECT', title, dFrom, dTo, filters, scope);
  }

  /**
   * Repository Report
   */
  async getRepositoryReport(repositoryId: string, filters: ReportFilters): Promise<StructuredReport> {
    let repo = await repositoryRepository.findById(repositoryId, filters.organizationId);
    if (!repo) {
      repo = await repositoryRepository.findByFullName(repositoryId, filters.organizationId);
    }

    const repoName = repo ? repo.name : repositoryId;
    const fullName = repo ? repo.full_name : repositoryId;
    const realRepoId = repo ? repo.id : repositoryId;

    let dTo = filters.dateTo ? new Date(filters.dateTo) : new Date();
    let dFrom = filters.dateFrom ? new Date(filters.dateFrom) : new Date(dTo.getTime() - 30 * 86400000);

    const title = `Repository Engineering Report: ${repoName}`;
    const scope = { repositoryId: realRepoId, repositoryName: fullName };

    return this.buildReport('REPOSITORY', title, dFrom, dTo, filters, scope);
  }

  /**
   * Developer Report
   */
  async getDeveloperReport(developerId: string, filters: ReportFilters): Promise<StructuredReport> {
    let dev = await developerRepository.findById(developerId, filters.organizationId);
    if (!dev) {
      dev = await developerRepository.findByLogin(developerId, filters.organizationId);
    }

    const devUsername = dev ? dev.login : developerId;
    const devName = dev ? dev.name || dev.login : developerId;
    const realDevId = dev ? dev.id : developerId;

    let dTo = filters.dateTo ? new Date(filters.dateTo) : new Date();
    let dFrom = filters.dateFrom ? new Date(filters.dateFrom) : new Date(dTo.getTime() - 30 * 86400000);

    const title = `Developer Activity & Impact Report: ${devUsername}`;
    const scope = {
      developerId: realDevId,
      developerName: devName,
      developerUsername: devUsername,
    };

    return this.buildReport('DEVELOPER', title, dFrom, dTo, filters, scope);
  }

  /**
   * Legacy generateReport wrapper
   */
  async generateReport(periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM' = 'WEEKLY', projectId?: string, organizationId?: string) {
    if (periodType === 'DAILY') {
      return this.getDailyReport({ projectId, organizationId });
    } else if (periodType === 'MONTHLY') {
      return this.getMonthlyReport({ projectId, organizationId });
    } else if (projectId) {
      return this.getProjectReport(projectId, { organizationId });
    } else {
      return this.getWeeklyReport({ organizationId });
    }
  }
}

export const reportService = new ReportService();

