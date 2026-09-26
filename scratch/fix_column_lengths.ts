import { pool } from '../GitHub-Backend/src/db/connection.js';

async function fixSchema() {
  console.log('Altering column lengths to VARCHAR(64) to prevent truncation errors...');
  await pool.query(`
    ALTER TABLE commits ALTER COLUMN id TYPE VARCHAR(64);
    ALTER TABLE commit_files ALTER COLUMN commit_id TYPE VARCHAR(64);
    ALTER TABLE developers ALTER COLUMN id TYPE VARCHAR(64);
    ALTER TABLE commits ALTER COLUMN developer_id TYPE VARCHAR(64);
    ALTER TABLE repository_developers ALTER COLUMN developer_id TYPE VARCHAR(64);
    ALTER TABLE pull_requests ALTER COLUMN author_developer_id TYPE VARCHAR(64);
    ALTER TABLE pull_request_reviews ALTER COLUMN reviewer_developer_id TYPE VARCHAR(64);
    ALTER TABLE issues ALTER COLUMN author_developer_id TYPE VARCHAR(64);
    ALTER TABLE issues ALTER COLUMN assignee_developer_id TYPE VARCHAR(64);
  `);
  console.log('✅ Schema column lengths successfully updated to VARCHAR(64).');
  process.exit(0);
}

fixSchema().catch(err => {
  console.error('Failed to fix schema:', err);
  process.exit(1);
});
