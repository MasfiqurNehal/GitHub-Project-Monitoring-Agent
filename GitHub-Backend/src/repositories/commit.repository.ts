import { pool } from '../db/connection.js';

export interface CommitRow {
  id: string;
  repository_id: string;
  github_commit_sha: string;
  developer_id: string | null;
  branch: string | null;
  message: string;
  commit_url: string;
  committed_at: Date;
  authored_at: Date | null;
  additions: number;
  deletions: number;
  changed_files: number;
  parent_count: number;
  is_merge_commit: boolean;
  created_at: Date;
  updated_at: Date;
}

export class CommitRepository {
  async upsert(data: {
    id: string;
    repositoryId: string;
    githubCommitSha: string;
    developerId?: string | null;
    branch?: string | null;
    message: string;
    commitUrl: string;
    committedAt: Date;
    authoredAt?: Date | null;
    additions?: number;
    deletions?: number;
    changedFiles?: number;
    parentCount?: number;
    isMergeCommit?: boolean;
  }): Promise<CommitRow> {
    const query = `
      INSERT INTO commits (
        id, repository_id, github_commit_sha, developer_id, branch,
        message, commit_url, committed_at, authored_at, additions,
        deletions, changed_files, parent_count, is_merge_commit, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, NOW(), NOW()
      )
      ON CONFLICT (repository_id, github_commit_sha) DO UPDATE SET
        developer_id = COALESCE(EXCLUDED.developer_id, commits.developer_id),
        message = EXCLUDED.message,
        additions = EXCLUDED.additions,
        deletions = EXCLUDED.deletions,
        changed_files = EXCLUDED.changed_files,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      data.id,
      data.repositoryId,
      data.githubCommitSha,
      data.developerId || null,
      data.branch || null,
      data.message,
      data.commitUrl,
      data.committedAt,
      data.authoredAt || null,
      data.additions || 0,
      data.deletions || 0,
      data.changedFiles || 0,
      data.parentCount || 1,
      data.isMergeCommit || false,
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  }

  async saveCommitFiles(commitId: string, files: Array<{
    id: string;
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string | null;
  }>): Promise<void> {
    for (const f of files) {
      await pool.query(
        `INSERT INTO commit_files (id, commit_id, filename, status, additions, deletions, changes, patch, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [f.id, commitId, f.filename, f.status, f.additions, f.deletions, f.changes, f.patch || null]
      );
    }
  }

  async findByRepository(repositoryId: string, limit = 100): Promise<CommitRow[]> {
    const res = await pool.query(
      'SELECT * FROM commits WHERE repository_id = $1 ORDER BY committed_at DESC LIMIT $2',
      [repositoryId, limit]
    );
    return res.rows;
  }
}

export const commitRepository = new CommitRepository();
