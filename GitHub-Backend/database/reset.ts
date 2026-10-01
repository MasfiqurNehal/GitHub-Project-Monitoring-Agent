import { pool } from '../src/db/connection.js';
import { execSync } from 'child_process';

async function resetDatabase() {
  console.log('[Database Reset] Dropping all tables in Neon PostgreSQL database...');
  const client = await pool.connect();

  try {
    await client.query(`
      DROP TABLE IF EXISTS engineering_messages CASCADE;
      DROP TABLE IF EXISTS engineering_conversations CASCADE;
      DROP TABLE IF EXISTS chatbot_messages CASCADE;
      DROP TABLE IF EXISTS chatbot_conversations CASCADE;
      DROP TABLE IF EXISTS project_repositories CASCADE;
      DROP TABLE IF EXISTS schema_migrations CASCADE;
      DROP TABLE IF EXISTS sync_jobs CASCADE;
      DROP TABLE IF EXISTS webhook_events CASCADE;
      DROP TABLE IF EXISTS activity_events CASCADE;
      DROP TABLE IF EXISTS issue_labels CASCADE;
      DROP TABLE IF EXISTS labels CASCADE;
      DROP TABLE IF EXISTS issue_events CASCADE;
      DROP TABLE IF EXISTS issues CASCADE;
      DROP TABLE IF EXISTS pull_request_reviewers CASCADE;
      DROP TABLE IF EXISTS pull_request_reviews CASCADE;
      DROP TABLE IF EXISTS pull_requests CASCADE;
      DROP TABLE IF EXISTS commit_files CASCADE;
      DROP TABLE IF EXISTS commits CASCADE;
      DROP TABLE IF EXISTS repository_developers CASCADE;
      DROP TABLE IF EXISTS developers CASCADE;
      DROP TABLE IF EXISTS repositories CASCADE;
      DROP TABLE IF EXISTS projects CASCADE;
      DROP TABLE IF EXISTS user_login_history CASCADE;
      DROP TABLE IF EXISTS refresh_tokens CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS saas_organizations CASCADE;
    `);

    console.log('[Database Reset] All tables dropped successfully!');
  } catch (err: any) {
    console.error('[Database Reset Error]', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase().then(() => {
  console.log('[Database Reset] Re-running all database migrations...');
  try {
    execSync('npx tsx database/migrate.ts', { stdio: 'inherit' });
    console.log('[Database Reset] Database successfully cleaned and re-migrated!');
  } catch (e) {
    console.error('[Migration Error]', e);
  }
});
