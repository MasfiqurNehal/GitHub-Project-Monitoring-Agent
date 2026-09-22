import { pool } from '../db/connection.js';

export interface RepositoryRow {
  id: string;
  project_id: string | null;
  github_repository_id: number | string;
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
  created_at: Date;
  updated_at: Date;
}

export class RepositoryRepository {
  async findAll(): Promise<RepositoryRow[]> {
    const res = await pool.query('SELECT * FROM repositories ORDER BY created_at DESC');
    return res.rows;
  }

  async findById(id: string): Promise<RepositoryRow | null> {
    const res = await pool.query('SELECT * FROM repositories WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async findByFullName(fullName: string): Promise<RepositoryRow | null> {
    const res = await pool.query('SELECT * FROM repositories WHERE LOWER(full_name) = LOWER($1)', [fullName]);
    return res.rows[0] || null;
  }

  async findByProjectId(projectId: string): Promise<RepositoryRow[]> {
    const res = await pool.query('SELECT * FROM repositories WHERE project_id = $1 ORDER BY created_at DESC', [projectId]);
    return res.rows;
  }

  async upsert(data: {
    id: string;
    projectId?: string | null;
    githubRepositoryId: number | string;
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
        id, project_id, github_repository_id, owner, name, full_name,
        html_url, clone_url, default_branch, visibility, is_private,
        description, language, stars, forks, open_issues_count,
        github_created_at, github_updated_at, sync_status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, 'PENDING', NOW(), NOW()
      )
      ON CONFLICT (full_name) DO UPDATE SET
        project_id = EXCLUDED.project_id,
        github_repository_id = EXCLUDED.github_repository_id,
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
      data.githubRepositoryId,
      data.owner,
      data.name,
      data.fullName,
      data.htmlUrl,
      data.cloneUrl || null,
      data.defaultBranch || 'main',
      data.visibility || 'public',
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

  async updateSyncStatus(id: string, status: string, lastSyncedAt?: Date): Promise<void> {
    if (lastSyncedAt) {
      await pool.query(
        'UPDATE repositories SET sync_status = $1, last_synced_at = $2, updated_at = NOW() WHERE id = $3',
        [status, lastSyncedAt, id]
      );
    } else {
      await pool.query(
        'UPDATE repositories SET sync_status = $1, updated_at = NOW() WHERE id = $2',
        [status, id]
      );
    }
  }

  async delete(id: string): Promise<boolean> {
    const res = await pool.query('DELETE FROM repositories WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }
}

export const repositoryRepository = new RepositoryRepository();
