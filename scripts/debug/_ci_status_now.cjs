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
  const all = runs.workflow_runs || [];
  if (all.length === 0) { console.log('No runs yet'); return; }

  const icon = r => r.conclusion === 'success' ? 'PASS' : r.conclusion === 'failure' ? 'FAIL' :
    r.status === 'in_progress' ? 'RUN ' : r.status === 'queued' ? 'WAIT' : '??? ';
  all.forEach(r => console.log('[' + icon(r) + ']', r.name, '|', r.conclusion || r.status));

  const ci = all.find(r => r.name === 'Continuous Integration');
  if (!ci) return;

  const jobs = await get('/repos/TalWayn72/EduSphere/actions/runs/' + ci.id + '/jobs?per_page=50');
  const jicon = j => j.conclusion === 'success' ? 'PASS' : j.conclusion === 'failure' ? 'FAIL' :
    j.conclusion === 'skipped' ? 'SKIP' : j.status === 'in_progress' ? 'RUN ' : 'WAIT';
  console.log('\nCI jobs:');
  (jobs.jobs || []).forEach(j => {
    const elapsed = (j.status === 'in_progress' && j.started_at)
      ? ' (' + Math.round((Date.now() - new Date(j.started_at).getTime()) / 60000) + 'min)' : '';
    console.log('  [' + jicon(j) + ']', j.name + elapsed);
  });
}
main().catch(e => console.error('Error:', e.message));
