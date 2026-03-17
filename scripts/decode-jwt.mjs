// Get a JWT from Keycloak and decode it to check for tenant_id
async function main() {
  const tokenResp = await fetch('http://localhost:8080/realms/edusphere/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=password&client_id=edusphere-web&username=instructor@example.com&password=Instructor123!',
  });
  const tokenData = await tokenResp.json();
  if (!tokenData.access_token) {
    console.log('Failed to get token:', tokenData);
    return;
  }

  // Decode JWT payload (base64url)
  const parts = tokenData.access_token.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

  console.log('=== JWT Claims ===');
  console.log('sub:', payload.sub);
  console.log('email:', payload.email);
  console.log('preferred_username:', payload.preferred_username);
  console.log('realm_access.roles:', payload.realm_access?.roles);
  console.log('tenant_id:', payload.tenant_id);
  console.log('iss:', payload.iss);
  console.log('aud:', payload.aud);
  console.log('');
  console.log('Has tenant_id?', 'tenant_id' in payload ? 'YES' : 'NO ❌');

  if (!payload.tenant_id) {
    console.log('\n⚠️  WARNING: JWT has NO tenant_id claim!');
    console.log('This means the content subgraph resolver will throw:');
    console.log('  "Tenant context missing" → frontend shows "כשל בקבלת כתובת להעלאה"');
    console.log('\nRoot cause: Keycloak needs a protocol mapper to add tenant_id to the JWT.');
  }
}

main().catch(e => console.error(e));
