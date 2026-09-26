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

async function runPhase4Test() {
  console.log('=== BACKEND PHASE 4 — GITHUB APP INTEGRATION TEST ===\n');

  // 1. Create/Login Tenant User
  const email = `tenant-phase4-${Date.now()}@example.com`;
  const orgId = `org-phase4-${Date.now()}`;
  await safeFetchJson(`${BASE_URL}/auth/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'password123',
      name: 'Phase4 Owner',
      role: 'admin',
      organizationId: orgId,
    }),
  });

  const loginRes = await safeFetchJson(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'password123',
    }),
  });

  const token = loginRes.data.data.accessToken || loginRes.data.data.token;
  const user = loginRes.data.data.user;
  console.log(`✅ Logged in Tenant User (${user.email}): Organization ID = ${user.organizationId}`);

  // 2. GET /api/github/install
  const installRes = await safeFetchJson(`${BASE_URL}/github/install`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('✅ GET /api/github/install Response:', installRes.data.data);

  if (!installRes.data.data.installUrl || !installRes.data.data.state) {
    throw new Error('❌ Failed: installUrl or state missing from /api/github/install response!');
  }

  const stateToken = installRes.data.data.state;

  // 3. Test Callback GET /api/github/callback with installation_id & state
  const testInstId = 98765432;
  const callbackRes = await safeFetchJson(
    `${BASE_URL}/github/callback?installation_id=${testInstId}&state=${encodeURIComponent(stateToken)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );
  console.log('✅ GET /api/github/callback Response:', callbackRes.data);

  // 4. GET /api/github/connection
  const statusRes = await safeFetchJson(`${BASE_URL}/github/connection`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('✅ GET /api/github/connection Status Response:', statusRes.data.data);

  const statusData = statusRes.data.data;
  if (
    statusData.connected !== true ||
    Number(statusData.installationId) !== testInstId ||
    statusData.connectionStatus !== 'ACTIVE'
  ) {
    throw new Error('❌ Failed: Connection status response does not match expected GitHub App installation fields!');
  }

  // 5. Test Disconnect API
  const discRes = await safeFetchJson(`${BASE_URL}/github/connection`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('✅ DELETE /api/github/connection Response:', discRes.data);

  // 6. Verify status is now disconnected
  const statusAfterDisc = await safeFetchJson(`${BASE_URL}/github/connection`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('✅ GET /api/github/connection Status After Disconnect:', statusAfterDisc.data.data);
  if (statusAfterDisc.data.data.connected !== false) {
    throw new Error('❌ Failed: Connection status did not reflect disconnect!');
  }

  console.log('\n🎉 ALL PHASE 4 GITHUB APP INTEGRATION TESTS PASSED PERFECTLY!');
}

runPhase4Test().catch((err) => {
  console.error('❌ Test failed:', err.message || err);
  process.exit(1);
});
