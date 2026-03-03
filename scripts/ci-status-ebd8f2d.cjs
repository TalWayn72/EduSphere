const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';
const SHA = 'ebd8f2d457cd32c76b4ca259b57e292d09335d3b';

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
  const data = await get('/repos/TalWayn72/EduSphere/commits/' + SHA + '/check-runs?per_page=100');
  const runs = data.check_runs || [];
  const total = runs.length;
  const byStatus = {};
  runs.forEach(r => {
    const key = r.conclusion || r.status;
    if (!byStatus[key]) byStatus[key] = [];
    byStatus[key].push(r.name);
  });
  console.log('=== CI for ebd8f2d ===');
  console.log('Total check-runs:', total);
  const order = ['success', 'failure', 'in_progress', 'queued', 'skipped', 'cancelled', 'neutral'];
  order.forEach(k => {
    if (byStatus[k]) {
      const icon = k === 'success' ? '✅' : k === 'failure' ? '❌' : k === 'in_progress' ? '🔄' : k === 'queued' ? '⏳' : '⚪';
      console.log(icon + ' ' + k + ' (' + byStatus[k].length + '):');
      byStatus[k].forEach(n => console.log('   -', n));
    }
  });
  // Remaining keys
  Object.keys(byStatus).forEach(k => {
    if (!order.includes(k)) {
      console.log('❓ ' + k + ':');
      byStatus[k].forEach(n => console.log('   -', n));
    }
  });

  const failed = (byStatus['failure'] || []);
  const inProgress = (byStatus['in_progress'] || []).length + (byStatus['queued'] || []).length;
  console.log('\nSummary: ' + failed.length + ' failed, ' + inProgress + ' in progress');
  if (failed.length > 0) {
    console.log('FAILED:', failed.join(', '));
  }
}
main().catch(console.error);
