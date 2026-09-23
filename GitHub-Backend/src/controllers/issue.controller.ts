import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection.js';

export async function listIssues(req: Request, res: Response, next: NextFunction) {
  try {
    const { repositoryId, projectId, developerId, state } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (repositoryId) {
      conditions.push(`i.repository_id = $${idx++}`);
      params.push(repositoryId);
    }

    if (projectId) {
      conditions.push(`r.project_id = $${idx++}`);
      params.push(projectId);
    }

    if (developerId) {
      conditions.push(`i.author_developer_id = $${idx++}`);
      params.push(developerId);
    }

    if (state && state !== 'ALL') {
      conditions.push(`i.state = $${idx++}`);
      params.push(String(state).toUpperCase());
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        i.*,
        r.name as repo_name,
        r.full_name as repo_full_name,
        d.id as author_id,
        d.login as author_login,
        d.name as author_name,
        d.avatar_url as author_avatar
      FROM issues i
      LEFT JOIN repositories r ON i.repository_id = r.id
      LEFT JOIN developers d ON i.author_developer_id = d.id
      ${whereSql}
      ORDER BY i.created_at DESC
      LIMIT 100
    `;

    const resDb = await pool.query(query, params);
    const data = resDb.rows.map((row) => ({
      id: row.id,
      repositoryId: row.repository_id,
      githubIssueId: row.github_issue_id,
      number: row.number,
      title: row.title,
      body: row.body,
      state: row.state,
      author: {
        id: row.author_id || 'dev-unknown',
        login: row.author_login || 'author',
        name: row.author_name,
        avatarUrl: row.author_avatar,
      },
      repository: {
        id: row.repository_id,
        name: row.repo_name,
        fullName: row.repo_full_name,
      },
      labels: [],
      assignees: [],
      commentsCount: row.comments_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      closedAt: row.closed_at,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getIssueDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const issueRes = await pool.query(
      `SELECT i.*, r.name as repo_name, r.full_name as repo_full_name, d.id as author_id, d.login as author_login, d.avatar_url as author_avatar
       FROM issues i
       LEFT JOIN repositories r ON i.repository_id = r.id
       LEFT JOIN developers d ON i.author_developer_id = d.id
       WHERE i.id = $1`,
      [id]
    );

    if (issueRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    const row = issueRes.rows[0];

    res.json({
      success: true,
      data: {
        issue: {
          id: row.id,
          repositoryId: row.repository_id,
          githubIssueId: row.github_issue_id,
          number: row.number,
          title: row.title,
          body: row.body,
          state: row.state,
          author: { id: row.author_id, login: row.author_login, avatarUrl: row.author_avatar },
          repository: { id: row.repository_id, name: row.repo_name, fullName: row.repo_full_name },
          labels: [],
          assignees: [],
          commentsCount: row.comments_count || 0,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          closedAt: row.closed_at,
        },
        comments: [],
        timeline: [],
        relatedPullRequests: [],
      },
    });
  } catch (err) {
    next(err);
  }
}
