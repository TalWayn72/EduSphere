const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';
const FULL_SHA = '5f7b272dab962e8b0557a989c4e64a0167c3f4e1';

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
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(new Error(e.message)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const runs = await get('/repos/TalWayn72/EduSphere/actions/runs?head_sha=' + FULL_SHA + '&per_page=20');
  const allRuns = runs.workflow_runs || [];
  console.log('Workflows for 5f7b272:');
  allRuns.forEach(r => console.log(' -', r.name, '|', r.status, '|', r.conclusion || '...'));

  const ciRun = allRuns.find(r => r.name === 'Continuous Integration');
  if (!ciRun) { console.log('CI run not found'); return; }

  const jobs = await get('/repos/TalWayn72/EduSphere/actions/runs/' + ciRun.id + '/jobs?per_page=50');
  const e2eJob = (jobs.jobs || []).find(j => j.name.includes('E2E'));
  if (!e2eJob) { console.log('E2E job not found'); return; }

  console.log('\nE2E Job:', e2eJob.name, '| status:', e2eJob.status, '| conclusion:', e2eJob.conclusion || 'null');
  const started = e2eJob.started_at ? new Date(e2eJob.started_at) : null;
  if (started) {
    const elapsed = Math.round((Date.now() - started.getTime()) / 60000);
    console.log('Started:', e2eJob.started_at, '| Elapsed:', elapsed, 'min');
  }
  console.log('\nSteps:');
  (e2eJob.steps || []).forEach(s => {
    const icon = s.conclusion === 'success' ? 'PASS' : s.conclusion === 'failure' ? 'FAIL' : s.conclusion === 'cancelled' ? 'CANCELLED' : s.status === 'in_progress' ? 'RUNNING' : s.status === 'queued' ? 'QUEUED' : 'SKIP';
    console.log(' ', icon, s.name, '|', s.status, '|', s.conclusion || '...');
  });
}
main().catch(console.error);
