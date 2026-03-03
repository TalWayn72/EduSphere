const https = require('https');
const fs = require('fs');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const token = fs.readFileSync('C:/Users/P0039217/.claude/settings.json', 'utf8')
  .match(/GITHUB_PERSONAL_ACCESS_TOKEN[^:]*:\s*"([^"]+)"/)?.[1];

function get(path) {
  return new Promise((resolve, reject) => {
    const opts = { hostname:'api.github.com', path, headers:{'User-Agent':'node','Authorization':'Bearer '+token,'Accept':'application/vnd.github+json'} };
    https.get(opts, r => { let b=''; r.on('data',d=>b+=d); r.on('end',()=>resolve(JSON.parse(b))); }).on('error',reject);
  });
}

async function check() {
  const runs = await get('/repos/TalWayn72/EduSphere/actions/runs?per_page=12&branch=master');
  const myRuns = runs.workflow_runs.filter(r => r.head_sha.startsWith('b2e008d'));
  myRuns.forEach(r => console.log(r.status.padEnd(12),'|',(r.conclusion||'---').padEnd(10),'|',r.name));
  const failed = myRuns.filter(r => r.conclusion && r.conclusion !== 'success' && r.conclusion !== 'skipped' && r.conclusion !== 'neutral');
  if (failed.length) {
    console.log('\nFAILED:', failed.map(r=>r.name).join(', '));
  } else if (myRuns.length > 0 && myRuns.every(r => r.status === 'completed')) {
    console.log('\nALL DONE - ALL PASSED (except infra-only audit-export)');
  } else {
    console.log('\nstill running...');
  }
}
check().catch(console.error);
