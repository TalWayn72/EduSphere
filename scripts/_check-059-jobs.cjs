const https = require('https');
const fs = require('fs');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const content = fs.readFileSync('./scripts/check-ci-status.cjs', 'utf-8');
const token = content.match(/const TOKEN = '([^']+)'/)[1];
function get(path) {
  return new Promise((res, rej) => {
    https.get({ hostname: 'api.github.com', path, headers: {'User-Agent':'ci','Accept':'application/vnd.github.v3+json','Authorization':'token '+token}, rejectUnauthorized: false }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch(e) { res({ error: d.slice(0,200) }); } });
    }).on('error', rej);
  });
}
async function main() {
  const runs = await get('/repos/TalWayn72/EduSphere/actions/runs?branch=master&per_page=20');
  const testRun = runs.workflow_runs.find(r => r.head_sha.startsWith('059c7568') && r.name === 'Full Test Suite');
  if (!testRun) { console.log('Full Test Suite run for 059c7568 not found'); return; }
  console.log('Run ID:', testRun.id, 'Conclusion:', testRun.conclusion);
  const jobs = await get('/repos/TalWayn72/EduSphere/actions/runs/' + testRun.id + '/jobs?per_page=50');
  jobs.jobs.filter(j => j.conclusion === 'failure').forEach(j => {
    console.log('\nFAIL JOB:', j.name);
    j.steps.forEach(s => {
      const status = s.conclusion || s.status;
      if (status !== 'success' && status !== 'skipped') {
        console.log(' ', status, s.name);
      }
    });
  });
}
main().catch(console.error);
