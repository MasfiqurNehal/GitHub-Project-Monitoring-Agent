import { projectRepository } from '../src/repositories/project.repository.js';
import { repositoryRepository } from '../src/repositories/repository.repository.js';
import { pool } from '../src/db/connection.js';

async function testProjectManagement() {
  console.log('=== BACKEND PHASE 8: PROJECT MANAGEMENT TESTS ===\n');

  const testOrgId = `org-prj-test-${Date.now()}`;
  const otherOrgId = `org-prj-other-${Date.now()}`;

  // 1. Setup mock organizations
  await pool.query(
    `INSERT INTO saas_organizations (id, name, slug) VALUES ($1, $2, $3), ($4, $5, $6)`,
    [testOrgId, 'Project Test Org A', testOrgId, otherOrgId, 'Project Test Org B', otherOrgId]
  );

  console.log('✓ Created test tenant organizations');

  // Test 1: Create Projects for Tenant A & Tenant B
  const prjA = await projectRepository.create(
    `prj-a-${Date.now()}`,
    'Alpha Multi-Repo Suite',
    'Main project containing frontend, backend, and mobile repos',
    'Betopia',
    testOrgId
  );
  console.log('✓ Created Project A for Tenant A:', prjA.name, '[ID:', prjA.id + ']');

  const prjB = await projectRepository.create(
    `prj-b-${Date.now()}`,
    'Beta Website Suite',
    'Tenant B project',
    'Company B',
    otherOrgId
  );
  console.log('✓ Created Project B for Tenant B:', prjB.name, '[ID:', prjB.id + ']');

  // Test 2: Multi-Tenant Data Isolation (Tenant A list must NOT see Tenant B projects)
  const tenantAProjects = await projectRepository.findAll(testOrgId);
  const tenantBProjects = await projectRepository.findAll(otherOrgId);

  const foundBInA = tenantAProjects.some((p) => p.id === prjB.id);
  const foundAInB = tenantBProjects.some((p) => p.id === prjA.id);

  if (!foundBInA && !foundAInB) {
    console.log('✓ Passed! Multi-tenant isolation verified: Tenant A cannot see Tenant B projects.');
  } else {
    console.error('FAILED: Tenant isolation leak detected in projects list!');
    process.exit(1);
  }

  // Test 3: Attach Repositories to Project A
  const repoA1 = await repositoryRepository.upsert({
    id: `repo-a1-${Date.now()}`,
    projectId: prjA.id,
    organizationId: testOrgId,
    githubRepositoryId: 88112233,
    owner: 'TestOrg',
    name: 'alpha-frontend',
    fullName: 'TestOrg/alpha-frontend',
    htmlUrl: 'https://github.com/TestOrg/alpha-frontend',
    defaultBranch: 'main',
    isPrivate: true,
  });

  const repoA2 = await repositoryRepository.upsert({
    id: `repo-a2-${Date.now()}`,
    projectId: prjA.id,
    organizationId: testOrgId,
    githubRepositoryId: 88112244,
    owner: 'TestOrg',
    name: 'alpha-backend',
    fullName: 'TestOrg/alpha-backend',
    htmlUrl: 'https://github.com/TestOrg/alpha-backend',
    defaultBranch: 'main',
    isPrivate: true,
  });

  console.log('✓ Attached 2 repositories to Project A');

  // Test 4: Verify Project A Repository Count
  const attachedRepos = await repositoryRepository.findByProjectId(prjA.id);
  if (attachedRepos.length === 2) {
    console.log('✓ Passed! Project A contains 2 attached repositories');
  } else {
    console.error(`FAILED: Expected 2 repos for Project A, got ${attachedRepos.length}`);
    process.exit(1);
  }

  // Test 5: Unlink Repository from Project (Preserve Repo entity)
  await pool.query('UPDATE repositories SET project_id = NULL WHERE id = $1', [repoA2.id]);
  const remainingRepos = await repositoryRepository.findByProjectId(prjA.id);
  const repoA2Check = await repositoryRepository.findById(repoA2.id, testOrgId);

  if (remainingRepos.length === 1 && repoA2Check !== null) {
    console.log('✓ Passed! Unlinked repo from Project A while preserving repository entity in Neon DB.');
  } else {
    console.error('FAILED: Unlinking repository failed or deleted the repository entity!');
    process.exit(1);
  }

  // Test 6: Delete Project A (Preserve Repo entity & set project_id = NULL)
  await projectRepository.delete(prjA.id, testOrgId);
  const repoA1Check = await repositoryRepository.findById(repoA1.id, testOrgId);

  if (repoA1Check !== null && repoA1Check.project_id === null) {
    console.log('✓ Passed! Deleting Project A preserved linked repository and reset project_id to NULL.');
  } else {
    console.error('FAILED: Deleting project removed repository or failed to clear project_id!');
    process.exit(1);
  }

  // Clean up test data
  await pool.query('DELETE FROM repositories WHERE organization_id IN ($1, $2)', [testOrgId, otherOrgId]);
  await pool.query('DELETE FROM projects WHERE organization_id IN ($1, $2)', [testOrgId, otherOrgId]);
  await pool.query('DELETE FROM saas_organizations WHERE id IN ($1, $2)', [testOrgId, otherOrgId]);

  console.log('\n=== ALL PHASE 8 PROJECT MANAGEMENT TESTS PASSED PERFECTLY ===\n');
  process.exit(0);
}

testProjectManagement().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
