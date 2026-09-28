import { pool } from '../db/connection.js';

export interface DashboardFilters {
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  dateFrom?: string;
  dateTo?: string;
  organizationId?: string;
  activityType?: string;
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

  private resolveDateRange(filters: DashboardFilters & { preset?: string }) {
    let from: string | undefined = filters.dateFrom || (filters as any).from;
    let to: string | undefined = filters.dateTo || (filters as any).to;

    if (!from && filters.preset) {
      const now = new Date();
      const p = filters.preset.toLowerCase().replace(/[\s_-]+/g, '');

      if (p === '1d' || p === 'today') {
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
      } else if (p === '7d' || p === 'thisweek' || p === 'week') {
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
      } else if (p === '30d' || p === 'thismonth' || p === 'month') {
        const start = new Date(now);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
        from = start.toISOString();
        to = now.toISOString();
      } else if (p === 'all') {
        from = undefined;
        to = undefined;
      }
    }

    return { from, to };
  }

  // Helper to build parameterized SQL WHERE clause for Commits
  private buildCommitWhere(filters: DashboardFilters & { preset?: string }) {
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

    const { from: dFromStr, to: dToStr } = this.resolveDateRange(filters);

    if (dFromStr) {
      let dFrom = new Date(dFromStr);
      if (typeof dFromStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dFromStr.trim())) {
        dFrom = new Date(`${dFromStr.trim()}T00:00:00.000Z`);
      }
      conditions.push(`c.committed_at >= $${pIdx}`);
      params.push(dFrom);
      pIdx++;
    }

