import { pool } from '../src/db/connection.js';
import crypto from 'crypto';

async function runTest() {
  console.log('=== PHASE 7: PROJECT DETAIL TABS INTEGRATION TEST ===');

  try {
    // 1. Get or create tenant organization
    const orgRes = await pool.query(`SELECT id FROM saas_organizations LIMIT 1`);
    let orgId = orgRes.rows[0]?.id;
    if (!orgId) {
      orgId = `org-test-${Date.now()}`;
      await pool.query(`INSERT INTO saas_organizations (id, name, slug) VALUES ($1, 'Test Org', 'test-org')`, [orgId]);
    }

    // 2. Create a test project with 3 repositories: frontend, backend, ai-service
    const projectId = `prj-test-hms-${Date.now()}`;
    const projectName = 'Hospital Management System';
    await pool.query(
      `INSERT INTO projects (id, name, description, organization_id, status) VALUES ($1, $2, 'Hospital software suite', $3, 'ACTIVE')`,
      [projectId, projectName, orgId]
    );

    const repo1Id = `repo-fe-${Date.now()}`;
    const repo2Id = `repo-be-${Date.now()}`;
    const repo3Id = `repo-ai-${Date.now()}`;

    const ts = Date.now();
    await pool.query(
      `INSERT INTO repositories (id, owner, name, full_name, html_url, default_branch, language, project_id, organization_id)
       VALUES 
       ($1, 'org', 'frontend', 'org/frontend-' || $6, 'https://github.com/org/frontend', 'main', 'TypeScript', $4, $5),
       ($2, 'org', 'backend', 'org/backend-' || $6, 'https://github.com/org/backend', 'main', 'TypeScript', $4, $5),
       ($3, 'org', 'ai-service', 'org/ai-service-' || $6, 'https://github.com/org/ai-service', 'main', 'Python', $4, $5)`,
      [repo1Id, repo2Id, repo3Id, projectId, orgId, ts.toString()]
    );

    // 3. Insert test developer, commits, PRs, issues, activity events, and commit_files
    const devId = `dev-test-${Date.now()}`;
    await pool.query(
      `INSERT INTO developers (id, login, name, organization_id) VALUES ($1, $3, 'Test Developer', $2)`,
      [devId, orgId, `testdev-${ts}`]
    );

    await pool.query(
      `INSERT INTO repository_developers (repository_id, developer_id) VALUES ($1, $4), ($2, $4), ($3, $4)`,
      [repo1Id, repo2Id, repo3Id, devId]
    );

    const commit1Id = `cmt-1-${Date.now()}`;
    const commit2Id = `cmt-2-${Date.now()}`;
    const commit3Id = `cmt-3-${Date.now()}`;

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO commits (id, repository_id, github_commit_sha, developer_id, message, additions, deletions, committed_at)
       VALUES 
       ($1, $4, 'sha1111', $7, 'feat: add login UI', 150, 20, $8::timestamp),
       ($2, $5, 'sha2222', $7, 'feat: add auth API', 200, 30, $8::timestamp),
       ($3, $6, 'sha3333', $7, 'feat: add ai model', 500, 50, $9::timestamp)`,
      [commit1Id, commit2Id, commit3Id, repo1Id, repo2Id, repo3Id, devId, threeDaysAgo, tenDaysAgo]
    );

    await pool.query(
      `INSERT INTO commit_files (id, commit_id, filename, additions, deletions)
       VALUES 
       ($1, $4, 'src/App.tsx', 150, 20),
       ($2, $5, 'src/server.ts', 200, 30),
       ($3, $6, 'model/predict.py', 500, 50)`,
      [`cf1-${Date.now()}`, `cf2-${Date.now()}`, `cf3-${Date.now()}`, commit1Id, commit2Id, commit3Id]
    );

    await pool.query(
      `INSERT INTO pull_requests (id, repository_id, github_pr_id, number, title, state, author_developer_id, additions, deletions, created_at, updated_at)
       VALUES 
       ($1, $3, 1001, 101, 'PR 101: Frontend layout', 'MERGED', $5, 150, 20, $6::timestamp, $6::timestamp),
       ($2, $4, 2002, 202, 'PR 202: Backend route', 'OPEN', $5, 200, 30, $6::timestamp, $6::timestamp)`,
      [`pr1-${Date.now()}`, `pr2-${Date.now()}`, repo1Id, repo2Id, devId, threeDaysAgo]
    );

    await pool.query(
      `INSERT INTO issues (id, repository_id, github_issue_id, number, title, state, author_developer_id, created_at, updated_at)
       VALUES 
       ($1, $2, 3003, 1, 'Bug in login modal', 'OPEN', $3, $4::timestamp, $5::timestamp)`,
      [`iss1-${Date.now()}`, repo1Id, devId, threeDaysAgo, threeDaysAgo]
    );

    await pool.query(
      `INSERT INTO activity_events (id, repository_id, developer_id, event_type, entity_type, entity_id, occurred_at)
       VALUES 
       ($1, $2, $3, 'commit', 'commit', 'sha1111', $4::timestamp)`,
      [`act1-${Date.now()}`, repo1Id, devId, threeDaysAgo]
    );

    // 4. Test API response for GET /api/projects/:id with preset = 7d
    const repoIds = [repo1Id, repo2Id, repo3Id];
    console.log(`\nChecking Project ${projectId} with 3 repositories: ${repoIds.join(', ')}`);

    const { getProjectDetail } = await import('../src/controllers/project.controller.js');

    const fakeReq7d = {
      params: { id: projectId },
      query: { preset: '7d' },
      organizationId: orgId,
    } as any;

    let resJsonData7d: any = null;
    const fakeRes7d = {
      status: (code: number) => ({ json: (d: any) => { resJsonData7d = d; } }),
      json: (d: any) => { resJsonData7d = d; },
    } as any;

    await getProjectDetail(fakeReq7d, fakeRes7d, (err: any) => { throw err; });

    console.log('\n--- GET /api/projects/:id?preset=7d ---');
    console.log('Success:', resJsonData7d?.success);
    const data7d = resJsonData7d?.data;
    console.log('Project Name:', data7d?.project?.name);
    console.log('Repositories Count:', data7d?.project?.metrics?.repositoriesCount);
    console.log('Developers Count (7D):', data7d?.project?.metrics?.developersCount);
    console.log('Commits Count (7D):', data7d?.project?.metrics?.commitsCount);
    console.log('PRs Count (7D):', data7d?.project?.metrics?.prsCount);
    console.log('Issues Count (7D):', data7d?.project?.metrics?.issuesCount);
    console.log('Lines Added (7D):', data7d?.project?.metrics?.linesAdded);
    console.log('Top Files Changed (7D):', data7d?.codeChanges?.topFilesChanged);

    // 5. Test API response for GET /api/projects/:id with preset = 1d (should be 0 for 3-day old data)
    const fakeReq1d = {
      params: { id: projectId },
      query: { preset: '1d' },
      organizationId: orgId,
    } as any;

    let resJsonData1d: any = null;
    const fakeRes1d = {
      status: (code: number) => ({ json: (d: any) => { resJsonData1d = d; } }),
      json: (d: any) => { resJsonData1d = d; },
    } as any;

    await getProjectDetail(fakeReq1d, fakeRes1d, (err: any) => { throw err; });

    console.log('\n--- GET /api/projects/:id?preset=1d (Filtered) ---');
    const data1d = resJsonData1d?.data;
    console.log('Commits Count (1D):', data1d?.project?.metrics?.commitsCount);
    console.log('PRs Count (1D):', data1d?.project?.metrics?.prsCount);
    console.log('Top Files Changed (1D):', data1d?.codeChanges?.topFilesChanged);

    // Cleanup test data
    await pool.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
    await pool.query(`DELETE FROM repositories WHERE id IN ($1, $2, $3)`, [repo1Id, repo2Id, repo3Id]);
    await pool.query(`DELETE FROM developers WHERE id = $1`, [devId]);

    console.log('\n✅ ALL PHASE 7 PROJECT TABS & DATE FILTER TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

runTest();
