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

export interface DeveloperMetrics {
  commitCount: number;
  prCount: number;
  reviewCount: number;
  issueCount: number;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export class DeveloperRepository {
  async findAll(organizationId?: string): Promise<DeveloperRow[]> {
    if (organizationId) {
      const res = await pool.query(
        `SELECT * FROM developers 
         WHERE organization_id = $1 OR id IN (
           SELECT DISTINCT rd.developer_id FROM repository_developers rd
           JOIN repositories r ON r.id = rd.repository_id
           WHERE r.organization_id = $1 OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $1)
         )
         ORDER BY login ASC`,
        [organizationId]
      );
      return res.rows;
    }
    const res = await pool.query('SELECT * FROM developers ORDER BY login ASC');
    return res.rows;
  }

  async findById(id: string, organizationId?: string): Promise<DeveloperRow | null> {
    if (organizationId) {
      const res = await pool.query(
        `SELECT * FROM developers 
         WHERE id = $1 AND (organization_id = $2 OR id IN (
           SELECT DISTINCT rd.developer_id FROM repository_developers rd
           JOIN repositories r ON r.id = rd.repository_id
           WHERE r.organization_id = $2 OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $2)
         ))`,
        [id, organizationId]
      );
      return res.rows[0] || null;
    }
    const res = await pool.query('SELECT * FROM developers WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async findByLogin(login: string, organizationId?: string): Promise<DeveloperRow | null> {
    if (organizationId) {
      const res = await pool.query(
        `SELECT * FROM developers 
         WHERE LOWER(login) = LOWER($1) AND (organization_id = $2 OR id IN (
           SELECT DISTINCT rd.developer_id FROM repository_developers rd
           JOIN repositories r ON r.id = rd.repository_id
           WHERE r.organization_id = $2 OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $2)
         ))`,
        [login, organizationId]
      );
      return res.rows[0] || null;
    }
    const res = await pool.query('SELECT * FROM developers WHERE LOWER(login) = LOWER($1)', [login]);
    return res.rows[0] || null;
  }


  async upsert(data: {
    id: string;
    organizationId?: string | null;
    githubUserId?: number | string | null;
    login: string;
    name?: string | null;
    avatarUrl?: string | null;
    htmlUrl?: string | null;
    email?: string | null;
    type?: string;
  }): Promise<DeveloperRow> {
    const query = `
      INSERT INTO developers (id, organization_id, github_user_id, login, name, avatar_url, html_url, email, type, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (login) DO UPDATE SET
        organization_id = COALESCE(EXCLUDED.organization_id, developers.organization_id),
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
      data.organizationId || null,
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

  async getMetricsForDeveloper(
    developerId: string,
    dateFrom?: string,
    dateTo?: string,
    projectId?: string,
    repositoryId?: string
  ): Promise<DeveloperMetrics> {
    const commitParams: any[] = [developerId];
    let commitWhere = 'WHERE c.developer_id = $1';
    let pIdx = 2;

    if (projectId) {
      commitWhere += ` AND r.project_id = $${pIdx}`;
      commitParams.push(projectId);
      pIdx++;
    }
    if (repositoryId) {
      commitWhere += ` AND c.repository_id = $${pIdx}`;
      commitParams.push(repositoryId);
      pIdx++;
    }
    if (dateFrom) {
      commitWhere += ` AND c.committed_at >= $${pIdx}`;
      commitParams.push(new Date(dateFrom));
      pIdx++;
    }
    if (dateTo) {
      commitWhere += ` AND c.committed_at <= $${pIdx}`;
      commitParams.push(new Date(dateTo));
      pIdx++;
    }

    const commitRes = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(c.additions), 0) as additions, COALESCE(SUM(c.deletions), 0) as deletions, COALESCE(SUM(c.changed_files), 0) as changed_files 
       FROM commits c 
       JOIN repositories r ON r.id = c.repository_id 
       ${commitWhere}`,
      commitParams
    );

    const prParams: any[] = [developerId];
    let prWhere = 'WHERE pr.author_developer_id = $1';
    pIdx = 2;
    if (projectId) {
      prWhere += ` AND r.project_id = $${pIdx}`;
      prParams.push(projectId);
      pIdx++;
    }
    if (repositoryId) {
      prWhere += ` AND pr.repository_id = $${pIdx}`;
      prParams.push(repositoryId);
      pIdx++;
    }
    if (dateFrom) {
      prWhere += ` AND pr.created_at >= $${pIdx}`;
      prParams.push(new Date(dateFrom));
      pIdx++;
    }
    if (dateTo) {
      prWhere += ` AND pr.created_at <= $${pIdx}`;
      prParams.push(new Date(dateTo));
      pIdx++;
    }
    const prRes = await pool.query(
      `SELECT COUNT(*) as count FROM pull_requests pr JOIN repositories r ON r.id = pr.repository_id ${prWhere}`,
      prParams
    );

    const reviewParams: any[] = [developerId];
    let reviewWhere = 'WHERE prr.reviewer_developer_id = $1';
    pIdx = 2;
    if (projectId) {
      reviewWhere += ` AND r.project_id = $${pIdx}`;
      reviewParams.push(projectId);
      pIdx++;
    }
    if (repositoryId) {
      reviewWhere += ` AND pr.repository_id = $${pIdx}`;
      reviewParams.push(repositoryId);
      pIdx++;
    }
    if (dateFrom) {
      reviewWhere += ` AND prr.submitted_at >= $${pIdx}`;
      reviewParams.push(new Date(dateFrom));
      pIdx++;
    }
    if (dateTo) {
      reviewWhere += ` AND prr.submitted_at <= $${pIdx}`;
      reviewParams.push(new Date(dateTo));
      pIdx++;
    }
    const reviewRes = await pool.query(
      `SELECT COUNT(*) as count FROM pull_request_reviews prr JOIN pull_requests pr ON pr.id = prr.pull_request_id JOIN repositories r ON r.id = pr.repository_id ${reviewWhere}`,
      reviewParams
    );

    const issueParams: any[] = [developerId];
    let issueWhere = 'WHERE i.author_developer_id = $1';
    pIdx = 2;
    if (projectId) {
      issueWhere += ` AND r.project_id = $${pIdx}`;
      issueParams.push(projectId);
      pIdx++;
    }
    if (repositoryId) {
      issueWhere += ` AND i.repository_id = $${pIdx}`;
      issueParams.push(repositoryId);
      pIdx++;
    }
    if (dateFrom) {
      issueWhere += ` AND i.created_at >= $${pIdx}`;
      issueParams.push(new Date(dateFrom));
      pIdx++;
    }
    if (dateTo) {
      issueWhere += ` AND i.created_at <= $${pIdx}`;
      issueParams.push(new Date(dateTo));
      pIdx++;
    }
    const issueRes = await pool.query(
      `SELECT COUNT(*) as count FROM issues i JOIN repositories r ON r.id = i.repository_id ${issueWhere}`,
      issueParams
    );

    const cRow = commitRes.rows[0];
    return {
      commitCount: parseInt(cRow?.count || '0', 10),
      prCount: parseInt(prRes.rows[0]?.count || '0', 10),
      reviewCount: parseInt(reviewRes.rows[0]?.count || '0', 10),
      issueCount: parseInt(issueRes.rows[0]?.count || '0', 10),
      additions: parseInt(cRow?.additions || '0', 10),
      deletions: parseInt(cRow?.deletions || '0', 10),
      changedFiles: parseInt(cRow?.changed_files || '0', 10),
    };
  }

  async findWithMetrics(options: {
    organizationId?: string;
    projectId?: string;
    repositoryId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const offset = (page - 1) * limit;

    const whereParts: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (options.organizationId) {
      whereParts.push(`(d.organization_id = $${pIdx} OR d.id IN (
        SELECT DISTINCT rd.developer_id FROM repository_developers rd
        JOIN repositories r ON r.id = rd.repository_id
        WHERE r.organization_id = $${pIdx} OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $${pIdx})
      ))`);
      params.push(options.organizationId);
      pIdx++;
    }

    if (options.projectId) {
      whereParts.push(`d.id IN (
        SELECT DISTINCT rd.developer_id FROM repository_developers rd
        JOIN repositories r ON r.id = rd.repository_id
        WHERE r.project_id = $${pIdx}
      )`);
      params.push(options.projectId);
      pIdx++;
    }

    if (options.repositoryId) {
      whereParts.push(`d.id IN (
        SELECT rd.developer_id FROM repository_developers rd WHERE rd.repository_id = $${pIdx}
      )`);
      params.push(options.repositoryId);
      pIdx++;
    }

    if (options.search) {
      whereParts.push(`(LOWER(d.name) LIKE $${pIdx} OR LOWER(d.login) LIKE $${pIdx})`);
      params.push(`%${options.search.toLowerCase()}%`);
      pIdx++;
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const countRes = await pool.query(`SELECT COUNT(*) FROM developers d ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const devQuery = `SELECT d.* FROM developers d ${whereClause} ORDER BY d.login ASC LIMIT $${pIdx} OFFSET $${pIdx + 1}`;
    const devParams = [...params, limit, offset];

    const devRes = await pool.query(devQuery, devParams);
    const developers = devRes.rows;

    const results = [];
    for (const dev of developers) {
      const [projectsRes, reposRes, metrics] = await Promise.all([
        pool.query(
          `SELECT DISTINCT p.id, p.name FROM projects p
           JOIN repositories r ON r.project_id = p.id
           JOIN repository_developers rd ON rd.repository_id = r.id
           WHERE rd.developer_id = $1`,
          [dev.id]
        ),
        pool.query(
          `SELECT DISTINCT r.id, r.name, r.full_name FROM repositories r
           JOIN repository_developers rd ON rd.repository_id = r.id
           WHERE rd.developer_id = $1`,
          [dev.id]
        ),
        this.getMetricsForDeveloper(dev.id, options.dateFrom, options.dateTo, options.projectId, options.repositoryId),
      ]);

      results.push({
        id: dev.id,
        githubUserId: dev.github_user_id,
        login: dev.login,
        name: dev.name || dev.login,
        avatarUrl: dev.avatar_url,
        profileUrl: dev.html_url || `https://github.com/${dev.login}`,
        email: dev.email,
        type: dev.type,
        createdAt: dev.created_at,
        updatedAt: dev.updated_at,
        projects: projectsRes.rows.map((p) => ({ id: p.id, name: p.name })),
        repositories: reposRes.rows.map((r) => ({ id: r.id, name: r.name, fullName: r.full_name })),
        metrics: {
          projectsCount: projectsRes.rows.length,
          repositoriesCount: reposRes.rows.length,
          commitsCount: metrics.commitCount,
          prsCount: metrics.prCount,
          reviewsCount: metrics.reviewCount,
          issuesCount: metrics.issueCount,
          linesAdded: metrics.additions,
          linesDeleted: metrics.deletions,
          changedFiles: metrics.changedFiles,
          lastActivityAt: dev.updated_at,
        },
      });
    }

    return {
      data: results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const developerRepository = new DeveloperRepository();
