#!/usr/bin/env node
/**
 * reset-keycloak-passwords.cjs
 * Resets Keycloak user passwords via Admin REST API.
 * Run: node scripts/reset-keycloak-passwords.cjs
 */
const http = require('http');

const KC_HOST = 'localhost';
const KC_PORT = 8080;

const USERS = [
  { id: 'daa00e8d-0b90-4990-ab36-e9dccbf855a5', email: 'instructor@example.com',      password: 'Instructor123!' },
  { id: 'a5e38677-6147-4e6c-a7f0-97370c4161c6', email: 'org.admin@example.com',       password: 'OrgAdmin123!'   },
  { id: '092417f4-5c50-4274-b640-f56b2aebdefd', email: 'researcher@example.com',     password: 'Researcher123!' },
  { id: '5c849df5-a025-4c65-9fa4-d282ced233b4', email: 'student@example.com',        password: 'Student123!'    },
  { id: '909e98a3-d6c4-407c-a4ab-59a978820f07', email: 'super.admin@edusphere.dev',  password: 'SuperAdmin123!' },
];

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: KC_HOST, port: KC_PORT, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // 1. Get admin token
  const tokenBody = 'client_id=admin-cli&username=admin&password=admin&grant_type=password';
  const tokenRes = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: KC_HOST, port: KC_PORT,
      path: '/realms/master/protocol/openid-connect/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(tokenBody) },
    }, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    req.on('error', reject);
    req.write(tokenBody);
    req.end();
  });

  const token = JSON.parse(tokenRes.body).access_token;
  if (!token) throw new Error('Failed to get admin token: ' + tokenRes.body);
  console.log('✅ Admin token obtained');

  // 2. Reset passwords
  for (const user of USERS) {
    const res = await request(
      'PUT',
      `/admin/realms/edusphere/users/${user.id}/reset-password`,
      { type: 'password', value: user.password, temporary: false },
      token
    );
    if (res.status === 204) {
      console.log(`✅ ${user.email} → password reset OK`);
    } else {
      console.log(`❌ ${user.email} → HTTP ${res.status}: ${res.body}`);
    }
  }

  // 3. Also clear notBefore for instructor (was set to a future value)
  const instructorId = 'daa00e8d-0b90-4990-ab36-e9dccbf855a5';
  const clearRes = await request(
    'PUT',
    `/admin/realms/edusphere/users/${instructorId}`,
    { notBefore: 0 },
    token
  );
  console.log(`${clearRes.status === 204 ? '✅' : '❌'} instructor notBefore cleared → HTTP ${clearRes.status}`);

  console.log('\nDone. Try logging in with the new passwords.');
}

main().catch(err => { console.error(err); process.exit(1); });
