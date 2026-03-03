import http from 'http';

async function request(method, urlStr, body, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = http.request(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers },
      (res) => {
        let data = '';
        res.on('data', (d) => (data += d));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function tryLogin(username, password) {
  const body =
    'client_id=edusphere-web&username=' +
    encodeURIComponent(username) +
    '&password=' +
    encodeURIComponent(password) +
    '&grant_type=password';
  const res = await request(
    'POST',
    'http://localhost:8080/realms/edusphere/protocol/openid-connect/token',
    body,
    { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
  );
  const parsed = JSON.parse(res.body);
  return { ok: Boolean(parsed.access_token), error: parsed.error_description };
}

const tests = [
  ['super.admin@edusphere.dev', 'SuperAdmin123!', 'SUPER_ADMIN'],
  ['instructor@example.com', 'Instructor123!', 'INSTRUCTOR'],
  ['org.admin@example.com', 'OrgAdmin123!', 'ORG_ADMIN'],
  ['researcher@example.com', 'Researcher123!', 'RESEARCHER'],
  ['student@example.com', 'Student123!', 'STUDENT'],
];

console.log('\n══════════════════════════════════════════════════════');
console.log('  EduSphere — Keycloak User Login Verification');
console.log('══════════════════════════════════════════════════════');

for (const [user, pass, role] of tests) {
  const r = await tryLogin(user, pass);
  const icon = r.ok ? '✅' : '❌';
  const status = r.ok ? 'LOGIN OK' : `FAIL: ${r.error}`;
  console.log(`  ${icon} [${role}] ${user} | pass: ${pass} | ${status}`);
}
console.log('══════════════════════════════════════════════════════\n');
