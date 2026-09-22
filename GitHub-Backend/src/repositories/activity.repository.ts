import { pool } from '../db/connection.js';

export interface ActivityEventRow {
  id: string;
  repository_id: string;
  developer_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  occurred_at: Date;
  metadata: any;
  source: string;
  created_at: Date;
}

export class ActivityRepository {
  async create(data: {
    id: string;
    repositoryId: string;
    developerId?: string | null;
    eventType: string;
    entityType?: string;
    entityId?: string;
    occurredAt: Date;
    metadata?: any;
    source?: string;
  }): Promise<ActivityEventRow> {
    const query = `
      INSERT INTO activity_events (id, repository_id, developer_id, event_type, entity_type, entity_id, occurred_at, metadata, source, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;

    const values = [
      data.id,
      data.repositoryId,
      data.developerId || null,
      data.eventType,
      data.entityType || null,
      data.entityId || null,
      data.occurredAt,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.source || 'sync',
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  }

  async findActivityFeed(filters: {
    projectId?: string;
    repositoryId?: string;
    developerId?: string;
    eventType?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (filters.repositoryId) {
      conditions.push(`ae.repository_id = $${paramIdx++}`);
      params.push(filters.repositoryId);
    }

    if (filters.projectId) {
      conditions.push(`r.project_id = $${paramIdx++}`);
      params.push(filters.projectId);
    }

    if (filters.developerId) {
      conditions.push(`ae.developer_id = $${paramIdx++}`);
      params.push(filters.developerId);
    }

    if (filters.eventType && filters.eventType !== 'all') {
      conditions.push(`ae.event_type = $${paramIdx++}`);
      params.push(filters.eventType);
    }

    if (filters.from) {
      conditions.push(`ae.occurred_at >= $${paramIdx++}`);
      params.push(filters.from);
    }

    if (filters.to) {
      conditions.push(`ae.occurred_at <= $${paramIdx++}`);
      params.push(filters.to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM activity_events ae
      LEFT JOIN repositories r ON ae.repository_id = r.id
      ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        ae.id,
        ae.event_type,
        ae.occurred_at,
        ae.metadata,
        r.id as repo_id,
        r.name as repo_name,
        r.full_name as repo_full_name,
        d.id as dev_id,
        d.login as dev_login,
        d.name as dev_name,
        d.avatar_url as dev_avatar_url,
        p.id as project_id,
        p.name as project_name
      FROM activity_events ae
      LEFT JOIN repositories r ON ae.repository_id = r.id
      LEFT JOIN developers d ON ae.developer_id = d.id
      LEFT JOIN projects p ON r.project_id = p.id
      ${whereClause}
      ORDER BY ae.occurred_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    params.push(limit, offset);

    const countRes = await pool.query(countQuery, params.slice(0, paramIdx - 3));
    const dataRes = await pool.query(dataQuery, params);

    return {
      data: dataRes.rows,
      total: parseInt(countRes.rows[0].total, 10),
      page,
      limit,
    };
  }
}

export const activityRepository = new ActivityRepository();
