const https = require('https');
const fs = require('fs');
const TOKEN = fs.readFileSync(__dirname + '/check-e2e-result.cjs', 'utf8').match(/TOKEN = '([^']+)'/)[1];
const SHA = 'dcdff27e26e858ee481d322a7ce309803afe66aa';

function get(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com', path, method: 'GET',
      headers: { 'Authorization': 'token ' + TOKEN, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'EduSphere' },
      rejectUnauthorized: false,
    };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch(e) { resolve({}); } });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const runs = await get('/repos/TalWayn72/EduSphere/actions/runs?head_sha=' + SHA + '&per_page=15');
  const ci = (runs.workflow_runs || []).find(r => r.name === 'Continuous Integration');
  if (!ci) { console.log('CI not found'); return; }

  const jobs = await get('/repos/TalWayn72/EduSphere/actions/runs/' + ci.id + '/jobs?per_page=50');
  const e2eJob = (jobs.jobs || []).find(j => j.name.includes('E2E'));
  if (!e2eJob) { console.log('E2E job not found'); return; }

  const started = e2eJob.started_at ? new Date(e2eJob.started_at) : null;
  const ended = e2eJob.completed_at ? new Date(e2eJob.completed_at) : null;
  const duration = (started && ended) ? Math.round((ended - started) / 60000) : 0;

  console.log('E2E Job:', e2eJob.conclusion || e2eJob.status);
  console.log('Duration:', duration, 'min');
  console.log('\nSteps:');
  (e2eJob.steps || []).forEach(s => {
    const icon = s.conclusion === 'success' ? 'PASS' : s.conclusion === 'failure' ? 'FAIL' :
      s.conclusion === 'cancelled' ? 'CANC' : s.conclusion === 'skipped' ? 'SKIP' :
      s.status === 'in_progress' ? 'RUN ' : '... ';
    console.log(' [' + icon + ']', s.name);
  });

  // Fetch log URL for failed step
  const failedStep = (e2eJob.steps || []).find(s => s.conclusion === 'failure');
  if (failedStep) console.log('\nFailed step:', failedStep.name, '(step', failedStep.number + ')');
}
main().catch(e => console.error('Error:', e.message));
