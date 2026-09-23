import { pool } from '../db/connection.js';

export interface PullRequestRow {
  id: string;
  repository_id: string;
  github_pr_id: number | string;
  number: number;
  author_developer_id: string | null;
  title: string;
  body: string | null;
  state: string;
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
  base_branch: string | null;
  head_branch: string | null;
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
  merged_at: Date | null;
  comments_count: number;
  review_comments_count: number;
  commits_count: number;
  additions: number;
  deletions: number;
  changed_files: number;
  html_url: string | null;
}

export interface PullRequestFilterOptions {
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  state?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export class PullRequestRepository {
  async upsert(data: {
    id: string;
    repositoryId: string;
    githubPrId: number | string;
    number: number;
    authorDeveloperId?: string | null;
    title: string;
    body?: string | null;
    state: string;
    draft?: boolean;
    merged?: boolean;
    baseBranch?: string | null;
    headBranch?: string | null;
    createdAt: Date;
    updatedAt: Date;
    closedAt?: Date | null;
    mergedAt?: Date | null;
    commentsCount?: number;
    reviewCommentsCount?: number;
    commitsCount?: number;
    additions?: number;
    deletions?: number;
    changedFiles?: number;
    htmlUrl?: string | null;
  }): Promise<PullRequestRow> {
    const query = `
      INSERT INTO pull_requests (
        id, repository_id, github_pr_id, number, author_developer_id,
        title, body, state, draft, merged, base_branch, head_branch,
        created_at, updated_at, closed_at, merged_at, comments_count,
        review_comments_count, commits_count, additions, deletions, changed_files, html_url
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23
      )
      ON CONFLICT (repository_id, github_pr_id) DO UPDATE SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        state = EXCLUDED.state,
        draft = EXCLUDED.draft,
        merged = EXCLUDED.merged,
        updated_at = EXCLUDED.updated_at,
        closed_at = EXCLUDED.closed_at,
        merged_at = EXCLUDED.merged_at,
        comments_count = EXCLUDED.comments_count,
        review_comments_count = EXCLUDED.review_comments_count,
        commits_count = EXCLUDED.commits_count,
        additions = EXCLUDED.additions,
        deletions = EXCLUDED.deletions,
        changed_files = EXCLUDED.changed_files
      RETURNING *
    `;

    const values = [
      data.id,
      data.repositoryId,
      data.githubPrId,
      data.number,
      data.authorDeveloperId || null,
      data.title,
      data.body || null,
      data.state.toUpperCase(),
      data.draft || false,
      data.merged || false,
      data.baseBranch || null,
      data.headBranch || null,
      data.createdAt,
      data.updatedAt,
      data.closedAt || null,
      data.mergedAt || null,
      data.commentsCount || 0,
      data.reviewCommentsCount || 0,
      data.commitsCount || 0,
      data.additions || 0,
      data.deletions || 0,
      data.changedFiles || 0,
      data.htmlUrl || null,
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  }

  async saveReview(data: {
    id: string;
    pullRequestId: string;
    githubReviewId?: number | string | null;
    reviewerDeveloperId?: string | null;
    state: string;
    body?: string | null;
    submittedAt: Date;
    htmlUrl?: string | null;
  }) {
    await pool.query(
      `INSERT INTO pull_request_reviews (id, pull_request_id, github_review_id, reviewer_developer_id, state, body, submitted_at, html_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (github_review_id) DO UPDATE SET state = EXCLUDED.state, body = EXCLUDED.body`,
      [data.id, data.pullRequestId, data.githubReviewId || null, data.reviewerDeveloperId || null, data.state.toUpperCase(), data.body || null, data.submittedAt, data.htmlUrl || null]
    );
  }

  async findPullRequests(options: PullRequestFilterOptions) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (options.repositoryId) {
      conditions.push(`(pr.repository_id = $${pIdx} OR r.full_name = $${pIdx} OR r.name = $${pIdx})`);
      params.push(options.repositoryId);
      pIdx++;
    }

    if (options.projectId) {
      conditions.push(`r.project_id = $${pIdx}`);
      params.push(options.projectId);
      pIdx++;
    }

    if (options.developerId) {
      conditions.push(`(pr.author_developer_id = $${pIdx} OR d.login = $${pIdx})`);
      params.push(options.developerId);
      pIdx++;
    }

    if (options.state && options.state.toUpperCase() !== 'ALL') {
      conditions.push(`UPPER(pr.state) = UPPER($${pIdx})`);
      params.push(options.state);
      pIdx++;
    }

    if (options.dateFrom) {
      conditions.push(`pr.created_at >= $${pIdx}`);
      params.push(new Date(options.dateFrom));
      pIdx++;
    }

    if (options.dateTo) {
      conditions.push(`pr.created_at <= $${pIdx}`);
      params.push(new Date(options.dateTo));
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) 
      FROM pull_requests pr
      JOIN repositories r ON r.id = pr.repository_id
      LEFT JOIN developers d ON d.id = pr.author_developer_id
      ${whereClause}
    `;

    const dataSql = `
      SELECT 
        pr.*,
        r.name as repo_name,
        r.full_name as repo_full_name,
        d.id as author_id,
        d.login as author_login,
        d.name as author_name,
        d.avatar_url as author_avatar_url,
        d.html_url as author_html_url
      FROM pull_requests pr
      JOIN repositories r ON r.id = pr.repository_id
      LEFT JOIN developers d ON d.id = pr.author_developer_id
      ${whereClause}
      ORDER BY pr.created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;

    const countRes = await pool.query(countSql, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await pool.query(dataSql, [...params, limit, offset]);

    const formattedPRs = await Promise.all(
      dataRes.rows.map(async (row) => {
        const reviewsRes = await pool.query(
          `SELECT prr.*, d.id as reviewer_id, d.login as reviewer_login, d.name as reviewer_name, d.avatar_url as reviewer_avatar_url
           FROM pull_request_reviews prr
           LEFT JOIN developers d ON prr.reviewer_developer_id = d.id
           WHERE prr.pull_request_id = $1`,
          [row.id]
        );

        let reviewStatus = 'PENDING';
        const reviews = reviewsRes.rows;
        if (row.merged) {
          reviewStatus = 'APPROVED';
        } else if (reviews.some((r) => r.state === 'APPROVED')) {
          reviewStatus = 'APPROVED';
        } else if (reviews.some((r) => r.state === 'CHANGES_REQUESTED')) {
          reviewStatus = 'CHANGES_REQUESTED';
        } else if (reviews.some((r) => r.state === 'COMMENTED')) {
          reviewStatus = 'COMMENTED';
        }

        return {
          id: row.id,
          repositoryId: row.repository_id,
          githubPrId: row.github_pr_id,
          number: row.number,
          title: row.title,
          body: row.body,
          state: row.state,
          draft: row.draft,
          merged: row.merged,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          closedAt: row.closed_at,
          mergedAt: row.merged_at,
          sourceBranch: row.head_branch || 'feature',
          targetBranch: row.base_branch || 'main',
          additions: row.additions || 0,
          deletions: row.deletions || 0,
          changedFiles: row.changed_files || 0,
          commitsCount: row.commits_count || 1,
          reviewStatus,
          url: row.html_url,
          repository: {
            id: row.repository_id,
            name: row.repo_name,
            fullName: row.repo_full_name,
          },
          author: row.author_login
            ? {
                id: row.author_id,
                login: row.author_login,
                name: row.author_name || row.author_login,
                avatarUrl: row.author_avatar_url,
                profileUrl: row.author_html_url,
              }
            : null,
          reviewers: reviews.map((r) => ({
            id: r.id,
            reviewerId: r.reviewer_id,
            login: r.reviewer_login,
            name: r.reviewer_name || r.reviewer_login,
            avatarUrl: r.reviewer_avatar_url,
            state: r.state,
            submittedAt: r.submitted_at,
            body: r.body,
          })),
        };
      })
    );

    return {
      data: formattedPRs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findDetailById(idOrNumber: string): Promise<any | null> {
    const prRes = await pool.query(
      `SELECT pr.*, r.name as repo_name, r.full_name as repo_full_name, d.id as author_id, d.login as author_login, d.name as author_name, d.avatar_url as author_avatar_url, d.html_url as author_html_url
       FROM pull_requests pr
       LEFT JOIN repositories r ON pr.repository_id = r.id
       LEFT JOIN developers d ON pr.author_developer_id = d.id
       WHERE pr.id = $1 OR CAST(pr.number AS TEXT) = $1 OR CAST(pr.github_pr_id AS TEXT) = $1`,
      [idOrNumber]
    );

    if (prRes.rows.length === 0) return null;
    const row = prRes.rows[0];

    const reviewsRes = await pool.query(
      `SELECT prr.*, d.id as reviewer_id, d.login as reviewer_login, d.name as reviewer_name, d.avatar_url as reviewer_avatar_url, d.html_url as reviewer_html_url
       FROM pull_request_reviews prr
       LEFT JOIN developers d ON prr.reviewer_developer_id = d.id
       WHERE prr.pull_request_id = $1`,
      [row.id]
    );

    const reviews = reviewsRes.rows;
    let reviewStatus = 'PENDING';
    if (row.merged) {
      reviewStatus = 'APPROVED';
    } else if (reviews.some((r) => r.state === 'APPROVED')) {
      reviewStatus = 'APPROVED';
    } else if (reviews.some((r) => r.state === 'CHANGES_REQUESTED')) {
      reviewStatus = 'CHANGES_REQUESTED';
    } else if (reviews.some((r) => r.state === 'COMMENTED')) {
      reviewStatus = 'COMMENTED';
    }

    return {
      id: row.id,
      repositoryId: row.repository_id,
      githubPrId: row.github_pr_id,
      number: row.number,
      title: row.title,
      body: row.body,
      state: row.state,
      draft: row.draft,
      merged: row.merged,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      closedAt: row.closed_at,
      mergedAt: row.merged_at,
      sourceBranch: row.head_branch || 'feature',
      targetBranch: row.base_branch || 'main',
      additions: row.additions || 0,
      deletions: row.deletions || 0,
      changedFiles: row.changed_files || 0,
      commitsCount: row.commits_count || 1,
      reviewStatus,
      url: row.html_url,
      repository: {
        id: row.repository_id,
        name: row.repo_name,
        fullName: row.repo_full_name,
      },
      author: row.author_login
        ? {
            id: row.author_id,
            login: row.author_login,
            name: row.author_name || row.author_login,
            avatarUrl: row.author_avatar_url,
            profileUrl: row.author_html_url,
          }
        : null,
      reviewers: reviews.map((r) => ({
        id: r.id,
        reviewerId: r.reviewer_id,
        login: r.reviewer_login,
        name: r.reviewer_name || r.reviewer_login,
        avatarUrl: r.reviewer_avatar_url,
        profileUrl: r.reviewer_html_url,
        state: r.state,
        submittedAt: r.submitted_at,
        body: r.body,
      })),
    };
  }

  async findByDeveloper(developerId: string, options: { repositoryId?: string; state?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) {
    return this.findPullRequests({
      ...options,
      developerId,
    });
  }

  async findReviewsByDeveloper(developerId: string, options: { repositoryId?: string; state?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['(prr.reviewer_developer_id = $1 OR d.login = $1)'];
    const params: any[] = [developerId];
    let pIdx = 2;

    if (options.repositoryId) {
      conditions.push(`(pr.repository_id = $${pIdx} OR r.full_name = $${pIdx})`);
      params.push(options.repositoryId);
      pIdx++;
    }

    if (options.state) {
      conditions.push(`UPPER(prr.state) = UPPER($${pIdx})`);
      params.push(options.state);
      pIdx++;
    }

    if (options.dateFrom) {
      conditions.push(`prr.submitted_at >= $${pIdx}`);
      params.push(new Date(options.dateFrom));
      pIdx++;
    }

    if (options.dateTo) {
      conditions.push(`prr.submitted_at <= $${pIdx}`);
      params.push(new Date(options.dateTo));
      pIdx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countSql = `
      SELECT COUNT(*) 
      FROM pull_request_reviews prr
      JOIN pull_requests pr ON pr.id = prr.pull_request_id
      JOIN repositories r ON r.id = pr.repository_id
      LEFT JOIN developers d ON d.id = prr.reviewer_developer_id
      ${whereClause}
    `;

    const dataSql = `
      SELECT 
        prr.*,
        pr.number as pull_request_number,
        pr.title as pull_request_title,
        r.full_name as repository_name,
        d.login as reviewer_login,
        d.avatar_url as reviewer_avatar_url
      FROM pull_request_reviews prr
      JOIN pull_requests pr ON pr.id = prr.pull_request_id
      JOIN repositories r ON r.id = pr.repository_id
      LEFT JOIN developers d ON d.id = prr.reviewer_developer_id
      ${whereClause}
      ORDER BY prr.submitted_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;

    const countRes = await pool.query(countSql, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataRes = await pool.query(dataSql, [...params, limit, offset]);

    return {
      data: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}

export const pullRequestRepository = new PullRequestRepository();
