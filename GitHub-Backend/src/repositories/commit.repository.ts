import { pool } from '../db/connection.js';

export interface CommitRow {
  id: string;
  repository_id: string;
  github_commit_sha: string;
  developer_id: string | null;
  branch: string | null;
  message: string;
  commit_url: string;
  committed_at: Date;
  authored_at: Date | null;
  additions: number;
  deletions: number;
  changed_files: number;
  parent_count: number;
  is_merge_commit: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CommitFileRow {
  id: string;
  commit_id: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
  previous_filename: string | null;
  created_at: Date;
}

export interface CommitFilterOptions {
  organizationId?: string;
  repositoryId?: string;
  developerId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export class CommitRepository {
  private schemaEnsured = false;

  private async ensureSchema() {
    if (this.schemaEnsured) return;
    try {
      await pool.query(`
        ALTER TABLE commits ALTER COLUMN id TYPE VARCHAR(64);
        ALTER TABLE commit_files ALTER COLUMN commit_id TYPE VARCHAR(64);
      `);
      this.schemaEnsured = true;
    } catch (err) {
      this.schemaEnsured = true;
    }
  }

  async upsert(data: {
    id: string;
    repositoryId: string;
    githubCommitSha: string;
    developerId?: string | null;
    branch?: string | null;
    message: string;
    commitUrl: string;
    committedAt: Date;
    authoredAt?: Date | null;
    additions?: number;
    deletions?: number;
    changedFiles?: number;
    parentCount?: number;
    isMergeCommit?: boolean;
  }): Promise<CommitRow> {
    await this.ensureSchema();
    const query = `
      INSERT INTO commits (
        id, repository_id, github_commit_sha, developer_id, branch,
        message, commit_url, committed_at, authored_at, additions,
        deletions, changed_files, parent_count, is_merge_commit, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, NOW(), NOW()
      )
      ON CONFLICT (repository_id, github_commit_sha) DO UPDATE SET
        developer_id = COALESCE(EXCLUDED.developer_id, commits.developer_id),
        message = EXCLUDED.message,
        additions = EXCLUDED.additions,
        deletions = EXCLUDED.deletions,
        changed_files = EXCLUDED.changed_files,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      data.id,
      data.repositoryId,
      data.githubCommitSha,
      data.developerId || null,
      data.branch || null,
      data.message,
      data.commitUrl,
      data.committedAt,
      data.authoredAt || null,
      data.additions || 0,
      data.deletions || 0,
      data.changedFiles || 0,
      data.parentCount || 1,
      data.isMergeCommit || false,
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  }

  async saveCommitFiles(commitId: string, files: Array<{
    id: string;
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string | null;
    previousFilename?: string | null;
  }>): Promise<void> {
    await pool.query('DELETE FROM commit_files WHERE commit_id = $1', [commitId]);
    for (const f of files) {
      await pool.query(
        `INSERT INTO commit_files (id, commit_id, filename, status, additions, deletions, changes, patch, previous_filename, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [f.id, commitId, f.filename, f.status, f.additions, f.deletions, f.changes, f.patch || null, f.previousFilename || null]
      );
    }
  }

  async findCommitFiles(commitIdOrSha: string, organizationId?: string): Promise<CommitFileRow[]> {
    let query = `
      SELECT cf.* 
      FROM commit_files cf
      JOIN commits c ON c.id = cf.commit_id
      JOIN repositories r ON r.id = c.repository_id
      WHERE (c.id = $1 OR c.github_commit_sha = $1)
    `;
    const params: any[] = [commitIdOrSha];

    if (organizationId) {
      query += ` AND (r.organization_id = $2 OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $2))`;
      params.push(organizationId);
    }

    query += ` ORDER BY cf.filename ASC`;

    const res = await pool.query(query, params);
    return res.rows;
  }

  async findByIdOrSha(idOrSha: string, organizationId?: string): Promise<any | null> {
    let query = `
      SELECT 
        c.*,
        r.full_name as repository_name,
        r.name as repository_short_name,
        d.login as author_login,
        d.avatar_url as author_avatar_url,
        d.html_url as author_html_url
      FROM commits c
      JOIN repositories r ON r.id = c.repository_id
      LEFT JOIN developers d ON d.id = c.developer_id
      WHERE (c.id = $1 OR c.github_commit_sha = $1)
    `;
    const params: any[] = [idOrSha];

    if (organizationId) {
      query += ` AND (r.organization_id = $2 OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $2))`;
      params.push(organizationId);
    }

    const res = await pool.query(query, params);
    return res.rows[0] || null;
  }

  async findCommits(options: CommitFilterOptions): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (options.organizationId) {
      conditions.push(`(r.organization_id = $${paramIdx} OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $${paramIdx}))`);
      params.push(options.organizationId);
      paramIdx++;
    }

    if (options.repositoryId) {
      conditions.push(`(c.repository_id = $${paramIdx} OR r.full_name = $${paramIdx} OR r.name = $${paramIdx})`);
      params.push(options.repositoryId);
      paramIdx++;
    }

    if (options.developerId) {
      conditions.push(`(c.developer_id = $${paramIdx} OR d.login = $${paramIdx})`);
      params.push(options.developerId);
      paramIdx++;
    }

    if (options.projectId) {
      conditions.push(`r.project_id = $${paramIdx}`);
      params.push(options.projectId);
      paramIdx++;
    }

    if (options.dateFrom) {
      conditions.push(`c.committed_at >= $${paramIdx}`);
      params.push(new Date(options.dateFrom));
      paramIdx++;
    }

    if (options.dateTo) {
      conditions.push(`c.committed_at <= $${paramIdx}`);
      params.push(new Date(options.dateTo));
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) 
      FROM commits c
      JOIN repositories r ON r.id = c.repository_id
      LEFT JOIN developers d ON d.id = c.developer_id
      ${whereClause}
    `;

    const dataSql = `
      SELECT 
        c.*,
        r.full_name as repository_name,
        r.name as repository_short_name,
        d.login as author_login,
        d.avatar_url as author_avatar_url,
        d.html_url as author_html_url
      FROM commits c
      JOIN repositories r ON r.id = c.repository_id
      LEFT JOIN developers d ON d.id = c.developer_id
      ${whereClause}
      ORDER BY c.committed_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    const countRes = await pool.query(countSql, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await pool.query(dataSql, [...params, limit, offset]);

    return {
      data: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findByRepository(repositoryId: string, limit = 100): Promise<CommitRow[]> {
    const res = await pool.query(
      'SELECT * FROM commits WHERE repository_id = $1 ORDER BY committed_at DESC LIMIT $2',
      [repositoryId, limit]
    );
    return res.rows;
  }
}

export const commitRepository = new CommitRepository();
