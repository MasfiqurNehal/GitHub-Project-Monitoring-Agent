const http = require('http');

const originsToTest = [
  { origin: 'https://gitmonitor.masfiqurnehal.com', expectedAllowed: true },
  { origin: 'https://git-hub-project-monitoring-agent.vercel.app', expectedAllowed: true },
  { origin: 'http://localhost:3000', expectedAllowed: true },
  { origin: 'https://preview-branch-123.vercel.app', expectedAllowed: true },
  { origin: 'https://staging.masfiqurnehal.com', expectedAllowed: true },
  { origin: 'https://unauthorized-attacker-site.com', expectedAllowed: false }
];

async function testExpressCors() {
  console.log('=====================================================');
  console.log('TESTING EXPRESS CORS ON LIVE LOCAL SERVER (PORT 5001)');
  console.log('=====================================================');
  let passedCount = 0;
  for (const item of originsToTest) {
    const origin = item.origin;
    const expectedAllowed = item.expectedAllowed;
    await new Promise((resolve) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: 5001,
        path: '/api/auth/login',
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization,content-type'
        }
      }, (res) => {
        const acao = res.headers['access-control-allow-origin'];
        const acac = res.headers['access-control-allow-credentials'];
        const allowed = acao === origin;
        const testPassed = allowed === expectedAllowed;
        console.log(`[TEST] Origin: ${origin}`);
        console.log(`  Status: ${res.statusCode} | ACAO: ${acao || 'None'} | ACAC: ${acac || 'None'}`);
        console.log(`  Verdict: ${testPassed ? '✓ PASS' : '✗ FAIL'} (Expected ${expectedAllowed ? 'ALLOWED' : 'BLOCKED'})`);
        if (testPassed) passedCount++;
        resolve();
      });
      req.on('error', (err) => {
        console.error('Request error:', err.message);
        resolve();
      });
      req.end();
    });
  }
  console.log('-----------------------------------------------------');
  console.log(`Summary: ${passedCount} / ${originsToTest.length} CORS tests passed.`);
  if (passedCount !== originsToTest.length) {
    process.exit(1);
  }
}

testExpressCors();
