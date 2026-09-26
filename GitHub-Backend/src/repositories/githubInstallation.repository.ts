import { pool } from '../db/connection.js';

export interface GitHubInstallationRow {
  id: string;
  github_installation_id: number;
  organization_id?: string | null;
  user_id?: string | null;
  github_account_id?: string | null;
  account_login: string;
  account_type: string;
  target_type: string;
  permissions: any;
  events: any;
  single_file_name: string | null;
  has_multiple_single_files: boolean;
  status: string;
  suspended_by: string | null;
  suspended_at: Date | null;
  connected_at: Date;
  created_at: Date;
  updated_at: Date;
}

export class GitHubInstallationRepository {
  async findAll(organizationId?: string): Promise<GitHubInstallationRow[]> {
    if (organizationId) {
      const res = await pool.query('SELECT * FROM github_installations WHERE organization_id = $1 ORDER BY created_at DESC', [organizationId]);
      return res.rows;
    }
    const res = await pool.query('SELECT * FROM github_installations ORDER BY created_at DESC');
    return res.rows;
  }

  async findByInstallationId(githubInstallationId: number, organizationId?: string): Promise<GitHubInstallationRow | null> {
    if (organizationId) {
      const res = await pool.query('SELECT * FROM github_installations WHERE github_installation_id = $1 AND organization_id = $2', [githubInstallationId, organizationId]);
      return res.rows[0] || null;
    }
    const res = await pool.query('SELECT * FROM github_installations WHERE github_installation_id = $1', [githubInstallationId]);
    return res.rows[0] || null;
  }

  async findByAccountLogin(login: string, organizationId?: string): Promise<GitHubInstallationRow | null> {
    if (organizationId) {
      const res = await pool.query('SELECT * FROM github_installations WHERE LOWER(account_login) = LOWER($1) AND organization_id = $2', [login, organizationId]);
      return res.rows[0] || null;
    }
    const res = await pool.query('SELECT * FROM github_installations WHERE LOWER(account_login) = LOWER($1)', [login]);
    return res.rows[0] || null;
  }

  async upsert(data: {
    id: string;
    githubInstallationId: number;
    organizationId?: string | null;
    userId?: string | null;
    githubAccountId?: string | number | null;
    accountLogin: string;
    accountType?: string;
    targetType?: string;
    permissions?: any;
    events?: any;
    status?: string;
    suspendedAt?: Date | null;
  }): Promise<GitHubInstallationRow> {
    const query = `
      INSERT INTO github_installations (
        id, github_installation_id, organization_id, user_id, github_account_id, account_login, account_type, target_type,
        permissions, events, status, suspended_at, connected_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, NOW(), NOW(), NOW()
      )
      ON CONFLICT (github_installation_id) DO UPDATE SET
        organization_id = COALESCE(EXCLUDED.organization_id, github_installations.organization_id),
        user_id = COALESCE(EXCLUDED.user_id, github_installations.user_id),
        github_account_id = COALESCE(EXCLUDED.github_account_id, github_installations.github_account_id),
        account_login = EXCLUDED.account_login,
        account_type = EXCLUDED.account_type,
        target_type = EXCLUDED.target_type,
        permissions = EXCLUDED.permissions,
        events = EXCLUDED.events,
        status = COALESCE(EXCLUDED.status, github_installations.status),
        suspended_at = EXCLUDED.suspended_at,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      data.id,
      data.githubInstallationId,
      data.organizationId || null,
      data.userId || null,
      data.githubAccountId ? String(data.githubAccountId) : null,
      data.accountLogin,
      data.accountType || 'Organization',
      data.targetType || 'User',
      JSON.stringify(data.permissions || {}),
      JSON.stringify(data.events || []),
      data.status || 'ACTIVE',
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
