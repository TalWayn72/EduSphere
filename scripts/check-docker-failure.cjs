const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN;

function apiCall(path) {
  return new Promise((res, rej) => {
    https.get({
      hostname: 'api.github.com',
      path,
      headers: {
        'User-Agent': 'EduSphere',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${TOKEN}`,
      }
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch(e) { res(d); } }); }).on('error', rej);
  });
}

async function main() {
  const sha = process.argv[2] || '56df3b0';
  const runs = await apiCall(`/repos/TalWayn72/EduSphere/actions/runs?branch=feat/improvements-wave1&per_page=20`);
  const dockerRun = runs.workflow_runs.find(r => r.head_sha.startsWith(sha) && r.name === 'Docker Image Builds');
  if (!dockerRun) { console.log('Docker run not found'); return; }

  console.log(`\n=== Docker Image Builds [${dockerRun.id}] - ${dockerRun.conclusion || dockerRun.status} ===`);
  const jobs = await apiCall(`/repos/TalWayn72/EduSphere/actions/runs/${dockerRun.id}/jobs`);
  jobs.jobs.forEach(j => {
    const status = j.conclusion || j.status;
    if (status !== 'success' && status !== 'skipped') {
      console.log(`  ${j.name.padEnd(40)} ${status}`);
      if (j.steps) {
        j.steps.forEach(s => {
          if (s.conclusion === 'failure') {
            console.log(`    FAILED: ${s.name}`);
          }
        });
      }
    }
  });
}
main().catch(console.error);
