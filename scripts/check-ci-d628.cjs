const https = require('https');
const fs = require('fs');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const token = fs.readFileSync('C:/Users/P0039217/.claude/settings.json', 'utf8')
  .match(/GITHUB_PERSONAL_ACCESS_TOKEN[^:]*:\s*"([^"]+)"/)?.[1];

const opts = {
  hostname: 'api.github.com',
  path: '/repos/TalWayn72/EduSphere/actions/runs?per_page=12&branch=master',
  headers: { 'User-Agent': 'node', 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json' }
};
https.get(opts, r => {
  let b = '';
  r.on('data', d => b += d);
  r.on('end', () => {
    const runs = (JSON.parse(b).workflow_runs || []).filter(r => r.head_sha.startsWith('d628f26'));
    runs.forEach(r => console.log(r.status.padEnd(12), '|', (r.conclusion || '---').padEnd(10), '|', r.name));
    const failed = runs.filter(r => r.conclusion && r.conclusion !== 'success' && r.conclusion !== 'skipped' && r.conclusion !== 'neutral');
    if (failed.length) {
      console.log('\nFAILED:', failed.map(r => r.name).join(', '));
      process.exit(1);
    } else if (runs.length > 0 && runs.every(r => r.status === 'completed')) {
      console.log('\nALL DONE - ALL PASSED');
    } else {
      console.log('\nstill running...');
    }
  });
}).on('error', e => console.log('err', e.message));
