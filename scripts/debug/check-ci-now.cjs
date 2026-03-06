const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';

// Check the latest commit (5329438) on master
const SHA = '5329438';

function apiCall(path) {
  return new Promise((res, rej) => {
    const opts = {
      hostname: 'api.github.com',
      path,
      headers: {
        'User-Agent': 'EduSphere',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + TOKEN,
      },
      rejectUnauthorized: false,
    };
    https.get(opts, r => {
      let d = '';
      r.on('data', c => (d += c));
      r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { res({ error: d }); } });
    }).on('error', rej);
  });
}

const ICON = {
  success: 'PASS   ',
  failure: 'FAIL   ',
  cancelled: 'CANCEL ',
  skipped: 'SKIP   ',
  action_required: 'ACTION ',
  timed_out: 'TIMEOUT',
};

async function main() {
  // Get check-runs for the commit
  const data = await apiCall('/repos/TalWayn72/EduSphere/actions/runs?branch=master&per_page=20');
  if (!data.workflow_runs) {
    console.log('Error:', JSON.stringify(data).slice(0, 300));
    return;
  }

  const runs = data.workflow_runs.filter(r => r.head_sha.startsWith(SHA));
  if (runs.length === 0) {
    console.log('No runs found for', SHA, '— latest commits:');
    data.workflow_runs.slice(0, 3).forEach(r =>
      console.log(' ', r.head_sha.slice(0, 7), r.name, r.status, r.conclusion || '')
    );
    return;
  }

  const pass = runs.filter(r => r.conclusion === 'success').length;
  const fail = runs.filter(r => r.conclusion === 'failure').length;
  const skip = runs.filter(r => ['cancelled', 'skipped'].includes(r.conclusion || '')).length;
  const pending = runs.filter(r => r.status !== 'completed').length;

  console.log('=== CI for commit', SHA, '===');
  console.log('PASS:', pass, '| FAIL:', fail, '| SKIP:', skip, '| PENDING:', pending);
  console.log();
  runs.forEach(r => {
    const icon = r.conclusion ? (ICON[r.conclusion] || r.conclusion.padEnd(7)) : (r.status + '  ').slice(0, 7).toUpperCase();
    console.log(' ', icon, r.name);
  });
}

main().catch(console.error);
