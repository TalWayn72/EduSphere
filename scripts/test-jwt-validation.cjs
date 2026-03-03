'use strict';
/**
 * Test JWT validation from inside the container context
 * Run with: node scripts/test-jwt-validation.cjs
 */
const http = require('http');

async function main() {
  // 1. Get fresh instructor token
  const loginBody = 'client_id=edusphere-web&username=instructor%40example.com&password=Instructor123%21&grant_type=password';
  const token = await new Promise((res, rej) => {
    const buf = Buffer.from(loginBody);
    const req = http.request({ hostname: 'localhost', port: 8080, path: '/realms/edusphere/protocol/openid-connect/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': buf.length } }, resp => {
      let d = ''; resp.on('data', c => d += c); resp.on('end', () => {
        const data = JSON.parse(d);
        if (data.access_token) res(data.access_token);
        else rej(new Error('No token: ' + d.slice(0, 200)));
      });
    });
    req.on('error', rej); req.write(buf); req.end();
  });

  console.log('Got token, length:', token.length);

  // 2. Decode payload manually
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  console.log('Payload keys:', Object.keys(payload).join(', '));
  console.log('sub:', payload.sub);
  console.log('realm_access:', JSON.stringify(payload.realm_access));
  console.log('tenant_id:', payload.tenant_id);

  // 3. Send to subgraph-core with a custom header to see if it's actually a JWKS fetch issue
  const gqlBody = JSON.stringify({ query: '{ me { id email role } }' });
  const gqlBuf = Buffer.from(gqlBody);
  const result = await new Promise((res, rej) => {
    const req = http.request({ hostname: 'localhost', port: 4001, path: '/graphql', method: 'POST', headers: {
      'Content-Type': 'application/json',
      'Content-Length': gqlBuf.length,
      'Authorization': 'Bearer ' + token
    }}, resp => {
      let d = ''; resp.on('data', c => d += c); resp.on('end', () => res(d));
    });
    req.on('error', rej); req.write(gqlBuf); req.end();
  });
  console.log('\nME result:', result);

  // 4. Also test dev-token bypass
  const devResult = await new Promise((res, rej) => {
    const req = http.request({ hostname: 'localhost', port: 4001, path: '/graphql', method: 'POST', headers: {
      'Content-Type': 'application/json',
      'Content-Length': gqlBuf.length,
      'Authorization': 'Bearer dev-token-mock-jwt'
    }}, resp => {
      let d = ''; resp.on('data', c => d += c); resp.on('end', () => res(d));
    });
    req.on('error', rej); req.write(gqlBuf); req.end();
  });
  console.log('\nDEV TOKEN result:', devResult);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
