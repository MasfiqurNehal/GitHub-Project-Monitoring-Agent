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
  async findAll(): Promise<ProjectRow[]> {
    const res = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    return res.rows;
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
}

export const projectRepository = new ProjectRepository();
