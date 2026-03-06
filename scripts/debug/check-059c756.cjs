const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';
const TARGET_SHA = '059c756';

function apiCall(path) {
  return new Promise((res, rej) => {
    const opts = {
      hostname: 'api.github.com',
      path,
      headers: {
        'User-Agent': 'EduSphere-CI-Check',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + TOKEN
      },
      rejectUnauthorized: false
    };
    https.get(opts, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { res(JSON.parse(d)); } catch(e) { res({ error: d }); }
      });
    }).on('error', rej);
  });
}

async function main() {
  // Check master branch runs
  const data = await apiCall('/repos/TalWayn72/EduSphere/actions/runs?branch=master&per_page=30');
  if (!data.workflow_runs) {
    console.log('ERROR:', JSON.stringify(data).substring(0, 300));
    return;
  }

  console.log('Total master branch runs returned:', data.workflow_runs.length);
  console.log('');

  const targetRuns = data.workflow_runs.filter(r => r.head_sha && r.head_sha.startsWith(TARGET_SHA));
  console.log('=== Runs for SHA ' + TARGET_SHA + ' ===');
  console.log('Count:', targetRuns.length);
  targetRuns.forEach(r => {
    console.log('  RunID:' + r.id + ' | ' + r.name + ' | status=' + r.status + ' | conclusion=' + (r.conclusion || '(none)') + ' | event=' + r.event + ' | created=' + r.created_at);
  });

  console.log('');
  console.log('=== All recent master runs (top 15) — SHA : workflow : status : conclusion ===');
  data.workflow_runs.slice(0, 15).forEach(r => {
    const sha = (r.head_sha || '').substring(0, 7);
    console.log('  SHA:' + sha + ' | ' + r.name + ' | status=' + r.status + ' | conclusion=' + (r.conclusion || 'none') + ' | created=' + r.created_at);
  });

  // Also try head SHA lookup directly
  console.log('');
  const checksData = await apiCall('/repos/TalWayn72/EduSphere/commits/059c7568b60fb1bd81695d6f63deaa9741d39bc6/check-runs');
  if (checksData.check_runs) {
    console.log('=== Check runs for 059c756 (from commit check-runs API) ===');
    console.log('Total check runs:', checksData.total_count);
    checksData.check_runs.forEach(cr => {
      console.log('  [' + cr.app.slug + '] ' + cr.name + ' | status=' + cr.status + ' | conclusion=' + (cr.conclusion || '(none)'));
    });
  } else {
    console.log('Check runs API result:', JSON.stringify(checksData).substring(0, 300));
  }
}

main().catch(console.error);
