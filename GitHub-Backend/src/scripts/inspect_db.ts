import { pool } from '../db/connection.js';

async function main() {
  try {
    const repos = await pool.query('SELECT id, full_name, is_private, organization_id, sync_status, last_synced_at FROM repositories');
    console.log('--- REPOSITORIES ---');
    console.table(repos.rows);

    const insts = await pool.query('SELECT id, github_installation_id, account_login, organization_id, status FROM github_installations');
    console.log('--- GITHUB INSTALLATIONS ---');
    console.table(insts.rows);

    const prjs = await pool.query('SELECT id, name, organization_id FROM projects');
    console.log('--- PROJECTS ---');
    console.table(prjs.rows);

    const devs = await pool.query('SELECT id, login, name, organization_id FROM developers');
    console.log('--- DEVELOPERS ---');
    console.table(devs.rows);

    const commitCount = await pool.query('SELECT COUNT(*) FROM commits');
    console.log('--- COMMIT COUNT ---', commitCount.rows[0].count);

    const prCount = await pool.query('SELECT COUNT(*) FROM pull_requests');
    console.log('--- PR COUNT ---', prCount.rows[0].count);

    const issueCount = await pool.query('SELECT COUNT(*) FROM issues');
    console.log('--- ISSUE COUNT ---', issueCount.rows[0].count);

    process.exit(0);
  } catch (err: any) {
    console.error('Failed to inspect database:', err);
    process.exit(1);
  }
}

main();
