const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';
const FULL_SHA = 'bd79faaf482c065b3eaac3117dc0bc9a5eb26f63';

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

async function main() {
  const runs = await get('/repos/TalWayn72/EduSphere/actions/runs?head_sha=' + FULL_SHA + '&per_page=20');
  const allRuns = runs.workflow_runs || [];
  const ciRun = allRuns.find(r => r.name === 'Continuous Integration');
  if (!ciRun) { console.log('CI run not found'); return; }
  console.log('CI:', ciRun.name, '|', ciRun.status, '|', ciRun.conclusion || 'running');

  const jobs = await get('/repos/TalWayn72/EduSphere/actions/runs/' + ciRun.id + '/jobs?per_page=50');
  const e2eJob = (jobs.jobs || []).find(j => j.name.includes('E2E'));
  if (!e2eJob) { console.log('E2E job not found'); return; }

  const started = e2eJob.started_at ? new Date(e2eJob.started_at) : null;
  const endTime = e2eJob.completed_at ? new Date(e2eJob.completed_at) : new Date();
  const elapsed = started ? Math.round((endTime.getTime() - started.getTime()) / 60000) : 0;
  console.log('E2E:', e2eJob.status, '|', e2eJob.conclusion || 'running', '| elapsed:', elapsed, 'min');
  if (e2eJob.status === 'completed') {
    console.log('Steps:');
    (e2eJob.steps || []).forEach(s => {
      const icon = s.conclusion === 'success' ? 'PASS' : s.conclusion === 'failure' ? 'FAIL' : s.conclusion === 'cancelled' ? 'CANCEL' : s.conclusion === 'skipped' ? 'SKIP' : s.status === 'in_progress' ? 'RUNNING' : '...';
      console.log(' ', icon, s.name, '|', s.conclusion || s.status);
    });
  }
}
main().catch(console.error);
