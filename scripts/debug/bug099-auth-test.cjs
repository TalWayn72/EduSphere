const http = require('http');

function httpRequest(method, url, body, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    let bodyStr = null;
    if (
      body &&
      typeof body === 'object' &&
      headers['Content-Type'] === 'application/json'
    ) {
      bodyStr = JSON.stringify(body);
    } else if (body && typeof body === 'string') {
      bodyStr = body;
    }
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method,
      headers: { ...headers },
    };
    if (bodyStr) opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  // Get admin token
  const tokenRes = await httpRequest(
    'POST',
    'http://localhost:8080/realms/master/protocol/openid-connect/token',
    'grant_type=password&client_id=admin-cli&username=admin&password=admin',
    { 'Content-Type': 'application/x-www-form-urlencoded' }
  );
  const adminToken = JSON.parse(tokenRes.body).access_token;
  if (!adminToken) {
    console.log('FATAL: Cannot get admin token');
    process.exit(1);
  }
  console.log('Admin token acquired.\n');

  const users = [
    ['super.admin@edusphere.dev', 'SuperAdmin123!'],
    ['instructor@example.com', 'Instructor123!'],
    ['org.admin@example.com', 'OrgAdmin123!'],
    ['researcher@example.com', 'Researcher123!'],
    ['student@example.com', 'Student123!'],
  ];

  // Reset passwords
  console.log('--- Password Reset ---');
  for (const [username, password] of users) {
    const searchUrl =
      'http://localhost:8080/admin/realms/edusphere/users?username=' +
      encodeURIComponent(username) +
      '&exact=true';
    const uRes = await httpRequest('GET', searchUrl, null, {
      Authorization: 'Bearer ' + adminToken,
    });
    const userList = JSON.parse(uRes.body);
    const userId = userList[0] && userList[0].id;
    if (!userId) {
      console.log('  ' + username + ': NOT FOUND');
      continue;
    }

    const resetUrl =
      'http://localhost:8080/admin/realms/edusphere/users/' +
      userId +
      '/reset-password';
    const resetRes = await httpRequest(
      'PUT',
      resetUrl,
      { type: 'password', value: password, temporary: false },
      {
        Authorization: 'Bearer ' + adminToken,
        'Content-Type': 'application/json',
      }
    );
    console.log(
      '  ' +
        username +
        ': HTTP ' +
        resetRes.status +
        (resetRes.body ? ' ' + resetRes.body : ' OK')
    );
  }

  // Test authentication
  console.log('\n--- Authentication Test ---');
  let allPass = true;
  for (const [username, password] of users) {
    const authRes = await httpRequest(
      'POST',
      'http://localhost:8080/realms/edusphere/protocol/openid-connect/token',
      'grant_type=password&client_id=edusphere-web&username=' +
        encodeURIComponent(username) +
        '&password=' +
        encodeURIComponent(password),
      { 'Content-Type': 'application/x-www-form-urlencoded' }
    );
    const j = JSON.parse(authRes.body);
    const result = j.access_token
      ? 'PASS'
      : 'FAIL: ' + (j.error_description || j.error);
    if (!j.access_token) allPass = false;
    console.log('  ' + username + ': ' + result);
  }

  console.log('\n--- SUMMARY ---');
  console.log('5-User Auth: ' + (allPass ? 'ALL PASS' : 'SOME FAILED'));
}

main().catch(console.error);
