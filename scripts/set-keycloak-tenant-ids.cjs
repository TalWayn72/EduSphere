/**
 * Sets tenant_id attribute on all 5 Keycloak users.
 * Run with: node scripts/set-keycloak-tenant-ids.cjs
 *
 * ROOT CAUSE FIX: Keycloak users were missing tenant_id attribute.
 * Without it, the JWT has no tenant_id claim even with the protocol mapper configured.
 * All tenant-scoped mutations (addFileSource, createCourse, etc.) fail with Unauthorized.
 */
const http = require('http');

function request(method, urlStr, body, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = http.request(
      { hostname: url.hostname, port: url.port || 80, path: url.pathname + url.search, method, headers },
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

async function main() {
  // Step 1: Get Keycloak admin token
  const tokenBody = 'client_id=admin-cli&username=admin&password=admin&grant_type=password';
  const tokenRes = await request(
    'POST',
    'http://localhost:8080/realms/master/protocol/openid-connect/token',
    tokenBody,
    { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(tokenBody) }
  );
  const parsed = JSON.parse(tokenRes.body);
  const token = parsed.access_token;
  if (!token) {
    console.error('Failed to get admin token:', tokenRes.body.slice(0, 200));
    process.exit(1);
  }
  console.log('Admin token obtained.');

  // Step 2: Update each user's tenant_id attribute
  const users = [
    { id: '909e98a3-d6c4-407c-a4ab-59a978820f07', email: 'super.admin@edusphere.dev', tenantId: '00000000-0000-0000-0000-000000000000' },
    { id: 'daa00e8d-0b90-4990-ab36-e9dccbf855a5', email: 'instructor@example.com',    tenantId: '11111111-1111-1111-1111-111111111111' },
    { id: 'a5e38677-6147-4e6c-a7f0-97370c4161c6', email: 'org.admin@example.com',     tenantId: '11111111-1111-1111-1111-111111111111' },
    { id: '092417f4-5c50-4274-b640-f56b2aebdefd', email: 'researcher@example.com',    tenantId: '11111111-1111-1111-1111-111111111111' },
    { id: '5c849df5-a025-4c65-9fa4-d282ced233b4', email: 'student@example.com',       tenantId: '11111111-1111-1111-1111-111111111111' },
  ];

  console.log('\n Setting tenant_id on Keycloak users...\n');
  let allOk = true;
  for (const u of users) {
    const payload = JSON.stringify({ attributes: { tenant_id: [u.tenantId] } });
    const res = await request(
      'PUT',
      'http://localhost:8080/admin/realms/edusphere/users/' + u.id,
      payload,
      {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      }
    );
    if (res.status === 204) {
      console.log('OK ' + u.email + ' -> tenant_id=' + u.tenantId);
    } else {
      console.error('FAIL ' + u.email + ' HTTP ' + res.status + ' ' + res.body.slice(0, 200));
      allOk = false;
    }
  }

  // Step 3: Verify — get a token for super.admin and decode tenant_id
  console.log('\n Verifying super.admin JWT now includes tenant_id...');
  const verifyBody =
    'client_id=edusphere-web&username=super.admin@edusphere.dev&password=SuperAdmin123' +
    '%21&grant_type=password';
  const verifyRes = await request(
    'POST',
    'http://localhost:8080/realms/edusphere/protocol/openid-connect/token',
    verifyBody,
    { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(verifyBody) }
  );
  const verifyParsed = JSON.parse(verifyRes.body);
  if (verifyParsed.access_token) {
    const parts = verifyParsed.access_token.split('.');
    const claims = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const hasTenant = Boolean(claims.tenant_id);
    console.log(
      (hasTenant ? 'JWT tenant_id=' + claims.tenant_id : 'JWT still missing tenant_id!') +
        ' (sub=' + claims.sub + ')'
    );
    if (!hasTenant) allOk = false;
  } else {
    console.error('Could not get super.admin JWT for verification:', verifyParsed.error_description);
    allOk = false;
  }

  if (allOk) {
    console.log('\n All Keycloak users updated successfully with tenant_id attribute.');
  } else {
    console.error('\n Some updates failed. Check errors above.');
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
