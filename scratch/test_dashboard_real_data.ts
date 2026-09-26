import { analyticsService } from '../GitHub-Backend/src/services/analytics.service.js';
import { pool } from '../GitHub-Backend/src/db/connection.js';

async function runDashboardValidation() {
  console.log('=== STARTING REAL DATA DASHBOARD ANALYTICS VERIFICATION ===\n');

  // 1. Get an organization ID from database
  const orgRes = await pool.query('SELECT id, name FROM organizations LIMIT 1');
  const org = orgRes.rows[0];
  console.log(`[Org Context]: ID=${org?.id || 'none'}, Name=${org?.name || 'none'}`);

  const orgId = org?.id;

  // 2. Test GET Dashboard Overview
  console.log('\n--- 1. Dashboard Overview (Default Filters) ---');
  const overview = await analyticsService.getDashboardOverview({ organizationId: orgId });
  console.log('KPI Metrics:');
  console.log(JSON.stringify(overview.kpi, null, 2));

  console.log(`Activity Trend points: ${overview.activityTrend.length}`);
  console.log(`Developer Activity items: ${overview.developerActivity.length}`);
  console.log(`Repository Overview count: ${overview.repositoryOverview.length}`);
  console.log(`Recent Activity items: ${overview.recentActivity.length}`);

  // 3. Test Date Range Presets
  const presets = ['1d', '7d', '30d', 'all'];
  for (const preset of presets) {
    console.log(`\n--- 2. Date Preset: '${preset}' ---`);
    const summary = await analyticsService.getDashboardSummary({ organizationId: orgId, preset });
    console.log(`[${preset}] Commits: ${summary.totalCommits}, PRs: ${summary.pullRequests}, Issues: ${summary.issuesOpened}, Added: +${summary.codeAdded}, Removed: -${summary.codeRemoved}, Net Impact: ${summary.netCodeImpact}`);
  }

  // 4. Test Repository Filtering
  if (overview.repositoryOverview.length > 0) {
    const repoId = overview.repositoryOverview[0].id;
    console.log(`\n--- 3. Repository Filter: '${repoId}' (${overview.repositoryOverview[0].name}) ---`);
    const repoSummary = await analyticsService.getDashboardSummary({ organizationId: orgId, repositoryId: repoId });
    console.log(`[Repo Filter] Commits: ${repoSummary.totalCommits}, PRs: ${repoSummary.pullRequests}, Devs: ${repoSummary.activeDevelopers}`);
  }

  // 5. Test Developer Filtering
  if (overview.developerActivity.length > 0) {
    const devId = overview.developerActivity[0].id;
    console.log(`\n--- 4. Developer Filter: '${devId}' (${overview.developerActivity[0].name}) ---`);
    const devSummary = await analyticsService.getDashboardSummary({ organizationId: orgId, developerId: devId });
    console.log(`[Dev Filter] Commits: ${devSummary.totalCommits}, PRs: ${devSummary.pullRequests}`);
  }

  // 6. Test GET Dashboard Activity, Developers, Repositories
  console.log('\n--- 5. Specialized Dashboard Endpoints ---');
  const activity = await analyticsService.getDashboardActivity({ organizationId: orgId });
  console.log(`Activity Feed count: ${activity.recentActivity.length}`);

  const devs = await analyticsService.getDashboardDevelopers({ organizationId: orgId });
  console.log(`Developers count: ${devs.developers.length}`);

  const repos = await analyticsService.getDashboardRepositories({ organizationId: orgId });
  console.log(`Repositories count: ${repos.repositories.length}`);

  console.log('\n=== REAL DATA DASHBOARD ANALYTICS VERIFICATION COMPLETED SUCCESSFULLY ===');
  await pool.end();
}

runDashboardValidation().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
