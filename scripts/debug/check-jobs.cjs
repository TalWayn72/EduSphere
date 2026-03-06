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

  // Find the "Continuous Integration" run
  const ciRun = runs.find(r => r.name === 'Continuous Integration');
  if (!ciRun) {
    console.log('CI run not found');
    return;
  }

  console.log(`\n=== Continuous Integration [${ciRun.id}] - ${ciRun.conclusion || ciRun.status} ===`);
  const jobs = await apiCall(`/repos/TalWayn72/EduSphere/actions/runs/${ciRun.id}/jobs`);
  jobs.jobs.forEach(j => {
    const status = j.conclusion || j.status;
    console.log(`  ${j.name.padEnd(45)} ${status}`);
  });
}
main().catch(console.error);
