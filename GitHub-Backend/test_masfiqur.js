const { pool } = require('./dist/db/connection.js');
const { developerService } = require('./dist/services/developer.service.js');
const { developerRepository } = require('./dist/repositories/developer.repository.js');

async function testMasfiqurNehalAnalytics() {
  console.log('=== AUDITING DEVELOPER: MasfiqurNehal ===\n');

  try {
    const dev = await developerRepository.findByLogin('MasfiqurNehal');
    if (!dev) {
      console.error('Developer MasfiqurNehal not found in DB.');
      process.exit(1);
    }

    console.log('--- Developer Row ---');
    console.log('ID:', dev.id);
    console.log('Login:', dev.login);
    console.log('Name:', dev.name);
    console.log('GitHub User ID:', dev.github_user_id);
    console.log('Avatar URL:', dev.avatar_url);

    const detail = await developerService.getDeveloperDetail(dev.id);
    if (!detail) {
      console.error('Detail returned null');
      process.exit(1);
    }

    console.log('\n--- Developer Detail ---');
    console.log('Projects:', detail.developer.projects);
    console.log('Repositories:', detail.developer.repositories);
    console.log('Metrics:', detail.developer.metrics);
    console.log('Commit Output:', detail.commitStats);
    console.log('PR Stats:', detail.prStats);
    console.log('Review Stats:', detail.reviewStats);
    console.log('Issue Stats:', detail.issueStats);
    console.log('Code Impact:', detail.codeChangeStats);
    console.log('Activity Distribution count:', detail.activityDistribution.length);
    console.log('Activity Timeline events count:', detail.activityTimeline.length);

    console.log('\n=== MASFIQURNEHAL TEST PASSED ===');

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testMasfiqurNehalAnalytics();
