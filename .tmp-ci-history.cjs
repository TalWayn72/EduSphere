const https = require('https');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function get(path, cb) {
  const opts = { hostname: 'api.github.com', path, headers: { 'User-Agent': 'node-ci-check' }};
  https.get(opts, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { cb(JSON.parse(d)); } catch(e) { console.log(d.slice(0,200)); } });
  }).on('error', e => { console.log('err:', e.message); });
}

get('/repos/TalWayn72/EduSphere/actions/runs?branch=docs%2Fnormalize-file-naming&per_page=10', data => {
  const runs = data.workflow_runs || [];
  runs.forEach(r => console.log(r.id, '|', r.name, '|', r.status, '|', r.conclusion));
});
