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
}

export const developerRepository = new DeveloperRepository();
