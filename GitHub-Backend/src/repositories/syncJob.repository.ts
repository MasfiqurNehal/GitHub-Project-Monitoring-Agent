import { pool } from '../db/connection.js';

export interface SyncJobRow {
  id: string;
  repository_id: string;
  job_type: string;
  status: string;
  started_at: Date | null;
  completed_at: Date | null;
  records_processed: number;
  error_message: string | null;
  created_at: Date;
}

export class SyncJobRepository {
  async create(id: string, repositoryId: string, jobType: string, organizationId?: string | null): Promise<SyncJobRow> {
    const res = await pool.query(
      `INSERT INTO sync_jobs (id, repository_id, organization_id, job_type, status, started_at, created_at)
       VALUES ($1, $2, $3, $4, 'running', NOW(), NOW())
       RETURNING *`,
      [id, repositoryId, organizationId || null, jobType]
    );
    return res.rows[0];
  }

  async findLatestByRepositoryId(repositoryId: string): Promise<SyncJobRow | null> {
    const res = await pool.query(
      'SELECT * FROM sync_jobs WHERE repository_id = $1 ORDER BY created_at DESC LIMIT 1',
      [repositoryId]
    );
    return res.rows[0] || null;
  }

  async updateProgress(id: string, recordsProcessed: number): Promise<void> {
    await pool.query(
      'UPDATE sync_jobs SET records_processed = $1 WHERE id = $2',
      [recordsProcessed, id]
    );
  }

  async complete(id: string, recordsProcessed: number): Promise<void> {
    await pool.query(
      `UPDATE sync_jobs SET status = 'completed', completed_at = NOW(), records_processed = $1 WHERE id = $2`,
      [recordsProcessed, id]
    );
  }

  async fail(id: string, errorMessage: string): Promise<void> {
    await pool.query(
      `UPDATE sync_jobs SET status = 'failed', completed_at = NOW(), error_message = $1 WHERE id = $2`,
      [errorMessage, id]
    );
  }
}

export const syncJobRepository = new SyncJobRepository();
