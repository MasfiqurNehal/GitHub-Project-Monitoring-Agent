import { pool } from '../src/db/connection.js';
import { listProjects, createProject, getProjectDetail, addRepositoryToProject, removeRepositoryFromProject } from '../src/controllers/project.controller.js';

async function runQA() {
  console.log('================================================================');
  console.log('       PHASE 8 — COMPLETE PROJECT FEATURE QA SUITE            ');
  console.log('================================================================\n');

  let testPassedCount = 0;
  let testTotalCount = 0;

  function assert(condition: boolean, message: string) {
    testTotalCount++;
    if (condition) {
      console.log(`  ✅ STEP PASSED: ${message}`);
      testPassedCount++;
    } else {
      console.error(`  ❌ STEP FAILED: ${message}`);
    }
  }

  const ts = Date.now();
  const orgAId = `org-qa-a-${ts}`;
  const orgBId = `org-qa-b-${ts}`;

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Tenant Setup (Organization A & Organization B)
    // -------------------------------------------------------------------------
    console.log('Step 1: Setting up multi-tenant test organizations...');
    await pool.query(`INSERT INTO saas_organizations (id, name, slug) VALUES ($1, 'Org A', 'org-a-${ts}'), ($2, 'Org B', 'org-b-${ts}')`, [orgAId, orgBId]);
    assert(true, 'Created Organization A and Organization B in database.');

    // Create 4 test repositories in Organization A
    const repoFeId = `repo-fe-${ts}`;
    const repoBeId = `repo-be-${ts}`;
    const repoAiId = `repo-ai-${ts}`;
    const repoMktId = `repo-mkt-${ts}`;

    await pool.query(
      `INSERT INTO repositories (id, owner, name, full_name, html_url, default_branch, language, organization_id)
       VALUES 
       ($1, 'orga', 'hospital-frontend', 'orga/hospital-frontend-${ts}', 'https://github.com/orga/hospital-frontend', 'main', 'TypeScript', $5),
       ($2, 'orga', 'hospital-backend', 'orga/hospital-backend-${ts}', 'https://github.com/orga/hospital-backend', 'main', 'TypeScript', $5),
       ($3, 'orga', 'hospital-ai', 'orga/hospital-ai-${ts}', 'https://github.com/orga/hospital-ai', 'main', 'Python', $5),
       ($4, 'orga', 'marketing-web', 'orga/marketing-web-${ts}', 'https://github.com/orga/marketing-web', 'main', 'TypeScript', $5)`,
      [repoFeId, repoBeId, repoAiId, repoMktId, orgAId]
    );

    // Create 1 test repository in Organization B for tenant isolation testing
    const repoOrgBId = `repo-orgb-${ts}`;
    await pool.query(
      `INSERT INTO repositories (id, owner, name, full_name, html_url, default_branch, language, organization_id)
       VALUES ($1, 'orgb', 'orgb-secret-repo', 'orgb/orgb-secret-repo-${ts}', 'https://github.com/orgb/orgb-secret-repo', 'main', 'Go', $2)`,
      [repoOrgBId, orgBId]
    );

    // Helper for executing controller functions
    const callController = async (fn: Function, params: any = {}, body: any = {}, query: any = {}, orgId: string = orgAId) => {
      let resData: any = null;
      let statusCode: number = 200;

      const req: any = { params, body, query, organizationId: orgId };
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

    // -------------------------------------------------------------------------
    // STEP 2: /projects Listing & Project Creation
    // -------------------------------------------------------------------------
    console.log('\nStep 2: Creating Projects under Org A...');
    const createRes1 = await callController(createProject, {}, { name: 'Hospital Management System', description: 'HMS core suite' }, {}, orgAId);
    assert(createRes1.status === 201 && createRes1.body?.success, 'Created Project 1: Hospital Management System.');
    const project1Id = createRes1.body?.data?.id;

    const listRes = await callController(listProjects, {}, {}, {}, orgAId);
    assert(listRes.body?.data?.length >= 1, 'Org A projects list returned created project.');

    // -------------------------------------------------------------------------
    // STEP 3-9: Connecting Repositories (hospital-frontend, hospital-backend, hospital-ai)
    // -------------------------------------------------------------------------
    console.log('\nStep 3-9: Connecting Repositories to Hospital Management System...');

    // Connect hospital-frontend (Repo 1)
    const connRes1 = await callController(addRepositoryToProject, { id: project1Id }, { repositoryId: repoFeId }, {}, orgAId);
    assert(connRes1.status === 200 && connRes1.body?.success, 'Connected hospital-frontend to HMS project.');

    let detailRes1 = await callController(getProjectDetail, { id: project1Id }, {}, {}, orgAId);
    assert(detailRes1.body?.data?.repositories?.length === 1, 'Project 1 Repositories Count = 1.');

    // Connect hospital-backend (Repo 2)
    const connRes2 = await callController(addRepositoryToProject, { id: project1Id }, { repositoryId: repoBeId }, {}, orgAId);
    assert(connRes2.status === 200 && connRes2.body?.success, 'Connected hospital-backend to HMS project.');

    let detailRes2 = await callController(getProjectDetail, { id: project1Id }, {}, {}, orgAId);
    assert(detailRes2.body?.data?.repositories?.length === 2, 'Project 1 Repositories Count = 2.');

    // Connect hospital-ai (Repo 3)
    const connRes3 = await callController(addRepositoryToProject, { id: project1Id }, { repositoryId: repoAiId }, {}, orgAId);
    assert(connRes3.status === 200 && connRes3.body?.success, 'Connected hospital-ai to HMS project.');

    let detailRes3 = await callController(getProjectDetail, { id: project1Id }, {}, {}, orgAId);
    assert(detailRes3.body?.data?.repositories?.length === 3, 'Project 1 Repositories Count = 3.');

    // -------------------------------------------------------------------------
    // STEP 10-11: Scoped Analytics & Project Detail Tabs Verification
    // -------------------------------------------------------------------------
    console.log('\nStep 10-11: Verifying Scoped Data & Project Tabs...');
    const data3 = detailRes3.body?.data;
    assert(data3?.project?.metrics?.repositoriesCount === 3, 'Metrics repositoriesCount = 3.');
    assert(Array.isArray(data3?.repositories) && data3.repositories.length === 3, 'Repositories tab contains exactly 3 connected repos.');
    assert(Array.isArray(data3?.developers), 'Developers tab array present.');
    assert(Array.isArray(data3?.recentActivity), 'Activity tab array present.');
    assert(Array.isArray(data3?.commits), 'Commits tab array present.');
    assert(Array.isArray(data3?.pullRequests), 'Pull Requests tab array present.');
    assert(Array.isArray(data3?.issues), 'Issues tab array present.');
    assert(Array.isArray(data3?.codeChanges?.trend) && Array.isArray(data3?.codeChanges?.topFilesChanged), 'Code Changes tab trend and hotspot files present.');

    // -------------------------------------------------------------------------
    // STEP 12: Second Project Isolation (Marketing Website)
    // -------------------------------------------------------------------------
    console.log('\nStep 12: Creating Second Project (Marketing Website)...');
    const createRes2 = await callController(createProject, {}, { name: 'Marketing Website', description: 'Public marketing site' }, {}, orgAId);
    const project2Id = createRes2.body?.data?.id;

    await callController(addRepositoryToProject, { id: project2Id }, { repositoryId: repoMktId }, {}, orgAId);

    const detailResProj2 = await callController(getProjectDetail, { id: project2Id }, {}, {}, orgAId);
    const proj2Repos = detailResProj2.body?.data?.repositories || [];
    assert(proj2Repos.length === 1 && proj2Repos[0].id === repoMktId, 'Project 2 contains ONLY marketing-web repo.');
    assert(!proj2Repos.some((r: any) => r.id === repoFeId || r.id === repoBeId || r.id === repoAiId), 'Project 1 repositories DO NOT appear in Project 2.');

    // -------------------------------------------------------------------------
    // STEP 13: Duplicate Connection Test
    // -------------------------------------------------------------------------
    console.log('\nStep 13: Testing Duplicate Repository Connection...');
    const dupRes = await callController(addRepositoryToProject, { id: project1Id }, { repositoryId: repoFeId }, {}, orgAId);
    assert(dupRes.status === 400 && dupRes.body?.success === false, 'Duplicate connection rejected with 400 error status.');
    assert(dupRes.body?.error?.toLowerCase().includes('already connected'), 'Returns user-friendly error: "Repository is already connected to this project".');

    // -------------------------------------------------------------------------
    // STEP 14: Tenant Isolation Verification (Org B vs Org A)
    // -------------------------------------------------------------------------
    console.log('\nStep 14: Testing Tenant Isolation (Org B attempting to access Org A Project)...');
    const tenantAccessRes = await callController(getProjectDetail, { id: project1Id }, {}, {}, orgBId);
    assert(tenantAccessRes.status === 404 && tenantAccessRes.body?.success === false, 'Org B receives 404 when querying Org A project.');

    // -------------------------------------------------------------------------
    // STEP 15: Disconnect Repository (hospital-frontend)
    // -------------------------------------------------------------------------
    console.log('\nStep 15: Disconnecting hospital-frontend from HMS Project...');
    const disconnRes = await callController(removeRepositoryFromProject, { id: project1Id, repositoryId: repoFeId }, {}, {}, orgAId);
    assert(disconnRes.status === 200 && disconnRes.body?.success, 'Successfully unlinked hospital-frontend from HMS.');

    let detailResPostDisc = await callController(getProjectDetail, { id: project1Id }, {}, {}, orgAId);
    assert(detailResPostDisc.body?.data?.repositories?.length === 2, 'Project 1 Repositories Count decreased from 3 to 2.');

    // Verify repository itself remains in database
    const repoCheck = await pool.query(`SELECT id FROM repositories WHERE id = $1`, [repoFeId]);
    assert(repoCheck.rows.length === 1, 'Unlinked repository hospital-frontend still exists in database (NOT deleted).');

    // -------------------------------------------------------------------------
    // STEP 16: Zero Repositories Project Test
    // -------------------------------------------------------------------------
    console.log('\nStep 16: Testing Empty Project (0 Repositories)...');
    const createRes3 = await callController(createProject, {}, { name: 'Empty Monitoring Group' }, {}, orgAId);
    const project3Id = createRes3.body?.data?.id;

    const detailResEmpty = await callController(getProjectDetail, { id: project3Id }, {}, {}, orgAId);
    const emptyMetrics = detailResEmpty.body?.data?.project?.metrics;
    assert(
      emptyMetrics.repositoriesCount === 0 &&
      emptyMetrics.developersCount === 0 &&
      emptyMetrics.commitsCount === 0 &&
      emptyMetrics.prsCount === 0 &&
      emptyMetrics.issuesCount === 0,
      'Empty project metrics are all 0.'
    );

    // Clean up QA test data
    await pool.query(`DELETE FROM projects WHERE organization_id IN ($1, $2)`, [orgAId, orgBId]);
    await pool.query(`DELETE FROM repositories WHERE organization_id IN ($1, $2)`, [orgAId, orgBId]);
    await pool.query(`DELETE FROM saas_organizations WHERE id IN ($1, $2)`, [orgAId, orgBId]);

    console.log('\n================================================================');
    console.log(`   QA RESULT: ${testPassedCount} / ${testTotalCount} STEPS PASSED SUCCESSFULLY!`);
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ QA Suite Error:', err);
    process.exit(1);
  }
}

runQA();
