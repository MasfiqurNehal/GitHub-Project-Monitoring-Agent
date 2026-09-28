import { pool } from '../db/connection.js';

export interface RepositoryRow {
  id: string;
  project_id: string | null;
  organization_id?: string | null;
  github_repository_id: number | string;
  github_installation_id?: number | string | null;
  owner: string;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string | null;
  default_branch: string;
  visibility: string;
  is_private: boolean;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  open_issues_count: number;
  github_created_at: Date | null;
  github_updated_at: Date | null;
  last_synced_at: Date | null;
  sync_status: string;
  sync_error?: string | null;
  created_at: Date;
  updated_at: Date;
}

export class RepositoryRepository {
  async findAll(organizationId?: string): Promise<RepositoryRow[]> {
    const orgFilter = organizationId
      ? `WHERE r.organization_id = $1 OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $1)`
      : '';
    const params = organizationId ? [organizationId] : [];

    const query = `
      SELECT 
        r.*,
        COUNT(DISTINCT c.developer_id)::int as developers_count,
        COUNT(DISTINCT c.id)::int as commits_count,
        COUNT(DISTINCT pr.id)::int as prs_count,
        COUNT(DISTINCT i.id)::int as issues_count,
        COALESCE(SUM(c.additions), 0)::int as lines_added,
        COALESCE(SUM(c.deletions), 0)::int as lines_deleted
      FROM repositories r
      LEFT JOIN commits c ON c.repository_id = r.id
      LEFT JOIN pull_requests pr ON pr.repository_id = r.id
      LEFT JOIN issues i ON i.repository_id = r.id
      ${orgFilter}
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;
    const res = await pool.query(query, params);
    return res.rows;
  }

  async findById(id: string, organizationId?: string): Promise<RepositoryRow | null> {
    if (organizationId) {
      const res = await pool.query(
        'SELECT * FROM repositories WHERE id = $1 AND (organization_id = $2 OR project_id IN (SELECT id FROM projects WHERE organization_id = $2))',
        [id, organizationId]
      );
      return res.rows[0] || null;
    }
    const res = await pool.query('SELECT * FROM repositories WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async findByFullName(fullName: string, organizationId?: string): Promise<RepositoryRow | null> {
    if (organizationId) {
      const res = await pool.query(
        'SELECT * FROM repositories WHERE LOWER(full_name) = LOWER($1) AND (organization_id = $2 OR project_id IN (SELECT id FROM projects WHERE organization_id = $2))',
        [fullName, organizationId]
      );
      return res.rows[0] || null;
    }
    const res = await pool.query('SELECT * FROM repositories WHERE LOWER(full_name) = LOWER($1)', [fullName]);
    return res.rows[0] || null;
  }

  async findByFullNameGlobal(fullName: string): Promise<RepositoryRow | null> {
    const res = await pool.query('SELECT * FROM repositories WHERE LOWER(full_name) = LOWER($1)', [fullName]);
    return res.rows[0] || null;
  }

  async findByGithubIdGlobal(githubRepositoryId: number | string): Promise<RepositoryRow | null> {
    const res = await pool.query('SELECT * FROM repositories WHERE github_repository_id = $1', [githubRepositoryId]);
    return res.rows[0] || null;
  }

  async findByProjectId(projectId: string): Promise<RepositoryRow[]> {
    const res = await pool.query('SELECT * FROM repositories WHERE project_id = $1 ORDER BY created_at DESC', [projectId]);
    return res.rows;
  }

  async upsert(data: {
    id: string;
    projectId?: string | null;
    organizationId?: string | null;
    githubRepositoryId: number | string;
    githubInstallationId?: number | string | null;
    owner: string;
    name: string;
    fullName: string;
    htmlUrl: string;
    cloneUrl?: string;
    defaultBranch?: string;
    visibility?: string;
    isPrivate?: boolean;
    description?: string;
    language?: string;
    stars?: number;
    forks?: number;
    openIssuesCount?: number;
    githubCreatedAt?: string;
    githubUpdatedAt?: string;
  }): Promise<RepositoryRow> {
    const query = `
      INSERT INTO repositories (
        id, project_id, organization_id, github_repository_id, github_installation_id, owner, name, full_name,
        html_url, clone_url, default_branch, visibility, is_private,
        description, language, stars, forks, open_issues_count,
        github_created_at, github_updated_at, sync_status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, 'PENDING', NOW(), NOW()
      )
      ON CONFLICT (full_name) DO UPDATE SET
        project_id = COALESCE(EXCLUDED.project_id, repositories.project_id),
        organization_id = COALESCE(EXCLUDED.organization_id, repositories.organization_id),
        github_repository_id = EXCLUDED.github_repository_id,
        github_installation_id = EXCLUDED.github_installation_id,
        default_branch = EXCLUDED.default_branch,
        description = EXCLUDED.description,
        language = EXCLUDED.language,
        stars = EXCLUDED.stars,
        forks = EXCLUDED.forks,
        open_issues_count = EXCLUDED.open_issues_count,
        github_updated_at = EXCLUDED.github_updated_at,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      data.id,
      data.projectId || null,
      data.organizationId || null,
      data.githubRepositoryId,
      data.githubInstallationId || null,
      data.owner,
      data.name,
      data.fullName,
      data.htmlUrl,
      data.cloneUrl || null,
      data.defaultBranch || 'main',
      data.visibility || (data.isPrivate ? 'private' : 'public'),
      data.isPrivate || false,
      data.description || null,
      data.language || null,
      data.stars || 0,
      data.forks || 0,
      data.openIssuesCount || 0,
      data.githubCreatedAt ? new Date(data.githubCreatedAt) : null,
      data.githubUpdatedAt ? new Date(data.githubUpdatedAt) : null,
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  }

  async updateSyncStatus(
    id: string,
    status: string,
    lastSyncedAt?: Date | null,
    syncError?: string | null,
    startedAt?: Date | null,
    completedAt?: Date | null
  ): Promise<void> {
    const effectiveStarted = startedAt || (status === 'SYNCING' || status === 'IN_PROGRESS' ? new Date() : null);
    const effectiveCompleted = completedAt || (status === 'SYNCED' || status === 'FAILED' ? new Date() : null);

    await pool.query(
      `UPDATE repositories 
       SET sync_status = $1,
           last_sync_status = $1,
           last_synced_at = COALESCE($2, last_synced_at),
           last_sync_completed_at = COALESCE($2, $3, last_sync_completed_at),
           last_sync_started_at = COALESCE($4, last_sync_started_at),
           sync_error = $5,
           last_sync_error = $5,
           updated_at = NOW() 
       WHERE id = $6`,
      [status, lastSyncedAt || null, effectiveCompleted, effectiveStarted, syncError || null, id]
    );
  }

  async delete(id: string, organizationId?: string): Promise<boolean> {
    let query = 'DELETE FROM repositories WHERE id = $1';
    const params: any[] = [id];
    if (organizationId) {
      query += ' AND (organization_id = $2 OR project_id IN (SELECT id FROM projects WHERE organization_id = $2))';
      params.push(organizationId);
    }
    const res = await pool.query(query, params);
    return (res.rowCount || 0) > 0;
  }
}

export const repositoryRepository = new RepositoryRepository();

