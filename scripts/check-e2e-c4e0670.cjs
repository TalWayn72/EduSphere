const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com', path, method: 'GET',
      headers: { 'Authorization': 'token ' + TOKEN, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'EduSphere' },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      if (res.statusCode === 302) { resolve({ redirect: res.headers.location }); return; }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch { resolve({}); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const commits = await get('/repos/TalWayn72/EduSphere/commits/master');
  const sha = commits.sha;
  const runs = await get('/repos/TalWayn72/EduSphere/actions/runs?head_sha=' + sha + '&per_page=20');
  const ciRun = (runs.workflow_runs || []).find(r => r.name === 'Continuous Integration');
  if (!ciRun) { console.log('CI run not found'); return; }
  console.log('CI:', ciRun.status, '|', ciRun.conclusion || 'running');

  const jobs = await get('/repos/TalWayn72/EduSphere/actions/runs/' + ciRun.id + '/jobs?per_page=50');
  const e2eJob = (jobs.jobs || []).find(j => j.name.includes('E2E'));
  if (!e2eJob) { console.log('E2E job not found'); return; }

  const started = e2eJob.started_at ? new Date(e2eJob.started_at) : null;
  const endTime = e2eJob.completed_at ? new Date(e2eJob.completed_at) : new Date();
  const elapsed = started ? Math.round((endTime.getTime() - started.getTime()) / 60000) : 0;
  console.log('E2E:', e2eJob.status, '|', e2eJob.conclusion || 'running', '| elapsed:', elapsed, 'min');
}
main().catch(console.error);
