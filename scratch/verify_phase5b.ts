import { pool } from '../GitHub-Backend/src/db/connection.js';
import { repositoryRepository } from '../GitHub-Backend/src/repositories/repository.repository.js';
import { syncService } from '../GitHub-Backend/src/services/sync.service.js';
import { analyticsService } from '../GitHub-Backend/src/services/analytics.service.js';
import http from 'http';

function makePostRequest(path: string, token?: string): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5001,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode || 500, data: JSON.parse(body) });
          } catch (e) {
            resolve({ statusCode: res.statusCode || 500, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function makeGetRequest(path: string, token?: string): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5001,
        path,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode || 500, data: JSON.parse(body) });
          } catch (e) {
            resolve({ statusCode: res.statusCode || 500, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runVerification() {
  console.log('===============================================================');
  console.log('       PHASE 5B VERIFICATION — REAL GITHUB DATA TEST           ');
  console.log('===============================================================\n');

  try {
    // 1. Check current repository database records
    const repos = await repositoryRepository.findAll();
    console.log(`[STEP 1] Found ${repos.length} total monitored repositories in database.`);

    const targetRepoName = 'MasfiqurNehal/Nexora-AI';
    let repo = repos.find((r) => r.full_name === targetRepoName);
    if (!repo) {
      console.log(`Target ${targetRepoName} not found in DB. Available: ${repos.map(r => r.full_name).join(', ')}`);
      repo = repos[0];
    }

    console.log(`\nTarget Repository Details:`);
    console.log(`  - ID: ${repo.id}`);
    console.log(`  - Owner/Name: ${repo.full_name}`);
    console.log(`  - Current Sync Status: ${repo.sync_status}`);
    console.log(`  - Last Synced At: ${repo.last_synced_at ? repo.last_synced_at.toISOString() : 'NULL'}`);

    // Pre-sync counts
    const [preCommits, preDevs, prePRs, preIssues, preReviews, preAddDel] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM commits WHERE repository_id = $1`, [repo.id]),
      pool.query(`SELECT COUNT(*) FROM repository_developers WHERE repository_id = $1`, [repo.id]),
      pool.query(`SELECT COUNT(*) FROM pull_requests WHERE repository_id = $1`, [repo.id]),
      pool.query(`SELECT COUNT(*) FROM issues WHERE repository_id = $1`, [repo.id]),
      pool.query(
        `SELECT COUNT(*) FROM pull_request_reviews WHERE pull_request_id IN (SELECT id FROM pull_requests WHERE repository_id = $1)`,
        [repo.id]
      ),
      pool.query(
        `SELECT COALESCE(SUM(additions), 0) as additions, COALESCE(SUM(deletions), 0) as deletions FROM commits WHERE repository_id = $1`,
        [repo.id]
      ),
    ]);

    console.log(`\nPre-Verification Database State for ${repo.full_name}:`);
    console.log(`  - Commits: ${preCommits.rows[0].count}`);
    console.log(`  - Developers Linked: ${preDevs.rows[0].count}`);
    console.log(`  - Pull Requests: ${prePRs.rows[0].count}`);
    console.log(`  - Issues: ${preIssues.rows[0].count}`);
    console.log(`  - Reviews: ${preReviews.rows[0].count}`);
    console.log(`  - Code Additions: ${preAddDel.rows[0].additions}`);
    console.log(`  - Code Deletions: ${preAddDel.rows[0].deletions}`);

    // 2. Obtain auth token or test login to hit POST /api/repositories/:id/sync
    console.log(`\n[STEP 2 & 3] Triggering POST /api/repositories/${repo.id}/sync via API engine...`);
    
    // Login as default admin/user to get JWT token
    const loginRes = await makePostRequest('/api/auth/login', undefined);
    let token = '';
    if (loginRes.data?.data?.token) {
      token = loginRes.data.data.token;
      console.log(`  - Auth Login successful. Acquired JWT token.`);
    }

    // Reset last_synced_at to null to test INITIAL HISTORICAL SYNC flow explicitly
    await pool.query(
      `UPDATE repositories SET last_synced_at = NULL, sync_status = 'PENDING' WHERE id = $1`,
      [repo.id]
    );
    console.log(`  - Reset repository state to NULL last_synced_at (Initial Sync state).`);

    const syncApiRes = await makePostRequest(`/api/repositories/${repo.id}/sync`, token);
    console.log(`\nInitial API Sync Response (Status Code: ${syncApiRes.statusCode}):`);
    console.log(JSON.stringify(syncApiRes.data, null, 2));

    // 4. Verify Database Population Post Initial Sync
    const [postCommits, postDevs, postPRs, postIssues, postReviews, postAddDel] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM commits WHERE repository_id = $1`, [repo.id]),
      pool.query(`SELECT COUNT(*) FROM repository_developers WHERE repository_id = $1`, [repo.id]),
      pool.query(`SELECT COUNT(*) FROM pull_requests WHERE repository_id = $1`, [repo.id]),
      pool.query(`SELECT COUNT(*) FROM issues WHERE repository_id = $1`, [repo.id]),
      pool.query(
        `SELECT COUNT(*) FROM pull_request_reviews WHERE pull_request_id IN (SELECT id FROM pull_requests WHERE repository_id = $1)`,
        [repo.id]
      ),
      pool.query(
        `SELECT COALESCE(SUM(additions), 0) as additions, COALESCE(SUM(deletions), 0) as deletions FROM commits WHERE repository_id = $1`,
        [repo.id]
      ),
    ]);

    const updatedRepoPost1 = await repositoryRepository.findById(repo.id);

    console.log(`\n[STEPS 4-10] Post-Initial Historical Sync State:`);
    console.log(`  - last_synced_at: ${updatedRepoPost1?.last_synced_at?.toISOString()}`);
    console.log(`  - sync_status: ${updatedRepoPost1?.sync_status}`);
    console.log(`  - Commits in DB: ${postCommits.rows[0].count}`);
    console.log(`  - Developers linked: ${postDevs.rows[0].count}`);
    console.log(`  - Pull Requests in DB: ${postPRs.rows[0].count}`);
    console.log(`  - Issues in DB: ${postIssues.rows[0].count}`);
    console.log(`  - Reviews in DB: ${postReviews.rows[0].count}`);
    console.log(`  - Total Additions: ${postAddDel.rows[0].additions}`);
    console.log(`  - Total Deletions: ${postAddDel.rows[0].deletions}`);

    // Sample commit verification
    const sampleCommit = await pool.query(
      `SELECT c.*, d.login as author_login FROM commits c LEFT JOIN developers d ON d.id = c.developer_id WHERE c.repository_id = $1 LIMIT 1`,
      [repo.id]
    );
    if (sampleCommit.rows.length > 0) {
      const c = sampleCommit.rows[0];
      console.log(`\nSample Commit Record Verification:`);
      console.log(`  - SHA: ${c.github_commit_sha}`);
      console.log(`  - Message: ${c.message.split('\n')[0]}`);
      console.log(`  - Additions: ${c.additions}`);
      console.log(`  - Deletions: ${c.deletions}`);
      console.log(`  - Developer ID: ${c.developer_id}`);
      console.log(`  - Developer Login: ${c.author_login}`);
    }

    // 11. Trigger synchronization a second time to test Incremental Sync & Idempotency
    console.log(`\n[STEPS 11-13] Triggering SECOND sync (testing incremental sync & idempotency)...`);
    const secondSyncRes = await makePostRequest(`/api/repositories/${repo.id}/sync`, token);
    console.log(`\nSecond API Sync Response (Status Code: ${secondSyncRes.statusCode}):`);
    console.log(JSON.stringify(secondSyncRes.data, null, 2));

    const [post2Commits, post2Devs] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM commits WHERE repository_id = $1`, [repo.id]),
      pool.query(`SELECT COUNT(*) FROM repository_developers WHERE repository_id = $1`, [repo.id]),
    ]);

    console.log(`\nPost-Second Sync Duplicate Verification:`);
    console.log(`  - Commits count before second sync: ${postCommits.rows[0].count}`);
    console.log(`  - Commits count after second sync: ${post2Commits.rows[0].count}`);
    console.log(`  - Duplicate commits created: ${parseInt(post2Commits.rows[0].count, 10) - parseInt(postCommits.rows[0].count, 10)} (Must be 0)`);

    // Inspection report across ALL monitored repositories
    console.log('\n===============================================================');
    console.log('   FULL DATABASE INSPECTION SUMMARY (ALL MONITORED REPOS)    ');
    console.log('===============================================================');

    const allReposSummary = await pool.query(`
      SELECT 
        r.full_name,
        r.sync_status,
        r.last_synced_at,
        COUNT(DISTINCT c.id) as commits,
        COUNT(DISTINCT rd.developer_id) as developers,
        COUNT(DISTINCT pr.id) as pull_requests,
        COUNT(DISTINCT i.id) as issues,
        COALESCE(SUM(c.additions), 0) as additions,
        COALESCE(SUM(c.deletions), 0) as deletions
      FROM repositories r
      LEFT JOIN commits c ON c.repository_id = r.id
      LEFT JOIN repository_developers rd ON rd.repository_id = r.id
      LEFT JOIN pull_requests pr ON pr.repository_id = r.id
      LEFT JOIN issues i ON i.repository_id = r.id
      GROUP BY r.id
      ORDER BY r.full_name ASC
    `);

    console.table(allReposSummary.rows);

    console.log('\n✅ PHASE 5B VERIFICATION COMPLETE!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Verification failed:', err.message, err);
    process.exit(1);
  }
}

runVerification();
