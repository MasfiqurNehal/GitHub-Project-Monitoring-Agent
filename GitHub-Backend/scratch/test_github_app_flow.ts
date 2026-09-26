import { config } from '../src/config/index.js';
import { githubAppService } from '../src/github/github-app.service.js';

async function testGitHubAppFlow() {
  console.log('--- GITHUB APP CONFIGURATION TEST ---');
  console.log('App ID:', config.githubAppId);
  console.log('App Slug:', config.githubAppSlug);
  console.log('App Setup Path:', config.githubAppSetupPath);
  console.log('Backend URL:', config.backendUrl);
  console.log('Frontend URL:', config.frontendUrl);
  console.log('Is App Configured:', githubAppService.isAppConfigured());

  const state = githubAppService.createInstallationState('org-test-123', 'user-test-456');
  console.log('\n--- STATE GENERATION ---');
  console.log('Generated State Token:', state);

  const verified = githubAppService.verifyInstallationState(state);
  console.log('\n--- STATE VERIFICATION ---');
  console.log('Verified Payload:', verified);

  if (verified?.organizationId === 'org-test-123' && verified?.userId === 'user-test-456') {
    console.log('State verification PASSED!');
  } else {
    console.error('State verification FAILED!');
    process.exit(1);
  }

  const installUrl = `https://github.com/apps/${config.githubAppSlug}/installations/new?state=${encodeURIComponent(state)}`;
  console.log('\n--- INSTALLATION URL ---');
  console.log('Generated Installation URL:', installUrl);

  if (installUrl.includes('https://github.com/apps/gitmonitor-ai/installations/new')) {
    console.log('Installation URL pattern matches gitmonitor-ai App Slug requirement!');
  } else {
    console.error('Installation URL does not match gitmonitor-ai!');
    process.exit(1);
  }

  console.log('\nAll checks passed successfully!');
  process.exit(0);
}

testGitHubAppFlow().catch((err) => {
  console.error('Error running test script:', err);
  process.exit(1);
});
