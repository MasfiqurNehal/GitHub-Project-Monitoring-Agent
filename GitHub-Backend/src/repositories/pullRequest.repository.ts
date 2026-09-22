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
}

export const pullRequestRepository = new PullRequestRepository();
