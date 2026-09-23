import { pool } from '../db/connection.js';

export interface DeveloperRow {
  id: string;
  github_user_id: number | string | null;
  login: string;
  name: string | null;
  avatar_url: string | null;
  html_url: string | null;
  email: string | null;
  type: string;
  created_at: Date;
  updated_at: Date;
}

export interface DeveloperMetrics {
  commitCount: number;
  prCount: number;
  reviewCount: number;
  issueCount: number;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export class DeveloperRepository {
  async findAll(): Promise<DeveloperRow[]> {
    const res = await pool.query('SELECT * FROM developers ORDER BY login ASC');
    return res.rows;
  }

  async findById(id: string): Promise<DeveloperRow | null> {
    const res = await pool.query('SELECT * FROM developers WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async findByLogin(login: string): Promise<DeveloperRow | null> {
    const res = await pool.query('SELECT * FROM developers WHERE LOWER(login) = LOWER($1)', [login]);
    return res.rows[0] || null;
  }

  async upsert(data: {
    id: string;
    githubUserId?: number | string | null;
    login: string;
    name?: string | null;
    avatarUrl?: string | null;
    htmlUrl?: string | null;
    email?: string | null;
    type?: string;
  }): Promise<DeveloperRow> {
    const query = `
      INSERT INTO developers (id, github_user_id, login, name, avatar_url, html_url, email, type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (login) DO UPDATE SET
        github_user_id = COALESCE(EXCLUDED.github_user_id, developers.github_user_id),
        name = COALESCE(EXCLUDED.name, developers.name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, developers.avatar_url),
        html_url = COALESCE(EXCLUDED.html_url, developers.html_url),
        email = COALESCE(EXCLUDED.email, developers.email),
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      data.id,
      data.githubUserId || null,
      data.login,
      data.name || null,
      data.avatarUrl || null,
      data.htmlUrl || `https://github.com/${data.login}`,
      data.email || null,
      data.type || 'User',
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  }

  async linkToRepository(repositoryId: string, developerId: string): Promise<void> {
    await pool.query(
      `INSERT INTO repository_developers (repository_id, developer_id, first_seen_at, last_seen_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (repository_id, developer_id) DO UPDATE SET last_seen_at = NOW()`,
      [repositoryId, developerId]
    );
  }

  async getMetricsForDeveloper(developerId: string, dateFrom?: string, dateTo?: string): Promise<DeveloperMetrics> {
    const commitParams: any[] = [developerId];
    let commitWhere = 'WHERE developer_id = $1';
    let pIdx = 2;
    if (dateFrom) {
      commitWhere += ` AND committed_at >= $${pIdx}`;
      commitParams.push(new Date(dateFrom));
      pIdx++;
    }
    if (dateTo) {
      commitWhere += ` AND committed_at <= $${pIdx}`;
      commitParams.push(new Date(dateTo));
      pIdx++;
    }

    const commitRes = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(additions), 0) as additions, COALESCE(SUM(deletions), 0) as deletions, COALESCE(SUM(changed_files), 0) as changed_files FROM commits ${commitWhere}`,
      commitParams
    );

    const prParams: any[] = [developerId];
    let prWhere = 'WHERE author_developer_id = $1';
    pIdx = 2;
    if (dateFrom) {
      prWhere += ` AND created_at >= $${pIdx}`;
      prParams.push(new Date(dateFrom));
      pIdx++;
    }
    if (dateTo) {
      prWhere += ` AND created_at <= $${pIdx}`;
      prParams.push(new Date(dateTo));
      pIdx++;
    }
    const prRes = await pool.query(`SELECT COUNT(*) as count FROM pull_requests ${prWhere}`, prParams);

    const reviewParams: any[] = [developerId];
    let reviewWhere = 'WHERE reviewer_developer_id = $1';
    pIdx = 2;
    if (dateFrom) {
      reviewWhere += ` AND submitted_at >= $${pIdx}`;
      reviewParams.push(new Date(dateFrom));
      pIdx++;
    }
    if (dateTo) {
      reviewWhere += ` AND submitted_at <= $${pIdx}`;
      reviewParams.push(new Date(dateTo));
      pIdx++;
    }
    const reviewRes = await pool.query(`SELECT COUNT(*) as count FROM pull_request_reviews ${reviewWhere}`, reviewParams);

    const issueParams: any[] = [developerId];
    let issueWhere = 'WHERE author_developer_id = $1';
    pIdx = 2;
    if (dateFrom) {
      issueWhere += ` AND created_at >= $${pIdx}`;
      issueParams.push(new Date(dateFrom));
      pIdx++;
    }
    if (dateTo) {
      issueWhere += ` AND created_at <= $${pIdx}`;
      issueParams.push(new Date(dateTo));
      pIdx++;
    }
    const issueRes = await pool.query(`SELECT COUNT(*) as count FROM issues ${issueWhere}`, issueParams);

    const cRow = commitRes.rows[0];
    return {
      commitCount: parseInt(cRow?.count || '0', 10),
      prCount: parseInt(prRes.rows[0]?.count || '0', 10),
      reviewCount: parseInt(reviewRes.rows[0]?.count || '0', 10),
      issueCount: parseInt(issueRes.rows[0]?.count || '0', 10),
      additions: parseInt(cRow?.additions || '0', 10),
      deletions: parseInt(cRow?.deletions || '0', 10),
      changedFiles: parseInt(cRow?.changed_files || '0', 10),
    };
  }

  async findWithMetrics(options: { dateFrom?: string; dateTo?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const offset = (page - 1) * limit;

    const countRes = await pool.query('SELECT COUNT(*) FROM developers');
    const total = parseInt(countRes.rows[0].count, 10);

    const devRes = await pool.query('SELECT * FROM developers ORDER BY login ASC LIMIT $1 OFFSET $2', [limit, offset]);
    const developers = devRes.rows;

    const results = [];
    for (const dev of developers) {
      const metrics = await this.getMetricsForDeveloper(dev.id, options.dateFrom, options.dateTo);
      results.push({
        ...dev,
        metrics,
      });
    }

    return {
      data: results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const developerRepository = new DeveloperRepository();
