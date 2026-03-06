const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';
const SHA = 'ebd8f2d457cd32c76b4ca259b57e292d09335d3b';

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method: 'GET',
      headers: {
        'Authorization': 'token ' + TOKEN,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'EduSphere',
      },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(new Error(e.message)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // Find runs for this SHA
  const runs = await get('/repos/TalWayn72/EduSphere/actions/runs?head_sha=' + SHA + '&per_page=20');
  const allRuns = runs.workflow_runs || [];
  console.log('Workflow runs for', SHA.slice(0,7) + ':');

  for (const run of allRuns) {
    console.log('  Run:', run.name, '| status:', run.status, '| conclusion:', run.conclusion || 'null');
    if (run.status === 'in_progress') {
      // Get jobs for this run
      const jobs = await get('/repos/TalWayn72/EduSphere/actions/runs/' + run.id + '/jobs?per_page=50');
      const inProgressJobs = (jobs.jobs || []).filter(j => j.status === 'in_progress' || j.status === 'queued');
      inProgressJobs.forEach(j => {
        const started = j.started_at ? new Date(j.started_at) : null;
        const elapsed = started ? Math.round((Date.now() - started.getTime()) / 60000) + 'min' : 'n/a';
        console.log('    Job:', j.name, '| status:', j.status, '| elapsed:', elapsed);
      });
    }
  }
}
main().catch(console.error);
