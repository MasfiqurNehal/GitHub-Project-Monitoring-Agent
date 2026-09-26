const BASE_URL = 'http://localhost:5001/api';

async function safeFetchJson(url: string, options?: any) {
  const res = await fetch(url, options);
  const text = await res.text();
  if (!res.ok && res.status !== 404) {
    console.error(`Request failed [${res.status}] ${url}:`, text);
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  try {
    return { status: res.status, ok: res.ok, data: JSON.parse(text) };
  } catch (err) {
    return { status: res.status, ok: res.ok, text };
  }
}

async function runMultiTenantTest() {
  console.log('=== MULTI-TENANT SAAS DATA ISOLATION TEST ===\n');

  // Create Tenant A User
  const emailA = `betopia-${Date.now()}@example.com`;
  const orgAId = `org-betopia-${Date.now()}`;
  await safeFetchJson(`${BASE_URL}/auth/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailA,
      password: 'password123',
      name: 'Betopia Owner',
      role: 'admin',
      organizationId: orgAId,
    }),
  });

  // Login Tenant A
  const loginARes = await safeFetchJson(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailA,
      password: 'password123',
    }),
  });
  const tokenA = loginARes.data.data.accessToken || loginARes.data.data.token;
  const userA = loginARes.data.data.user;
  console.log(`✅ Tenant A Registered & Logged in (${userA.email}): Organization ID = ${userA.organizationId}`);

  // Create Project for Tenant A
  const projARes = await safeFetchJson(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({
      name: `Betopia Core Service ${Date.now()}`,
      description: 'Main product backend service',
    }),
  });
  const projectA = projARes.data.data;
  console.log(`✅ Tenant A created project: ${projectA.name} [ID: ${projectA.id}]`);

  // Fetch Tenant A dashboard stats
  const dashARes = await safeFetchJson(`${BASE_URL}/dashboard/overview`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const kpiA = dashARes.data.data.kpi;
  console.log('✅ Tenant A Dashboard Overview KPI:', {
    totalProjects: kpiA.totalProjects,
    totalRepositories: kpiA.totalRepositories,
    totalCommits: kpiA.totalCommits,
  });

  if (kpiA.totalProjects !== 1) {
    throw new Error(`❌ Expected Tenant A totalProjects = 1, got ${kpiA.totalProjects}`);
  }

  // Create Tenant B User
  const emailB = `companyb-${Date.now()}@example.com`;
  const orgBId = `org-companyb-${Date.now()}`;
  await safeFetchJson(`${BASE_URL}/auth/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailB,
      password: 'password123',
      name: 'Company B Owner',
      role: 'admin',
      organizationId: orgBId,
    }),
  });

  // Login Tenant B
  const loginBRes = await safeFetchJson(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailB,
      password: 'password123',
    }),
  });
  const tokenB = loginBRes.data.data.accessToken || loginBRes.data.data.token;
  const userB = loginBRes.data.data.user;
  console.log(`\n✅ Tenant B Registered & Logged in (${userB.email}): Organization ID = ${userB.organizationId}`);

  // Verify Tenant B Dashboard Stats (Must be 0 for Tenant B!)
  const dashBRes = await safeFetchJson(`${BASE_URL}/dashboard/overview`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const kpiB = dashBRes.data.data.kpi;
  console.log('✅ Tenant B Dashboard Overview KPI (Isolated):', {
    totalProjects: kpiB.totalProjects,
    totalRepositories: kpiB.totalRepositories,
    totalCommits: kpiB.totalCommits,
  });

  if (kpiB.totalProjects !== 0 || kpiB.totalRepositories !== 0) {
    throw new Error(`❌ ISOLATION FAILURE: Tenant B sees Tenant A dashboard stats! (projects: ${kpiB.totalProjects}, repos: ${kpiB.totalRepositories})`);
  }

  // Verify Tenant B Repositories list
  const reposBRes = await safeFetchJson(`${BASE_URL}/repositories`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  console.log(`✅ Tenant B Repositories Count: ${reposBRes.data.data.length}`);
  if (reposBRes.data.data.length !== 0) {
    throw new Error('❌ ISOLATION FAILURE: Tenant B sees Tenant A repositories in list!');
  }

  // Verify Tenant B Projects list
  const projectsBRes = await safeFetchJson(`${BASE_URL}/projects`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  console.log(`✅ Tenant B Projects Count: ${projectsBRes.data.data.length}`);
  if (projectsBRes.data.data.length !== 0) {
    throw new Error('❌ ISOLATION FAILURE: Tenant B sees Tenant A projects in list!');
  }

  // Test unauthorized access by Tenant B to Tenant A project ID
  if (projectA) {
    const projDetailBRes = await safeFetchJson(`${BASE_URL}/projects/${projectA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    console.log(`✅ Tenant B requesting Tenant A project (${projectA.id}) status: ${projDetailBRes.status}`);
    if (projDetailBRes.status === 404) {
      console.log('   -> Correctly received 404 Not Found (Tenant A project hidden from Tenant B)');
    } else {
      throw new Error(`❌ ISOLATION FAILURE: Tenant B received status ${projDetailBRes.status} accessing Tenant A project!`);
    }
  }

  console.log('\n🎉 ALL MULTI-TENANT ISOLATION TESTS PASSED PERFECTLY!');
}

runMultiTenantTest().catch((err) => {
  console.error('❌ Test failed:', err.message || err);
  process.exit(1);
});
