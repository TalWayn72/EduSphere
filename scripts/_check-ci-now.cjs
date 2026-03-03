const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';
const TARGET_SHA = '5329438';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function apiCall(path) {
  return new Promise((res, rej) => {
    const opts = {
      hostname: 'api.github.com',
      path,
      headers: {
        'User-Agent': 'EduSphere-CI-Check',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + TOKEN
      },
      rejectUnauthorized: false
    };
    const req = https.get(opts, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { res(JSON.parse(d)); } catch(e) { res({ error: d.slice(0,200) }); } });
    });
    req.on('error', rej);
  });
}

async function main() {
  const data = await apiCall('/repos/TalWayn72/EduSphere/actions/runs?branch=master&per_page=20');
  if (!data.workflow_runs) { console.log('ERROR:', JSON.stringify(data).slice(0,300)); return; }

  // Group by SHA
  const bySha = {};
  data.workflow_runs.forEach(r => {
    const sha = r.head_sha ? r.head_sha.slice(0,8) : 'N/A';
    if (!bySha[sha]) bySha[sha] = [];
    const icon = r.conclusion === 'success' ? 'OK  ' : r.conclusion === 'failure' ? 'FAIL' : (r.conclusion || r.status || '?   ').slice(0,4);
    bySha[sha].push(icon + ' ' + r.name);
  });

  Object.entries(bySha).slice(0,4).forEach(([sha, runs]) => {
    console.log('=== SHA: ' + sha + ' ===');
    runs.forEach(r => console.log('  ' + r));
    console.log('');
  });

  // Check for specific subgraph-content and subgraph-agent failures in latest SHA
  const latestSha = Object.keys(bySha)[0];
  const latestRuns = data.workflow_runs.filter(r => r.head_sha && r.head_sha.startsWith(latestSha));
  const failedRuns = latestRuns.filter(r => r.conclusion === 'failure');
  if (failedRuns.length > 0) {
    console.log('FAILED WORKFLOWS for ' + latestSha + ':');
    // Get jobs for first failed run
    for (const run of failedRuns.slice(0,2)) {
      const jobs = await apiCall('/repos/TalWayn72/EduSphere/actions/runs/' + run.id + '/jobs?per_page=50');
      if (jobs.jobs) {
        const failedJobs = jobs.jobs.filter(j => j.conclusion === 'failure');
        console.log('  Run: ' + run.name + ' (id=' + run.id + ')');
        failedJobs.forEach(j => {
          console.log('    FAIL JOB: ' + j.name);
          j.steps && j.steps.filter(s => s.conclusion === 'failure').forEach(s => {
            console.log('      FAIL STEP: ' + s.name);
          });
        });
      }
    }
  }
}
main().catch(console.error);
