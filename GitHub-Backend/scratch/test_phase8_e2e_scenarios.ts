import { pool } from '../src/db/connection.js';
import { 
  listProjects, 
  createProject, 
  getProjectDetail, 
  addRepositoryToProject, 
  deleteProject 
} from '../src/controllers/project.controller.js';

async function runE2EValidationScenarios() {
  console.log('================================================================');
  console.log('       PHASE 8 — PROJECT MANAGEMENT E2E VALIDATION SUITE        ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, message: string) {
    total++;
    if (condition) {
      console.log(`  ✅ ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAILED: ${message}`);
    }
  }

  const ts = Date.now();
  const orgAId = `org-e2e-a-${ts}`;
  const orgBId = `org-e2e-b-${ts}`;
  const userAId = `user-e2e-a-${ts}`;
  const userBId = `user-e2e-b-${ts}`;
  const correctPassword = 'Password123!';
  const wrongPassword = 'WrongPassword999!';

  try {
    // Setup Organizations and Users
    await pool.query(
      `INSERT INTO saas_organizations (id, name, slug) VALUES ($1, 'Tenant A', 'tenant-a-${ts}'), ($2, 'Tenant B', 'tenant-b-${ts}')`,
      [orgAId, orgBId]
    );

    await pool.query(
      `INSERT INTO users (id, email, name, github_login, password_hash, organization_id)
       VALUES 
       ($1, 'usera@test.com', 'User A', 'usera-${ts}', $3, $4),
       ($2, 'userb@test.com', 'User B', 'userb-${ts}', $3, $5)`,
      [userAId, userBId, correctPassword, orgAId, orgBId]
    );

    // Setup Repositories
    // Repo X, Y, Z for Tenant A
    const repoXId = `repo-x-${ts}`;
    const repoYId = `repo-y-${ts}`;
    const repoZId = `repo-z-${ts}`;

    await pool.query(
      `INSERT INTO repositories (id, owner, name, full_name, html_url, default_branch, language, organization_id)
       VALUES 
       ($1, 'acme', 'repo-x', 'acme/repo-x-${ts}', 'https://github.com/acme/repo-x', 'main', 'TypeScript', $4),
       ($2, 'acme', 'repo-y', 'acme/repo-y-${ts}', 'https://github.com/acme/repo-y', 'main', 'Python', $4),
       ($3, 'acme', 'repo-z', 'acme/repo-z-${ts}', 'https://github.com/acme/repo-z', 'main', 'Go', $4)`,
      [repoXId, repoYId, repoZId, orgAId]
    );

    // Repo X also attached to Tenant B so Tenant B can access Repo X
    const repoXTenantBId = `repo-x-tb-${ts}`;
    await pool.query(
      `INSERT INTO repositories (id, owner, name, full_name, html_url, default_branch, language, organization_id)
       VALUES ($1, 'acme', 'repo-x', 'acme/repo-x-tb-${ts}', 'https://github.com/acme/repo-x', 'main', 'TypeScript', $2)`,
      [repoXTenantBId, orgBId]
    );

    // Helper to call controllers with express mock req/res
    const callController = async (fn: Function, params: any = {}, body: any = {}, query: any = {}, orgId: string = orgAId, userId: string = userAId) => {
      let resData: any = null;
      let statusCode: number = 200;

      const req: any = { 
        params, 
        body, 
        query, 
        organizationId: orgId,
        user: { id: userId, organizationId: orgId }
      };
      const res: any = {
        status: (code: number) => {
          statusCode = code;
          return { json: (d: any) => { resData = d; } };
        },
        json: (d: any) => { resData = d; },
      };

      await fn(req, res, (err: any) => { throw err; });
      return { status: statusCode, body: resData };
    };

    // =========================================================================
    // SCENARIO 1 — CREATE PROJECT
    // =========================================================================
    console.log('\n--- SCENARIO 1: CREATE PROJECT ---');
    const createProjA = await callController(createProject, {}, { name: 'Project A', description: 'Tenant A Project A' }, {}, orgAId, userAId);
    assert(createProjA.status === 201 && createProjA.body?.success, 'Project A created successfully for Tenant A.');
    const projectAId = createProjA.body?.data?.id;

    const listProjA = await callController(listProjects, {}, {}, {}, orgAId, userAId);
    const listProjB = await callController(listProjects, {}, {}, {}, orgBId, userBId);

    const hasProjAInTenantA = listProjA.body?.data?.some((p: any) => p.id === projectAId);
    const hasProjAInTenantB = listProjB.body?.data?.some((p: any) => p.id === projectAId);

    assert(hasProjAInTenantA && !hasProjAInTenantB, 'Project A appears in Tenant A list and is isolated from Tenant B.');

    // =========================================================================
    // SCENARIO 2 — CONNECT REPOSITORY (Repo X -> Project A)
    // =========================================================================
    console.log('\n--- SCENARIO 2: CONNECT REPOSITORY ---');
    const connX = await callController(addRepositoryToProject, { id: projectAId }, { repositoryId: repoXId }, {}, orgAId, userAId);
    assert(connX.status === 200 && connX.body?.success, 'Repo X connected to Project A.');

    const detailA1 = await callController(getProjectDetail, { id: projectAId }, {}, {}, orgAId, userAId);
    assert(detailA1.body?.data?.repositories?.length === 1, 'Project A repository count = 1.');
    assert(detailA1.body?.data?.repositories[0].id === repoXId, 'Repo X appears in Project A details.');

    // =========================================================================
    // SCENARIO 3 — MULTIPLE REPOSITORIES (Repo X, Y, Z -> Project A)
    // =========================================================================
    console.log('\n--- SCENARIO 3: MULTIPLE REPOSITORIES ---');
    await callController(addRepositoryToProject, { id: projectAId }, { repositoryId: repoYId }, {}, orgAId, userAId);
    await callController(addRepositoryToProject, { id: projectAId }, { repositoryId: repoZId }, {}, orgAId, userAId);

    const detailA3 = await callController(getProjectDetail, { id: projectAId }, {}, {}, orgAId, userAId);
    assert(detailA3.body?.data?.repositories?.length === 3, 'Project A contains 3 repositories (Repo X, Y, Z).');

    // =========================================================================
    // SCENARIO 4 — SAME REPOSITORY MULTIPLE PROJECTS IN SAME TENANT
    // =========================================================================
    console.log('\n--- SCENARIO 4: SAME REPOSITORY MULTIPLE PROJECTS ---');
    const createProjB_A = await callController(createProject, {}, { name: 'Project B Tenant A', description: 'Second Project in Tenant A' }, {}, orgAId, userAId);
    const projectB_TenantA_Id = createProjB_A.body?.data?.id;

    const connX_ProjB = await callController(addRepositoryToProject, { id: projectB_TenantA_Id }, { repositoryId: repoXId }, {}, orgAId, userAId);
    assert(connX_ProjB.status === 200 && connX_ProjB.body?.success, 'Repo X successfully connected to Project B in same tenant.');

    // =========================================================================
    // SCENARIO 5 — DUPLICATE SAME RELATIONSHIP (Repo X -> Project A again)
    // =========================================================================
    console.log('\n--- SCENARIO 5: DUPLICATE SAME RELATIONSHIP ---');
    const dupConn = await callController(addRepositoryToProject, { id: projectAId }, { repositoryId: repoXId }, {}, orgAId, userAId);
    assert(dupConn.status === 400 && dupConn.body?.error?.includes('already connected'), 'Duplicate attachment Repo X -> Project A rejected with 400 error.');

    // =========================================================================
    // SCENARIO 6 — CROSS-TENANT SAME REPOSITORY
    // =========================================================================
    console.log('\n--- SCENARIO 6: CROSS-TENANT SAME REPOSITORY ---');
    const createProjB_TenantB = await callController(createProject, {}, { name: 'Project B Tenant B', description: 'Tenant B Project' }, {}, orgBId, userBId);
    const projectB_TenantB_Id = createProjB_TenantB.body?.data?.id;

    const connX_TenantB = await callController(addRepositoryToProject, { id: projectB_TenantB_Id }, { repositoryId: repoXTenantBId }, {}, orgBId, userBId);
    assert(connX_TenantB.status === 200 && connX_TenantB.body?.success, 'Tenant B successfully created Project B and attached Repo X.');

    // Verify Tenant B cannot access Tenant A's Project A
    const detailAFromTenantB = await callController(getProjectDetail, { id: projectAId }, {}, {}, orgBId, userBId);
    assert(detailAFromTenantB.status === 404, 'Tenant B requesting Tenant A Project A receives 404 Not Found (Tenant Isolated).');

    // =========================================================================
    // SCENARIO 7, 8 & 9 — DELETE PROJECT VALIDATIONS
    // =========================================================================
    console.log('\n--- SCENARIO 7, 8 & 9: DELETE PROJECT VALIDATIONS ---');
    
    // SCENARIO 9: UNCHECKED CONFIRMATION
    console.log('Testing deletion without confirmation checkbox...');
    const delUnconfirmed = await callController(deleteProject, { id: projectAId }, { password: correctPassword, confirmation: false }, {}, orgAId, userAId);
    assert(delUnconfirmed.status === 400, 'Deletion attempt without confirmation checkbox rejected (400 Bad Request).');

    // SCENARIO 8: WRONG PASSWORD
    console.log('Testing deletion with incorrect password...');
    const delWrongPass = await callController(deleteProject, { id: projectAId }, { password: wrongPassword, confirmation: true }, {}, orgAId, userAId);
    assert(delWrongPass.status === 401, 'Deletion attempt with wrong password failed (401 Unauthorized).');

    const detailCheckStillExists = await callController(getProjectDetail, { id: projectAId }, {}, {}, orgAId, userAId);
    assert(detailCheckStillExists.status === 200, 'Project A remains intact after failed deletion attempts.');

    // SCENARIO 7: CORRECT DELETION
    console.log('Testing deletion with correct password and confirmation...');
    const delCorrect = await callController(deleteProject, { id: projectAId }, { password: correctPassword, confirmation: true }, {}, orgAId, userAId);
    assert(delCorrect.status === 200 && delCorrect.body?.success, 'Project A deleted successfully with correct password.');

    const detailCheckDeleted = await callController(getProjectDetail, { id: projectAId }, {}, {}, orgAId, userAId);
    assert(detailCheckDeleted.status === 404, 'Project A detail now returns 404 Not Found after deletion.');

    // Verify Repo X still exists in database and Project B in Tenant A still has Repo X attached
    const repoXCheck = await pool.query('SELECT * FROM repositories WHERE id = $1', [repoXId]);
    assert(repoXCheck.rows.length === 1, 'Underlying Repository X still exists after Project A deletion.');

    const projBCheck = await callController(getProjectDetail, { id: projectB_TenantA_Id }, {}, {}, orgAId, userAId);
    assert(projBCheck.body?.data?.repositories?.some((r: any) => r.id === repoXId), 'Project B in Tenant A still retains Repo X relationship.');

    // =========================================================================
    // SCENARIO 10 — EMPTY PROJECT
    // =========================================================================
    console.log('\n--- SCENARIO 10: EMPTY PROJECT ---');
    const emptyProj = await callController(createProject, {}, { name: 'Empty Project', description: 'Project with zero repos' }, {}, orgAId, userAId);
    const emptyProjId = emptyProj.body?.data?.id;

    const emptyDetail = await callController(getProjectDetail, { id: emptyProjId }, {}, {}, orgAId, userAId);
    const metrics = emptyDetail.body?.data?.project?.metrics;
    assert(
      metrics &&
      Number(metrics.repositoriesCount) === 0 &&
      Number(metrics.developersCount) === 0 &&
      Number(metrics.commitsCount) === 0 &&
      Number(metrics.prsCount) === 0 &&
      Number(metrics.issuesCount) === 0 &&
      Number(metrics.linesAdded) === 0 &&
      Number(metrics.linesDeleted) === 0,
      'Empty project returns zero for all aggregated statistics.'
    );

    // Clean up test data
    console.log('\nCleaning up test data...');
    await pool.query('DELETE FROM saas_organizations WHERE id IN ($1, $2)', [orgAId, orgBId]);
    console.log('Cleanup completed successfully.');

  } catch (err) {
    console.error('Test Execution Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed}/${total} E2E SCENARIOS PASSED.`);
  console.log('================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runE2EValidationScenarios();
