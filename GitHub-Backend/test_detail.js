const { pool } = require('./dist/database/client');
const { analyticsService } = require('./dist/services/analytics.service');

async function testRepositoryDetail() {
  try {
    const reposRes = await pool.query(`SELECT id, full_name FROM repositories LIMIT 5`);
    console.log('Repositories in DB:', reposRes.rows);

    if (reposRes.rows.length === 0) {
      console.log('No repositories found in DB.');
      process.exit(0);
    }

    for (const repoRow of reposRes.rows) {
      console.log(`\n==================================================`);
      console.log(`REPOSITORY DETAIL FOR: ${repoRow.full_name} (${repoRow.id})`);
      console.log(`==================================================`);
      const detail = await analyticsService.getRepositoryFullDetail(repoRow.id);
      
      if (!detail) {
        console.error(`Detail returned null for ${repoRow.full_name}`);
        continue;
      }

      console.log('--- Repository Info ---');
      console.log('Name:', detail.repository.name);
      console.log('Owner:', detail.repository.owner);
      console.log('Visibility:', detail.repository.isPrivate ? 'Private' : 'Public');
      console.log('Default Branch:', detail.repository.defaultBranch);
      console.log('Status:', detail.repository.status);
      console.log('Last Synced At:', detail.repository.lastSyncedAt);
      console.log('Metrics:', detail.repository.metrics);

      console.log('--- Branches ---');
      console.log(`Branches (${detail.branches.length}):`, detail.branches.map(b => b.name));

      console.log('--- Overview ---');
      console.log(detail.overview);

      console.log('--- Developers ---');
      console.log(`Developers (${detail.developers.length}):`, detail.developers.map(d => `${d.name || d.login} (${d.commits} commits, ${d.prs} PRs)`));

      console.log('--- Telemetry Counts ---');
      console.log(`Commits Count: ${detail.commits.length}`);
      console.log(`PRs Count: ${detail.pullRequests.length}`);
      console.log(`Issues Count: ${detail.issues.length}`);
      console.log(`Recent Activity Events: ${detail.recentActivity.length}`);
      console.log(`Code Changes Net: ${detail.codeChanges.netChanges} (+${detail.codeChanges.totalAdditions} / -${detail.codeChanges.totalDeletions})`);
    }

  } catch (err) {
    console.error('Error running test:', err);
  } finally {
    await pool.end();
  }
}

testRepositoryDetail();
