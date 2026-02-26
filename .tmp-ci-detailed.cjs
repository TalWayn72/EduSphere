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

// Get job logs
get('/repos/TalWayn72/EduSphere/actions/runs/' + runId + '/jobs', data => {
  const jobs = data.jobs || [];
  const failedJob = jobs.find(j => j.conclusion === 'failure' && j.name.includes('Unit'));
  if (failedJob) {
    console.log('Job ID:', failedJob.id);
    // Get logs URL
    const logsPath = '/repos/TalWayn72/EduSphere/actions/jobs/' + failedJob.id + '/logs';
    const opts = { hostname: 'api.github.com', path: logsPath, headers: { 'User-Agent': 'node-ci-check' }};
    https.get(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        // May be a redirect
        const lines = d.split('\n');
        lines.slice(0, 50).forEach(l => console.log(l));
      });
    });
  }
});
