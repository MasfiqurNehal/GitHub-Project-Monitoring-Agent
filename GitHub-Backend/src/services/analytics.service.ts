import { pool } from '../db/connection.js';

export interface DashboardFilters {
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  from?: Date;
  to?: Date;
}

export class AnalyticsService {
  async getDashboardOverview(filters: DashboardFilters) {
    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (filters.repositoryId) {
      conditions.push(`repository_id = $${pIdx++}`);
      params.push(filters.repositoryId);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Executive KPIs
    const projectsCountRes = await pool.query('SELECT COUNT(*) FROM projects');
    const reposCountRes = await pool.query('SELECT COUNT(*) FROM repositories');
    const devsCountRes = await pool.query('SELECT COUNT(*) FROM developers');

    const commitsRes = await pool.query(
      `SELECT COUNT(*) as total_commits, COALESCE(SUM(additions), 0) as lines_added, COALESCE(SUM(deletions), 0) as lines_deleted FROM commits ${whereSql}`,
      params
    );

    const prsRes = await pool.query(
      `SELECT 
        COUNT(*) as total_prs,
        COUNT(*) FILTER (WHERE state = 'MERGED' OR merged = true) as merged_prs,
        COUNT(*) FILTER (WHERE state = 'OPEN') as open_prs
       FROM pull_requests ${whereSql}`,
      params
    );

    const issuesRes = await pool.query(
      `SELECT 
        COUNT(*) as total_issues,
        COUNT(*) FILTER (WHERE state = 'OPEN') as open_issues,
        COUNT(*) FILTER (WHERE state = 'CLOSED') as closed_issues
       FROM issues ${whereSql}`,
      params
    );

    const reviewsRes = await pool.query('SELECT COUNT(*) FROM pull_request_reviews');

    const kpi = {
      totalProjects: parseInt(projectsCountRes.rows[0].count, 10),
      totalRepositories: parseInt(reposCountRes.rows[0].count, 10),
      activeDevelopers: parseInt(devsCountRes.rows[0].count, 10),
      totalCommits: parseInt(commitsRes.rows[0].total_commits, 10),
      totalPRs: parseInt(prsRes.rows[0].total_prs, 10),
      mergedPRs: parseInt(prsRes.rows[0].merged_prs, 10),
      openPRs: parseInt(prsRes.rows[0].open_prs, 10),
      issuesOpened: parseInt(issuesRes.rows[0].open_issues, 10),
      issuesClosed: parseInt(issuesRes.rows[0].closed_issues, 10),
      linesAdded: parseInt(commitsRes.rows[0].lines_added, 10),
      linesDeleted: parseInt(commitsRes.rows[0].lines_deleted, 10),
      totalReviews: parseInt(reviewsRes.rows[0].count, 10),
    };

    // 2. Activity Trend (Grouped by date)
    const activityTrendRes = await pool.query(`
      SELECT 
        TO_CHAR(committed_at, 'YYYY-MM-DD') as date,
        COUNT(*) as commits
      FROM commits
      GROUP BY TO_CHAR(committed_at, 'YYYY-MM-DD')
      ORDER BY date ASC
      LIMIT 30
    `);

    const activityTrend = activityTrendRes.rows.map((row) => ({
      date: row.date,
      commits: parseInt(row.commits, 10),
      prs: 0,
      reviews: 0,
    }));

    // 3. Code Changes Trend
    const codeChangesTrendRes = await pool.query(`
      SELECT 
        TO_CHAR(committed_at, 'YYYY-MM-DD') as date,
        SUM(additions) as additions,
        SUM(deletions) as deletions
      FROM commits
      GROUP BY TO_CHAR(committed_at, 'YYYY-MM-DD')
      ORDER BY date ASC
      LIMIT 30
    `);

    const codeChangesTrend = codeChangesTrendRes.rows.map((row) => ({
      date: row.date,
      additions: parseInt(row.additions || 0, 10),
      deletions: parseInt(row.deletions || 0, 10),
    }));

    // 4. Issue Trend
    const issueTrendRes = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        COUNT(*) FILTER (WHERE state = 'OPEN') as opened,
        COUNT(*) FILTER (WHERE state = 'CLOSED') as closed
      FROM issues
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date ASC
      LIMIT 30
    `);

    const issueTrend = issueTrendRes.rows.map((row) => ({
      date: row.date,
      opened: parseInt(row.opened || 0, 10),
      closed: parseInt(row.closed || 0, 10),
    }));

    // 5. Developer Contributions Leaderboard with PRs & Reviews
    const devContribRes = await pool.query(`
      SELECT 
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
      LIMIT 10
    `);

    const developerActivity = devContribRes.rows.map((r) => ({
      id: r.id,
      name: r.name || r.login,
      login: r.login,
      avatarUrl: r.avatar_url,
      commits: parseInt(r.commits, 10),
      prs: parseInt(r.prs, 10),
      reviews: parseInt(r.reviews, 10),
      linesAdded: parseInt(r.lines_added, 10),
      linesDeleted: parseInt(r.lines_deleted, 10),
    }));

    // 6. Project & Repository Overviews
    const projectOverviewRes = await pool.query(`
      SELECT 
        p.id,
        p.name,
        COUNT(DISTINCT r.id) as repositories_count,
        COUNT(DISTINCT c.id) as commits_count,
        COUNT(DISTINCT pr.id) as prs_count,
        COUNT(DISTINCT i.id) as issues_count,
        p.status,
        p.updated_at
      FROM projects p
      LEFT JOIN repositories r ON r.project_id = p.id
      LEFT JOIN commits c ON c.repository_id = r.id
      LEFT JOIN pull_requests pr ON pr.repository_id = r.id
      LEFT JOIN issues i ON i.repository_id = r.id
      GROUP BY p.id, p.name, p.status, p.updated_at
    `);

    const projectOverview = projectOverviewRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      repositoriesCount: parseInt(r.repositories_count, 10),
      commitsCount: parseInt(r.commits_count, 10),
      prsCount: parseInt(r.prs_count, 10),
      issuesCount: parseInt(r.issues_count, 10),
      status: r.status,
      updatedAt: r.updated_at,
    }));

    const repoOverviewRes = await pool.query(`
      SELECT 
        r.id,
        r.name,
        r.full_name,
        r.language,
        COUNT(DISTINCT c.id) as commits_count,
        COUNT(DISTINCT pr.id) FILTER (WHERE pr.state = 'OPEN') as open_prs_count,
        COUNT(DISTINCT i.id) FILTER (WHERE i.state = 'OPEN') as open_issues_count,
        r.last_synced_at
      FROM repositories r
      LEFT JOIN commits c ON c.repository_id = r.id
      LEFT JOIN pull_requests pr ON pr.repository_id = r.id
      LEFT JOIN issues i ON i.repository_id = r.id
      GROUP BY r.id, r.name, r.full_name, r.language, r.last_synced_at
    `);

    const repositoryOverview = repoOverviewRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      language: r.language,
      commitsCount: parseInt(r.commits_count, 10),
      openPRsCount: parseInt(r.open_prs_count, 10),
      issuesCount: parseInt(r.open_issues_count, 10),
      lastSyncedAt: r.last_synced_at,
    }));

    // 7. Recent Activity Feed
    const recentActivityRes = await pool.query(`
      SELECT 
        ae.id,
        ae.event_type as type,
        ae.occurred_at,
        ae.metadata,
        r.name as repo_name,
        d.login as author,
        d.avatar_url as author_avatar
      FROM activity_events ae
      LEFT JOIN repositories r ON ae.repository_id = r.id
      LEFT JOIN developers d ON ae.developer_id = d.id
      ORDER BY ae.occurred_at DESC
      LIMIT 15
    `);

    const recentActivity = recentActivityRes.rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.metadata?.message || r.metadata?.title || `Event: ${r.type}`,
      repoName: r.repo_name || 'Unknown Repo',
      author: r.author || 'System',
      authorAvatar: r.author_avatar,
      timeAgo: new Date(r.occurred_at).toISOString(),
    }));

    return {
      kpi,
      activityTrend,
      codeChangesTrend,
      issueTrend,
      developerActivity,
      projectOverview,
      repositoryOverview,
      recentActivity,
    };
  }

  async getEngineeringSignals() {
    // Inactive Repositories (No commits in last 14 days)
    const inactiveReposRes = await pool.query(`
      SELECT r.* FROM repositories r
      WHERE r.id NOT IN (
        SELECT DISTINCT repository_id FROM commits WHERE committed_at >= NOW() - INTERVAL '14 days'
      )
    `);

    // Stale Pull Requests (Open for 3+ days)
    const stalePRsRes = await pool.query(`
      SELECT pr.*, r.name as repo_name, d.login as author_login, d.avatar_url as author_avatar
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      LEFT JOIN developers d ON pr.author_developer_id = d.id
      WHERE pr.state = 'OPEN' AND pr.created_at <= NOW() - INTERVAL '3 days'
    `);

    // Open Issues
    const openIssuesRes = await pool.query(`
      SELECT i.*, r.name as repo_name, d.login as author_login, d.avatar_url as author_avatar
      FROM issues i
      LEFT JOIN repositories r ON i.repository_id = r.id
      LEFT JOIN developers d ON i.author_developer_id = d.id
      WHERE i.state = 'OPEN'
    `);

    return {
      inactiveRepositories: inactiveReposRes.rows,
      stalePullRequests: stalePRsRes.rows,
      openIssues: openIssuesRes.rows,
      signalAlertsCount: inactiveReposRes.rows.length + stalePRsRes.rows.length,
    };
  }
}

export const analyticsService = new AnalyticsService();
