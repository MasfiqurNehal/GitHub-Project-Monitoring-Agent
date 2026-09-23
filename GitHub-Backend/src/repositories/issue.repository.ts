import { pool } from '../db/connection.js';

export interface IssueRow {
  id: string;
  repository_id: string;
  github_issue_id: number | string;
  number: number;
  author_developer_id: string | null;
  assignee_developer_id?: string | null;
  title: string;
  body: string | null;
  state: string;
  labels?: any;
  closed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  comments_count: number;
  html_url: string | null;
}

export interface IssueFilterOptions {
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  state?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export class IssueRepository {
  private schemaEnsured = false;

  private async ensureSchema() {
    if (this.schemaEnsured) return;
    try {
      await pool.query(`
        ALTER TABLE issues ADD COLUMN IF NOT EXISTS assignee_developer_id VARCHAR(36) REFERENCES developers(id) ON DELETE SET NULL;
        ALTER TABLE issues ADD COLUMN IF NOT EXISTS labels JSONB DEFAULT '[]'::jsonb;
      `);
      this.schemaEnsured = true;
    } catch (err) {
      // Schema may already exist
      this.schemaEnsured = true;
    }
  }

  async upsert(data: {
    id: string;
    repositoryId: string;
    githubIssueId: number | string;
    number: number;
    authorDeveloperId?: string | null;
    assigneeDeveloperId?: string | null;
    title: string;
    body?: string | null;
    state: string;
    labels?: string[];
    closedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    commentsCount?: number;
    htmlUrl?: string | null;
  }): Promise<IssueRow> {
    await this.ensureSchema();
    const query = `
      INSERT INTO issues (
        id, repository_id, github_issue_id, number, author_developer_id, assignee_developer_id,
        title, body, state, labels, closed_at, created_at, updated_at, comments_count, html_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      ON CONFLICT (repository_id, github_issue_id) DO UPDATE SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        state = EXCLUDED.state,
        author_developer_id = COALESCE(EXCLUDED.author_developer_id, issues.author_developer_id),
        assignee_developer_id = COALESCE(EXCLUDED.assignee_developer_id, issues.assignee_developer_id),
        labels = EXCLUDED.labels,
        closed_at = EXCLUDED.closed_at,
        updated_at = EXCLUDED.updated_at,
        comments_count = EXCLUDED.comments_count
      RETURNING *
    `;

    const values = [
      data.id,
      data.repositoryId,
      data.githubIssueId,
      data.number,
      data.authorDeveloperId || null,
      data.assigneeDeveloperId || null,
      data.title,
      data.body || null,
      data.state.toUpperCase(),
      JSON.stringify(data.labels || []),
      data.closedAt || null,
      data.createdAt,
      data.updatedAt,
      data.commentsCount || 0,
      data.htmlUrl || null,
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  }

  async findIssues(options: IssueFilterOptions) {
    await this.ensureSchema();
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (options.repositoryId) {
      conditions.push(`(i.repository_id = $${pIdx} OR r.full_name = $${pIdx} OR r.name = $${pIdx})`);
      params.push(options.repositoryId);
      pIdx++;
    }

    if (options.projectId) {
      conditions.push(`r.project_id = $${pIdx}`);
      params.push(options.projectId);
      pIdx++;
    }

    if (options.developerId) {
      conditions.push(`(i.author_developer_id = $${pIdx} OR i.assignee_developer_id = $${pIdx} OR da.login = $${pIdx} OR das.login = $${pIdx})`);
      params.push(options.developerId);
      pIdx++;
    }

    if (options.state && options.state.toUpperCase() !== 'ALL') {
      conditions.push(`UPPER(i.state) = UPPER($${pIdx})`);
      params.push(options.state);
      pIdx++;
    }

    if (options.dateFrom) {
      conditions.push(`i.created_at >= $${pIdx}`);
      params.push(new Date(options.dateFrom));
      pIdx++;
    }

    if (options.dateTo) {
      conditions.push(`i.created_at <= $${pIdx}`);
      params.push(new Date(options.dateTo));
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) 
      FROM issues i
      JOIN repositories r ON r.id = i.repository_id
      LEFT JOIN developers da ON da.id = i.author_developer_id
      LEFT JOIN developers das ON das.id = i.assignee_developer_id
      ${whereClause}
    `;

    const dataSql = `
      SELECT 
        i.*,
        r.name as repo_name,
        r.full_name as repo_full_name,
        da.id as author_id,
        da.login as author_login,
        da.name as author_name,
        da.avatar_url as author_avatar_url,
        da.html_url as author_html_url,
        das.id as assignee_id,
        das.login as assignee_login,
        das.name as assignee_name,
        das.avatar_url as assignee_avatar_url,
        das.html_url as assignee_html_url
      FROM issues i
      JOIN repositories r ON r.id = i.repository_id
      LEFT JOIN developers da ON da.id = i.author_developer_id
      LEFT JOIN developers das ON das.id = i.assignee_developer_id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;

    const countRes = await pool.query(countSql, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await pool.query(dataSql, [...params, limit, offset]);

    const formattedIssues = dataRes.rows.map((row) => ({
      id: row.id,
      repositoryId: row.repository_id,
      githubIssueId: row.github_issue_id,
      number: row.number,
      title: row.title,
      body: row.body,
      state: row.state,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      closedAt: row.closed_at,
      commentsCount: row.comments_count || 0,
      labels: Array.isArray(row.labels) ? row.labels : (typeof row.labels === 'string' ? JSON.parse(row.labels || '[]') : []),
      url: row.html_url,
      repository: {
        id: row.repository_id,
        name: row.repo_name,
        fullName: row.repo_full_name,
      },
      author: row.author_login
        ? {
            id: row.author_id,
            login: row.author_login,
            name: row.author_name || row.author_login,
            avatarUrl: row.author_avatar_url,
            profileUrl: row.author_html_url,
          }
        : null,
      assignee: row.assignee_login
        ? {
            id: row.assignee_id,
            login: row.assignee_login,
            name: row.assignee_name || row.assignee_login,
            avatarUrl: row.assignee_avatar_url,
            profileUrl: row.assignee_html_url,
          }
        : null,
    }));

    return {
      data: formattedIssues,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findDetailById(idOrNumber: string): Promise<any | null> {
    await this.ensureSchema();
    const issueRes = await pool.query(
      `SELECT 
        i.*,
        r.name as repo_name,
        r.full_name as repo_full_name,
        da.id as author_id,
        da.login as author_login,
        da.name as author_name,
        da.avatar_url as author_avatar_url,
        da.html_url as author_html_url,
        das.id as assignee_id,
        das.login as assignee_login,
        das.name as assignee_name,
        das.avatar_url as assignee_avatar_url,
        das.html_url as assignee_html_url
       FROM issues i
       LEFT JOIN repositories r ON i.repository_id = r.id
       LEFT JOIN developers da ON i.author_developer_id = da.id
       LEFT JOIN developers das ON i.assignee_developer_id = das.id
       WHERE i.id = $1 OR CAST(i.number AS TEXT) = $1 OR CAST(i.github_issue_id AS TEXT) = $1`,
      [idOrNumber]
    );

    if (issueRes.rows.length === 0) return null;
    const row = issueRes.rows[0];

    return {
      id: row.id,
      repositoryId: row.repository_id,
      githubIssueId: row.github_issue_id,
      number: row.number,
      title: row.title,
      body: row.body,
      state: row.state,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      closedAt: row.closed_at,
      commentsCount: row.comments_count || 0,
      labels: Array.isArray(row.labels) ? row.labels : (typeof row.labels === 'string' ? JSON.parse(row.labels || '[]') : []),
      url: row.html_url,
      repository: {
        id: row.repository_id,
        name: row.repo_name,
        fullName: row.repo_full_name,
      },
      author: row.author_login
        ? {
            id: row.author_id,
            login: row.author_login,
            name: row.author_name || row.author_login,
            avatarUrl: row.author_avatar_url,
            profileUrl: row.author_html_url,
          }
        : null,
      assignee: row.assignee_login
        ? {
            id: row.assignee_id,
            login: row.assignee_login,
            name: row.assignee_name || row.assignee_login,
            avatarUrl: row.assignee_avatar_url,
            profileUrl: row.assignee_html_url,
          }
        : null,
    };
  }

  async findByDeveloper(developerId: string, options: { repositoryId?: string; state?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) {
    return this.findIssues({
      ...options,
      developerId,
    });
  }
}

export const issueRepository = new IssueRepository();
