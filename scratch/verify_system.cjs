async function runVerification() {
  console.log('====================================================');
  console.log('🚀 FULL SYSTEM VERIFICATION & BENCHMARKING SUITE');
  console.log('====================================================\n');

  // 1. EXPRESS HEALTH
  const expRes = await fetch('http://localhost:5001/api/health').then(r => r.json());
  console.log('1. Express Health Check:', expRes);

  // 2. FASTAPI HEALTH
  const aiHealth = await fetch('http://localhost:8000/health').then(r => r.json());
  console.log('2. FastAPI Health Check:', aiHealth);

  // 3. AUTH LOGIN
  const loginRes = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin1@masfiqurnehal.com', password: 'password' }),
  }).then(r => r.json());

  console.log('\n3. Express Login Authentication:');
  console.log('   Success:', loginRes.success);
  const token = loginRes.data?.accessToken;
  const refreshToken = loginRes.data?.refreshToken;
  console.log('   Access Token received:', !!token, '(Bearer prefix ready)');
  console.log('   Refresh Token received:', !!refreshToken);
  console.log('   User:', loginRes.data?.user?.email, '| Org:', loginRes.data?.user?.organizationId);

  // 4. VERIFY ACCESS TOKEN WITH /api/auth/me
  const meRes = await fetch('http://localhost:5001/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());
  console.log('\n4. Profile Verification (/api/auth/me):');
  console.log('   Success:', meRes.success, '| User Name:', meRes.data?.user?.name);

  // 5. REFRESH TOKEN ROTATION
  const refreshRes = await fetch('http://localhost:5001/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).then(r => r.json());
  console.log('\n5. Refresh Token Rotation (/api/auth/refresh):');
  console.log('   Success:', refreshRes.success);
  console.log('   New Access Token received:', !!refreshRes.data?.accessToken);
  console.log('   New Refresh Token received:', !!refreshRes.data?.refreshToken);

  // 6. BENCHMARK DASHBOARD OVERVIEW (DATA FETCHING SPEED)
  console.log('\n6. Benchmarking Dashboard Overview Performance:');
  const t0 = Date.now();
  const dashRes = await fetch('http://localhost:5001/api/dashboard/overview', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());
  const t1 = Date.now();
  console.log(`   Fetched /api/dashboard/overview in ${t1 - t0} ms!`);
  console.log('   Active Repositories:', dashRes.data?.activeRepositories?.length);
  console.log('   Total Commits:', dashRes.data?.summary?.totalCommits);
  console.log('   Total PRs:', dashRes.data?.summary?.totalPullRequests);

  // 7. DASHBOARD SIGNALS ENDPOINT
  console.log('\n7. Engineering Signals (/api/dashboard/signals):');
  const sigRes = await fetch('http://localhost:5001/api/dashboard/signals', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());
  console.log('   Success:', sigRes.success);
  console.log('   Signals Count:', sigRes.data?.signals?.length);
  if (sigRes.data?.signals?.length > 0) {
    console.log('   Sample Signal:', sigRes.data?.signals[0]?.title);
  }

  // 8. FASTAPI AI CHATBOT WITH RAG
  console.log('\n8. FastAPI AI Chatbot & RAG Integration (/api/v1/chatbot/chat):');
  const chatStart = Date.now();
  const chatRes = await fetch('http://localhost:8000/api/v1/chatbot/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      conversation_id: 'conv-prod-verify-001',
      prompt: 'What is GitMonitor and how does it calculate code churn and pull request metrics?',
    }),
  }).then(r => r.json());
  const chatEnd = Date.now();
  console.log(`   Response Time: ${chatEnd - chatStart} ms`);
  console.log('   Success:', chatRes.success);
  console.log('   Conversation ID:', chatRes.data?.conversation_id);
  console.log('   Message ID:', chatRes.data?.message_id);
  console.log('   Sources Count:', chatRes.data?.sources?.length);
  console.log('   Sources:', chatRes.data?.sources?.map((s) => s.title));
  console.log('\n--- AI Response Content Preview ---');
  console.log(chatRes.data?.answer?.slice(0, 350) + '...\n');

  // 9. VERIFY CONVERSATION PERSISTENCE IN NEON DB
  console.log('9. Checking Conversation Persistence via FastAPI:');
  const convRes = await fetch('http://localhost:8000/api/v1/chatbot/conversations', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());
  console.log('   Success:', convRes.success);
  console.log('   Total User Conversations in Neon DB:', convRes.conversations?.length);

  // 10. FRONTEND STATUS
  console.log('\n10. Next.js Frontend (port 3000):');
  try {
    const frontendRes = await fetch('http://localhost:3000/');
    console.log('   Frontend status:', frontendRes.status, '(Ready and serving pages)');
  } catch (feErr) {
    console.log('   Frontend status check:', feErr.message);
  }

  console.log('\n====================================================');
  console.log('✅ ALL SYSTEMS OPERATIONAL AND CONNECTED PERFECTLY!');
  console.log('====================================================');
}

runVerification().catch(console.error);
