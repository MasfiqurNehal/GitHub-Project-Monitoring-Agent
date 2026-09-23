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
        r.html_url as repo_html_url,
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

    const formattedData = dataRes.rows.map((row) => {
      const occurredDate = new Date(row.occurred_at);
      const metadata = row.metadata || {};

      let label = 'View on GitHub';
      if (metadata.prNumber) label = `PR #${metadata.prNumber}`;
      else if (metadata.issueNumber) label = `Issue #${metadata.issueNumber}`;
      else if (metadata.commitSha) label = `Commit ${metadata.commitSha.substring(0, 7)}`;
      else if (row.event_type) label = `${row.event_type.replace(/_/g, ' ')}`;

      const url = metadata.html_url || metadata.url || row.repo_html_url || 'https://github.com';

      return {
        id: row.id,
        type: row.event_type,
        occurredAt: row.occurred_at,
        time: occurredDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        formattedTime: occurredDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: occurredDate.toISOString().split('T')[0],
        developer: {
          id: row.dev_id || 'dev-system',
          login: row.dev_login || 'system',
          name: row.dev_name || row.dev_login || 'System / Webhook',
          avatarUrl: row.dev_avatar_url || 'https://github.com/github.png',
        },
        repository: {
          id: row.repo_id || 'repo-1',
          name: row.repo_name || 'Repository',
          fullName: row.repo_full_name || 'Organization/Repository',
        },
        project: {
          id: row.project_id || 'proj-1',
          name: row.project_name || 'Default Project',
        },
        githubItem: {
          label,
          url,
        },
        title: metadata.message || metadata.title || `Activity: ${row.event_type}`,
        details: metadata,
      };
    });

    return {
      data: formattedData,
      total: parseInt(countRes.rows[0].total, 10),
      page,
      limit,
    };
  }
}

export const activityRepository = new ActivityRepository();
