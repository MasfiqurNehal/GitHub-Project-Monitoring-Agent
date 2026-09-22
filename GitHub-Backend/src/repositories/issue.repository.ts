import { pool } from '../db/connection.js';

export interface IssueRow {
  id: string;
  repository_id: string;
  github_issue_id: number | string;
  number: number;
  author_developer_id: string | null;
  title: string;
  body: string | null;
  state: string;
  closed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  comments_count: number;
  html_url: string | null;
}

export class IssueRepository {
  async upsert(data: {
    id: string;
    repositoryId: string;
    githubIssueId: number | string;
    number: number;
    authorDeveloperId?: string | null;
    title: string;
    body?: string | null;
    state: string;
    closedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    commentsCount?: number;
    htmlUrl?: string | null;
  }): Promise<IssueRow> {
    const query = `
      INSERT INTO issues (
        id, repository_id, github_issue_id, number, author_developer_id,
        title, body, state, closed_at, created_at, updated_at, comments_count, html_url
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12, $13
      )
      ON CONFLICT (repository_id, github_issue_id) DO UPDATE SET
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        state = EXCLUDED.state,
        closed_at = EXCLUDED.closed_at,
        updated_at = EXCLUDED.updated_at,
        comments_count = EXCLUDED.comments_count
      RETURNING *
    `;

    const values = [
      data.id,
      data.repositoryId,
      data.githubIssueId,
      data.number,
      data.authorDeveloperId || null,
      data.title,
      data.body || null,
      data.state.toUpperCase(),
      data.closedAt || null,
      data.createdAt,
      data.updatedAt,
      data.commentsCount || 0,
      data.htmlUrl || null,
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  }
}

export const issueRepository = new IssueRepository();
