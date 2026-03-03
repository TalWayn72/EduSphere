'use strict';
const http = require('http');

function httpPost(path, body, contentType, token) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    const headers = { 'Content-Type': contentType || 'application/json', 'Content-Length': buf.length };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = http.request({ hostname: 'localhost', port: 8080, path, method: 'POST', headers }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ s: res.statusCode, b: d }));
    });
    req.on('error', reject); req.write(buf); req.end();
  });
}

function httpGet(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = http.request({ hostname: 'localhost', port: 8080, path, method: 'GET', headers }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ s: res.statusCode, b: d }));
    });
    req.on('error', reject); req.end();
  });
}

function httpPost4001(query, token) {
  const body = JSON.stringify({ query });
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const req = http.request({ hostname: 'localhost', port: 4001, path: '/graphql', method: 'POST', headers }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ s: res.statusCode, b: d }));
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

async function main() {
  console.log('=== Assigning Keycloak Realm Roles ===\n');

  // Get admin token
  const r1 = await httpPost('/realms/master/protocol/openid-connect/token',
    'client_id=admin-cli&username=admin&password=admin&grant_type=password',
    'application/x-www-form-urlencoded');
  const tok = JSON.parse(r1.b).access_token;
  if (!tok) { console.error('No admin token:', r1.b.slice(0, 200)); process.exit(1); }
  console.log('✅ Admin token OK');

  // Get realm roles
  const rolesR = await httpGet('/admin/realms/edusphere/roles', tok);
  const roles = JSON.parse(rolesR.b);
  const roleMap = {};
  roles.forEach(r => { roleMap[r.name] = r; });
  console.log('Available roles:', Object.keys(roleMap).join(', '));

  // Assign roles to users
  const assignments = [
    { userId: '00000000-0000-0000-0000-000000000001', role: 'SUPER_ADMIN' },
    { userId: '00000000-0000-0000-0000-000000000002', role: 'INSTRUCTOR' },
    { userId: '00000000-0000-0000-0000-000000000003', role: 'ORG_ADMIN' },
    { userId: '00000000-0000-0000-0000-000000000004', role: 'RESEARCHER' },
    { userId: '00000000-0000-0000-0000-000000000005', role: 'STUDENT' },
  ];

  for (const a of assignments) {
    const role = roleMap[a.role];
    if (!role) { console.log('❌ Role not found:', a.role); continue; }
    const r = await httpPost(
      '/admin/realms/edusphere/users/' + a.userId + '/role-mappings/realm',
      [{ id: role.id, name: role.name }],
      'application/json',
      tok
    );
    console.log(r.s === 204 ? '✅' : ('❌ HTTP ' + r.s + ' '), a.userId.slice(-4), '->', a.role);
  }

  console.log('\n=== Testing login + JWT + ME query ===\n');

  const testUsers = [
    { email: 'super.admin@edusphere.dev', password: 'SuperAdmin123!', expectedRole: 'SUPER_ADMIN' },
    { email: 'instructor@example.com',    password: 'Instructor123!', expectedRole: 'INSTRUCTOR'  },
  ];

  for (const u of testUsers) {
    const loginBody = 'client_id=edusphere-web&username=' + encodeURIComponent(u.email) +
      '&password=' + encodeURIComponent(u.password) + '&grant_type=password';
    const lr = await httpPost('/realms/edusphere/protocol/openid-connect/token', loginBody, 'application/x-www-form-urlencoded');
    const ldata = JSON.parse(lr.b);
    if (!ldata.access_token) {
      console.log('❌', u.email, 'login FAILED:', lr.b.slice(0, 150));
      continue;
    }
    const payload = JSON.parse(Buffer.from(ldata.access_token.split('.')[1], 'base64url').toString());
    const roles = payload.realm_access && payload.realm_access.roles ? payload.realm_access.roles : [];
    const hasRole = roles.includes(u.expectedRole);
    console.log(hasRole ? '✅' : '❌', u.email, '| roles:', roles.join(','), '| tenant_id:', payload.tenant_id);

    // Test ME query
    const meR = await httpPost4001('{ me { id email role } }', ldata.access_token);
    const meData = JSON.parse(meR.b);
    if (meData.data && meData.data.me) {
      console.log('  ✅ ME query OK:', meData.data.me.email, '| role:', meData.data.me.role);
    } else {
      console.log('  ❌ ME null:', JSON.stringify(meData.errors));
    }
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
