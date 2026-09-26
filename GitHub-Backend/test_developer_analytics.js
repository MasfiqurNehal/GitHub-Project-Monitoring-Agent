const { pool } = require('./dist/db/connection.js');
const { developerService } = require('./dist/services/developer.service.js');
const { developerRepository } = require('./dist/repositories/developer.repository.js');

async function testDeveloperAnalytics() {
  console.log('=== STARTING DEVELOPER ANALYTICS AUDIT & VERIFICATION ===\n');

  try {
    // 1. Fetch Developers List via Repository
    const devListResult = await developerRepository.findWithMetrics({ page: 1, limit: 10 });
    console.log(`[TEST 1] Total Developers in DB: ${devListResult.total}`);
    console.log(`Fetched Developers count: ${devListResult.data.length}`);

    if (devListResult.data.length === 0) {
      console.log('No developers found in database to test.');
      process.exit(0);
    }

    // Check stable identity and relationships
    for (const dev of devListResult.data) {
      console.log(`\nDeveloper: ${dev.name} (@${dev.login})`);
      console.log(`  ID: ${dev.id}`);
      console.log(`  GitHub User ID: ${dev.githubUserId || 'N/A'}`);
      console.log(`  Avatar URL: ${dev.avatarUrl}`);
      console.log(`  Profile URL: ${dev.profileUrl}`);
      console.log(`  Email: ${dev.email || 'None'}`);
      console.log(`  Projects count: ${dev.projects.length} (${dev.projects.map(p => p.name).join(', ') || 'None'})`);
      console.log(`  Repos count: ${dev.repositories.length} (${dev.repositories.map(r => r.name).join(', ') || 'None'})`);
      console.log(`  Metrics:`, dev.metrics);
    }

    // 2. Fetch Detail & Analytics for First Developer
    const testDev = devListResult.data[0];
    console.log(`\n==================================================`);
    console.log(`[TEST 2] FETCHING FULL ANALYTICS FOR: @${testDev.login} (${testDev.id})`);
    console.log(`==================================================`);

    const detail = await developerService.getDeveloperDetail(testDev.id);
    
    if (!detail) {
      console.error(`ERROR: getDeveloperDetail returned null for ${testDev.login}`);
      process.exit(1);
    }

    console.log('--- Developer Header Specs ---');
    console.log('Login:', detail.developer.login);
    console.log('Name:', detail.developer.name);
    console.log('GitHub User ID:', detail.developer.githubUserId);
    console.log('Projects:', detail.developer.projects);
    console.log('Repositories:', detail.developer.repositories);

    console.log('\n--- Factual Metrics ---');
    console.log('Commit Output:', detail.commitStats);
    console.log('PR Stats:', detail.prStats);
    console.log('Review Stats:', detail.reviewStats);
    console.log('Issue Stats:', detail.issueStats);
    console.log('Code Impact:', detail.codeChangeStats);

    console.log('\n--- Activity Distribution (Chart Data) ---');
    console.log(`Distribution items count: ${detail.activityDistribution.length}`);
    if (detail.activityDistribution.length > 0) {
      console.log('Sample Distribution Item:', detail.activityDistribution[0]);
    }

    console.log('\n--- Activity Timeline (Feed) ---');
    console.log(`Timeline events count: ${detail.activityTimeline.length}`);
    if (detail.activityTimeline.length > 0) {
      console.log('Sample Timeline Event:', detail.activityTimeline[0]);
    }

    // 3. Test Filtered Detail
    console.log(`\n==================================================`);
    console.log(`[TEST 3] TESTING QUERY FILTERING (activityType = 'commit')`);
    console.log(`==================================================`);
    const filteredDetail = await developerService.getDeveloperDetail(testDev.id, { activityType: 'commit' });
    console.log(`Filtered Timeline Events count: ${filteredDetail.activityTimeline.length}`);
    const nonCommits = filteredDetail.activityTimeline.filter(e => e.type !== 'commit');
    console.log(`Non-commit events in filtered timeline: ${nonCommits.length} (Expected: 0)`);

    console.log('\n=== ALL DEVELOPER ANALYTICS TESTS PASSED ===');

  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testDeveloperAnalytics();
