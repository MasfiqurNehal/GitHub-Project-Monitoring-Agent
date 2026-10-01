import { pool } from '../src/db/connection.js';

async function cleanDataOnly() {
  console.log('[Database Clean] Truncating all data rows from Neon PostgreSQL tables...');
  const client = await pool.connect();

  try {
    // Truncate data tables while preserving database schema and migration history
    await client.query(`
      TRUNCATE TABLE 
        engineering_messages,
        engineering_conversations,
        chatbot_messages,
        chatbot_conversations,
        sync_jobs,
        webhook_events,
        activity_events,
        issues,
        pull_request_reviews,
        pull_requests,
        commit_files,
        commits,
        repository_developers,
        developers,
        repositories,
        project_repositories,
        projects,
        user_login_history,
        refresh_tokens,
        users,
        saas_organizations
      RESTART IDENTITY CASCADE;
    `);

    console.log('[Database Clean] Successfully cleared all table rows! Schema and migration history preserved.');
  } catch (err: any) {
    console.error('[Database Clean Error]', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanDataOnly();
