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
  // 1. Check commit status for a59fbc7
  console.log('=== Commit Status for a59fbc7 ===');
  const commitStatus = await apiCall('/repos/TalWayn72/EduSphere/commits/a59fbc7/status');
  if (commitStatus.state) {
    console.log('Combined state:', commitStatus.state);
    console.log('Total statuses:', commitStatus.total_count);
    if (commitStatus.statuses) {
      commitStatus.statuses.forEach(function(s) {
        console.log('  -', s.context, ':', s.state);
      });
    }
  } else {
    console.log(JSON.stringify(commitStatus).substring(0, 300));
  }

  // 2. Check check-runs (GitHub Actions reports as check-runs)
  console.log('\n=== Check-Runs for a59fbc7 ===');
  const checkRuns = await apiCall('/repos/TalWayn72/EduSphere/commits/a59fbc7/check-runs?per_page=50');
  if (checkRuns.check_runs) {
    console.log('Total check-runs:', checkRuns.total_count);
    checkRuns.check_runs.forEach(function(cr) {
      console.log('  Name:', cr.name, '| Status:', cr.status, '| Conclusion:', cr.conclusion, '| Run ID:', cr.details_url);
    });
  } else {
    console.log(JSON.stringify(checkRuns).substring(0, 500));
  }

  // 3. Check PR #4 check-suites
  console.log('\n=== Check-Suites for a59fbc7 ===');
  const suites = await apiCall('/repos/TalWayn72/EduSphere/commits/a59fbc7/check-suites?per_page=20');
  if (suites.check_suites) {
    console.log('Total check-suites:', suites.total_count);
    suites.check_suites.forEach(function(s) {
      console.log('  App:', s.app ? s.app.name : 'N/A', '| Status:', s.status, '| Conclusion:', s.conclusion, '| Head SHA:', s.head_sha ? s.head_sha.substring(0,7) : 'N/A');
    });
  } else {
    console.log(JSON.stringify(suites).substring(0, 500));
  }

  // 4. Check PR #4 detailed info
  console.log('\n=== PR #4 Check Status ===');
  const pr4 = await apiCall('/repos/TalWayn72/EduSphere/pulls/4');
  if (pr4.head) {
    console.log('HEAD SHA:', pr4.head.sha ? pr4.head.sha.substring(0,7) : 'N/A');
    console.log('Base:', pr4.base ? pr4.base.ref : 'N/A');
    console.log('Mergeable:', pr4.mergeable);
    console.log('Mergeable state:', pr4.mergeable_state);
    console.log('Labels:', pr4.labels ? pr4.labels.map(function(l) { return l.name; }).join(', ') : 'none');
  }

  // 5. Check recent workflow runs with synchronize event trigger (PR push)
  console.log('\n=== Recent workflow runs triggered by synchronize (PR push) ===');
  const allRuns = await apiCall('/repos/TalWayn72/EduSphere/actions/runs?branch=feat%2Fimprovements-wave1&event=pull_request&per_page=30');
  if (allRuns.workflow_runs) {
    console.log('Total PR-triggered runs:', allRuns.workflow_runs.length);
    allRuns.workflow_runs.slice(0, 15).forEach(function(r) {
      const sha = r.head_sha ? r.head_sha.substring(0,7) : 'N/A';
      console.log('SHA:', sha, '| Name:', r.name, '| Status:', r.status, '| Conclusion:', r.conclusion, '| Created:', r.created_at);
    });
  }
}

main().catch(console.error);
