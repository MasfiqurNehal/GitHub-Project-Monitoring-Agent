import { pool } from '../db/connection.js';

export interface DashboardFilters {
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  dateFrom?: string;
  dateTo?: string;
  organizationId?: string;
}

export class AnalyticsService {
  private cache = new Map<string, { data: any; expiresAt: number }>();

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T, ttlMs: number = 20000): void {
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  public clearCache(): void {
    this.cache.clear();
  }

  // Helper to build parameterized SQL WHERE clause based on filters
  private buildCommitWhere(filters: DashboardFilters) {
    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (filters.organizationId) {
      conditions.push(`(r.organization_id = $${pIdx} OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $${pIdx}))`);
      params.push(filters.organizationId);
      pIdx++;
    }

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
      let dFrom = new Date(filters.dateFrom);
      if (typeof filters.dateFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(filters.dateFrom.trim())) {
        dFrom = new Date(`${filters.dateFrom.trim()}T00:00:00.000Z`);
      }
      conditions.push(`c.committed_at >= $${pIdx}`);
      params.push(dFrom);
      pIdx++;
    }

    if (filters.dateTo) {
      let dTo = new Date(filters.dateTo);
      if (typeof filters.dateTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(filters.dateTo.trim())) {
        dTo = new Date(`${filters.dateTo.trim()}T23:59:59.999Z`);
      }
      conditions.push(`c.committed_at <= $${pIdx}`);
      params.push(dTo);
      pIdx++;
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereSql, params };
  }

  // 1. Overview API with parallel query execution and in-memory caching
  async getDashboardOverview(filters: DashboardFilters) {
    const cacheKey = `overview_${JSON.stringify(filters)}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const { whereSql: commitWhere, params: commitParams } = this.buildCommitWhere(filters);
    const prWhere = commitWhere.replace(/c\.committed_at/g, 'pr.created_at').replace(/c\./g, 'pr.');
    const issueWhere = commitWhere.replace(/c\.committed_at/g, 'i.created_at').replace(/c\./g, 'i.');
    const prrWhere = commitWhere.replace(/c\.committed_at/g, 'prr.submitted_at').replace(/c\./g, 'prr.');

    // Execute all independent queries concurrently in parallel with Promise.all
    const [
      projectsRes,
      reposRes,
      commitsRes,
      prsRes,
      issuesRes,
      reviewsRes,
      commitTrendRes,
      prTrendRes,
      reviewTrendRes,
      codeChangesRes,
      issueTrendRes,
      devActRes,
      projOverviewRes,
      reposData,
      activityFeedRes,
    ] = await Promise.all([
      filters.organizationId
        ? pool.query('SELECT COUNT(*) FROM projects WHERE organization_id = $1', [filters.organizationId])
        : pool.query('SELECT COUNT(*) FROM projects'),
      filters.organizationId
        ? pool.query('SELECT COUNT(*) FROM repositories WHERE organization_id = $1 OR project_id IN (SELECT id FROM projects WHERE organization_id = $1)', [filters.organizationId])
        : pool.query('SELECT COUNT(*) FROM repositories'),
      pool.query(
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
      ),
      pool.query(
        `SELECT 
          COUNT(*) as total_prs,
          COUNT(*) FILTER (WHERE pr.merged = true OR UPPER(pr.state) = 'MERGED') as merged_prs,
          COUNT(*) FILTER (WHERE UPPER(pr.state) = 'OPEN') as open_prs
         FROM pull_requests pr
         JOIN repositories r ON r.id = pr.repository_id
         LEFT JOIN developers d ON d.id = pr.author_developer_id
         ${prWhere}`,
        commitParams
      ),
      pool.query(
        `SELECT 
          COUNT(*) as issues_opened,
          COUNT(*) FILTER (WHERE UPPER(i.state) = 'CLOSED') as issues_closed
         FROM issues i
         JOIN repositories r ON r.id = i.repository_id
         LEFT JOIN developers d ON d.id = i.author_developer_id
         ${issueWhere}`,
        commitParams
      ),
      pool.query(
        `SELECT COUNT(*) as total_reviews
         FROM pull_request_reviews prr
         JOIN pull_requests pr ON pr.id = prr.pull_request_id
         JOIN repositories r ON r.id = pr.repository_id
         LEFT JOIN developers d ON d.id = prr.reviewer_developer_id
         ${prrWhere}`,
        commitParams
      ),
      pool.query(
        `SELECT TO_CHAR(c.committed_at, 'YYYY-MM-DD') as date, COUNT(*) as commits
         FROM commits c
         JOIN repositories r ON r.id = c.repository_id
         LEFT JOIN developers d ON d.id = c.developer_id
         ${commitWhere}
         GROUP BY TO_CHAR(c.committed_at, 'YYYY-MM-DD')
         ORDER BY date ASC LIMIT 30`,
        commitParams
      ),
      pool.query(
        `SELECT TO_CHAR(pr.created_at, 'YYYY-MM-DD') as date, COUNT(*) as prs
         FROM pull_requests pr
         JOIN repositories r ON r.id = pr.repository_id
         LEFT JOIN developers d ON d.id = pr.author_developer_id
         ${prWhere}
         GROUP BY TO_CHAR(pr.created_at, 'YYYY-MM-DD')
         ORDER BY date ASC LIMIT 30`,
        commitParams
      ),
      pool.query(
        `SELECT TO_CHAR(prr.submitted_at, 'YYYY-MM-DD') as date, COUNT(*) as reviews
         FROM pull_request_reviews prr
         JOIN pull_requests pr ON pr.id = prr.pull_request_id
         JOIN repositories r ON r.id = pr.repository_id
         LEFT JOIN developers d ON d.id = prr.reviewer_developer_id
         ${prrWhere}
         GROUP BY TO_CHAR(prr.submitted_at, 'YYYY-MM-DD')
         ORDER BY date ASC LIMIT 30`,
        commitParams
      ),
      pool.query(
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
      ),
      pool.query(
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
      ),
      filters.organizationId
        ? pool.query(
            `SELECT 
              d.id, d.name, d.login, d.avatar_url,
              COUNT(DISTINCT c.id) as commits,
              COUNT(DISTINCT pr.id) as prs,
              COUNT(DISTINCT prr.id) as reviews,
              COALESCE(SUM(c.additions), 0) as lines_added,
              COALESCE(SUM(c.deletions), 0) as lines_deleted
             FROM developers d
             LEFT JOIN commits c ON c.developer_id = d.id
             LEFT JOIN pull_requests pr ON pr.author_developer_id = d.id
             LEFT JOIN pull_request_reviews prr ON prr.reviewer_developer_id = d.id
             WHERE d.organization_id = $1 OR d.id IN (
               SELECT DISTINCT rd.developer_id FROM repository_developers rd
               JOIN repositories r ON r.id = rd.repository_id
               WHERE r.organization_id = $1 OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $1)
             )
             GROUP BY d.id, d.name, d.login, d.avatar_url
             ORDER BY commits DESC
             LIMIT 10`,
            [filters.organizationId]
          )
        : pool.query(
            `SELECT 
              d.id, d.name, d.login, d.avatar_url,
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
          ),
      filters.organizationId
        ? pool.query(
            `SELECT 
              p.id, p.name, p.status, p.updated_at,
              COUNT(DISTINCT r.id) as repositories_count,
              COUNT(DISTINCT c.id) as commits_count,
              COUNT(DISTINCT pr.id) as prs_count,
              COUNT(DISTINCT i.id) as issues_count
             FROM projects p
             LEFT JOIN repositories r ON r.project_id = p.id
             LEFT JOIN commits c ON c.repository_id = r.id
             LEFT JOIN pull_requests pr ON pr.repository_id = r.id
             LEFT JOIN issues i ON i.repository_id = r.id
             WHERE p.organization_id = $1
             GROUP BY p.id, p.name, p.status, p.updated_at
             ORDER BY p.updated_at DESC`,
            [filters.organizationId]
          )
        : pool.query(
            `SELECT 
              p.id, p.name, p.status, p.updated_at,
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
          ),
      this.getDashboardRepositories(filters),
      filters.organizationId
        ? pool.query(
            `SELECT 
              ae.id, ae.event_type as type, ae.occurred_at, ae.metadata,
              r.name as repo_name, d.login as author, d.avatar_url as author_avatar
             FROM activity_events ae
             JOIN repositories r ON r.id = ae.repository_id
             LEFT JOIN developers d ON d.id = ae.developer_id
             WHERE r.organization_id = $1 OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $1)
             ORDER BY ae.occurred_at DESC
             LIMIT 10`,
            [filters.organizationId]
          )
        : pool.query(
            `SELECT 
              ae.id, ae.event_type as type, ae.occurred_at, ae.metadata,
              r.name as repo_name, d.login as author, d.avatar_url as author_avatar
             FROM activity_events ae
             JOIN repositories r ON r.id = ae.repository_id
             LEFT JOIN developers d ON d.id = ae.developer_id
             ORDER BY ae.occurred_at DESC
             LIMIT 10`
          ),
    ]);

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

    // Activity Trend (commits, prs, reviews by date)
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

    // Code Changes Trend
    const codeChangesTrend = codeChangesRes.rows.map((r) => ({
      date: r.date,
      additions: parseInt(r.additions, 10),
      deletions: parseInt(r.deletions, 10),
    }));

    // Issue Trend
    const issueTrend = issueTrendRes.rows.map((r) => ({
      date: r.date,
      opened: parseInt(r.opened, 10),
      closed: parseInt(r.closed, 10),
    }));

    // Developer Activity
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

    // Project Overview
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

    // Repository Overview
    const repositoryOverview = (reposData.repositories || []).map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.fullName,
      language: r.language,
      commitsCount: r.commitsCount,
      openPRsCount: r.openPRsCount,
      issuesCount: r.openIssuesCount,
      lastSyncedAt: r.lastSyncedAt ? new Date(r.lastSyncedAt).toISOString() : null,
    }));

    // Recent Activity
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
      const recentCommitsRes = filters.organizationId
        ? await pool.query(
            `SELECT c.id, c.message, c.committed_at, c.commit_url, r.name as repo_name, d.login as author, d.avatar_url as author_avatar, c.additions, c.deletions
             FROM commits c
             JOIN repositories r ON r.id = c.repository_id
             LEFT JOIN developers d ON d.id = c.developer_id
             WHERE r.organization_id = $1 OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $1)
             ORDER BY c.committed_at DESC
             LIMIT 10`,
            [filters.organizationId]
          )
        : await pool.query(
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
        status: `+${c.additions} / -${c.deletions} lines`,
        details: `+${c.additions} / -${c.deletions} lines`,
        url: c.commit_url,
      }));
    }

    const overviewResult = {
      kpi,
      activityTrend,
      codeChangesTrend,
      issueTrend,
      developerActivity,
      projectOverview,
      repositoryOverview,
      recentActivity,
    };

    // Cache the aggregated overview result for 20 seconds
    this.setCache(cacheKey, overviewResult, 20000);
    return overviewResult;
  }

  // Engineering Signals API (Attention signals: inactive repos & stale PRs)
  async getEngineeringSignals(filters: DashboardFilters = {}) {
    const cacheKey = `signals_${JSON.stringify(filters)}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const orgWhere = filters.organizationId
      ? `WHERE (r.organization_id = $1 OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $1))`
      : '';
    const orgParams = filters.organizationId ? [filters.organizationId] : [];

    const [inactiveReposRes, stalePRsRes] = await Promise.all([
      pool.query(`
        SELECT r.id, r.name, r.full_name, MAX(c.committed_at) as last_activity
        FROM repositories r
        LEFT JOIN commits c ON c.repository_id = r.id
        ${orgWhere}
        GROUP BY r.id, r.name, r.full_name
        HAVING MAX(c.committed_at) < NOW() - INTERVAL '7 days' OR MAX(c.committed_at) IS NULL
        LIMIT 10
      `, orgParams),
      pool.query(`
        SELECT pr.id, pr.title, pr.number, r.name as repo_name, pr.created_at
        FROM pull_requests pr
        JOIN repositories r ON r.id = pr.repository_id
        WHERE UPPER(pr.state) = 'OPEN' AND pr.created_at < NOW() - INTERVAL '7 days'
        ${filters.organizationId ? `AND (r.organization_id = $1 OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $1))` : ''}
        LIMIT 10
      `, orgParams),
    ]);

    const signalsResult = {
      inactiveRepositories: inactiveReposRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        lastActivity: r.last_activity ? new Date(r.last_activity).toISOString() : 'No recent commits',
      })),
      stalePullRequests: stalePRsRes.rows.map((p) => ({
        id: p.id,
        title: p.title,
        number: p.number,
        repoName: p.repo_name,
        createdAt: new Date(p.created_at).toISOString(),
      })),
    };

    this.setCache(cacheKey, signalsResult, 30000);
    return signalsResult;
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
    const orgWhere = filters.organizationId
      ? `WHERE (r.organization_id = $1 OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $1))`
      : '';
    const orgParams = filters.organizationId ? [filters.organizationId] : [];

    const repoOverviewRes = await pool.query(
      `
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
      ${orgWhere}
      GROUP BY r.id, r.name, r.full_name, r.language, r.last_synced_at
      ORDER BY r.full_name ASC
    `,
      orgParams
    );

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

  // 8. Daily Analytics API (Today, Yesterday, This Week, Last Week, This Month, Custom Date Range)
  private resolveDateRange(filters: DashboardFilters & { preset?: string }) {
    let from: string | undefined = filters.dateFrom;
    let to: string | undefined = filters.dateTo;

    if (filters.preset) {
      const now = new Date();
      const p = filters.preset.toLowerCase().replace(/[\s_-]+/g, '');

      if (p === 'today') {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        from = start.toISOString();
        to = now.toISOString();
      } else if (p === 'yesterday') {
        const start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        from = start.toISOString();
        to = end.toISOString();
      } else if (p === 'thisweek' || p === 'week' || p === '7d') {
        const start = new Date(now);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        from = start.toISOString();
        to = now.toISOString();
      } else if (p === 'lastweek') {
        const end = new Date(now);
        end.setDate(end.getDate() - 7);
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(start.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        from = start.toISOString();
        to = end.toISOString();
      } else if (p === 'thismonth' || p === 'month' || p === '30d') {
        const start = new Date(now);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        from = start.toISOString();
        to = now.toISOString();
      }
    }

    return { from, to };
  }

  async getDailyAnalytics(filters: DashboardFilters & { preset?: string }) {
    const { from, to } = this.resolveDateRange(filters);
    const effectiveFilters: DashboardFilters = {
      ...filters,
      dateFrom: from,
      dateTo: to,
    };

    const { whereSql: commitWhere, params: commitParams } = this.buildCommitWhere(effectiveFilters);
    const prWhere = commitWhere.replace(/c\.committed_at/g, 'pr.created_at').replace(/c\./g, 'pr.');
    const issueWhere = commitWhere.replace(/c\.committed_at/g, 'i.created_at').replace(/c\./g, 'i.');
    const prrWhere = commitWhere.replace(/c\.committed_at/g, 'prr.submitted_at').replace(/c\./g, 'prr.');

    // 1. Commits & Line Changes by Day
    const commitsRes = await pool.query(
      `SELECT 
        TO_CHAR(c.committed_at, 'YYYY-MM-DD') as date,
        COUNT(*) as commits,
        COALESCE(SUM(c.additions), 0) as additions,
        COALESCE(SUM(c.deletions), 0) as deletions
       FROM commits c
       JOIN repositories r ON r.id = c.repository_id
       LEFT JOIN developers d ON d.id = c.developer_id
       ${commitWhere}
       GROUP BY TO_CHAR(c.committed_at, 'YYYY-MM-DD')
       ORDER BY date ASC`,
      commitParams
    );

    // 2. PRs by Day
    const prsRes = await pool.query(
      `SELECT 
        TO_CHAR(pr.created_at, 'YYYY-MM-DD') as date,
        COUNT(*) as prs
       FROM pull_requests pr
       JOIN repositories r ON r.id = pr.repository_id
       LEFT JOIN developers d ON d.id = pr.author_developer_id
       ${prWhere}
       GROUP BY TO_CHAR(pr.created_at, 'YYYY-MM-DD')
       ORDER BY date ASC`,
      commitParams
    );

    // 3. Reviews by Day
    const reviewsRes = await pool.query(
      `SELECT 
        TO_CHAR(prr.submitted_at, 'YYYY-MM-DD') as date,
        COUNT(*) as reviews
       FROM pull_request_reviews prr
       JOIN pull_requests pr ON pr.id = prr.pull_request_id
       JOIN repositories r ON r.id = pr.repository_id
       LEFT JOIN developers d ON d.id = prr.reviewer_developer_id
       ${prrWhere}
       GROUP BY TO_CHAR(prr.submitted_at, 'YYYY-MM-DD')
       ORDER BY date ASC`,
      commitParams
    );

    // 4. Issues by Day
    const issuesRes = await pool.query(
      `SELECT 
        TO_CHAR(i.created_at, 'YYYY-MM-DD') as date,
        COUNT(*) as issues
       FROM issues i
       JOIN repositories r ON r.id = i.repository_id
       LEFT JOIN developers d ON d.id = i.author_developer_id
       ${issueWhere}
       GROUP BY TO_CHAR(i.created_at, 'YYYY-MM-DD')
       ORDER BY date ASC`,
      commitParams
    );

    const map = new Map<string, {
      date: string;
      commits: number;
      pullRequests: number;
      reviews: number;
      issues: number;
      additions: number;
      deletions: number;
    }>();

    for (const r of commitsRes.rows) {
      map.set(r.date, {
        date: r.date,
        commits: parseInt(r.commits, 10),
        pullRequests: 0,
        reviews: 0,
        issues: 0,
        additions: parseInt(r.additions, 10),
        deletions: parseInt(r.deletions, 10),
      });
    }

    for (const r of prsRes.rows) {
      const item = map.get(r.date) || {
        date: r.date,
        commits: 0,
        pullRequests: 0,
        reviews: 0,
        issues: 0,
        additions: 0,
        deletions: 0,
      };
      item.pullRequests = parseInt(r.prs, 10);
      map.set(r.date, item);
    }

    for (const r of reviewsRes.rows) {
      const item = map.get(r.date) || {
        date: r.date,
        commits: 0,
        pullRequests: 0,
        reviews: 0,
        issues: 0,
        additions: 0,
        deletions: 0,
      };
      item.reviews = parseInt(r.reviews, 10);
      map.set(r.date, item);
    }

    for (const r of issuesRes.rows) {
      const item = map.get(r.date) || {
        date: r.date,
        commits: 0,
        pullRequests: 0,
        reviews: 0,
        issues: 0,
        additions: 0,
        deletions: 0,
      };
      item.issues = parseInt(r.issues, 10);
      map.set(r.date, item);
    }

    const result = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    return result;
  }
}

export const analyticsService = new AnalyticsService();

