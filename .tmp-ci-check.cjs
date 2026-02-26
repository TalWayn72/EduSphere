const https = require('https');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const opts = {
  hostname: 'api.github.com',
  path: '/repos/TalWayn72/EduSphere/actions/runs?branch=docs%2Fnormalize-file-naming&per_page=5',
  headers: { 'User-Agent': 'node-ci-check' }
};
https.get(opts, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    try {
      const body = JSON.parse(d);
      const runs = body.workflow_runs || [];
      if (!runs.length) { console.log('No runs found yet - CI may be triggering'); return; }
      runs.forEach(r => console.log(r.id, '|', r.status, '|', r.conclusion || 'pending', '|', r.name));
    } catch(e) { console.log(d.slice(0,300)); }
  });
}).on('error', e => console.log('error:', e.message));
