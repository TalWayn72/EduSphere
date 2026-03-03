const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function apiCall(path) {
  return new Promise((res, rej) => {
    const opts = {
      hostname: 'api.github.com',
      path,
      headers: {
        'User-Agent': 'EduSphere-CI-Check',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + TOKEN
      },
      rejectUnauthorized: false
    };
    const req = https.get(opts, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { res(JSON.parse(d)); } catch(e) { res({ error: d.slice(0,200) }); } });
    });
    req.on('error', rej);
  });
}

async function main() {
  // Find Full Test Suite run for e7f612b
  const data = await apiCall('/repos/TalWayn72/EduSphere/actions/runs?branch=master&per_page=30');
  const e7f = data.workflow_runs.find(r => r.head_sha.startsWith('e7f612b') && r.name === 'Full Test Suite');
  if (!e7f) { console.log('No Full Test Suite run for e7f612b found'); return; }

  console.log('Found Full Test Suite for e7f612b: run id=' + e7f.id + ' conclusion=' + e7f.conclusion);

  const jobs = await apiCall('/repos/TalWayn72/EduSphere/actions/runs/' + e7f.id + '/jobs?per_page=50');
  if (!jobs.jobs) { console.log('ERROR:', JSON.stringify(jobs).slice(0,300)); return; }

  jobs.jobs.forEach(j => {
    const icon = j.conclusion === 'success' ? 'OK  ' : j.conclusion === 'failure' ? 'FAIL' : j.conclusion === 'skipped' ? 'SKIP' : (j.conclusion || j.status || '?').slice(0,4);
    console.log(icon + ' ' + j.name);
    if (j.conclusion === 'failure') {
      j.steps && j.steps.filter(s => s.conclusion === 'failure').forEach(s => {
        console.log('       FAIL STEP: ' + s.name);
      });
    }
  });
}
main().catch(console.error);
