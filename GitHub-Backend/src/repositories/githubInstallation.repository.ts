import { pool } from '../db/connection.js';

export interface GitHubInstallationRow {
  id: string;
  github_installation_id: number;
  account_login: string;
  account_type: string;
  target_type: string;
  permissions: any;
  events: any;
  single_file_name: string | null;
  has_multiple_single_files: boolean;
  suspended_by: string | null;
  suspended_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class GitHubInstallationRepository {
  async findAll(): Promise<GitHubInstallationRow[]> {
    const res = await pool.query('SELECT * FROM github_installations ORDER BY created_at DESC');
    return res.rows;
  }

  async findByInstallationId(githubInstallationId: number): Promise<GitHubInstallationRow | null> {
    const res = await pool.query('SELECT * FROM github_installations WHERE github_installation_id = $1', [githubInstallationId]);
    return res.rows[0] || null;
  }

  async findByAccountLogin(login: string): Promise<GitHubInstallationRow | null> {
    const res = await pool.query('SELECT * FROM github_installations WHERE LOWER(account_login) = LOWER($1)', [login]);
    return res.rows[0] || null;
  }

  async upsert(data: {
    id: string;
    githubInstallationId: number;
    accountLogin: string;
    accountType?: string;
    targetType?: string;
    permissions?: any;
    events?: any;
    suspendedAt?: Date | null;
  }): Promise<GitHubInstallationRow> {
    const query = `
      INSERT INTO github_installations (
        id, github_installation_id, account_login, account_type, target_type,
        permissions, events, suspended_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, NOW(), NOW()
      )
      ON CONFLICT (github_installation_id) DO UPDATE SET
        account_login = EXCLUDED.account_login,
        account_type = EXCLUDED.account_type,
        target_type = EXCLUDED.target_type,
        permissions = EXCLUDED.permissions,
        events = EXCLUDED.events,
        suspended_at = EXCLUDED.suspended_at,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      data.id,
      data.githubInstallationId,
      data.accountLogin,
      data.accountType || 'Organization',
      data.targetType || 'User',
      JSON.stringify(data.permissions || {}),
      JSON.stringify(data.events || []),
      data.suspendedAt || null,
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  }

  async deleteByInstallationId(githubInstallationId: number): Promise<boolean> {
    const res = await pool.query('DELETE FROM github_installations WHERE github_installation_id = $1', [githubInstallationId]);
    return (res.rowCount || 0) > 0;
  }
}

export const githubInstallationRepository = new GitHubInstallationRepository();
