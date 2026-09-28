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
  async findAll(organizationId?: string): Promise<any[]> {
    const params: any[] = [];
    let whereClause = '';
    if (organizationId) {
      whereClause = 'WHERE p.organization_id = $1';
      params.push(organizationId);
    }

    const query = `
      SELECT 
        p.*,
        COUNT(DISTINCT r.id) as repositories_count,
        COUNT(DISTINCT c.id) as commits_count,
        COUNT(DISTINCT pr.id) as prs_count,
        COUNT(DISTINCT i.id) as issues_count
      FROM projects p
      LEFT JOIN project_repositories pr_link ON pr_link.project_id = p.id
      LEFT JOIN repositories r ON (r.id = pr_link.repository_id OR r.project_id = p.id)
      LEFT JOIN commits c ON c.repository_id = r.id
      LEFT JOIN pull_requests pr ON pr.repository_id = r.id
      LEFT JOIN issues i ON i.repository_id = r.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;
    const res = await pool.query(query, params);
    return res.rows.map(r => ({
      ...r,
      repositories_count: parseInt(r.repositories_count, 10),
      commits_count: parseInt(r.commits_count, 10),
      prs_count: parseInt(r.prs_count, 10),
      issues_count: parseInt(r.issues_count, 10),
    }));
  }

  async findById(id: string, organizationId?: string): Promise<ProjectRow | null> {
    if (organizationId) {
      const res = await pool.query('SELECT * FROM projects WHERE id = $1 AND organization_id = $2', [id, organizationId]);
      return res.rows[0] || null;
    }
    const res = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async findByName(name: string, organizationId?: string): Promise<ProjectRow | null> {
    if (organizationId) {
      const res = await pool.query('SELECT * FROM projects WHERE LOWER(name) = LOWER($1) AND organization_id = $2', [name, organizationId]);
      return res.rows[0] || null;
    }
    const res = await pool.query('SELECT * FROM projects WHERE LOWER(name) = LOWER($1)', [name]);
    return res.rows[0] || null;
  }

  async create(id: string, name: string, description?: string, organization?: string, organizationId?: string): Promise<ProjectRow> {
    const res = await pool.query(
      `INSERT INTO projects (id, name, description, organization, organization_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NOW(), NOW())
       RETURNING *`,
      [id, name, description || null, organization || null, organizationId || null]
    );
    return res.rows[0];
  }

  async update(id: string, data: { name?: string; description?: string; organization?: string; status?: string }, organizationId?: string): Promise<ProjectRow | null> {
    const current = await this.findById(id, organizationId);
    if (!current) return null;

    const name = data.name !== undefined ? data.name : current.name;
    const description = data.description !== undefined ? data.description : current.description;
    const organization = data.organization !== undefined ? data.organization : current.organization;
    const status = data.status !== undefined ? data.status : current.status;

    let query = `UPDATE projects SET name = $1, description = $2, organization = $3, status = $4, updated_at = NOW() WHERE id = $5`;
    const params: any[] = [name, description, organization, status, id];

    if (organizationId) {
      query += ` AND organization_id = $6`;
      params.push(organizationId);
    }
    query += ` RETURNING *`;

    const res = await pool.query(query, params);
    return res.rows[0] || null;
  }

  async delete(id: string, organizationId?: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const project = await this.findById(id, organizationId);
      if (!project) {
        await client.query('ROLLBACK');
        return false;
      }
      // Unlink legacy project_id field on repositories to preserve monitoring records
      await client.query('UPDATE repositories SET project_id = NULL WHERE project_id = $1', [id]);
      // Remove junction records for this project
      await client.query('DELETE FROM project_repositories WHERE project_id = $1', [id]);
      let delQuery = 'DELETE FROM projects WHERE id = $1';
      const delParams: any[] = [id];
      if (organizationId) {
        delQuery += ' AND organization_id = $2';
        delParams.push(organizationId);
      }
      const res = await client.query(delQuery, delParams);
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
