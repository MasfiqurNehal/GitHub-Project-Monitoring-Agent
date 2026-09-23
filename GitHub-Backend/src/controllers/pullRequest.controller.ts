import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection.js';

export async function listPullRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const { repositoryId, projectId, developerId, state } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (repositoryId) {
      conditions.push(`pr.repository_id = $${idx++}`);
      params.push(repositoryId);
    }

    if (projectId) {
      conditions.push(`r.project_id = $${idx++}`);
      params.push(projectId);
    }

    if (developerId) {
      conditions.push(`pr.author_developer_id = $${idx++}`);
      params.push(developerId);
    }

    if (state && state !== 'ALL') {
      conditions.push(`pr.state = $${idx++}`);
      params.push(String(state).toUpperCase());
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        pr.*,
        r.name as repo_name,
        r.full_name as repo_full_name,
        d.id as author_id,
        d.login as author_login,
        d.name as author_name,
        d.avatar_url as author_avatar
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      LEFT JOIN developers d ON pr.author_developer_id = d.id
      ${whereSql}
      ORDER BY pr.created_at DESC
      LIMIT 100
    `;

    const resDb = await pool.query(query, params);
    const data = resDb.rows.map((row) => ({
      id: row.id,
      repositoryId: row.repository_id,
      githubPrId: row.github_pr_id,
      number: row.number,
      authorId: row.author_developer_id,
      title: row.title,
      body: row.body,
      state: row.state,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      closedAt: row.closed_at,
      mergedAt: row.merged_at,
      additions: row.additions || 0,
      deletions: row.deletions || 0,
      changedFiles: row.changed_files || 0,
      reviewStatus: row.merged ? 'APPROVED' : 'PENDING',
      commitsCount: row.commits_count || 1,
      targetBranch: row.base_branch || 'main',
      sourceBranch: row.head_branch || 'feature',
      repository: {
        id: row.repository_id,
        name: row.repo_name,
        fullName: row.repo_full_name,
      },
      author: row.author_login
        ? {
            id: row.author_id,
            login: row.author_login,
            name: row.author_name,
            avatarUrl: row.author_avatar,
          }
        : null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getPullRequestDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const prRes = await pool.query(
      `SELECT pr.*, r.name as repo_name, r.full_name as repo_full_name, d.login as author_login, d.avatar_url as author_avatar
       FROM pull_requests pr
       LEFT JOIN repositories r ON pr.repository_id = r.id
       LEFT JOIN developers d ON pr.author_developer_id = d.id
       WHERE pr.id = $1`,
      [id]
    );

    if (prRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Pull Request not found' });
    }

    const row = prRes.rows[0];

    const reviewsRes = await pool.query(
      `SELECT prr.*, d.login as reviewer_login, d.name as reviewer_name, d.avatar_url as reviewer_avatar
       FROM pull_request_reviews prr
       LEFT JOIN developers d ON prr.reviewer_developer_id = d.id
       WHERE prr.pull_request_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        pullRequest: {
          id: row.id,
          repositoryId: row.repository_id,
          githubPrId: row.github_pr_id,
          number: row.number,
          title: row.title,
          body: row.body,
          state: row.state,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          closedAt: row.closed_at,
          mergedAt: row.merged_at,
          additions: row.additions || 0,
          deletions: row.deletions || 0,
          changedFiles: row.changed_files || 0,
          reviewStatus: row.merged ? 'APPROVED' : 'PENDING',
          commitsCount: row.commits_count || 1,
          targetBranch: row.base_branch || 'main',
          sourceBranch: row.head_branch || 'feature',
          repository: { id: row.repository_id, name: row.repo_name, fullName: row.repo_full_name },
        },
        reviewers: reviewsRes.rows.map((r) => ({
          id: r.id,
          login: r.reviewer_login || 'reviewer',
          name: r.reviewer_name,
          avatarUrl: r.reviewer_avatar,
          state: r.state,
          submittedAt: r.submitted_at,
          body: r.body,
        })),
        commits: [],
        files: [],
        timeline: [],
      },
    });
  } catch (err) {
    next(err);
  }
}
