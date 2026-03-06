const https = require('https');
const fs = require('fs');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const token = fs.readFileSync('C:/Users/P0039217/.claude/settings.json', 'utf8')
  .match(/GITHUB_PERSONAL_ACCESS_TOKEN[^:]*:\s*"([^"]+)"/)?.[1];

function get(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path,
      headers: { 'User-Agent': 'node', 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' }
    };
    https.get(opts, r => {
      let b = '';
      r.on('data', d => b += d);
      r.on('end', () => resolve(JSON.parse(b)));
    }).on('error', reject);
  });
}

async function main() {
  const runs = await get('/repos/TalWayn72/EduSphere/actions/runs?per_page=12&branch=master');
  const cdRun = runs.workflow_runs.find(r => r.head_sha.startsWith('d628f26') && r.name === 'CD — Deploy to Kubernetes');
  if (!cdRun) { console.log('CD run not found'); return; }
  console.log('CD run:', cdRun.id, cdRun.status, cdRun.conclusion, cdRun.html_url);

  const jobs = await get(`/repos/TalWayn72/EduSphere/actions/runs/${cdRun.id}/jobs`);
  for (const job of jobs.jobs) {
    console.log('\nJob:', job.name, job.status, job.conclusion);
    if (job.conclusion === 'failure') {
      for (const step of job.steps) {
        if (step.conclusion === 'failure') {
          console.log('  FAILED STEP:', step.name, step.number);
        }
      }
    }
  }
}
main().catch(console.error);