    if (dToStr) {
      let dTo = new Date(dToStr);
      if (typeof dToStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dToStr.trim())) {
        dTo = new Date(`${dToStr.trim()}T23:59:59.999Z`);
      }
      conditions.push(`c.committed_at <= $${pIdx}`);
      params.push(dTo);
      pIdx++;
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereSql, params };
  }

  // Helper for Pull Requests
  private buildPRWhere(filters: DashboardFilters & { preset?: string }) {
    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (filters.organizationId) {
      conditions.push(`(r.organization_id = $${pIdx} OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $${pIdx}))`);
      params.push(filters.organizationId);
      pIdx++;
    }

    if (filters.repositoryId) {
      conditions.push(`(pr.repository_id = $${pIdx} OR r.full_name = $${pIdx} OR r.name = $${pIdx})`);
      params.push(filters.repositoryId);
      pIdx++;
    }

    if (filters.projectId) {
      conditions.push(`r.project_id = $${pIdx}`);
      params.push(filters.projectId);
      pIdx++;
    }

    if (filters.developerId) {
      conditions.push(`(pr.author_developer_id = $${pIdx} OR d.login = $${pIdx})`);
      params.push(filters.developerId);
      pIdx++;
    }

    const { from: dFromStr, to: dToStr } = this.resolveDateRange(filters);

    if (dFromStr) {
      let dFrom = new Date(dFromStr);
      if (typeof dFromStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dFromStr.trim())) {
        dFrom = new Date(`${dFromStr.trim()}T00:00:00.000Z`);
      }
      conditions.push(`pr.created_at >= $${pIdx}`);
      params.push(dFrom);
      pIdx++;
    }

    if (dToStr) {
      let dTo = new Date(dToStr);
      if (typeof dToStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dToStr.trim())) {
        dTo = new Date(`${dToStr.trim()}T23:59:59.999Z`);
      }
      conditions.push(`pr.created_at <= $${pIdx}`);
      params.push(dTo);
      pIdx++;
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereSql, params };
  }

  // Helper for Issues
  private buildIssueWhere(filters: DashboardFilters & { preset?: string }) {
    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (filters.organizationId) {
      conditions.push(`(r.organization_id = $${pIdx} OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $${pIdx}))`);
      params.push(filters.organizationId);
      pIdx++;
    }

    if (filters.repositoryId) {
      conditions.push(`(i.repository_id = $${pIdx} OR r.full_name = $${pIdx} OR r.name = $${pIdx})`);
      params.push(filters.repositoryId);
      pIdx++;
    }

    if (filters.projectId) {
      conditions.push(`r.project_id = $${pIdx}`);
      params.push(filters.projectId);
      pIdx++;
    }

    if (filters.developerId) {
      conditions.push(`(i.author_developer_id = $${pIdx} OR d.login = $${pIdx})`);
      params.push(filters.developerId);
      pIdx++;
    }

    const { from: dFromStr, to: dToStr } = this.resolveDateRange(filters);

    if (dFromStr) {
      let dFrom = new Date(dFromStr);
      if (typeof dFromStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dFromStr.trim())) {
        dFrom = new Date(`${dFromStr.trim()}T00:00:00.000Z`);
      }
      conditions.push(`i.created_at >= $${pIdx}`);
      params.push(dFrom);
      pIdx++;
    }

    if (dToStr) {
      let dTo = new Date(dToStr);
      if (typeof dToStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dToStr.trim())) {
        dTo = new Date(`${dToStr.trim()}T23:59:59.999Z`);
      }
      conditions.push(`i.created_at <= $${pIdx}`);
      params.push(dTo);
      pIdx++;
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereSql, params };
  }

  // Helper for Reviews
  private buildReviewWhere(filters: DashboardFilters & { preset?: string }) {
    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (filters.organizationId) {
      conditions.push(`(r.organization_id = $${pIdx} OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $${pIdx}))`);
      params.push(filters.organizationId);
      pIdx++;
    }

    if (filters.repositoryId) {
      conditions.push(`(pr.repository_id = $${pIdx} OR r.full_name = $${pIdx} OR r.name = $${pIdx})`);
      params.push(filters.repositoryId);
      pIdx++;
    }

    if (filters.projectId) {
      conditions.push(`r.project_id = $${pIdx}`);
      params.push(filters.projectId);
      pIdx++;
    }

    if (filters.developerId) {
      conditions.push(`(prr.reviewer_developer_id = $${pIdx} OR d.login = $${pIdx})`);
      params.push(filters.developerId);
      pIdx++;
    }

    const { from: dFromStr, to: dToStr } = this.resolveDateRange(filters);

    if (dFromStr) {
      let dFrom = new Date(dFromStr);
      if (typeof dFromStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dFromStr.trim())) {
        dFrom = new Date(`${dFromStr.trim()}T00:00:00.000Z`);
      }
      conditions.push(`prr.submitted_at >= $${pIdx}`);
      params.push(dFrom);
      pIdx++;
    }

    if (dToStr) {
      let dTo = new Date(dToStr);
      if (typeof dToStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dToStr.trim())) {
        dTo = new Date(`${dToStr.trim()}T23:59:59.999Z`);
      }
      conditions.push(`prr.submitted_at <= $${pIdx}`);
      params.push(dTo);
      pIdx++;
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereSql, params };
  }

  // GET /api/dashboard/summary
  async getDashboardSummary(filters: DashboardFilters & { preset?: string }) {
    const cacheKey = `summary_${JSON.stringify(filters)}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const { whereSql: commitWhere, params: commitParams } = this.buildCommitWhere(filters);
    const { whereSql: prWhere, params: prParams } = this.buildPRWhere(filters);
    const { whereSql: issueWhere, params: issueParams } = this.buildIssueWhere(filters);
    const { whereSql: prrWhere, params: prrParams } = this.buildReviewWhere(filters);

    const [
      projectsRes,
      reposRes,
      activeReposRes,
      commitsRes,
      prsRes,
      issuesRes,
      reviewsRes,
    ] = await Promise.all([
      filters.organizationId
        ? pool.query('SELECT COUNT(*) FROM projects WHERE organization_id = $1', [filters.organizationId])
        : pool.query('SELECT COUNT(*) FROM projects'),
      filters.organizationId
        ? pool.query('SELECT COUNT(*) FROM repositories WHERE organization_id = $1 OR project_id IN (SELECT id FROM projects WHERE organization_id = $1)', [filters.organizationId])
        : pool.query('SELECT COUNT(*) FROM repositories'),
      filters.organizationId
        ? pool.query("SELECT COUNT(*) FROM repositories WHERE (organization_id = $1 OR project_id IN (SELECT id FROM projects WHERE organization_id = $1)) AND (UPPER(sync_status) = 'SYNCED' OR UPPER(sync_status) = 'ACTIVE')", [filters.organizationId])
        : pool.query("SELECT COUNT(*) FROM repositories WHERE UPPER(sync_status) = 'SYNCED' OR UPPER(sync_status) = 'ACTIVE'"),
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
        prParams
      ),
      pool.query(
        `SELECT 
          COUNT(*) as issues_opened,
          COUNT(*) FILTER (WHERE UPPER(i.state) = 'CLOSED') as issues_closed,
          COUNT(*) FILTER (WHERE UPPER(i.state) = 'OPEN') as open_issues
         FROM issues i
         JOIN repositories r ON r.id = i.repository_id
         LEFT JOIN developers d ON d.id = i.author_developer_id
         ${issueWhere}`,
        issueParams
      ),
      pool.query(
        `SELECT COUNT(*) as total_reviews
         FROM pull_request_reviews prr
         JOIN pull_requests pr ON pr.id = prr.pull_request_id
         JOIN repositories r ON r.id = pr.repository_id
         LEFT JOIN developers d ON d.id = prr.reviewer_developer_id
         ${prrWhere}`,
        prrParams
      ),
    ]);

    const cRow = commitsRes.rows[0] || {};
    const pRow = prsRes.rows[0] || {};
    const iRow = issuesRes.rows[0] || {};
    const rRow = reviewsRes.rows[0] || {};

    const summary = {
      monitoredProjects: parseInt(projectsRes.rows[0]?.count || '0', 10),
      connectedRepositories: parseInt(reposRes.rows[0]?.count || '0', 10),
      activeRepositories: parseInt(activeReposRes.rows[0]?.count || '0', 10),
      activeDevelopers: parseInt(cRow.active_devs || '0', 10),
      totalDevelopers: parseInt(cRow.active_devs || '0', 10),
      totalCommits: parseInt(cRow.total_commits || '0', 10),
      pullRequests: parseInt(pRow.total_prs || '0', 10),
      mergedPRs: parseInt(pRow.merged_prs || '0', 10),
      openPRs: parseInt(pRow.open_prs || '0', 10),
      issuesOpened: parseInt(iRow.issues_opened || '0', 10),
      issuesClosed: parseInt(iRow.issues_closed || '0', 10),
      openIssues: parseInt(iRow.open_issues || '0', 10),
      codeAdded: parseInt(cRow.lines_added || '0', 10),
      codeRemoved: parseInt(cRow.lines_deleted || '0', 10),
      netCodeImpact: parseInt(cRow.lines_added || '0', 10) - parseInt(cRow.lines_deleted || '0', 10),
      prReviews: parseInt(rRow.total_reviews || '0', 10),
      // Direct alias fields for UI component compatibility
      totalProjects: parseInt(projectsRes.rows[0]?.count || '0', 10),
      totalRepositories: parseInt(reposRes.rows[0]?.count || '0', 10),
      totalPRs: parseInt(pRow.total_prs || '0', 10),
      linesAdded: parseInt(cRow.lines_added || '0', 10),
      linesDeleted: parseInt(cRow.lines_deleted || '0', 10),
      totalReviews: parseInt(rRow.total_reviews || '0', 10),
    };

    this.setCache(cacheKey, summary);
    return summary;
  }

  // GET /api/dashboard/activity-trends
  async getActivityTrends(filters: DashboardFilters) {
    const cacheKey = `activity_trends_${JSON.stringify(filters)}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const { whereSql: commitWhere, params: commitParams } = this.buildCommitWhere(filters);
    const { whereSql: prWhere, params: prParams } = this.buildPRWhere(filters);
    const { whereSql: issueWhere, params: issueParams } = this.buildIssueWhere(filters);
    const { whereSql: prrWhere, params: prrParams } = this.buildReviewWhere(filters);

    const [commitsRes, prsRes, reviewsRes, issuesRes] = await Promise.all([
      pool.query(
        `SELECT TO_CHAR(c.committed_at, 'YYYY-MM-DD') as date, COUNT(*) as count, COALESCE(SUM(c.additions), 0) as additions, COALESCE(SUM(c.deletions), 0) as deletions
         FROM commits c
         JOIN repositories r ON r.id = c.repository_id
         LEFT JOIN developers d ON d.id = c.developer_id
         ${commitWhere}
         GROUP BY TO_CHAR(c.committed_at, 'YYYY-MM-DD')
         ORDER BY date ASC`,
        commitParams
      ),
      pool.query(
        `SELECT TO_CHAR(pr.created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
         FROM pull_requests pr
         JOIN repositories r ON r.id = pr.repository_id
         LEFT JOIN developers d ON d.id = pr.author_developer_id
         ${prWhere}
         GROUP BY TO_CHAR(pr.created_at, 'YYYY-MM-DD')
         ORDER BY date ASC`,
        prParams
      ),
      pool.query(
        `SELECT TO_CHAR(prr.submitted_at, 'YYYY-MM-DD') as date, COUNT(*) as count
         FROM pull_request_reviews prr
         JOIN pull_requests pr ON pr.id = prr.pull_request_id
         JOIN repositories r ON r.id = pr.repository_id
         LEFT JOIN developers d ON d.id = prr.reviewer_developer_id
         ${prrWhere}
         GROUP BY TO_CHAR(prr.submitted_at, 'YYYY-MM-DD')
         ORDER BY date ASC`,
        prrParams
      ),
      pool.query(
        `SELECT TO_CHAR(i.created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
         FROM issues i
         JOIN repositories r ON r.id = i.repository_id
         LEFT JOIN developers d ON d.id = i.author_developer_id
         ${issueWhere}
         GROUP BY TO_CHAR(i.created_at, 'YYYY-MM-DD')
         ORDER BY date ASC`,
        issueParams
      ),
    ]);

    const dateMap = new Map<string, any>();

    for (const row of commitsRes.rows) {
      dateMap.set(row.date, {
        date: row.date,
        commits: parseInt(row.count, 10),
        pullRequests: 0,
        prs: 0,
        reviews: 0,
        issues: 0,
        additions: parseInt(row.additions, 10),
        deletions: parseInt(row.deletions, 10),
      });
    }

    for (const row of prsRes.rows) {
      const entry = dateMap.get(row.date) || {
        date: row.date,
        commits: 0,
        pullRequests: 0,
        prs: 0,
        reviews: 0,
        issues: 0,
        additions: 0,
        deletions: 0,
      };
      const count = parseInt(row.count, 10);
      entry.pullRequests = count;
      entry.prs = count;
      dateMap.set(row.date, entry);
    }

    for (const row of reviewsRes.rows) {
      const entry = dateMap.get(row.date) || {
        date: row.date,
        commits: 0,
        pullRequests: 0,
        prs: 0,
        reviews: 0,
        issues: 0,
        additions: 0,
        deletions: 0,
      };
      entry.reviews = parseInt(row.count, 10);
      dateMap.set(row.date, entry);
    }

    for (const row of issuesRes.rows) {
      const entry = dateMap.get(row.date) || {
        date: row.date,
        commits: 0,
        pullRequests: 0,
        prs: 0,
        reviews: 0,
        issues: 0,
        additions: 0,
        deletions: 0,
      };
      entry.issues = parseInt(row.count, 10);
      dateMap.set(row.date, entry);
    }

    let trends = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    if (filters.activityType) {
      const type = filters.activityType.toLowerCase();
      trends = trends.map((t) => {
        let count = 0;
        if (type.includes('commit')) count = t.commits;
        else if (type.includes('pr') || type.includes('pull')) count = t.pullRequests;
        else if (type.includes('review')) count = t.reviews;
        else if (type.includes('issue')) count = t.issues;
        return { ...t, count };
      });
    }

    this.setCache(cacheKey, trends);
    return trends;
  }

  // 1. Overview API with parallel query execution and in-memory caching
  async getDashboardOverview(filters: DashboardFilters & { preset?: string }) {
    const cacheKey = `overview_${JSON.stringify(filters)}`;
    const cached = this.getCached<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const { whereSql: commitWhere, params: commitParams } = this.buildCommitWhere(filters);
    const { whereSql: prWhere, params: prParams } = this.buildPRWhere(filters);
    const { whereSql: issueWhere, params: issueParams } = this.buildIssueWhere(filters);
    const { whereSql: prrWhere, params: prrParams } = this.buildReviewWhere(filters);

    // Execute all independent queries concurrently in parallel with Promise.all
    const [
      projectsRes,
      reposRes,
      activeReposRes,
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
      filters.organizationId
        ? pool.query("SELECT COUNT(*) FROM repositories WHERE (organization_id = $1 OR project_id IN (SELECT id FROM projects WHERE organization_id = $1)) AND (UPPER(sync_status) = 'SYNCED' OR UPPER(sync_status) = 'ACTIVE')", [filters.organizationId])
        : pool.query("SELECT COUNT(*) FROM repositories WHERE UPPER(sync_status) = 'SYNCED' OR UPPER(sync_status) = 'ACTIVE'"),
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
        prParams
      ),
      pool.query(
        `SELECT 
          COUNT(*) as issues_opened,
          COUNT(*) FILTER (WHERE UPPER(i.state) = 'CLOSED') as issues_closed,
          COUNT(*) FILTER (WHERE UPPER(i.state) = 'OPEN') as open_issues
         FROM issues i
         JOIN repositories r ON r.id = i.repository_id
         LEFT JOIN developers d ON d.id = i.author_developer_id
         ${issueWhere}`,
        issueParams
      ),
      pool.query(
        `SELECT COUNT(*) as total_reviews
         FROM pull_request_reviews prr
         JOIN pull_requests pr ON pr.id = prr.pull_request_id
         JOIN repositories r ON r.id = pr.repository_id
         LEFT JOIN developers d ON d.id = prr.reviewer_developer_id
         ${prrWhere}`,
        prrParams
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
        prParams
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
        prrParams
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
        issueParams
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
      activeRepositories: parseInt(activeReposRes.rows[0]?.count || '0', 10),
      activeDevelopers: parseInt(cRow.active_devs || '0', 10),
      totalDevelopers: parseInt(cRow.active_devs || '0', 10),
      totalCommits: parseInt(cRow.total_commits || '0', 10),
      totalPRs: parseInt(pRow.total_prs || '0', 10),
      pullRequests: parseInt(pRow.total_prs || '0', 10),
      mergedPRs: parseInt(pRow.merged_prs || '0', 10),
      openPRs: parseInt(pRow.open_prs || '0', 10),
      issuesOpened: parseInt(iRow.issues_opened || '0', 10),
      issuesClosed: parseInt(iRow.issues_closed || '0', 10),
      openIssues: parseInt(iRow.open_issues || '0', 10),
      linesAdded: parseInt(cRow.lines_added || '0', 10),
      linesDeleted: parseInt(cRow.lines_deleted || '0', 10),
      codeAdded: parseInt(cRow.lines_added || '0', 10),
      codeRemoved: parseInt(cRow.lines_deleted || '0', 10),
      netCodeImpact: parseInt(cRow.lines_added || '0', 10) - parseInt(cRow.lines_deleted || '0', 10),
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

    // Cache the aggregated overview result for 60 seconds (cleared automatically on sync/webhook)
    this.setCache(cacheKey, overviewResult, 60000);
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
    const { whereSql: prWhere, params: prParams } = this.buildPRWhere(filters);

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
      prParams
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
      prParams
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
    const { whereSql: issueWhere, params: issueParams } = this.buildIssueWhere(filters);

    const summaryRes = await pool.query(
      `SELECT 
        COUNT(*) as total_issues,
        COUNT(*) FILTER (WHERE UPPER(i.state) = 'OPEN') as open_issues,
        COUNT(*) FILTER (WHERE UPPER(i.state) = 'CLOSED') as closed_issues
       FROM issues i
       JOIN repositories r ON r.id = i.repository_id
       LEFT JOIN developers d ON d.id = i.author_developer_id
       ${issueWhere}`,
      issueParams
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
      issueParams
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

  async getDailyAnalytics(filters: DashboardFilters & { preset?: string }) {
    const { from, to } = this.resolveDateRange(filters);
    const effectiveFilters: DashboardFilters = {
      ...filters,
      dateFrom: from,
      dateTo: to,
    };

    const { whereSql: commitWhere, params: commitParams } = this.buildCommitWhere(effectiveFilters);
    const { whereSql: prWhere, params: prParams } = this.buildPRWhere(effectiveFilters);
    const { whereSql: issueWhere, params: issueParams } = this.buildIssueWhere(effectiveFilters);
    const { whereSql: prrWhere, params: prrParams } = this.buildReviewWhere(effectiveFilters);

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
      prParams
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
      prrParams
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
      issueParams
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

  // 9. Repository Detail API (Full synchronized analytics for a single repository)
  async getRepositoryFullDetail(repositoryIdOrName: string, organizationId?: string) {
    // Find repository record first
    let repoRes;
    if (organizationId) {
      repoRes = await pool.query(
        `SELECT * FROM repositories 
         WHERE (id = $1 OR LOWER(full_name) = LOWER($1)) 
           AND (organization_id = $2 OR project_id IN (SELECT id FROM projects WHERE organization_id = $2))`,
        [repositoryIdOrName, organizationId]
      );
    } else {
      repoRes = await pool.query(
        `SELECT * FROM repositories WHERE id = $1 OR LOWER(full_name) = LOWER($1)`,
        [repositoryIdOrName]
      );
    }

    if (repoRes.rows.length === 0) {
      return null;
    }

    const repo = repoRes.rows[0];
    const repoId = repo.id;

    // Run parallel queries to gather all detail data from child tables
    const [
      metricsRes,
      overviewRes,
      developersRes,
      recentActivityRes,
      commitsRes,
      prsRes,
      issuesRes,
      codeChangesTrendRes,
      topFilesRes,
      branchesRes,
    ] = await Promise.all([
      // 1. Aggregated Metrics
      pool.query(
        `SELECT 
          COUNT(DISTINCT c.id) as commits_count,
          COUNT(DISTINCT pr.id) as prs_count,
          COUNT(DISTINCT i.id) as issues_count,
          COUNT(DISTINCT c.developer_id) as developers_count,
          COALESCE(SUM(c.additions), 0) as lines_added,
          COALESCE(SUM(c.deletions), 0) as lines_deleted,
          MAX(c.committed_at) as last_activity
         FROM repositories r
         LEFT JOIN commits c ON c.repository_id = r.id
         LEFT JOIN pull_requests pr ON pr.repository_id = r.id
         LEFT JOIN issues i ON i.repository_id = r.id
         WHERE r.id = $1
         GROUP BY r.id`,
        [repoId]
      ),

      // 2. Overview Counts
      pool.query(
        `SELECT 
          COUNT(*) FILTER (WHERE UPPER(pr.state) = 'OPEN') as open_prs_count,
          COUNT(*) FILTER (WHERE pr.merged = true OR UPPER(pr.state) = 'MERGED') as merged_prs_count,
          (SELECT COUNT(*) FROM issues WHERE repository_id = $1 AND UPPER(state) = 'OPEN') as open_issues_count,
          (SELECT COUNT(*) FROM issues WHERE repository_id = $1 AND UPPER(state) = 'CLOSED') as closed_issues_count
         FROM pull_requests pr
         WHERE pr.repository_id = $1`,
        [repoId]
      ),

      // 3. Developers/Contributors
      pool.query(
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
         JOIN repository_developers rd ON rd.developer_id = d.id
         LEFT JOIN commits c ON c.developer_id = d.id AND c.repository_id = $1
         LEFT JOIN pull_requests pr ON pr.author_developer_id = d.id AND pr.repository_id = $1
         LEFT JOIN pull_request_reviews prr ON prr.reviewer_developer_id = d.id AND prr.pull_request_id IN (SELECT id FROM pull_requests WHERE repository_id = $1)
         WHERE rd.repository_id = $1
         GROUP BY d.id, d.name, d.login, d.avatar_url
         ORDER BY commits DESC, prs DESC, d.login ASC`,
        [repoId]
      ),

      // 4. Recent Activity Feed
      pool.query(
        `SELECT 
          ae.id,
          ae.event_type as type,
          ae.occurred_at,
          ae.metadata,
          r.name as repo_name,
          COALESCE(d.name, d.login, 'System') as author,
          d.avatar_url as author_avatar
         FROM activity_events ae
         JOIN repositories r ON r.id = ae.repository_id
         LEFT JOIN developers d ON d.id = ae.developer_id
         WHERE ae.repository_id = $1
         ORDER BY ae.occurred_at DESC
         LIMIT 20`,
        [repoId]
      ),

      // 5. Commits
      pool.query(
        `SELECT 
          c.id,
          c.repository_id,
          c.github_commit_sha as github_sha,
          c.developer_id,
          c.message,
          c.commit_url,
          c.committed_at,
          c.additions,
          c.deletions,
          c.changed_files,
          d.id as dev_id,
          d.name as dev_name,
          d.login as dev_login,
          d.avatar_url as dev_avatar
         FROM commits c
         LEFT JOIN developers d ON d.id = c.developer_id
         WHERE c.repository_id = $1
         ORDER BY c.committed_at DESC
         LIMIT 50`,
        [repoId]
      ),

      // 6. Pull Requests
      pool.query(
        `SELECT 
          pr.id,
          pr.repository_id,
          pr.github_pr_id,
          pr.number,
          pr.author_developer_id,
          pr.title,
          pr.body,
          pr.state,
          pr.merged,
          pr.created_at,
          pr.updated_at,
          pr.closed_at,
          pr.merged_at,
          pr.additions,
          pr.deletions,
          pr.changed_files,
          d.id as dev_id,
          d.name as dev_name,
          d.login as dev_login,
          d.avatar_url as dev_avatar
         FROM pull_requests pr
         LEFT JOIN developers d ON d.id = pr.author_developer_id
         WHERE pr.repository_id = $1
         ORDER BY pr.created_at DESC
         LIMIT 50`,
        [repoId]
      ),

      // 7. Issues
      pool.query(
        `SELECT 
          i.id,
          i.github_issue_id,
          i.number,
          i.title,
          i.state,
          i.created_at,
          i.updated_at,
          i.closed_at,
          r.name as repo_name,
          d.name as author_name,
          d.login as author_login,
          d.avatar_url as author_avatar
         FROM issues i
         JOIN repositories r ON r.id = i.repository_id
         LEFT JOIN developers d ON d.id = i.author_developer_id
         WHERE i.repository_id = $1
         ORDER BY i.created_at DESC
         LIMIT 50`,
        [repoId]
      ),

      // 8. Code Changes Trend by date
      pool.query(
        `SELECT 
          TO_CHAR(committed_at, 'YYYY-MM-DD') as date,
          COALESCE(SUM(additions), 0) as additions,
          COALESCE(SUM(deletions), 0) as deletions
         FROM commits
         WHERE repository_id = $1
         GROUP BY TO_CHAR(committed_at, 'YYYY-MM-DD')
         ORDER BY date ASC`,
        [repoId]
      ),

      // 9. Top Files Changed
      pool.query(
        `SELECT 
          cf.filename as name,
          COALESCE(SUM(cf.additions), 0) as additions,
          COALESCE(SUM(cf.deletions), 0) as deletions
         FROM commit_files cf
         JOIN commits c ON c.id = cf.commit_id
         WHERE c.repository_id = $1
         GROUP BY cf.filename
         ORDER BY (COALESCE(SUM(cf.additions), 0) + COALESCE(SUM(cf.deletions), 0)) DESC
         LIMIT 10`,
        [repoId]
      ),

      // 10. Branches
      pool.query(
        `SELECT name, is_default, is_protected, head_sha FROM branches WHERE repository_id = $1 ORDER BY is_default DESC, name ASC`,
        [repoId]
      ),
    ]);

    const mRow = metricsRes.rows[0] || {};
    const oRow = overviewRes.rows[0] || {};

    const commitsCount = parseInt(mRow.commits_count || '0', 10);
    const prsCount = parseInt(mRow.prs_count || '0', 10);
    const issuesCount = parseInt(mRow.issues_count || '0', 10);
    const developersCount = parseInt(mRow.developers_count || '0', 10);
    const linesAdded = parseInt(mRow.lines_added || '0', 10);
    const linesDeleted = parseInt(mRow.lines_deleted || '0', 10);
    const lastActivityAt = mRow.last_activity ? new Date(mRow.last_activity).toISOString() : (repo.last_synced_at ? new Date(repo.last_synced_at).toISOString() : new Date().toISOString());

    const branches = branchesRes.rows.map((b) => ({
      name: b.name,
      isDefault: b.is_default,
      isProtected: b.is_protected,
      headSha: b.head_sha,
    }));

    const repository = {
      id: repo.id,
      projectId: repo.project_id,
      githubId: repo.github_repository_id,
      owner: repo.owner,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      defaultBranch: repo.default_branch || 'main',
      branches,
      language: repo.language || 'TypeScript',
      isActive: true,
      isPrivate: repo.is_private,
      status: (repo.sync_status || 'ACTIVE').toUpperCase(),
      lastSyncedAt: repo.last_synced_at ? new Date(repo.last_synced_at).toISOString() : null,
      createdAt: repo.created_at ? new Date(repo.created_at).toISOString() : new Date().toISOString(),
      updatedAt: repo.updated_at ? new Date(repo.updated_at).toISOString() : new Date().toISOString(),
      metrics: {
        developersCount,
        commitsCount,
        prsCount,
        issuesCount,
        linesAdded,
        linesDeleted,
        lastActivityAt,
      },
    };

    const overview = {
      openPRsCount: parseInt(oRow.open_prs_count || '0', 10),
      mergedPRsCount: parseInt(oRow.merged_prs_count || '0', 10),
      openIssuesCount: parseInt(oRow.open_issues_count || '0', 10),
      closedIssuesCount: parseInt(oRow.closed_issues_count || '0', 10),
      activeBranch: repo.default_branch || 'main',
      readOnlyStatus: true,
    };

    const developers = developersRes.rows.map((d) => ({
      id: d.id,
      name: d.name || d.login,
      login: d.login,
      avatarUrl: d.avatar_url || undefined,
      commits: parseInt(d.commits || '0', 10),
      prs: parseInt(d.prs || '0', 10),
      reviews: parseInt(d.reviews || '0', 10),
      linesAdded: parseInt(d.lines_added || '0', 10),
      linesDeleted: parseInt(d.lines_deleted || '0', 10),
    }));

    let recentActivity = recentActivityRes.rows.map((r) => {
      let eventType: 'commit' | 'pull_request' | 'review' | 'issue' = 'commit';
      if (r.type.includes('pr') || r.type.includes('pull')) eventType = 'pull_request';
      else if (r.type.includes('issue')) eventType = 'issue';
      else if (r.type.includes('review')) eventType = 'review';

      return {
        id: r.id,
        type: eventType,
        title: r.metadata?.message || r.metadata?.title || `Event: ${r.type}`,
        repoName: r.repo_name,
        author: r.author,
        authorAvatar: r.author_avatar || undefined,
        timeAgo: r.occurred_at ? new Date(r.occurred_at).toLocaleDateString() : 'recently',
        status: r.metadata?.state,
        url: r.metadata?.url,
      };
    });

    // Fallback recent activity from commits if activity_events table is empty
    if (recentActivity.length === 0 && commitsRes.rows.length > 0) {
      recentActivity = commitsRes.rows.slice(0, 10).map((c) => ({
        id: c.id,
        type: 'commit',
        title: c.message,
        repoName: repo.name,
        author: c.dev_name || c.dev_login || 'Developer',
        authorAvatar: c.dev_avatar || undefined,
        timeAgo: c.committed_at ? new Date(c.committed_at).toLocaleDateString() : 'recently',
        status: `+${c.additions} / -${c.deletions}`,
        details: `+${c.additions} / -${c.deletions} lines`,
        url: c.commit_url,
      }));
    }

    const commits = commitsRes.rows.map((c) => ({
      id: c.id,
      repositoryId: c.repository_id,
      githubSha: c.github_sha,
      authorId: c.developer_id,
      message: c.message,
      commitUrl: c.commit_url,
      committedAt: c.committed_at ? new Date(c.committed_at).toISOString() : new Date().toISOString(),
      additions: parseInt(c.additions || '0', 10),
      deletions: parseInt(c.deletions || '0', 10),
      changedFiles: parseInt(c.changed_files || '0', 10),
      repository: {
        id: repo.id,
        owner: repo.owner,
        name: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
      },
      author: c.dev_id
        ? {
            id: c.dev_id,
            login: c.dev_login,
            name: c.dev_name || c.dev_login,
            avatarUrl: c.dev_avatar || undefined,
          }
        : null,
    }));

    const pullRequests = prsRes.rows.map((pr) => {
      let prState = (pr.state || 'OPEN').toUpperCase();
      if (pr.merged) prState = 'MERGED';

      return {
        id: pr.id,
        repositoryId: pr.repository_id,
        githubPrId: pr.github_pr_id,
        number: parseInt(pr.number, 10),
        authorId: pr.author_developer_id,
        title: pr.title,
        body: pr.body || null,
        state: prState as any,
        createdAt: pr.created_at ? new Date(pr.created_at).toISOString() : new Date().toISOString(),
        updatedAt: pr.updated_at ? new Date(pr.updated_at).toISOString() : new Date().toISOString(),
        closedAt: pr.closed_at ? new Date(pr.closed_at).toISOString() : null,
        mergedAt: pr.merged_at ? new Date(pr.merged_at).toISOString() : null,
        additions: parseInt(pr.additions || '0', 10),
        deletions: parseInt(pr.deletions || '0', 10),
        changedFiles: parseInt(pr.changed_files || '0', 10),
        author: pr.dev_id
          ? {
              id: pr.dev_id,
              login: pr.dev_login,
              name: pr.dev_name || pr.dev_login,
              avatarUrl: pr.dev_avatar || undefined,
            }
          : null,
      };
    });

    const issues = issuesRes.rows.map((i) => ({
      id: i.id,
      number: parseInt(i.number, 10),
      title: i.title,
      repoName: i.repo_name,
      author: i.author_name || i.author_login || 'Developer',
      authorAvatar: i.author_avatar || undefined,
      state: (i.state || 'OPEN').toUpperCase() as any,
      createdAt: i.created_at ? new Date(i.created_at).toISOString() : new Date().toISOString(),
      updatedAt: i.updated_at ? new Date(i.updated_at).toISOString() : new Date().toISOString(),
    }));

    const codeChangesTrend = codeChangesTrendRes.rows.map((r) => ({
      date: r.date,
      additions: parseInt(r.additions || '0', 10),
      deletions: parseInt(r.deletions || '0', 10),
    }));

    const topFilesChanged = topFilesRes.rows.map((r) => ({
      name: r.name,
      repoName: repo.name,
      additions: parseInt(r.additions || '0', 10),
      deletions: parseInt(r.deletions || '0', 10),
    }));

    return {
      repository,
      branches,
      overview,
      developers,
      recentActivity,
      commits,
      pullRequests,
      issues,
      codeChanges: {
        trend: codeChangesTrend,
        totalAdditions: linesAdded,
        totalDeletions: linesDeleted,
        netChanges: linesAdded - linesDeleted,
        topFilesChanged,
      },
    };
  }
}

export const analyticsService = new AnalyticsService();


