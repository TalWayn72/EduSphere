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

function getLogs(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path,
      headers: { 'User-Agent': 'node', 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' }
    };
    const req = https.get(opts, r => {
      if (r.statusCode === 302) {
        // Follow redirect
        const url = new URL(r.headers.location);
        const opts2 = {
          hostname: url.hostname,
          path: url.pathname + url.search,
          headers: { 'User-Agent': 'node' }
        };
        https.get(opts2, r2 => {
          let b = '';
          r2.on('data', d => b += d);
          r2.on('end', () => resolve(b));
        }).on('error', reject);
      } else {
        let b = '';
        r.on('data', d => b += d);
        r.on('end', () => resolve(b));
      }
    });
    req.on('error', reject);
  });
}

async function main() {
  const runs = await get('/repos/TalWayn72/EduSphere/actions/runs?per_page=12&branch=master');
  const cdRun = runs.workflow_runs.find(r => r.head_sha.startsWith('d628f26') && r.name === 'CD — Deploy to Kubernetes');

  const jobs = await get(`/repos/TalWayn72/EduSphere/actions/runs/${cdRun.id}/jobs`);
  const failedJob = jobs.jobs.find(j => j.name === 'Build & Push — subgraph-annotation');

  console.log('Job ID:', failedJob.id);
  const logs = await getLogs(`/repos/TalWayn72/EduSphere/actions/jobs/${failedJob.id}/logs`);

  // Show last 100 lines
  const lines = logs.split('\n');
  const relevant = lines.filter(l => l.includes('error') || l.includes('Error') || l.includes('ERROR') || l.includes('failed') || l.includes('FAILED'));
  console.log('=== ERRORS ===');
  relevant.slice(0, 30).forEach(l => console.log(l.substring(0, 200)));
  console.log('\n=== LAST 40 LINES ===');
  lines.slice(-40).forEach(l => console.log(l.substring(0, 200)));
}
main().catch(console.error);
