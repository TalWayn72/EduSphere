const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';

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
  const commits = await get('/repos/TalWayn72/EduSphere/commits/master');
  const sha = commits.sha;
  const shortSha = sha.slice(0, 7);
  const msg = commits.commit.message.split('\n')[0];
  console.log('HEAD:', shortSha, '-', msg);
  console.log('Time:', new Date().toISOString());

  const data = await get('/repos/TalWayn72/EduSphere/commits/' + sha + '/check-runs?per_page=100');
  const runs = data.check_runs || [];
  const byStatus = {};
  runs.forEach(r => {
    const key = r.conclusion || r.status;
    if (!byStatus[key]) byStatus[key] = [];
    byStatus[key].push(r.name);
  });
  const order = ['success', 'failure', 'in_progress', 'queued', 'skipped', 'cancelled', 'neutral'];
  order.forEach(k => {
    if (byStatus[k]) {
      const icon = k === 'success' ? 'OK' : k === 'failure' ? 'FAIL' : k === 'in_progress' ? 'RUN' : k === 'queued' ? 'WAIT' : 'SKIP';
      console.log(icon + ' ' + k + ' (' + byStatus[k].length + '):', byStatus[k].slice(0, 5).join(', ') + (byStatus[k].length > 5 ? '...' : ''));
    }
  });
  const failed = (byStatus['failure'] || []);
  const inProgress = (byStatus['in_progress'] || []).length + (byStatus['queued'] || []).length;
  console.log('Summary: ' + (byStatus['success'] || []).length + ' pass, ' + failed.length + ' fail, ' + inProgress + ' pending');
  if (failed.length > 0) console.log('FAILED:', failed.join(', '));
}
main().catch(console.error);
