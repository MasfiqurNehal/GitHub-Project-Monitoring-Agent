import { pool } from '../db/connection.js';

export interface DashboardFilters {
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class AnalyticsService {
  // Helper to build parameterized SQL WHERE clause based on filters
  private buildCommitWhere(filters: DashboardFilters) {
    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (filters.repositoryId) {
      conditions.push(`(c.repository_id = $${pIdx} OR r.full_name = $${pIdx} OR r.name = $${pIdx})`);
      params.push(filters.repositoryId);
      pIdx++;
    }

    if (filters.projectId) {
      conditions.push(`r.project_id = $${pIdx}`);
      params.push(filters.projectId);
      pIdx++;
    }

    if (filters.developerId) {
      conditions.push(`(c.developer_id = $${pIdx} OR d.login = $${pIdx})`);
      params.push(filters.developerId);
      pIdx++;
    }

    if (filters.dateFrom) {
      conditions.push(`c.committed_at >= $${pIdx}`);
      params.push(new Date(filters.dateFrom));
      pIdx++;
    }

    if (filters.dateTo) {
      conditions.push(`c.committed_at <= $${pIdx}`);
      params.push(new Date(filters.dateTo));
      pIdx++;
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereSql, params };
  }

  // 1. Overview API
  async getDashboardOverview(filters: DashboardFilters) {
    const { whereSql: commitWhere, params: commitParams } = this.buildCommitWhere(filters);
    const prWhere = commitWhere.replace(/c\.committed_at/g, 'pr.created_at').replace(/c\./g, 'pr.');
    const issueWhere = commitWhere.replace(/c\.committed_at/g, 'i.created_at').replace(/c\./g, 'i.');
    const prrWhere = commitWhere.replace(/c\.committed_at/g, 'prr.submitted_at').replace(/c\./g, 'prr.');

    // 1. KPI Counts
    const projectsRes = await pool.query('SELECT COUNT(*) FROM projects');
    const reposRes = await pool.query('SELECT COUNT(*) FROM repositories');

    const commitsRes = await pool.query(
      `SELECT 
        COUNT(*) as total_commits, 
        COALESCE(SUM(c.additions), 0) as lines_added, 
        COALESCE(SUM(c.deletions), 0) as lines_deleted,
        COUNT(DISTINCT c.developer_id) as active_devs
       FROM commits c
       JOIN repositories r ON r.id = c.repository_id
       LEFT JOIN developers d ON d.id = c.developer_id
       ${commitWhere}`,
      commitParams
    );

    const prsRes = await pool.query(
      `SELECT 
        COUNT(*) as total_prs,
        COUNT(*) FILTER (WHERE pr.merged = true OR UPPER(pr.state) = 'MERGED') as merged_prs,
        COUNT(*) FILTER (WHERE UPPER(pr.state) = 'OPEN') as open_prs
       FROM pull_requests pr
       JOIN repositories r ON r.id = pr.repository_id
       LEFT JOIN developers d ON d.id = pr.author_developer_id
       ${prWhere}`,
      commitParams
    );

    const issuesRes = await pool.query(
      `SELECT 
        COUNT(*) as issues_opened,
        COUNT(*) FILTER (WHERE UPPER(i.state) = 'CLOSED') as issues_closed
       FROM issues i
       JOIN repositories r ON r.id = i.repository_id
       LEFT JOIN developers d ON d.id = i.author_developer_id
       ${issueWhere}`,
      commitParams
    );

    const reviewsRes = await pool.query(
      `SELECT COUNT(*) as total_reviews
       FROM pull_request_reviews prr
       JOIN pull_requests pr ON pr.id = prr.pull_request_id
       JOIN repositories r ON r.id = pr.repository_id
       LEFT JOIN developers d ON d.id = prr.reviewer_developer_id
       ${prrWhere}`,
      commitParams
    );

    const cRow = commitsRes.rows[0] || {};
    const pRow = prsRes.rows[0] || {};
    const iRow = issuesRes.rows[0] || {};
    const rRow = reviewsRes.rows[0] || {};

    const kpi = {
      totalProjects: parseInt(projectsRes.rows[0]?.count || '0', 10),
      totalRepositories: parseInt(reposRes.rows[0]?.count || '0', 10),
      activeDevelopers: parseInt(cRow.active_devs || '0', 10),
      totalCommits: parseInt(cRow.total_commits || '0', 10),
      totalPRs: parseInt(pRow.total_prs || '0', 10),
      mergedPRs: parseInt(pRow.merged_prs || '0', 10),
      openPRs: parseInt(pRow.open_prs || '0', 10),
      issuesOpened: parseInt(iRow.issues_opened || '0', 10),
      issuesClosed: parseInt(iRow.issues_closed || '0', 10),
      linesAdded: parseInt(cRow.lines_added || '0', 10),
      linesDeleted: parseInt(cRow.lines_deleted || '0', 10),
      totalReviews: parseInt(rRow.total_reviews || '0', 10),
    };

    // 2. Activity Trend (commits, prs, reviews by date)
    const commitTrendRes = await pool.query(
      `SELECT TO_CHAR(c.committed_at, 'YYYY-MM-DD') as date, COUNT(*) as commits
       FROM commits c
       JOIN repositories r ON r.id = c.repository_id
       LEFT JOIN developers d ON d.id = c.developer_id
       ${commitWhere}
       GROUP BY TO_CHAR(c.committed_at, 'YYYY-MM-DD')
       ORDER BY date ASC LIMIT 30`,
      commitParams
    );

    const prTrendRes = await pool.query(
      `SELECT TO_CHAR(pr.created_at, 'YYYY-MM-DD') as date, COUNT(*) as prs
       FROM pull_requests pr
       JOIN repositories r ON r.id = pr.repository_id
       LEFT JOIN developers d ON d.id = pr.author_developer_id
       ${prWhere}
       GROUP BY TO_CHAR(pr.created_at, 'YYYY-MM-DD')
       ORDER BY date ASC LIMIT 30`,
      commitParams
    );

    const reviewTrendRes = await pool.query(
      `SELECT TO_CHAR(prr.submitted_at, 'YYYY-MM-DD') as date, COUNT(*) as reviews
       FROM pull_request_reviews prr
       JOIN pull_requests pr ON pr.id = prr.pull_request_id
       JOIN repositories r ON r.id = pr.repository_id
       LEFT JOIN developers d ON d.id = prr.reviewer_developer_id
       ${prrWhere}
       GROUP BY TO_CHAR(prr.submitted_at, 'YYYY-MM-DD')
       ORDER BY date ASC LIMIT 30`,
      commitParams
    );

    const trendMap = new Map<string, { date: string; commits: number; prs: number; reviews: number }>();
    for (const r of commitTrendRes.rows) {
      trendMap.set(r.date, { date: r.date, commits: parseInt(r.commits, 10), prs: 0, reviews: 0 });
    }
    for (const r of prTrendRes.rows) {
      const existing = trendMap.get(r.date) || { date: r.date, commits: 0, prs: 0, reviews: 0 };
      existing.prs = parseInt(r.prs, 10);
      trendMap.set(r.date, existing);
    }
    for (const r of reviewTrendRes.rows) {
      const existing = trendMap.get(r.date) || { date: r.date, commits: 0, prs: 0, reviews: 0 };
      existing.reviews = parseInt(r.reviews, 10);
      trendMap.set(r.date, existing);
    }
    const activityTrend = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 3. Code Changes Trend
    const codeChangesRes = await pool.query(
      `SELECT 
        TO_CHAR(c.committed_at, 'YYYY-MM-DD') as date,
        COALESCE(SUM(c.additions), 0) as additions,
        COALESCE(SUM(c.deletions), 0) as deletions
       FROM commits c
       JOIN repositories r ON r.id = c.repository_id
       LEFT JOIN developers d ON d.id = c.developer_id
       ${commitWhere}
       GROUP BY TO_CHAR(c.committed_at, 'YYYY-MM-DD')
       ORDER BY date ASC LIMIT 30`,
      commitParams
    );
    const codeChangesTrend = codeChangesRes.rows.map((r) => ({
      date: r.date,
      additions: parseInt(r.additions, 10),
      deletions: parseInt(r.deletions, 10),
    }));

    // 4. Issue Trend
    const issueTrendRes = await pool.query(
      `SELECT 
        TO_CHAR(i.created_at, 'YYYY-MM-DD') as date,
        COUNT(*) FILTER (WHERE UPPER(i.state) = 'OPEN') as opened,
        COUNT(*) FILTER (WHERE UPPER(i.state) = 'CLOSED') as closed
       FROM issues i
       JOIN repositories r ON r.id = i.repository_id
       LEFT JOIN developers d ON d.id = i.author_developer_id
       ${issueWhere}
       GROUP BY TO_CHAR(i.created_at, 'YYYY-MM-DD')
       ORDER BY date ASC LIMIT 30`,
      commitParams
    );
    const issueTrend = issueTrendRes.rows.map((r) => ({
      date: r.date,
      opened: parseInt(r.opened, 10),
      closed: parseInt(r.closed, 10),
    }));

    // 5. Developer Activity
    const devActRes = await pool.query(
      `SELECT 
        d.id,
        d.name,
        d.login,
        d.avatar_url,
        COUNT(DISTINCT c.id) as commits,
        COUNT(DISTINCT pr.id) as prs,
        COUNT(DISTINCT prr.id) as reviews,
        COALESCE(SUM(c.additions), 0) as lines_added,
        COALESCE(SUM(c.deletions), 0) as lines_deleted
       FROM developers d
       LEFT JOIN commits c ON c.developer_id = d.id
       LEFT JOIN pull_requests pr ON pr.author_developer_id = d.id
       LEFT JOIN pull_request_reviews prr ON prr.reviewer_developer_id = d.id
       GROUP BY d.id, d.name, d.login, d.avatar_url
       ORDER BY commits DESC
       LIMIT 10`
    );
    const developerActivity = devActRes.rows.map((r) => ({
      id: r.id,
      name: r.name || r.login,
      login: r.login,
      avatarUrl: r.avatar_url || undefined,
      commits: parseInt(r.commits, 10),
      prs: parseInt(r.prs, 10),
      reviews: parseInt(r.reviews, 10),
      linesAdded: parseInt(r.lines_added, 10),
      linesDeleted: parseInt(r.lines_deleted, 10),
    }));

    // 6. Project Overview
    const projOverviewRes = await pool.query(
      `SELECT 
        p.id,
        p.name,
        p.status,
        p.updated_at,
        COUNT(DISTINCT r.id) as repositories_count,
        COUNT(DISTINCT c.id) as commits_count,
        COUNT(DISTINCT pr.id) as prs_count,
        COUNT(DISTINCT i.id) as issues_count
       FROM projects p
       LEFT JOIN repositories r ON r.project_id = p.id
       LEFT JOIN commits c ON c.repository_id = r.id
       LEFT JOIN pull_requests pr ON pr.repository_id = r.id
       LEFT JOIN issues i ON i.repository_id = r.id
       GROUP BY p.id, p.name, p.status, p.updated_at
       ORDER BY p.updated_at DESC`
    );
    const projectOverview = projOverviewRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      repositoriesCount: parseInt(r.repositories_count, 10),
      commitsCount: parseInt(r.commits_count, 10),
      prsCount: parseInt(r.prs_count, 10),
      issuesCount: parseInt(r.issues_count, 10),
      status: r.status || 'ACTIVE',
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    }));

    // 7. Repository Overview
    const repoOverview = (await this.getDashboardRepositories(filters)).repositories.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.fullName,
      language: r.language,
      commitsCount: r.commitsCount,
      openPRsCount: r.openPRsCount,
      issuesCount: r.openIssuesCount,
      lastSyncedAt: r.lastSyncedAt ? new Date(r.lastSyncedAt).toISOString() : null,
    }));

    // 8. Recent Activity
    const activityFeedRes = await pool.query(
      `SELECT 
        ae.id, ae.event_type as type, ae.occurred_at, ae.metadata,
        r.name as repo_name, d.login as author, d.avatar_url as author_avatar
       FROM activity_events ae
       JOIN repositories r ON r.id = ae.repository_id
       LEFT JOIN developers d ON d.id = ae.developer_id
       ORDER BY ae.occurred_at DESC
       LIMIT 10`
    );

    let recentActivity = activityFeedRes.rows.map((r) => ({
      id: r.id,
      type: (r.type === 'push' || r.type === 'commit' ? 'commit' : r.type.includes('pr') ? 'pull_request' : r.type.includes('issue') ? 'issue' : 'review') as any,
      title: r.metadata?.message || r.metadata?.title || `Event: ${r.type}`,
      repoName: r.repo_name,
      author: r.author || 'System',
      authorAvatar: r.author_avatar || undefined,
      timeAgo: r.occurred_at ? new Date(r.occurred_at).toLocaleDateString() : 'recently',
      status: r.metadata?.state,
      url: r.metadata?.url,
    }));

    if (recentActivity.length === 0) {
      const recentCommitsRes = await pool.query(
        `SELECT c.id, c.message, c.committed_at, c.commit_url, r.name as repo_name, d.login as author, d.avatar_url as author_avatar, c.additions, c.deletions
         FROM commits c
         JOIN repositories r ON r.id = c.repository_id
         LEFT JOIN developers d ON d.id = c.developer_id
         ORDER BY c.committed_at DESC
         LIMIT 10`
      );
      recentActivity = recentCommitsRes.rows.map((c) => ({
        id: c.id,
        type: 'commit',
        title: c.message,
        repoName: c.repo_name,
        author: c.author || 'Developer',
        authorAvatar: c.author_avatar || undefined,
        timeAgo: c.committed_at ? new Date(c.committed_at).toLocaleDateString() : 'recently',
        details: `+${c.additions} / -${c.deletions} lines`,
        url: c.commit_url,
      }));
    }

    return {
      kpi,
      activityTrend,
      codeChangesTrend,
      issueTrend,
      developerActivity,
      projectOverview,
      repositoryOverview: repoOverview,
      recentActivity,
    };
  }

  // 2. Activity Dashboard API
  async getDashboardActivity(filters: DashboardFilters) {
    const { whereSql, params } = this.buildCommitWhere(filters);

    const trendRes = await pool.query(
      `SELECT 
        TO_CHAR(c.committed_at, 'YYYY-MM-DD') as date,
        COUNT(*) as commits
       FROM commits c
       JOIN repositories r ON r.id = c.repository_id
       LEFT JOIN developers d ON d.id = c.developer_id
       ${whereSql}
       GROUP BY TO_CHAR(c.committed_at, 'YYYY-MM-DD')
       ORDER BY date ASC`,
      params
    );

    const activityFeedRes = await pool.query(
      `SELECT 
        ae.id, ae.event_type as type, ae.occurred_at, ae.metadata,
        r.name as repo_name, d.login as author, d.avatar_url as author_avatar
       FROM activity_events ae
       JOIN repositories r ON r.id = ae.repository_id
       LEFT JOIN developers d ON d.id = ae.developer_id
       ${whereSql.replace(/c\.committed_at/g, 'ae.occurred_at').replace(/c\./g, 'ae.')}
       ORDER BY ae.occurred_at DESC
       LIMIT 20`,
      params
    );

    return {
      trend: trendRes.rows.map((row) => ({
        date: row.date,
        commits: parseInt(row.commits, 10),
      })),
      recentActivity: activityFeedRes.rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.metadata?.message || r.metadata?.title || `Event: ${r.type}`,
        repoName: r.repo_name,
        author: r.author || 'System',
        authorAvatar: r.author_avatar,
        occurredAt: r.occurred_at,
      })),
    };
  }

  // 3. Commits Dashboard API
  async getDashboardCommits(filters: DashboardFilters) {
    const { whereSql, params } = this.buildCommitWhere(filters);

    const summaryRes = await pool.query(
      `SELECT 
        COUNT(*) as total_commits,
        COALESCE(SUM(c.additions), 0) as additions,
        COALESCE(SUM(c.deletions), 0) as deletions,
        COALESCE(SUM(c.changed_files), 0) as changed_files
       FROM commits c
       JOIN repositories r ON r.id = c.repository_id
       LEFT JOIN developers d ON d.id = c.developer_id
       ${whereSql}`,
      params
    );

    const trendRes = await pool.query(
      `SELECT 
        TO_CHAR(c.committed_at, 'YYYY-MM-DD') as date,
        COUNT(*) as commits,
        SUM(c.additions) as additions,
        SUM(c.deletions) as deletions
       FROM commits c
       JOIN repositories r ON r.id = c.repository_id
       LEFT JOIN developers d ON d.id = c.developer_id
       ${whereSql}
       GROUP BY TO_CHAR(c.committed_at, 'YYYY-MM-DD')
       ORDER BY date ASC`,
      params
    );

    const row = summaryRes.rows[0];
    return {
      summary: {
        totalCommits: parseInt(row.total_commits || '0', 10),
        additions: parseInt(row.additions || '0', 10),
        deletions: parseInt(row.deletions || '0', 10),
        changedFiles: parseInt(row.changed_files || '0', 10),
      },
      trend: trendRes.rows.map((r) => ({
        date: r.date,
        commits: parseInt(r.commits, 10),
        additions: parseInt(r.additions || '0', 10),
        deletions: parseInt(r.deletions || '0', 10),
      })),
    };
  }

  // 4. Pull Requests Dashboard API
  async getDashboardPullRequests(filters: DashboardFilters) {
    const { whereSql, params } = this.buildCommitWhere(filters);
    const prWhere = whereSql.replace(/c\.committed_at/g, 'pr.created_at').replace(/c\./g, 'pr.');

    const prSummaryRes = await pool.query(
      `SELECT 
        COUNT(*) as total_prs,
        COUNT(*) FILTER (WHERE UPPER(pr.state) = 'OPEN') as open_prs,
        COUNT(*) FILTER (WHERE pr.merged = true OR UPPER(pr.state) = 'MERGED') as merged_prs,
        COUNT(*) FILTER (WHERE UPPER(pr.state) = 'CLOSED' AND pr.merged = false) as closed_prs,
        COUNT(*) FILTER (WHERE pr.draft = true) as draft_prs
       FROM pull_requests pr
       JOIN repositories r ON r.id = pr.repository_id
       LEFT JOIN developers d ON d.id = pr.author_developer_id
       ${prWhere}`,
      params
    );

    const trendRes = await pool.query(
      `SELECT 
        TO_CHAR(pr.created_at, 'YYYY-MM-DD') as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE pr.merged = true OR UPPER(pr.state) = 'MERGED') as merged,
        COUNT(*) FILTER (WHERE UPPER(pr.state) = 'OPEN') as open
       FROM pull_requests pr
       JOIN repositories r ON r.id = pr.repository_id
       LEFT JOIN developers d ON d.id = pr.author_developer_id
       ${prWhere}
       GROUP BY TO_CHAR(pr.created_at, 'YYYY-MM-DD')
       ORDER BY date ASC`,
      params
    );

    const row = prSummaryRes.rows[0];
    return {
      summary: {
        totalPRs: parseInt(row.total_prs || '0', 10),
        openPRs: parseInt(row.open_prs || '0', 10),
        mergedPRs: parseInt(row.merged_prs || '0', 10),
        closedPRs: parseInt(row.closed_prs || '0', 10),
        draftPRs: parseInt(row.draft_prs || '0', 10),
      },
      trend: trendRes.rows.map((r) => ({
        date: r.date,
        total: parseInt(r.total, 10),
        merged: parseInt(r.merged || '0', 10),
        open: parseInt(r.open || '0', 10),
      })),
    };
  }

  // 5. Issues Dashboard API
  async getDashboardIssues(filters: DashboardFilters) {
    const { whereSql, params } = this.buildCommitWhere(filters);
    const issueWhere = whereSql.replace(/c\.committed_at/g, 'i.created_at').replace(/c\./g, 'i.');

    const summaryRes = await pool.query(
      `SELECT 
        COUNT(*) as total_issues,
        COUNT(*) FILTER (WHERE UPPER(i.state) = 'OPEN') as open_issues,
        COUNT(*) FILTER (WHERE UPPER(i.state) = 'CLOSED') as closed_issues
       FROM issues i
       JOIN repositories r ON r.id = i.repository_id
       LEFT JOIN developers d ON d.id = i.author_developer_id
       ${issueWhere}`,
      params
    );

    const trendRes = await pool.query(
      `SELECT 
        TO_CHAR(i.created_at, 'YYYY-MM-DD') as date,
        COUNT(*) FILTER (WHERE UPPER(i.state) = 'OPEN') as opened,
        COUNT(*) FILTER (WHERE UPPER(i.state) = 'CLOSED') as closed
       FROM issues i
       JOIN repositories r ON r.id = i.repository_id
       LEFT JOIN developers d ON d.id = i.author_developer_id
       ${issueWhere}
       GROUP BY TO_CHAR(i.created_at, 'YYYY-MM-DD')
       ORDER BY date ASC`,
      params
    );

    const row = summaryRes.rows[0];
    return {
      summary: {
        totalIssues: parseInt(row.total_issues || '0', 10),
        openIssues: parseInt(row.open_issues || '0', 10),
        closedIssues: parseInt(row.closed_issues || '0', 10),
      },
      trend: trendRes.rows.map((r) => ({
        date: r.date,
        opened: parseInt(r.opened || '0', 10),
        closed: parseInt(r.closed || '0', 10),
      })),
    };
  }

  // 6. Developers Dashboard API
  async getDashboardDevelopers(filters: DashboardFilters) {
    const { whereSql, params } = this.buildCommitWhere(filters);

    const leaderboardRes = await pool.query(
      `SELECT 
        d.id,
        d.name,
        d.login,
        d.avatar_url,
        COUNT(DISTINCT c.id) as commits,
        COUNT(DISTINCT pr.id) as prs,
        COUNT(DISTINCT prr.id) as reviews,
        COALESCE(SUM(c.additions), 0) as additions,
        COALESCE(SUM(c.deletions), 0) as deletions
       FROM developers d
       LEFT JOIN commits c ON c.developer_id = d.id
       LEFT JOIN repositories r ON r.id = c.repository_id
       LEFT JOIN pull_requests pr ON pr.author_developer_id = d.id
       LEFT JOIN pull_request_reviews prr ON prr.reviewer_developer_id = d.id
       ${whereSql}
       GROUP BY d.id, d.name, d.login, d.avatar_url
       ORDER BY commits DESC
       LIMIT 20`,
      params
    );

    return {
      developers: leaderboardRes.rows.map((r) => ({
        id: r.id,
        name: r.name || r.login,
        login: r.login,
        avatarUrl: r.avatar_url,
        commits: parseInt(r.commits, 10),
        prs: parseInt(r.prs, 10),
        reviews: parseInt(r.reviews, 10),
        additions: parseInt(r.additions || '0', 10),
        deletions: parseInt(r.deletions || '0', 10),
      })),
    };
  }

  // 7. Repositories Dashboard API
  async getDashboardRepositories(filters: DashboardFilters) {
    const repoOverviewRes = await pool.query(`
      SELECT 
        r.id,
        r.name,
        r.full_name,
        r.language,
        COUNT(DISTINCT c.id) as commits_count,
        COUNT(DISTINCT pr.id) FILTER (WHERE UPPER(pr.state) = 'OPEN') as open_prs_count,
        COUNT(DISTINCT i.id) FILTER (WHERE UPPER(i.state) = 'OPEN') as open_issues_count,
        COALESCE(SUM(c.additions), 0) as additions,
        COALESCE(SUM(c.deletions), 0) as deletions,
        r.last_synced_at
      FROM repositories r
      LEFT JOIN commits c ON c.repository_id = r.id
      LEFT JOIN pull_requests pr ON pr.repository_id = r.id
      LEFT JOIN issues i ON i.repository_id = r.id
      GROUP BY r.id, r.name, r.full_name, r.language, r.last_synced_at
      ORDER BY r.full_name ASC
    `);

    return {
      repositories: repoOverviewRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        language: r.language,
        commitsCount: parseInt(r.commits_count, 10),
        openPRsCount: parseInt(r.open_prs_count, 10),
        openIssuesCount: parseInt(r.open_issues_count, 10),
        additions: parseInt(r.additions || '0', 10),
        deletions: parseInt(r.deletions || '0', 10),
        lastSyncedAt: r.last_synced_at,
      })),
    };
  }
}

export const analyticsService = new AnalyticsService();
