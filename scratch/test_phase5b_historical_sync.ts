import { pool } from '../GitHub-Backend/src/db/connection.js';
import { repositoryRepository } from '../GitHub-Backend/src/repositories/repository.repository.js';
import { syncService } from '../GitHub-Backend/src/services/sync.service.js';
import { analyticsService } from '../GitHub-Backend/src/services/analytics.service.js';

async function runTest() {
  console.log('=== PHASE 5B: HISTORICAL GITHUB SYNCHRONIZATION TEST ===\n');

  try {
    // 1. Find target repository
    const repos = await repositoryRepository.findAll();
    console.log(`Found ${repos.length} total monitored repositories in database.`);
    
    if (repos.length === 0) {
      console.log('No repositories found in database.');
      process.exit(0);
    }

    const repo = repos.find(r => r.full_name === 'MasfiqurNehal/Nexora-AI') || repos[0];
    console.log(`Target Repository: ${repo.full_name} (ID: ${repo.id})`);
    console.log(`Previous last_synced_at: ${repo.last_synced_at}`);
    console.log(`Previous sync_status: ${repo.sync_status}`);

    // 2. Reset last_synced_at to null to test INITIAL HISTORICAL SYNC
    await pool.query(
      `UPDATE repositories SET last_synced_at = NULL, sync_status = 'PENDING' WHERE id = $1`,
      [repo.id]
    );
    console.log('\n[TEST STEP 1] Reset repository state to NULL last_synced_at (Initial Sync state).');

    // 3. Trigger Initial Historical Sync
    console.log('\n[TEST STEP 2] Running Initial Historical Sync...');
    const initialSyncResult = await syncService.runFullHistoricalSync(repo.id);
    console.log('\nInitial Sync Result:', JSON.stringify(initialSyncResult, null, 2));

    // 4. Verify Database Records Populated
    const [commitsRes, devsRes, prsRes, issuesRes, actRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM commits WHERE repository_id = $1`, [repo.id]),
      pool.query(`SELECT COUNT(*) FROM repository_developers WHERE repository_id = $1`, [repo.id]),
      pool.query(`SELECT COUNT(*) FROM pull_requests WHERE repository_id = $1`, [repo.id]),
      pool.query(`SELECT COUNT(*) FROM issues WHERE repository_id = $1`, [repo.id]),
      pool.query(`SELECT COUNT(*) FROM activity_events WHERE repository_id = $1`, [repo.id]),
    ]);

    console.log('\n--- Real Database Records Populated ---');
    console.log(`Commits count: ${commitsRes.rows[0].count}`);
    console.log(`Developers count: ${devsRes.rows[0].count}`);
    console.log(`Pull Requests count: ${prsRes.rows[0].count}`);
    console.log(`Issues count: ${issuesRes.rows[0].count}`);
    console.log(`Activity Events count: ${actRes.rows[0].count}`);

    // 5. Test Incremental Sync & Idempotency
    const updatedRepo = await repositoryRepository.findById(repo.id);
    console.log(`\nPost-Initial Sync last_synced_at: ${updatedRepo?.last_synced_at?.toISOString()}`);
    console.log(`Post-Initial Sync status: ${updatedRepo?.sync_status}`);

    console.log('\n[TEST STEP 3] Running Incremental Sync (testing idempotency)...');
    const incrementalSyncResult = await syncService.runFullHistoricalSync(repo.id);
    console.log('Incremental Sync Result status:', incrementalSyncResult.status);

    const [commitsRes2, devsRes2] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM commits WHERE repository_id = $1`, [repo.id]),
      pool.query(`SELECT COUNT(*) FROM repository_developers WHERE repository_id = $1`, [repo.id]),
    ]);

    console.log(`Post-Incremental Commits count (should match): ${commitsRes2.rows[0].count}`);
    console.log(`Post-Incremental Developers count (should match): ${devsRes2.rows[0].count}`);

    // 6. Test Analytics Metrics Data Flow
    const analytics = await analyticsService.getRepositoryFullDetail(repo.id);
    if (!analytics) {
      throw new Error('getRepositoryFullDetail returned null');
    }

    console.log('\n--- Repository Detail Analytics Verification ---');
    console.log(`Analytics Total Commits: ${analytics.repository.metrics.commitsCount}`);
    console.log(`Analytics Total Developers: ${analytics.repository.metrics.developersCount}`);
    console.log(`Analytics Code Additions: ${analytics.repository.metrics.linesAdded}`);
    console.log(`Analytics Code Deletions: ${analytics.repository.metrics.linesDeleted}`);
    console.log(`Analytics Net Impact: ${analytics.codeChanges.netChanges}`);

    console.log('\n✅ PHASE 5B HISTORICAL SYNC VERIFICATION COMPLETE!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Test failed:', err.message, err);
    process.exit(1);
  }
}

runTest();
