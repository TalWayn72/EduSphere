const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';
const SHA = 'ac2042e18b06478f64e6e3775657d62db4af9551';
const OWNER = 'TalWayn72';
const REPO = 'EduSphere';

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method: 'GET',
      headers: {
        'Authorization': 'token ' + TOKEN,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'EduSphere-CI-Checker',
      },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // Get check runs
  const data = await get('/repos/' + OWNER + '/' + REPO + '/commits/' + SHA + '/check-runs?per_page=100');
  const failed = (data.check_runs || []).filter(r => r.conclusion === 'failure');
  console.log('Failed checks:', failed.map(r => r.name).join(', '));

  // Get workflow runs for this SHA to find the failed run IDs
  const runs = await get('/repos/' + OWNER + '/' + REPO + '/actions/runs?per_page=30&branch=master');
  const wfRuns = (runs.workflow_runs || []).filter(r => r.head_sha === SHA);
  const failedRuns = wfRuns.filter(r => r.conclusion === 'failure');

  for (const run of failedRuns.slice(0, 4)) {
    console.log('\n=== Run: ' + run.name + ' (id=' + run.id + ') ===');
    const jobs = await get('/repos/' + OWNER + '/' + REPO + '/actions/runs/' + run.id + '/jobs?per_page=50');
    const failedJobs = (jobs.jobs || []).filter(j => j.conclusion === 'failure' || j.conclusion === 'cancelled');
    for (const job of failedJobs.slice(0, 5)) {
      console.log('  Job: ' + job.name + ' | ' + job.conclusion);
      const failedSteps = (job.steps || []).filter(s => s.conclusion === 'failure' || s.conclusion === 'cancelled');
      failedSteps.forEach(s => console.log('    Step: ' + s.name));
    }
  }
}

main().catch(console.error);
