const https = require('https');

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
  // Reopen PR #3
  const result = await apiCall('PATCH', '/repos/TalWayn72/EduSphere/pulls/3', {
    state: 'open'
  });
  if (result.number) {
    console.log('PR #' + result.number, result.state, result.title);
  } else {
    console.log('Response:', JSON.stringify(result).substring(0, 500));
  }
}
main().catch(console.error);
