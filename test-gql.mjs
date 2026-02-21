import http from 'http';

async function gql(query, variables = {}) {
  const body = JSON.stringify({ query, variables });
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost', port: 4000, path: '/graphql', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    req.write(body); req.end();
  });
}

// Test queries that ContentViewer and Dashboard make
const tests = [
  ['myStats (Dashboard)', 'query MyStats { myStats { coursesEnrolled annotationsCreated conceptsMastered totalLearningMinutes } }'],
  ['contentItem', 'query ContentItem($id: ID!) { contentItem(id: $id) { id title } }', { id: 'content-1' }],
  ['annotations', 'query Annotations($assetId: ID!) { annotations(assetId: $assetId) { id layer content createdAt } }', { assetId: 'content-1' }],
  ['ME query', 'query Me { me { id email firstName lastName role tenantId } }'],
  ['courses', 'query Courses($limit: Int) { courses(limit: $limit) { id title } }', { limit: 5 }],
  ['myEnrollments', 'query MyEnrollments { myEnrollments { id courseId status } }'],
];

for (const [name, query, vars] of tests) {
  const r = await gql(query, vars);
  const hasErrors = r.body.errors?.length > 0;
  const errMsg = r.body.errors?.[0]?.message ?? '';
  console.log(`${r.status === 400 ? '❌ 400' : r.status === 200 && hasErrors ? '⚠️  200+err' : '✅ 200'} ${name}: ${errMsg.slice(0, 80)}`);
}
