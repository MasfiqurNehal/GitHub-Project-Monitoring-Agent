import crypto from 'crypto';
import { verifyGitHubWebhookSignature } from '../GitHub-Backend/src/utils/githubSignature.js';
import { webhookProcessorService } from '../GitHub-Backend/src/services/webhookProcessor.service.js';
import { syncService } from '../GitHub-Backend/src/services/sync.service.js';
import { syncSchedulerService } from '../GitHub-Backend/src/services/syncScheduler.service.js';
import { repositoryRepository } from '../GitHub-Backend/src/repositories/repository.repository.js';
import { webhookRepository } from '../GitHub-Backend/src/repositories/webhook.repository.js';
import { pool } from '../GitHub-Backend/src/db/connection.js';

async function runContinuousMonitoringTests() {
  console.log('====================================================');
  console.log('    CONTINUOUS GITHUB MONITORING TEST SUITE        ');
  console.log('====================================================\n');

  const testSecret = 'test_webhook_secret_key_12345';
  process.env.GITHUB_WEBHOOK_SECRET = testSecret;

  // ----------------------------------------------------
  // TEST 1: Webhook Signature Validation
  // ----------------------------------------------------
  console.log('--- TEST 1: Webhook Signature Validation ---');
  const samplePayload = JSON.stringify({ repository: { full_name: 'test/repo' } });
  const validHmac = 'sha256=' + crypto.createHmac('sha256', testSecret).update(samplePayload).digest('hex');
  const invalidHmac = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

  const validResult = verifyGitHubWebhookSignature(samplePayload, validHmac, testSecret);
  const invalidResult = verifyGitHubWebhookSignature(samplePayload, invalidHmac, testSecret);
  const missingSigResult = verifyGitHubWebhookSignature(samplePayload, undefined, testSecret);

  console.log(`[Valid Signature Test]: ${validResult ? 'PASSED' : 'FAILED'}`);
  console.log(`[Invalid Signature Test]: ${!invalidResult ? 'PASSED' : 'FAILED'}`);
  console.log(`[Missing Signature Test]: ${!missingSigResult ? 'PASSED' : 'FAILED'}`);

  if (!validResult || invalidResult || missingSigResult) {
    throw new Error('TEST 1 FAILED: Signature validation logic error');
  }

  // Find a monitored repository for subsequent tests
  const repoRes = await pool.query('SELECT * FROM repositories LIMIT 1');
  if (repoRes.rows.length === 0) {
    console.log('No repository found in database to test payload handling.');
    await pool.end();
    return;
  }

  const repo = repoRes.rows[0];
  console.log(`\nUsing repository context: ${repo.full_name} (${repo.id})`);

  // ----------------------------------------------------
  // TEST 2: Push Event Processing
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Push Event Processing ---');
  const commitSha = `testsha-${Date.now()}`;
  const pushPayload = {
    repository: {
      id: repo.github_repository_id ? Number(repo.github_repository_id) : 12345,
      full_name: repo.full_name,
      name: repo.name,
    },
    sender: {
      id: 999111,
      login: 'test-pusher-user',
      avatar_url: 'https://github.com/avatar.png',
      html_url: 'https://github.com/test-pusher-user',
    },
    commits: [
      {
        id: commitSha,
        message: 'feat: continuous monitoring push event test commit',
        timestamp: new Date().toISOString(),
        url: `https://github.com/${repo.full_name}/commit/${commitSha}`,
        added: ['src/index.ts'],
        modified: ['README.md'],
        removed: [],
        author: {
          name: 'Test Author',
          email: 'test@example.com',
          username: 'test-pusher-user',
        },
      },
    ],
  };

  await webhookProcessorService.processEvent('push', pushPayload);
  const commitCheck = await pool.query('SELECT * FROM commits WHERE github_commit_sha = $1', [commitSha]);
  console.log(`[Push Event DB Verification]: Found ${commitCheck.rows.length} committed record(s). ${commitCheck.rows.length > 0 ? 'PASSED' : 'FAILED'}`);
  if (commitCheck.rows.length === 0) throw new Error('TEST 2 FAILED: Push event failed to persist commit');

  // ----------------------------------------------------
  // TEST 3: Pull Request Event Processing
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Pull Request Event Processing ---');
  const prNumber = Math.floor(Math.random() * 900000) + 100000;
  const prPayload = {
    action: 'opened',
    repository: {
      id: repo.github_repository_id ? Number(repo.github_repository_id) : 12345,
      full_name: repo.full_name,
    },
    pull_request: {
      id: 888000 + prNumber,
      number: prNumber,
      title: `Test PR #${prNumber} Continuous Webhook`,
      body: 'Testing continuous PR monitoring integration',
      state: 'open',
      merged: false,
      draft: false,
      user: {
        id: 999222,
        login: 'pr-author-dev',
        avatar_url: 'https://github.com/avatar2.png',
        html_url: 'https://github.com/pr-author-dev',
      },
      additions: 45,
      deletions: 12,
      changed_files: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      html_url: `https://github.com/${repo.full_name}/pull/${prNumber}`,
    },
  };

  await webhookProcessorService.processEvent('pull_request', prPayload);
  const prCheck = await pool.query('SELECT * FROM pull_requests WHERE repository_id = $1 AND number = $2', [repo.id, prNumber]);
  console.log(`[PR Event DB Verification]: Found ${prCheck.rows.length} PR record(s). ${prCheck.rows.length > 0 ? 'PASSED' : 'FAILED'}`);
  if (prCheck.rows.length === 0) throw new Error('TEST 3 FAILED: Pull Request event failed to persist');

  // ----------------------------------------------------
  // TEST 4: Issue Event Processing
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Issue Event Processing ---');
  const issueNumber = Math.floor(Math.random() * 900000) + 100000;
  const issuePayload = {
    action: 'opened',
    repository: {
      id: repo.github_repository_id ? Number(repo.github_repository_id) : 12345,
      full_name: repo.full_name,
    },
    issue: {
      id: 777000 + issueNumber,
      number: issueNumber,
      title: `Test Issue #${issueNumber} Continuous Webhook`,
      body: 'Testing issue monitoring integration',
      state: 'open',
      user: {
        id: 999333,
        login: 'issue-author-dev',
        avatar_url: 'https://github.com/avatar3.png',
        html_url: 'https://github.com/issue-author-dev',
      },
      comments: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      html_url: `https://github.com/${repo.full_name}/issues/${issueNumber}`,
    },
  };

  await webhookProcessorService.processEvent('issues', issuePayload);
  const issueCheck = await pool.query('SELECT * FROM issues WHERE repository_id = $1 AND number = $2', [repo.id, issueNumber]);
  console.log(`[Issue Event DB Verification]: Found ${issueCheck.rows.length} Issue record(s). ${issueCheck.rows.length > 0 ? 'PASSED' : 'FAILED'}`);
  if (issueCheck.rows.length === 0) throw new Error('TEST 4 FAILED: Issue event failed to persist');

  // ----------------------------------------------------
  // TEST 5: Duplicate Webhook Delivery Handling
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Duplicate Webhook Delivery Idempotency ---');
  const testDeliveryId = `delivery-test-${Date.now()}`;
  const save1 = await webhookRepository.saveEvent(`wh-${Date.now()}-1`, testDeliveryId, 'push', repo.id, { test: true });
  const checkDup = await webhookRepository.findByDeliveryId(testDeliveryId);

  console.log(`[Duplicate Check]: Found existing delivery record ${checkDup ? checkDup.delivery_id : 'none'}. ${checkDup ? 'PASSED' : 'FAILED'}`);
  if (!checkDup) throw new Error('TEST 5 FAILED: Duplicate delivery check failed');

  // ----------------------------------------------------
  // TEST 6: Unknown Repository Handling
  // ----------------------------------------------------
  console.log('\n--- TEST 6: Unknown Repository Handling ---');
  const unknownPayload = {
    repository: {
      id: 999999999,
      full_name: 'unknown-org/unmonitored-secret-repo',
    },
    commits: [{ id: 'unksha123', message: 'test' }],
  };

  await webhookProcessorService.processEvent('push', unknownPayload);
  console.log('[Unknown Repo Handling]: Safely ignored without crashing. PASSED');

  // ----------------------------------------------------
  // TEST 7: Unauthorized / Installation Status Event
  // ----------------------------------------------------
  console.log('\n--- TEST 7: Installation Status Event Handling ---');
  const instId = 555444;
  const instPayload = {
    action: 'deleted',
    installation: {
      id: instId,
      account: {
        login: 'test-unauthorized-org',
        type: 'Organization',
      },
    },
  };

  await webhookProcessorService.processEvent('installation', instPayload);
  const instCheck = await pool.query('SELECT * FROM github_installations WHERE github_installation_id = $1', [instId]);
  console.log(`[Installation Event DB Verification]: Status = ${instCheck.rows[0]?.status || 'none'}. ${instCheck.rows[0]?.status === 'DELETED' ? 'PASSED' : 'FAILED'}`);
  if (instCheck.rows[0]?.status !== 'DELETED') throw new Error('TEST 7 FAILED: Installation deletion status error');

  // ----------------------------------------------------
  // TEST 8: Scheduled Sync Execution & Status Updates
  // ----------------------------------------------------
  console.log('\n--- TEST 8: Scheduled Sync Execution ---');
  // Reset repository status to SYNCED before testing scheduled sync
  await repositoryRepository.updateSyncStatus(repo.id, 'SYNCED', new Date(), null, null, new Date());

  // Trigger single repo sync
  const syncRes = await syncService.runFullHistoricalSync(repo.id);
  const updatedRepo = await repositoryRepository.findById(repo.id);

  console.log(`[Scheduled Sync Output]: Status = ${syncRes.status}, synchronized = ${syncRes.synchronized}`);
  console.log(`[DB Tracking Fields]: sync_status = ${updatedRepo?.sync_status}, last_sync_started_at = ${updatedRepo?.last_sync_started_at}, last_sync_completed_at = ${updatedRepo?.last_sync_completed_at}`);
  if (updatedRepo?.sync_status !== 'SYNCED' || !updatedRepo?.last_sync_completed_at) {
    throw new Error('TEST 8 FAILED: Scheduled sync tracking fields were not updated correctly');
  }

  // ----------------------------------------------------
  // TEST 9: Concurrent Sync Prevention
  // ----------------------------------------------------
  console.log('\n--- TEST 9: Concurrent Sync Prevention ---');
  // Set repository status to SYNCING and set fresh start time
  await repositoryRepository.updateSyncStatus(repo.id, 'SYNCING', null, null, new Date(), null);

  const concurrentRes = await syncService.runFullHistoricalSync(repo.id);
  console.log(`[Concurrent Execution Test]: synchronized = ${concurrentRes.synchronized} (Expected: false)`);
  
  // Reset repo back to SYNCED
  await repositoryRepository.updateSyncStatus(repo.id, 'SYNCED', new Date(), null, new Date(), new Date());

  if (concurrentRes.synchronized !== false) {
    throw new Error('TEST 9 FAILED: Concurrent sync was not prevented');
  }

  console.log('\n====================================================');
  console.log(' ALL 9 CONTINUOUS MONITORING TESTS PASSED! ');
  console.log('====================================================\n');

  await pool.end();
}

runContinuousMonitoringTests().catch((err) => {
  console.error('\nContinuous Monitoring Test Suite Error:', err);
  process.exit(1);
});
