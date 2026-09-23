import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seed() {
  console.log('🌱 Starting Database Seeding with valid schema...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Projects
    const projId = crypto.randomUUID();
    const projectRes = await client.query(`
      INSERT INTO projects (id, name, description)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
      RETURNING id;
    `, [projId, 'GitHub Monitoring Platform', 'AI Agentic workspace for developer productivity analytics and repository insights']);

    let projectId: string = projId;
    if (projectRes.rows.length === 0) {
      const existing = await client.query(`SELECT id FROM projects LIMIT 1;`);
      projectId = existing.rows[0].id;
    }

    // 2. Repositories
    const repoUuid = crypto.randomUUID();
    const repoRes = await client.query(`
      INSERT INTO repositories (id, project_id, github_repository_id, name, full_name, owner, default_branch, is_private, sync_status, html_url, last_synced_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (github_repository_id) DO UPDATE SET sync_status = 'SYNCED'
      RETURNING id;
    `, [
      repoUuid,
      projectId,
      990182881,
      'GitHub-Project-Monitoring-Agent',
      'MasfiqurNehal/GitHub-Project-Monitoring-Agent',
      'MasfiqurNehal',
      'main',
      false,
      'SYNCED',
      'https://github.com/MasfiqurNehal/GitHub-Project-Monitoring-Agent',
    ]);
    const repoId = repoRes.rows[0].id;

    // 3. Developers
    const dev1Uuid = crypto.randomUUID();
    const dev2Uuid = crypto.randomUUID();
    const dev3Uuid = crypto.randomUUID();

    const dev1 = await client.query(`
      INSERT INTO developers (id, github_user_id, login, name, avatar_url, html_url)
      VALUES ($1, 101, 'MasfiqurNehal', 'Masfiqur Nehal', 'https://github.com/MasfiqurNehal.png', 'https://github.com/MasfiqurNehal')
      ON CONFLICT (login) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `, [dev1Uuid]);

    const dev2 = await client.query(`
      INSERT INTO developers (id, github_user_id, login, name, avatar_url, html_url)
      VALUES ($1, 102, 'octocat', 'The Octocat', 'https://github.com/octocat.png', 'https://github.com/octocat')
      ON CONFLICT (login) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `, [dev2Uuid]);

    const dev3 = await client.query(`
      INSERT INTO developers (id, github_user_id, login, name, avatar_url, html_url)
      VALUES ($1, 103, 'ai-code-reviewer', 'AI Review Bot', 'https://github.com/github.png', 'https://github.com/github')
      ON CONFLICT (login) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `, [dev3Uuid]);

    const dev1Id = dev1.rows[0].id;
    const dev2Id = dev2.rows[0].id;
    const dev3Id = dev3.rows[0].id;

    // Link Developers to Repository
    await client.query(`
      INSERT INTO repository_developers (repository_id, developer_id)
      VALUES ($1, $2), ($1, $3), ($1, $4)
      ON CONFLICT DO NOTHING;
    `, [repoId, dev1Id, dev2Id, dev3Id]);

    // 4. Pull Requests
    const pr1Uuid = crypto.randomUUID();
    const pr2Uuid = crypto.randomUUID();
    const pr3Uuid = crypto.randomUUID();

    const pr1 = await client.query(`
      INSERT INTO pull_requests (id, repository_id, github_pr_id, number, title, body, state, draft, author_developer_id, additions, deletions, changed_files, created_at, updated_at)
      VALUES ($1, $2, 201, 14, 'feat: connect frontend to backend with full API integration & telemetry logs', 'Integrates all REST endpoints across Next.js frontend and Express backend engine.', 'MERGED', false, $3, 480, 45, 12, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day')
      ON CONFLICT (repository_id, github_pr_id) DO UPDATE SET state = 'MERGED'
      RETURNING id;
    `, [pr1Uuid, repoId, dev1Id]);

    const pr2 = await client.query(`
      INSERT INTO pull_requests (id, repository_id, github_pr_id, number, title, body, state, draft, author_developer_id, additions, deletions, changed_files, created_at, updated_at)
      VALUES ($1, $2, 202, 15, 'fix: nanosecond precision logger output format & single timestamping', 'Refactor backend logger to emit unified nanosecond ISO timestamps.', 'OPEN', false, $3, 120, 18, 4, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '1 hour')
      ON CONFLICT (repository_id, github_pr_id) DO UPDATE SET state = 'OPEN'
      RETURNING id;
    `, [pr2Uuid, repoId, dev1Id]);

    const pr3 = await client.query(`
      INSERT INTO pull_requests (id, repository_id, github_pr_id, number, title, body, state, draft, author_developer_id, additions, deletions, changed_files, created_at, updated_at)
      VALUES ($1, $2, 203, 16, 'refactor: database migrations clean and reset commands', 'Add safe schema resets for Neon PostgreSQL connection pool.', 'CLOSED', false, $3, 95, 30, 3, NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours')
      ON CONFLICT (repository_id, github_pr_id) DO UPDATE SET state = 'CLOSED'
      RETURNING id;
    `, [pr3Uuid, repoId, dev2Id]);

    const pr1Id = pr1.rows[0].id;
    const pr2Id = pr2.rows[0].id;

    // PR Reviews
    await client.query(`
      INSERT INTO pull_request_reviews (id, pull_request_id, github_review_id, reviewer_developer_id, state, body, submitted_at)
      VALUES 
      ($1, $2, 301, $3, 'APPROVED', 'Looks great! Clean backend structure and flawless Neon DB pool handling.', NOW() - INTERVAL '1 day'),
      ($4, $5, 302, $3, 'CHANGES_REQUESTED', 'Please add telemetry logging for frontend router events.', NOW() - INTERVAL '3 hours')
      ON CONFLICT DO NOTHING;
    `, [crypto.randomUUID(), pr1Id, dev3Id, crypto.randomUUID(), pr2Id]);

    // 5. Issues
    await client.query(`
      INSERT INTO issues (id, repository_id, github_issue_id, number, title, body, state, author_developer_id, comments_count, created_at, updated_at)
      VALUES 
      ($1, $2, 401, 1, 'Bug: Telemetry double-timestamp formatting in logger.txt', 'The logger output contains duplicate timestamps at start and end of line.', 'CLOSED', $3, 3, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
      ($4, $2, 402, 2, 'Feature Request: Real-time telemetry log streaming on terminal', 'Add npm run logs command for instant tailing of server and frontend events.', 'CLOSED', $3, 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
      ($5, $2, 403, 3, 'Enhancement: Full-stack API verification for Developer & Project metrics', 'Ensure all React Query hooks render non-zero charts on the main dashboard.', 'OPEN', $6, 2, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '1 hour')
      ON CONFLICT (repository_id, github_issue_id) DO NOTHING;
    `, [crypto.randomUUID(), repoId, dev1Id, crypto.randomUUID(), crypto.randomUUID(), dev2Id]);

    // 6. Commits
    await client.query(`
      INSERT INTO commits (id, repository_id, github_commit_sha, message, developer_id, additions, deletions, committed_at)
      VALUES 
      ($1, $2, 'a1b2c3d4e5f678901234567890abcdef12345678', 'feat: setup Neon Cloud PostgreSQL migrations and schema tables', $3, 340, 0, NOW() - INTERVAL '3 days'),
      ($4, $2, 'b2c3d4e5f678901234567890abcdef12345678a9', 'fix: Express router registration for pull-requests and issues controllers', $3, 85, 12, NOW() - INTERVAL '1 day'),
      ($5, $2, 'c3d4e5f678901234567890abcdef12345678a9b0', 'style: glassmorphic UI polish and modern typography', $6, 140, 22, NOW() - INTERVAL '6 hours')
      ON CONFLICT (repository_id, github_commit_sha) DO NOTHING;
    `, [crypto.randomUUID(), repoId, dev1Id, crypto.randomUUID(), crypto.randomUUID(), dev2Id]);

    // 7. Engineering Activity Events
    await client.query(`
      INSERT INTO activity_events (id, repository_id, developer_id, event_type, metadata, occurred_at)
      VALUES 
      ($1, $2, $3, 'PULL_REQUEST_OPENED', '{"title": "fix: nanosecond precision logger output format", "prNumber": 15}', NOW() - INTERVAL '4 hours'),
      ($4, $2, $3, 'COMMIT_PUSHED', '{"commitSha": "b2c3d4e5", "message": "fix: Express router registration"}', NOW() - INTERVAL '5 hours'),
      ($5, $2, $6, 'REVIEW_SUBMITTED', '{"prNumber": 15, "state": "APPROVED"}', NOW() - INTERVAL '3 hours'),
      ($7, $2, $3, 'ISSUE_OPENED', '{"title": "Enhancement: Full-stack API verification", "issueNumber": 3}', NOW() - INTERVAL '2 hours');
    `, [crypto.randomUUID(), repoId, dev1Id, crypto.randomUUID(), crypto.randomUUID(), dev3Id, crypto.randomUUID()]);

    await client.query('COMMIT');
    console.log('✅ Database Seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Database Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
