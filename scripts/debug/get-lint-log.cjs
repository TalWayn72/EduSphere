const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';
const fs = require('fs');

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com', path, method: 'GET',
      headers: { 'Authorization': 'token ' + TOKEN, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'EduSphere' },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) { resolve({ redirect: res.headers.location }); return; }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => { const body = Buffer.concat(chunks).toString(); try { resolve(JSON.parse(body)); } catch { resolve(body); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function getUrl(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, path: u.pathname + u.search, method: 'GET', headers: { 'User-Agent': 'EduSphere' }, rejectUnauthorized: false };
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const commits = await get('/repos/TalWayn72/EduSphere/commits/master');
  const sha = commits.sha;
  const data = await get('/repos/TalWayn72/EduSphere/commits/' + sha + '/check-runs?per_page=100');
  const lintRun = (data.check_runs || []).find(r => r.name === 'Lint (ESLint + Prettier)');
  if (!lintRun) { console.log('Lint run not found'); return; }

  const resp = await get('/repos/TalWayn72/EduSphere/actions/jobs/' + lintRun.id + '/logs');
  const url = resp.redirect || (typeof resp === 'string' ? resp.trim() : null);
  if (!url) { console.log('No log URL'); return; }

  const log = await getUrl(url);
  fs.writeFileSync('scripts/ci_log_lint_c61a.txt', log);

  // Find prettier/error lines
  const lines = log.split('\n');
  const tail = lines.slice(-200);
  console.log('=== LAST 200 LINES OF LINT LOG ===');
  tail.forEach(l => {
    const clean = l.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, '').slice(0, 200);
    if (clean.trim()) console.log(clean);
  });
}
main().catch(console.error);
