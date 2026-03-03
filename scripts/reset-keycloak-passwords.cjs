#!/usr/bin/env node
/**
 * reset-keycloak-passwords.cjs
 * Idempotent Keycloak bootstrap: fixes user UUIDs, assigns realm roles, resets passwords.
 * Safe to run on every startup — all operations are idempotent.
 * Run: node scripts/reset-keycloak-passwords.cjs
 */
'use strict';
const http = require('http');

const KC_HOST = 'localhost';
const KC_PORT = 8080;
const REALM = 'edusphere';

// USERS must stay in sync with:
//   - infrastructure/docker/keycloak-realm.json (user IDs)
//   - packages/db/src/seed.ts (user IDs + emails)
const USERS = [
  { id: '00000000-0000-0000-0000-000000000001', email: 'super.admin@edusphere.dev',  password: 'SuperAdmin123!',  role: 'SUPER_ADMIN', firstName: 'Super', lastName: 'Admin'      },
  { id: '00000000-0000-0000-0000-000000000002', email: 'instructor@example.com',     password: 'Instructor123!', role: 'INSTRUCTOR',  firstName: 'Demo',  lastName: 'Instructor'  },
  { id: '00000000-0000-0000-0000-000000000003', email: 'org.admin@example.com',      password: 'OrgAdmin123!',   role: 'ORG_ADMIN',   firstName: 'Demo',  lastName: 'Org Admin'   },
  { id: '00000000-0000-0000-0000-000000000004', email: 'researcher@example.com',     password: 'Researcher123!', role: 'RESEARCHER',  firstName: 'Demo',  lastName: 'Researcher'  },
  { id: '00000000-0000-0000-0000-000000000005', email: 'student@example.com',        password: 'Student123!',    role: 'STUDENT',     firstName: 'Demo',  lastName: 'Student'     },
];

function httpReq(method, path, body, token, contentType) {
  return new Promise((resolve, reject) => {
    const buf = body ? Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const headers = { 'Content-Type': contentType || 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (buf) headers['Content-Length'] = buf.length;
    const req = http.request({ hostname: KC_HOST, port: KC_PORT, path, method, headers }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    if (buf) req.write(buf);
    req.end();
  });
}

async function getAdminToken() {
  const body = 'client_id=admin-cli&username=admin&password=admin&grant_type=password';
  const r = await httpReq('POST', '/realms/master/protocol/openid-connect/token', body, null, 'application/x-www-form-urlencoded');
  const token = JSON.parse(r.body).access_token;
  if (!token) throw new Error('Admin token failed: ' + r.body.slice(0, 200));
  return token;
}

async function main() {
  console.log('[keycloak-setup] Starting idempotent Keycloak user bootstrap...');

  const token = await getAdminToken();
  console.log('[keycloak-setup] ✅ Admin token obtained');

  // ── Step 1: List current users ─────────────────────────────────────────────
  const r1 = await httpReq('GET', `/admin/realms/${REALM}/users?max=20`, null, token);
  const existing = JSON.parse(r1.body);
  if (!Array.isArray(existing)) {
    throw new Error('Failed to list users: ' + r1.body.slice(0, 200));
  }

  const correctIds = new Set(USERS.map(u => u.id));
  const existingByEmail = {};
  existing.forEach(u => { existingByEmail[u.email] = u; });

  // ── Step 2: Delete users with wrong IDs ────────────────────────────────────
  const toDelete = existing.filter(u => !correctIds.has(u.id) && USERS.some(d => d.email === u.email));
  for (const u of toDelete) {
    const r = await httpReq('DELETE', `/admin/realms/${REALM}/users/${u.id}`, null, token);
    console.log('[keycloak-setup]', r.status === 204 ? '✅' : '❌',
      'Deleted wrong-UUID user:', u.email, '(' + u.id + ') → HTTP', r.status);
  }

  // ── Step 3: Partial-import users with correct IDs (skip if already correct) ─
  const existingCorrectIds = new Set(existing.filter(u => correctIds.has(u.id)).map(u => u.id));
  // After deletions, re-check by fetching again only if needed
  const alreadyDeleted = new Set(toDelete.map(u => u.id));
  const toImport = USERS.filter(u => {
    // Import if: didn't exist with correct ID before, AND wasn't present with correct ID
    const hadCorrectId = existingCorrectIds.has(u.id) && !alreadyDeleted.has(u.id);
    return !hadCorrectId;
  });

  if (toImport.length > 0) {
    const payload = {
      ifResourceExists: 'SKIP',
      users: toImport.map(u => ({
        id: u.id,
        username: u.email,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        enabled: true,
        emailVerified: true,
        attributes: { tenant_id: ['00000000-0000-0000-0000-000000000000'] },
        credentials: [{ type: 'password', value: u.password, temporary: false }],
      })),
    };
    const r = await httpReq('POST', `/admin/realms/${REALM}/partialImport`, payload, token);
    try {
      const result = JSON.parse(r.body);
      console.log('[keycloak-setup] ✅ Partial import: added=' + result.added + ' skipped=' + result.skipped);
    } catch (e) {
      console.log('[keycloak-setup] partialImport HTTP', r.status, r.body.slice(0, 200));
    }
  } else {
    console.log('[keycloak-setup] ✅ All users already have correct UUIDs');
  }

  // ── Step 4: Get realm roles ────────────────────────────────────────────────
  const r2 = await httpReq('GET', `/admin/realms/${REALM}/roles`, null, token);
  const roles = JSON.parse(r2.body);
  const roleMap = {};
  roles.forEach(r => { roleMap[r.name] = r; });

  // ── Step 5: Assign realm roles (idempotent) ────────────────────────────────
  for (const u of USERS) {
    const role = roleMap[u.role];
    if (!role) { console.log('[keycloak-setup] ❌ Role not found:', u.role); continue; }
    const r = await httpReq('POST',
      `/admin/realms/${REALM}/users/${u.id}/role-mappings/realm`,
      [{ id: role.id, name: role.name }], token);
    // 204 = assigned, 409 = already assigned (both OK)
    if (r.status === 204 || r.status === 409) {
      console.log('[keycloak-setup] ✅', u.email.split('@')[0], '->', u.role);
    } else {
      console.log('[keycloak-setup] ❌ Role assign failed:', u.email, 'HTTP', r.status, r.body.slice(0, 100));
    }
  }

  // ── Step 6: Reset passwords ───────────────────────────────────────────────
  for (const u of USERS) {
    const r = await httpReq('PUT',
      `/admin/realms/${REALM}/users/${u.id}/reset-password`,
      { type: 'password', value: u.password, temporary: false }, token);
    if (r.status === 204) {
      console.log('[keycloak-setup] ✅', u.email.split('@')[0], 'password reset OK');
    } else {
      console.log('[keycloak-setup] ❌', u.email, 'password reset HTTP', r.status, r.body.slice(0, 100));
    }
  }

  // ── Step 7: Clear notBefore on all users ──────────────────────────────────
  for (const u of USERS) {
    await httpReq('PUT', `/admin/realms/${REALM}/users/${u.id}`, { notBefore: 0 }, token);
  }

  console.log('[keycloak-setup] ✅ Keycloak bootstrap complete');
}

main().catch(err => { console.error('[keycloak-setup] FATAL:', err.message); process.exit(1); });
