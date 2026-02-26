const https = require('https');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function get(path, cb) {
  const opts = { hostname: 'api.github.com', path, headers: { 'User-Agent': 'node-ci-check' }};
  https.get(opts, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => cb(JSON.parse(d)));
  }).on('error', e => { console.log('err:', e.message); });
}

// Get last 5 runs on this branch, look for test.yml runs before my push
get('/repos/TalWayn72/EduSphere/actions/runs?branch=docs%2Fnormalize-file-naming&event=push&per_page=6', data => {
  const runs = data.workflow_runs || [];
  // Find the Full Test Suite runs
  const testRuns = runs.filter(r => r.name === 'Full Test Suite');
  testRuns.forEach(r => console.log(r.id, r.status, r.conclusion, new Date(r.created_at).toISOString()));
});
