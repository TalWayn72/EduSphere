const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';

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
  // All run IDs for 059c756:
  const runIds = [
    { id: 22568421625, name: 'Continuous Integration' },
    { id: 22568421656, name: 'Full Test Suite' },
    { id: 22568421634, name: 'GraphQL Federation Validation' },
  ];

  for (const run of runIds) {
    console.log('=== Jobs for: ' + run.name + ' (run ' + run.id + ') ===');
    const data = await apiCall('/repos/TalWayn72/EduSphere/actions/runs/' + run.id + '/jobs?per_page=50');
    if (data.jobs && data.jobs.length) {
      data.jobs.forEach(j => {
        console.log('  Job: ' + j.name + ' | status=' + j.status + ' | conclusion=' + (j.conclusion || 'none'));
        if (j.steps && j.steps.length) {
          j.steps.forEach(s => {
            const marker = (s.conclusion === 'failure') ? ' <== FAILED' : '';
            console.log('    Step[' + s.number + ']: ' + s.name + ' | status=' + s.status + ' | conclusion=' + (s.conclusion || 'none') + marker);
          });
        }
      });
    } else {
      console.log('  (no jobs yet or error) total_count=' + (data.total_count || 0), JSON.stringify(data).substring(0, 200));
    }
    console.log('');
  }
}

main().catch(console.error);
