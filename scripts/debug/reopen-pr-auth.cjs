const https = require('https');

const TOKEN = process.env.GITHUB_TOKEN || '';

function apiCall(method, path, body) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'User-Agent': 'EduSphere',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      }
    }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { res(JSON.parse(d)); } catch(e) { res(d); }
      });
    });
    req.on('error', rej);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const action = process.argv[2] || 'reopen';

  if (action === 'reopen') {
    const result = await apiCall('PATCH', '/repos/TalWayn72/EduSphere/pulls/3', {
      state: 'open'
    });
    if (result.number) {
      console.log('PR #' + result.number, result.state, result.title);
    } else {
      console.log('Response:', JSON.stringify(result).substring(0, 500));
    }
  } else if (action === 'status') {
    const result = await apiCall('GET', '/repos/TalWayn72/EduSphere/pulls/3', null);
    console.log('PR #' + result.number, result.state, result.title, result.head.sha.substring(0,8));
  }
}
main().catch(console.error);
