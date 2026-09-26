const { GitHubClient } = require('./dist/github/github-client.js');
const { pool } = require('./dist/db/connection.js');
const { githubInstallationRepository } = require('./dist/repositories/githubInstallation.repository.js');

async function testFetch() {
  try {
    const installations = await githubInstallationRepository.findAll();
    const activeInst = installations.find(i => i.status === 'ACTIVE');
    console.log('Active installation ID:', activeInst?.github_installation_id);

    const client = new GitHubClient({ installationId: Number(activeInst?.github_installation_id) });

    console.log('\n--- 1. Testing getCommits WITHOUT since parameter ---');
    const commitsNoSince = await client.getCommits('MasfiqurNehal', 'Nexora-AI');
    console.log(`Fetched ${commitsNoSince.length} commits for MasfiqurNehal/Nexora-AI (No since date)`);
    if (commitsNoSince.length > 0) {
      console.log('Sample commit 0 SHA:', commitsNoSince[0].sha);
      console.log('Sample commit 0 Author Login:', commitsNoSince[0].author?.login);
      console.log('Sample commit 0 Date:', commitsNoSince[0].commit?.committer?.date);
    }

    const repos = ['Nexora-AI', 'expressJS-operation', 'Dead-ZONE'];
    for (const rName of repos) {
      const c = await client.getCommits('MasfiqurNehal', rName);
      console.log(`Repo MasfiqurNehal/${rName} has ${c.length} commits on default branch.`);
    }

  } catch (err) {
    console.error('Error fetching commits:', err);
  } finally {
    await pool.end();
  }
}

testFetch();
