const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';
const fs = require('fs');

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method: 'GET',
      headers: {
        'Authorization': 'token ' + TOKEN,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'EduSphere',
      },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        resolve({ redirect: res.headers.location });
        return;
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        try { resolve(JSON.parse(body)); } catch { resolve(body); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function getUrl(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { 'User-Agent': 'EduSphere' },
      rejectUnauthorized: false,
    };
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on('error', reject);
    req.end();
  });
}

async function getJobLog(jobId, label) {
  const resp = await get('/repos/TalWayn72/EduSphere/actions/jobs/' + jobId + '/logs');
  let url = resp.redirect || (typeof resp === 'string' ? resp.trim() : null);
  if (!url) { console.log('No log URL for', label); return; }
  const log = await getUrl(url);
  const lines = log.split('\n');
  const errLines = lines.filter(l =>
    l.includes('error') || l.includes('Error') || l.includes('FAIL') ||
    l.includes('warning') || l.includes('prettier') || l.includes('eslint') ||
    l.includes('failed') || l.includes('Cannot') || l.includes('Module')
  );
  console.log('\n=== LOG:', label, '(' + errLines.length + ' relevant lines) ===');
  errLines.slice(0, 40).forEach(l => console.log(l.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, '').slice(0, 200)));
}

async function main() {
  const commits = await get('/repos/TalWayn72/EduSphere/commits/master');
  const sha = commits.sha;

  const data = await get('/repos/TalWayn72/EduSphere/commits/' + sha + '/check-runs?per_page=100');
  const failedRuns = (data.check_runs || []).filter(r => r.conclusion === 'failure');

  console.log('Failed runs:', failedRuns.map(r => r.name).join(', '));

  for (const run of failedRuns) {
    await getJobLog(run.id, run.name);
  }
}
main().catch(console.error);
