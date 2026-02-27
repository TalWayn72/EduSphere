const https = require('https');

function apiCall(path) {
  return new Promise((res, rej) => {
    https.get({
      hostname: 'api.github.com',
      path,
      headers: { 'User-Agent': 'EduSphere', 'Accept': 'application/vnd.github.v3+json' }
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(JSON.parse(d))); }).on('error', rej);
  });
}

async function main() {
  const sha = process.argv[2] || 'a7d7857';
  const data = await apiCall(`/repos/TalWayn72/EduSphere/actions/runs?branch=feat/improvements-wave1&per_page=20`);
  const runs = data.workflow_runs.filter(r => r.head_sha.startsWith(sha));

  // Find the PR Quality Gate run
  const prRun = runs.find(r => r.name === 'PR Quality Gate');
  if (!prRun) { console.log('PR Quality Gate run not found'); return; }

  console.log(`\n=== PR Quality Gate [${prRun.id}] - ${prRun.conclusion || prRun.status} ===`);
  const jobs = await apiCall(`/repos/TalWayn72/EduSphere/actions/runs/${prRun.id}/jobs`);
  jobs.jobs.forEach(j => {
    const status = j.conclusion || j.status;
    console.log(`  ${j.name.padEnd(45)} ${status}`);
    if (j.steps && status !== 'success') {
      j.steps.filter(s => s.conclusion === 'failure').forEach(s => {
        console.log(`    FAILED STEP: ${s.name}`);
      });
    }
  });
}
main().catch(console.error);
