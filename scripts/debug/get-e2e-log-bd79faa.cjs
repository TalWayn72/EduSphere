const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';
const FULL_SHA = 'bd79faaf482c065b3eaac3117dc0bc9a5eb26f63';
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
    const opts = { hostname: u.hostname, path: u.pathname + u.search, headers: { 'User-Agent': 'EduSphere' }, rejectUnauthorized: false };
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
  const runs = await get('/repos/TalWayn72/EduSphere/actions/runs?head_sha=' + FULL_SHA + '&per_page=20');
  const ciRun = (runs.workflow_runs || []).find(r => r.name === 'Continuous Integration');
  if (!ciRun) { console.log('CI run not found'); return; }

  const jobs = await get('/repos/TalWayn72/EduSphere/actions/runs/' + ciRun.id + '/jobs?per_page=50');
  const e2eJob = (jobs.jobs || []).find(j => j.name.includes('E2E'));
  if (!e2eJob) { console.log('E2E job not found'); return; }

  console.log('E2E:', e2eJob.conclusion, '| elapsed:', Math.round((new Date(e2eJob.completed_at) - new Date(e2eJob.started_at)) / 60000), 'min');

  const resp = await get('/repos/TalWayn72/EduSphere/actions/jobs/' + e2eJob.id + '/logs');
  const url = resp.redirect || (typeof resp === 'string' ? resp.trim() : null);
  if (!url) { console.log('No log URL'); return; }

  const log = await getUrl(url);
  fs.writeFileSync('scripts/ci_log_e2e_bd79.txt', log);

  // Find meaningful failure patterns
  const lines = log.split('\n');
  const summaryLines = lines.filter(l =>
    l.includes('passed') || l.includes('failed') || l.includes('skipped') ||
    l.includes('FAILED') || l.includes(' x ') || l.includes('Error:') ||
    (l.includes('●') && !l.includes('npm')) || l.includes('Tests:')
  );
  console.log('\n=== KEY SUMMARY LINES ===');
  summaryLines.slice(-60).forEach(l =>
    console.log(l.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, '').slice(0, 200))
  );
}
main().catch(console.error);
