/**
 * BUG-092 verification: test AI course generation end-to-end.
 * Run inside container: node /app/scripts/debug/bug092-test-generation.cjs
 */
const http = require('http');

function httpReq(method, port, path, body, token, ct) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port, path, method, headers: {}, timeout: 30000 };
    if (token) opts.headers.Authorization = 'Bearer ' + token;
    opts.headers['Content-Type'] = ct || 'application/json';
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', reject);
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}

async function main() {
  // 1. Get instructor token
  const r1 = await httpReq(
    'POST', 8080,
    '/realms/edusphere/protocol/openid-connect/token',
    'client_id=edusphere-web&grant_type=password&username=instructor@example.com&password=Instructor123!',
    null, 'application/x-www-form-urlencoded'
  );
  const token = JSON.parse(r1.body).access_token;
  if (!token) { console.error('Login failed:', r1.body); process.exit(1); }
  console.log('[OK] Token obtained');

  // 2. Set AI_PROCESSING consent
  await httpReq('POST', 4000, '/graphql', {
    query: 'mutation { updateConsent(input: { consentType: AI_PROCESSING, given: true }) }'
  }, token);
  console.log('[OK] AI consent set');

  // 3. Generate course
  const r3 = await httpReq('POST', 4000, '/graphql', {
    query: `mutation {
      generateCourseFromPrompt(input: {
        prompt: "Introduction to basic mathematics for beginners"
        targetAudienceLevel: "BEGINNER"
        estimatedHours: 10
      }) {
        executionId
        status
      }
    }`
  }, token);
  console.log('[Generate]', r3.body);

  const data = JSON.parse(r3.body);
  if (data.errors) {
    console.error('GraphQL errors:', JSON.stringify(data.errors, null, 2));
    process.exit(1);
  }

  const execId = data.data.generateCourseFromPrompt.executionId;
  console.log('[OK] Execution started:', execId);

  // 4. Poll for completion
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const r4 = await httpReq('POST', 4000, '/graphql', {
      query: `{ agentExecution(id: "${execId}") { id status output completedAt } }`
    }, token);

    const result = JSON.parse(r4.body);
    const exec = result?.data?.agentExecution;
    if (!exec) {
      console.log(`[Poll ${i+1}] No data:`, r4.body.slice(0, 200));
      continue;
    }

    const output = exec.output;
    const title = output?.courseTitle || 'pending';
    console.log(`[Poll ${i+1}] status=${exec.status} title=${title}`);

    if (exec.status === 'COMPLETED') {
      console.log('\n=== COURSE GENERATED ===');
      console.log('Title:', output.courseTitle);
      console.log('Description:', output.courseDescription);
      console.log('Modules:', output.modules?.length || 0);
      for (const m of output.modules || []) {
        console.log(`  - ${m.title}: ${m.contentItemTitles?.length || 0} items`);
      }
      process.exit(0);
    }

    if (exec.status === 'FAILED') {
      console.error('\n=== GENERATION FAILED ===');
      console.error('Error:', output?.error || JSON.stringify(output));
      process.exit(1);
    }
  }

  console.error('Timed out waiting for generation');
  process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
