const https = require('https');
function apiCall(path) {
  return new Promise((res, rej) => {
    https.get({
      hostname: 'api.github.com',
      path,
      headers: {'User-Agent': 'EduSphere', 'Accept': 'application/vnd.github.v3+json'}
    }, r => { let d=''; r.on('data', c=>d+=c); r.on('end', ()=>res(JSON.parse(d))); }).on('error', rej);
  });
}
async function main() {
  const data = await apiCall('/repos/TalWayn72/EduSphere/actions/runs?branch=feat/improvements-wave1&per_page=20');
  const failures = data.workflow_runs.filter(r => r.conclusion === 'failure').slice(0, 5);
  for (const r of failures) {
    console.log('\n=== ' + r.name + ' [' + r.id + '] ===');
    const jobs = await apiCall('/repos/TalWayn72/EduSphere/actions/runs/' + r.id + '/jobs');
    for (const j of jobs.jobs) {
      if (j.conclusion !== 'success' && j.conclusion !== 'skipped') {
        console.log('  JOB:', j.name, j.conclusion || j.status);
        if (j.steps) {
          for (const s of j.steps) {
            if (s.conclusion === 'failure') {
              console.log('    STEP FAILED:', s.name);
            }
          }
        }
      }
    }
  }
}
main().catch(console.error);
