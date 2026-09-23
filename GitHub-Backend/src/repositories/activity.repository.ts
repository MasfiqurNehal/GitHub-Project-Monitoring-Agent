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
    activityType?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (filters.repositoryId) {
      conditions.push(`(ca.repository_id = $${paramIdx} OR r.full_name = $${paramIdx} OR r.name = $${paramIdx})`);
      params.push(filters.repositoryId);
      paramIdx++;
    }

    if (filters.projectId) {
      conditions.push(`(ca.project_id = $${paramIdx} OR r.project_id = $${paramIdx})`);
      params.push(filters.projectId);
      paramIdx++;
    }

    if (filters.developerId) {
      conditions.push(`(ca.developer_id = $${paramIdx} OR d.login = $${paramIdx})`);
      params.push(filters.developerId);
      paramIdx++;
    }

    if (filters.activityType && filters.activityType !== 'all') {
      const typeClean = filters.activityType.toLowerCase().replace(/\s+/g, '_');
      conditions.push(`(LOWER(ca.type) = $${paramIdx} OR LOWER(ca.type) LIKE '%' || $${paramIdx} || '%')`);
      params.push(typeClean);
      paramIdx++;
    }

    if (filters.from) {
      conditions.push(`ca.timestamp >= $${paramIdx}`);
      params.push(filters.from);
      paramIdx++;
    }

    if (filters.to) {
      conditions.push(`ca.timestamp <= $${paramIdx}`);
      params.push(filters.to);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const combinedCte = `
      WITH combined_activities AS (
        -- 1. Commits
        SELECT 
          c.id as id,
          'commit' as type,
          c.committed_at as timestamp,
          c.message as title,
          c.commit_url as url,
          c.repository_id,
          c.developer_id,
          r.project_id
        FROM commits c
        JOIN repositories r ON r.id = c.repository_id

        UNION ALL

        -- 2. Pull Requests Opened
        SELECT 
          pr.id || '-opened' as id,
          'pull_request_opened' as type,
          pr.created_at as timestamp,
          'Opened PR #' || pr.number || ': ' || pr.title as title,
          'https://github.com/' || r.full_name || '/pull/' || pr.number as url,
          pr.repository_id,
          pr.author_developer_id as developer_id,
          r.project_id
        FROM pull_requests pr
        JOIN repositories r ON r.id = pr.repository_id

        UNION ALL

        -- 3. Pull Requests Merged
        SELECT 
          pr.id || '-merged' as id,
          'pull_request_merged' as type,
          pr.merged_at as timestamp,
          'Merged PR #' || pr.number || ': ' || pr.title as title,
          'https://github.com/' || r.full_name || '/pull/' || pr.number as url,
          pr.repository_id,
          pr.author_developer_id as developer_id,
          r.project_id
        FROM pull_requests pr
        JOIN repositories r ON r.id = pr.repository_id
        WHERE pr.merged_at IS NOT NULL

        UNION ALL

        -- 4. Pull Request Reviews
        SELECT 
          prr.id as id,
          'review' as type,
          prr.submitted_at as timestamp,
          'Reviewed PR #' || pr.number || ' (' || prr.state || ')' as title,
          'https://github.com/' || r.full_name || '/pull/' || pr.number as url,
          pr.repository_id,
          prr.reviewer_developer_id as developer_id,
          r.project_id
        FROM pull_request_reviews prr
        JOIN pull_requests pr ON pr.id = prr.pull_request_id
        JOIN repositories r ON r.id = pr.repository_id

        UNION ALL

        -- 5. Issues Opened
        SELECT 
          i.id || '-opened' as id,
          'issue_opened' as type,
          i.created_at as timestamp,
          'Opened Issue #' || i.number || ': ' || i.title as title,
          COALESCE(i.html_url, 'https://github.com/' || r.full_name || '/issues/' || i.number) as url,
          i.repository_id,
          i.author_developer_id as developer_id,
          r.project_id
        FROM issues i
        JOIN repositories r ON r.id = i.repository_id

        UNION ALL

        -- 6. Issues Closed
        SELECT 
          i.id || '-closed' as id,
          'issue_closed' as type,
          i.closed_at as timestamp,
          'Closed Issue #' || i.number || ': ' || i.title as title,
          COALESCE(i.html_url, 'https://github.com/' || r.full_name || '/issues/' || i.number) as url,
          i.repository_id,
          i.author_developer_id as developer_id,
          r.project_id
        FROM issues i
        JOIN repositories r ON r.id = i.repository_id
        WHERE i.closed_at IS NOT NULL

        UNION ALL

        -- 7. Webhook & Activity Events (push, issue_comment, pr_updated, etc.)
        SELECT 
          ae.id as id,
          ae.event_type as type,
          ae.occurred_at as timestamp,
          COALESCE(
            ae.metadata->>'message',
            ae.metadata->>'title',
            'Activity: ' || ae.event_type
          ) as title,
          COALESCE(
            ae.metadata->>'url',
            ae.metadata->>'html_url',
            'https://github.com/' || r.full_name
          ) as url,
          ae.repository_id,
          ae.developer_id,
          r.project_id
        FROM activity_events ae
        JOIN repositories r ON r.id = ae.repository_id
        WHERE ae.event_type NOT IN ('commit', 'pr_opened', 'pr_merged', 'issue_opened', 'issue_closed')
      )
    `;

    const countQuery = `
      ${combinedCte}
      SELECT COUNT(*) as total
      FROM combined_activities ca
      JOIN repositories r ON r.id = ca.repository_id
      LEFT JOIN developers d ON d.id = ca.developer_id
      ${whereClause}
    `;

    const dataQuery = `
      ${combinedCte}
      SELECT 
        ca.id,
        ca.type,
        ca.timestamp,
        ca.title,
        ca.url,
        r.id as repo_id,
        r.name as repo_name,
        r.full_name as repo_full_name,
        d.id as dev_id,
        d.login as dev_login,
        d.name as dev_name,
        d.avatar_url as dev_avatar_url
      FROM combined_activities ca
      JOIN repositories r ON r.id = ca.repository_id
      LEFT JOIN developers d ON d.id = ca.developer_id
      ${whereClause}
      ORDER BY ca.timestamp DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    const countRes = await pool.query(countQuery, params);
    
    params.push(limit, offset);
    const dataRes = await pool.query(dataQuery, params);

    const formattedData = dataRes.rows.map((row) => ({
      id: row.id,
      type: row.type,
      developer: {
        id: row.dev_id || 'dev-system',
        login: row.dev_login || 'system',
        name: row.dev_name || row.dev_login || 'System',
        avatarUrl: row.dev_avatar_url || 'https://github.com/github.png',
      },
      repository: {
        id: row.repo_id || '',
        name: row.repo_name || '',
        fullName: row.repo_full_name || '',
      },
      timestamp: row.timestamp ? new Date(row.timestamp).toISOString() : new Date().toISOString(),
      title: row.title || `Event: ${row.type}`,
      url: row.url || `https://github.com/${row.repo_full_name}`,
    }));

    return {
      data: formattedData,
      total: parseInt(countRes.rows[0]?.total || '0', 10),
      page,
      limit,
    };
  }
}

export const activityRepository = new ActivityRepository();
