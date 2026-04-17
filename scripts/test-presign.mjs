// Step 1: Get token from Keycloak
const tokenResp = await fetch(
  'http://localhost:8080/realms/edusphere/protocol/openid-connect/token',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=password&client_id=edusphere-web&username=instructor@example.com&password=Instructor123!',
  }
);
const tokenData = await tokenResp.json();
const token = tokenData.access_token;
console.log('Token length:', token.length);

const resp = await fetch('http://localhost:4000/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    query: `query { getPresignedUploadUrl(fileName: "test.pdf", contentType: "application/pdf", courseId: "draft") { uploadUrl fileKey expiresAt } }`,
  }),
});

const data = await resp.json();
console.log('Response:', JSON.stringify(data, null, 2));
