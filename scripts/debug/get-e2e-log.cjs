const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';
const FULL_SHA = '5f7b272dab962e8b0557a989c4e64a0167c3f4e1';
const fs = require('fs');

function get(path, raw) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method: 'GET',
      headers: {
        'Authorization': 'token ' + TOKEN,
        'Accept': raw ? 'application/vnd.github.v3.raw' : 'application/vnd.github.v3+json',
        'User-Agent': 'EduSphere',
      },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      // Handle redirect
      if (res.statusCode === 302 || res.statusCode === 301) {
        const loc = res.headers.location;
        resolve({ redirect: loc });
        return;
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        if (raw) { resolve(body); return; }
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve(body); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function getUrl(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { 'User-Agent': 'EduSphere' },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
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

  console.log('E2E Job ID:', e2eJob.id, '| conclusion:', e2eJob.conclusion);
  const logResp = await get('/repos/TalWayn72/EduSphere/actions/jobs/' + e2eJob.id + '/logs');
  let logUrl;
  if (logResp && logResp.redirect) {
    logUrl = logResp.redirect;
  } else if (typeof logResp === 'string') {
    logUrl = logResp.trim();
  }
  if (!logUrl) { console.log('Could not get log URL'); return; }

  console.log('Fetching logs...');
  const logText = await getUrl(logUrl);
  // Show last 100 lines with failures
  const lines = logText.split('\n');
  const failLines = lines.filter(l => l.includes('failed') || l.includes('Error') || l.includes('FAIL') || l.includes('error:') || l.includes('✘') || l.includes('x '));
  console.log('\n=== FAILURE LINES (' + failLines.length + ') ===');
  failLines.slice(0, 50).forEach(l => console.log(l.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, '').slice(0, 200)));

  // Also save full log
  const outPath = 'scripts/ci_log_e2e_5f7.txt';
  fs.writeFileSync(outPath, logText.slice(-50000));
  console.log('\nFull log saved to', outPath, '(last 50KB)');
}
main().catch(console.error);
