import { pool } from '../GitHub-Backend/src/db/connection.js';
import { repositoryRepository } from '../GitHub-Backend/src/repositories/repository.repository.js';
import { syncService } from '../GitHub-Backend/src/services/sync.service.js';

async function syncAll() {
  console.log('=== SYNCING ALL MONITORED REPOSITORIES ===\n');
  const repos = await repositoryRepository.findAll();
  console.log(`Found ${repos.length} monitored repositories.\n`);

  for (const repo of repos) {
    console.log(`--> Syncing ${repo.full_name} (last_synced_at: ${repo.last_synced_at})...`);
    try {
      const res = await syncService.runFullHistoricalSync(repo.id);
      console.log(`    ✅ ${repo.full_name}: ${res.status} | Commits: ${res.counts.commits} | Developers: ${res.counts.developers} | PRs: ${res.counts.pullRequests} | Issues: ${res.counts.issues}`);
    } catch (err: any) {
      console.error(`    ❌ ${repo.full_name} failed:`, err.message);
    }
  }

  console.log('\n=== ALL REPOSITORIES SYNC COMPLETED ===');
  process.exit(0);
}

syncAll();
