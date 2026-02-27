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
  console.log(`\n=== CI Status for ${sha} ===`);
  if (runs.length === 0) {
    console.log('No runs found yet for this SHA. Latest runs:');
    data.workflow_runs.slice(0, 8).forEach(r => {
      const status = r.conclusion || r.status;
      console.log(`  ${r.name.padEnd(40)} ${status.padEnd(15)} ${r.head_sha.substring(0,8)} ${r.created_at.substring(0,16)}`);
    });
  } else {
    runs.forEach(r => {
      const status = r.conclusion || r.status;
      console.log(`  ${r.name.padEnd(40)} ${status.padEnd(15)}`);
    });
  }
}
main().catch(console.error);
