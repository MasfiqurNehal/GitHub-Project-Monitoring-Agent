import { pool } from '../db/connection.js';

export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  organization: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export class ProjectRepository {
  async findAll(): Promise<any[]> {
    const query = `
      SELECT 
        p.*,
        COUNT(DISTINCT r.id) as repositories_count,
        COUNT(DISTINCT c.id) as commits_count,
        COUNT(DISTINCT pr.id) as prs_count,
        COUNT(DISTINCT i.id) as issues_count
      FROM projects p
      LEFT JOIN repositories r ON r.project_id = p.id
      LEFT JOIN commits c ON c.repository_id = r.id
      LEFT JOIN pull_requests pr ON pr.repository_id = r.id
      LEFT JOIN issues i ON i.repository_id = r.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    const res = await pool.query(query);
    return res.rows.map(r => ({
      ...r,
      repositories_count: parseInt(r.repositories_count, 10),
      commits_count: parseInt(r.commits_count, 10),
      prs_count: parseInt(r.prs_count, 10),
      issues_count: parseInt(r.issues_count, 10),
    }));
  }

  async findById(id: string): Promise<ProjectRow | null> {
    const res = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async findByName(name: string): Promise<ProjectRow | null> {
    const res = await pool.query('SELECT * FROM projects WHERE LOWER(name) = LOWER($1)', [name]);
    return res.rows[0] || null;
  }

  async create(id: string, name: string, description?: string, organization?: string): Promise<ProjectRow> {
    const res = await pool.query(
      `INSERT INTO projects (id, name, description, organization, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW())
       RETURNING *`,
      [id, name, description || null, organization || null]
    );
    return res.rows[0];
  }

  async update(id: string, data: { name?: string; description?: string; organization?: string; status?: string }): Promise<ProjectRow | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const name = data.name !== undefined ? data.name : current.name;
    const description = data.description !== undefined ? data.description : current.description;
    const organization = data.organization !== undefined ? data.organization : current.organization;
    const status = data.status !== undefined ? data.status : current.status;

    const res = await pool.query(
      `UPDATE projects 
       SET name = $1, description = $2, organization = $3, status = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, description, organization, status, id]
    );
    return res.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Set project_id = NULL on linked repositories to preserve monitoring records and GitHub repositories
      await client.query('UPDATE repositories SET project_id = NULL WHERE project_id = $1', [id]);
      const res = await client.query('DELETE FROM projects WHERE id = $1', [id]);
      await client.query('COMMIT');
      return (res.rowCount || 0) > 0;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export const projectRepository = new ProjectRepository();
