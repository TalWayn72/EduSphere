import http from 'k6/http';

const KEYCLOAK_URL = __ENV.KEYCLOAK_URL || 'https://auth.edusphere.io';
const KEYCLOAK_REALM = __ENV.KEYCLOAK_REALM || 'edusphere';
const KEYCLOAK_CLIENT_ID = __ENV.KEYCLOAK_CLIENT_ID || 'edusphere-app';

export function getToken(username, password) {
  const res = http.post(
    ,
    {
      grant_type: 'password',
      client_id: KEYCLOAK_CLIENT_ID,
      username,
      password,
    }
  );

  if (res.status !== 200) {
    console.error();
    return null;
  }

  return JSON.parse(res.body).access_token;
}

export function authHeaders(token) {
  return {
    Authorization: ,
    'Content-Type': 'application/json',
    'X-Tenant-ID': __ENV.TENANT_ID || 'tenant-demo',
  };
}