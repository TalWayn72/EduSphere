const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';
const SHA = '7448935';

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
        catch (e) { reject(new Error(e.message + ': ' + Buffer.concat(chunks).toString().slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function getText(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'Authorization': 'token ' + TOKEN,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'EduSphere',
      },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        resolve(getText(res.headers.location));
        return;
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const runs = await get('/repos/TalWayn72/EduSphere/actions/runs?per_page=20&branch=master');
  const ciRun = (runs.workflow_runs || []).find(r => r.head_sha.startsWith(SHA) && r.name.includes('Continuous Integration'));
  if (!ciRun) {
    console.log('CI run not found for', SHA, 'Available:', (runs.workflow_runs || []).map(r => r.head_sha.slice(0,7) + ' ' + r.name).join('\n'));
    return;
  }
  console.log('CI run:', ciRun.id, ciRun.status, ciRun.conclusion);

  const jobs = await get('/repos/TalWayn72/EduSphere/actions/runs/' + ciRun.id + '/jobs?per_page=50');
  const lintJob = (jobs.jobs || []).find(j => j.name.toLowerCase().includes('lint'));
  if (!lintJob) {
    console.log('Lint job not found. Jobs:', (jobs.jobs || []).map(j => j.name + ' ' + j.conclusion).join('\n'));
    return;
  }

  console.log('\nLint job:', lintJob.name, '|', lintJob.status, '|', lintJob.conclusion);
  const failedSteps = (lintJob.steps || []).filter(s => s.conclusion === 'failure' || s.conclusion === 'cancelled');
  console.log('Failed steps:');
  failedSteps.forEach(s => console.log(' -', s.name));

  // Get logs
  console.log('\nFetching logs for lint job...');
  const logsResp = await get('/repos/TalWayn72/EduSphere/actions/jobs/' + lintJob.id + '/logs');
  if (logsResp.message) {
    console.log('API redirect expected - fetching logs URL');
  }
  // Logs endpoint returns a redirect, need to use raw URL
  const logsUrl = 'https://api.github.com/repos/TalWayn72/EduSphere/actions/jobs/' + lintJob.id + '/logs';
  const logs = await getText(logsUrl);
  // Show last 3000 chars of logs
  const relevant = logs.slice(-4000);
  console.log('\n--- LINT JOB LOGS (last 4000 chars) ---');
  console.log(relevant);
}

main().catch(console.error);
