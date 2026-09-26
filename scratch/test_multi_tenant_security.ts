const BASE_URL = process.env.API_URL || 'http://localhost:5001/api';


async function request(endpoint: string, options: { method?: string; body?: any; token?: string } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { raw: text };
  }

  return { status: res.status, ok: res.ok, data };
}

async function runMultiTenantAuditTest() {
  console.log('====================================================');
  console.log('🔒 MULTI-TENANT SECURITY & DATA ISOLATION AUDIT TEST');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // Step 1: Authenticate Org A (Masfiqur Nehal)
    console.log('--- STEP 1: Authenticate Organization A ---');
    const loginA = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin1@masfiqurnehal.com', password: 'password' },
    });
    assert(loginA.status === 200 && Boolean(loginA.data.data?.accessToken), 'Login Organization A (Masfiqur Nehal)');
    const tokenA = loginA.data.data?.accessToken;
    const orgAId = loginA.data.data?.user?.organizationId;
    console.log(`Organization A ID: ${orgAId}`);

    // Step 2: Authenticate Org B (Betopia Ltd)
    console.log('\n--- STEP 2: Authenticate Organization B ---');
    const loginB = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@betopia.com', password: 'password' },
    });
    assert(loginB.status === 200 && Boolean(loginB.data.data?.accessToken), 'Login Organization B (Betopia Ltd)');
    const tokenB = loginB.data.data?.accessToken;
    const orgBId = loginB.data.data?.user?.organizationId;
    console.log(`Organization B ID: ${orgBId}`);

    assert(orgAId !== orgBId, 'Organization A and Organization B have distinct tenant organization IDs');

    // Step 3: Unauthenticated Access Prevention
    console.log('\n--- STEP 3: Unauthenticated Access Prevention ---');
    const unauthProjects = await request('/projects');
    assert(unauthProjects.status === 401, 'Unauthenticated request to /api/projects is rejected with 401 Unauthorized');
    const unauthDashboard = await request('/dashboard/summary');
    assert(unauthDashboard.status === 401, 'Unauthenticated request to /api/dashboard/summary is rejected with 401 Unauthorized');

    // Step 4: Create Org B Project
    console.log('\n--- STEP 4: Project Isolation & IDOR Protection ---');
    const projBName = `OrgB-Isolated-Proj-${Date.now()}`;
    const createProjB = await request('/projects', {
      method: 'POST',
      token: tokenB,
      body: { name: projBName, description: 'Secret project belonging to Org B' },
    });
    assert(createProjB.status === 201 && Boolean(createProjB.data.data?.id), 'Org B creates project');
    const projBId = createProjB.data.data?.id;

    // Org A lists projects - should NOT contain Org B project
    const projectsA = await request('/projects', { token: tokenA });
    const containsBInA = projectsA.data.data?.some((p: any) => p.id === projBId || p.name === projBName);
    assert(!containsBInA, 'Organization A project list does NOT leak Organization B project');

    // Org A attempts IDOR access to Org B project detail
    const getDetailOrgAOnB = await request(`/projects/${projBId}`, { token: tokenA });
    assert(getDetailOrgAOnB.status === 404, 'Organization A GET /api/projects/:id_org_b returns 404 Not Found (IDOR protected)');

    // Org A attempts IDOR update on Org B project
    const updateOrgAOnB = await request(`/projects/${projBId}`, {
      method: 'PATCH',
      token: tokenA,
      body: { name: 'Hacked Project Name' },
    });
    assert(updateOrgAOnB.status === 404, 'Organization A PATCH /api/projects/:id_org_b returns 404 Not Found (IDOR protected)');

    // Org A attempts IDOR delete on Org B project
    const deleteOrgAOnB = await request(`/projects/${projBId}`, {
      method: 'DELETE',
      token: tokenA,
    });
    assert(deleteOrgAOnB.status === 404, 'Organization A DELETE /api/projects/:id_org_b returns 404 Not Found (IDOR protected)');

    // Step 5: Repositories Isolation
    console.log('\n--- STEP 5: Repository Isolation & IDOR Protection ---');
    const reposA = await request('/repositories', { token: tokenA });
    const reposB = await request('/repositories', { token: tokenB });

    assert(reposA.ok && reposB.ok, 'Successfully fetched repositories for Org A and Org B');
    const repoBIds = (reposB.data.data || []).map((r: any) => r.id);

    if (repoBIds.length > 0) {
      const targetRepoB = repoBIds[0];
      const getRepoAOnB = await request(`/repositories/${targetRepoB}`, { token: tokenA });
      assert(getRepoAOnB.status === 404, `Organization A GET /api/repositories/${targetRepoB} returns 404 Not Found`);

      const syncRepoAOnB = await request(`/repositories/${targetRepoB}/sync`, { method: 'POST', token: tokenA });
      assert(syncRepoAOnB.status === 404, `Organization A POST /api/repositories/${targetRepoB}/sync returns 404 Not Found`);

      const deleteRepoAOnB = await request(`/repositories/${targetRepoB}`, { method: 'DELETE', token: tokenA });
      assert(deleteRepoAOnB.status === 404, `Organization A DELETE /api/repositories/${targetRepoB} returns 404 Not Found`);
    } else {
      console.log('ℹ️ Org B has 0 repositories connected; testing cross-repo IDOR check with Org A repo on Org B');
      const repoAIds = (reposA.data.data || []).map((r: any) => r.id);
      if (repoAIds.length > 0) {
        const getRepoBOnA = await request(`/repositories/${repoAIds[0]}`, { token: tokenB });
        assert(getRepoBOnA.status === 404, `Organization B GET /api/repositories/${repoAIds[0]} returns 404 Not Found`);
      }
    }

    // Step 6: Developers Isolation
    console.log('\n--- STEP 6: Developers Isolation & IDOR Protection ---');
    const devsA = await request('/developers', { token: tokenA });
    const devsB = await request('/developers', { token: tokenB });
    assert(devsA.ok && devsB.ok, 'Successfully listed developers for Org A and Org B');

    const devBLogins = (devsB.data.data || []).map((d: any) => d.login);
    const leakDevInA = (devsA.data.data || []).some((d: any) => devBLogins.includes(d.login) && d.organization_id === orgBId);
    assert(!leakDevInA, 'Organization A developer list does NOT leak Organization B developers');

    if (devsA.data.data?.length > 0) {
      const devAId = devsA.data.data[0].id;
      const getDevBOnA = await request(`/developers/${devAId}`, { token: tokenB });
      assert(getDevBOnA.status === 404, `Organization B GET /api/developers/${devAId} returns 404 Not Found`);
    }

    // Step 7: Dashboard Metrics Isolation
    console.log('\n--- STEP 7: Dashboard Metrics Isolation ---');
    const dashA = await request('/dashboard/summary', { token: tokenA });
    const dashB = await request('/dashboard/summary', { token: tokenB });
    assert(dashA.ok && dashB.ok, 'Successfully fetched dashboard summary for Org A and Org B');
    console.log(`Org A Dashboard Summary: ${JSON.stringify(dashA.data.data)}`);
    console.log(`Org B Dashboard Summary: ${JSON.stringify(dashB.data.data)}`);

    // Step 8: GitHub Installations Isolation
    console.log('\n--- STEP 8: GitHub Installations & Token Isolation ---');
    const instsA = await request('/settings/github/installations', { token: tokenA });
    const instsB = await request('/settings/github/installations', { token: tokenB });
    assert(instsA.ok && instsB.ok, 'Successfully listed installations for Org A and Org B');

    if (instsA.data.data?.length > 0) {
      const targetInstId = instsA.data.data[0].github_installation_id;
      const tokenGenBOnA = await request(`/settings/github/installations/${targetInstId}/token`, {
        method: 'POST',
        token: tokenB,
      });
      assert(tokenGenBOnA.status === 404 || tokenGenBOnA.status === 400 || !tokenGenBOnA.ok, 'Organization B CANNOT generate token for Organization A GitHub installation');
    }

    // Step 9: Clean Empty State for New Tenant (Organization C)
    console.log('\n--- STEP 9: Newly Created Organization Empty State Verification ---');
    const newOrgEmail = `newtenant-${Date.now()}@testorg.com`;
    const createOrgC = await request('/auth/users', {
      method: 'POST',
      token: tokenA,
      body: {
        email: newOrgEmail,
        name: 'Brand New Tenant Org C',
        role: 'admin',
        password: 'password123',
      },
    });
    assert(createOrgC.ok, 'Created new user/organization C');

    const loginC = await request('/auth/login', {
      method: 'POST',
      body: { email: newOrgEmail, password: 'password123' },
    });
    assert(loginC.ok && Boolean(loginC.data.data?.accessToken), 'Logged in as new Organization C');
    const tokenC = loginC.data.data?.accessToken;

    const summaryC = await request('/dashboard/summary', { token: tokenC });
    assert(summaryC.ok, 'Fetched dashboard summary for new Organization C');
    const metricsC = summaryC.data.data || {};

    assert(metricsC.connectedRepositories === 0, 'New Organization C Repositories: 0');
    assert(metricsC.monitoredProjects === 0, 'New Organization C Projects: 0');
    assert(metricsC.totalDevelopers === 0, 'New Organization C Developers: 0');
    assert(metricsC.totalCommits === 0, 'New Organization C Commits: 0');
    assert(metricsC.pullRequests === 0, 'New Organization C Pull Requests: 0');
    assert(metricsC.issuesOpened === 0, 'New Organization C Issues: 0');

    // Clean up test project
    await request(`/projects/${projBId}`, { method: 'DELETE', token: tokenB });

    console.log('\n====================================================');
    console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err: any) {
    console.error('Audit script failed with error:', err.message);
    process.exit(1);
  }
}

runMultiTenantAuditTest();
