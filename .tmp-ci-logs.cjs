const https = require('https');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const runId = process.argv[2] || '22428884716';

function get(path, cb) {
  const opts = { hostname: 'api.github.com', path, headers: { 'User-Agent': 'node-ci-check' }};
  https.get(opts, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => cb(JSON.parse(d)));
  }).on('error', e => { console.log('err:', e.message); });
}

get('/repos/TalWayn72/EduSphere/actions/runs/' + runId + '/jobs', data => {
  const jobs = data.jobs || [];
  jobs.forEach(j => {
    if (j.conclusion === 'failure') {
      console.log('FAILED JOB:', j.name);
      j.steps.filter(s => s.conclusion === 'failure').forEach(s => {
        console.log('  STEP:', s.name, '-', s.conclusion);
      });
    }
  });
});
