'use strict';
/**
 * Fix Keycloak user UUIDs to match DB seed (00000000-...001-005).
 * Steps:
 *  1. Get admin token
 *  2. Delete old users (daa00e8d-... etc.)
 *  3. Partial-import users with correct 00000000-... IDs
 *  4. Set passwords via reset-credentials
 */

const http = require('http');

const KC_BASE = 'http://localhost:8080';
const REALM = 'edusphere';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

const DESIRED_USERS = [
  { id: '00000000-0000-0000-0000-000000000001', username: 'super.admin@edusphere.dev',  email: 'super.admin@edusphere.dev',  firstName: 'Super', lastName: 'Admin',      password: 'SuperAdmin123!',  role: 'SUPER_ADMIN' },
  { id: '00000000-0000-0000-0000-000000000002', username: 'instructor@example.com',     email: 'instructor@example.com',     firstName: 'Demo',  lastName: 'Instructor', password: 'Instructor123!', role: 'INSTRUCTOR'  },
  { id: '00000000-0000-0000-0000-000000000003', username: 'org.admin@example.com',      email: 'org.admin@example.com',      firstName: 'Demo',  lastName: 'Org Admin',  password: 'OrgAdmin123!',   role: 'ORG_ADMIN'   },
  { id: '00000000-0000-0000-0000-000000000004', username: 'researcher@example.com',     email: 'researcher@example.com',     firstName: 'Demo',  lastName: 'Researcher', password: 'Researcher123!', role: 'RESEARCHER'  },
  { id: '00000000-0000-0000-0000-000000000005', username: 'student@example.com',        email: 'student@example.com',        firstName: 'Demo',  lastName: 'Student',    password: 'Student123!',    role: 'STUDENT'     },
];

function httpReq(method, path, body, token, contentType) {
  return new Promise((resolve, reject) => {
    const bodyBuf = body ? Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (bodyBuf) {
      headers['Content-Type'] = contentType || 'application/json';
      headers['Content-Length'] = bodyBuf.length;
    }
    const req = http.request({ hostname: 'localhost', port: 8080, path, method, headers }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

async function getAdminToken() {
  const body = `client_id=admin-cli&username=${ADMIN_USER}&password=${encodeURIComponent(ADMIN_PASS)}&grant_type=password`;
  const r = await httpReq('POST', '/realms/master/protocol/openid-connect/token', body, null, 'application/x-www-form-urlencoded');
  const data = JSON.parse(r.body);
  if (!data.access_token) throw new Error('Admin token failed: ' + r.body.slice(0, 200));
  return data.access_token;
}

async function listUsers(token) {
  const r = await httpReq('GET', `/admin/realms/${REALM}/users?max=20`, null, token);
  return JSON.parse(r.body);
}

async function deleteUser(token, userId) {
  const r = await httpReq('DELETE', `/admin/realms/${REALM}/users/${userId}`, null, token);
  return r.status;
}

async function partialImport(token, users) {
  const payload = {
    ifResourceExists: 'SKIP',
    users: users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      enabled: true,
      emailVerified: true,
      attributes: { tenant_id: ['00000000-0000-0000-0000-000000000000'] },
      credentials: [{
        type: 'password',
        value: u.password,
        temporary: false,
      }],
    })),
  };
  const r = await httpReq('POST', `/admin/realms/${REALM}/partialImport`, payload, token);
  return { status: r.status, body: r.body };
}

async function getRoles(token) {
  const r = await httpReq('GET', `/admin/realms/${REALM}/roles`, null, token);
  return JSON.parse(r.body);
}

async function getUserRoles(token, userId) {
  const r = await httpReq('GET', `/admin/realms/${REALM}/users/${userId}/role-mappings/realm`, null, token);
  return JSON.parse(r.body);
}

async function addRolesToUser(token, userId, roles) {
  const r = await httpReq('POST', `/admin/realms/${REALM}/users/${userId}/role-mappings/realm`, roles, token);
  return r.status;
}

async function setNotBefore(token, userId) {
  // Clear not-before to ensure tokens are valid immediately
  const r = await httpReq('PUT', `/admin/realms/${REALM}/users/${userId}`, { notBefore: 0 }, token);
  return r.status;
}

async function main() {
  console.log('=== Fixing Keycloak User UUIDs ===\n');

  const token = await getAdminToken();
  console.log('✅ Admin token obtained');

  // Step 1: List current users
  const existingUsers = await listUsers(token);
  console.log('\nCurrent Keycloak users:');
  existingUsers.forEach(u => console.log(`  ${u.id} | ${u.email}`));

  // Step 2: Delete old users (those with wrong IDs)
  const correctIds = new Set(DESIRED_USERS.map(u => u.id));
  const toDelete = existingUsers.filter(u => !correctIds.has(u.id));

  if (toDelete.length > 0) {
    console.log('\nDeleting users with wrong IDs...');
    for (const u of toDelete) {
      const status = await deleteUser(token, u.id);
      console.log(`  DELETE ${u.email} (${u.id}) → HTTP ${status}`);
    }
  } else {
    console.log('\nNo users to delete (all have correct IDs)');
  }

  // Step 3: Partial import users with correct IDs
  // Only import users that don't already exist with correct IDs
  const existingCorrectIds = new Set(existingUsers.filter(u => correctIds.has(u.id)).map(u => u.id));
  const toImport = DESIRED_USERS.filter(u => !existingCorrectIds.has(u.id));

  if (toImport.length > 0) {
    console.log(`\nPartial importing ${toImport.length} users with correct UUIDs...`);
    const result = await partialImport(token, toImport);
    console.log(`  partialImport → HTTP ${result.status}: ${result.body.slice(0, 200)}`);
  } else {
    console.log('\nAll users already have correct IDs');
  }

  // Step 4: Verify final state
  // Re-get admin token (might expire)
  const token2 = await getAdminToken();
  const finalUsers = await listUsers(token2);
  console.log('\nFinal Keycloak users:');
  finalUsers.forEach(u => {
    const expected = DESIRED_USERS.find(d => d.email === u.email);
    const idOk = expected && u.id === expected.id;
    console.log(`  ${idOk ? '✅' : '❌'} ${u.id} | ${u.email}`);
  });

  // Step 5: Test login for each user
  console.log('\nTesting user logins...');
  for (const u of DESIRED_USERS) {
    const body = `client_id=edusphere-web&username=${encodeURIComponent(u.email)}&password=${encodeURIComponent(u.password)}&grant_type=password`;
    const r = await httpReq('POST', `/realms/${REALM}/protocol/openid-connect/token`, body, null, 'application/x-www-form-urlencoded');
    const data = JSON.parse(r.body);
    if (data.access_token) {
      const payload = JSON.parse(Buffer.from(data.access_token.split('.')[1], 'base64').toString());
      const subOk = payload.sub === u.id;
      console.log(`  ${subOk ? '✅' : '❌'} ${u.email} | sub=${payload.sub} | tenant_id=${payload.tenant_id}`);
    } else {
      console.log(`  ❌ ${u.email} login FAILED: ${r.body.slice(0, 150)}`);
    }
  }

  console.log('\n=== Done ===');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
