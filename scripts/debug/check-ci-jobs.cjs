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
  // Run IDs for 059c756 from previous check:
  // 22568421650 - CD Deploy
  // 22568421656 - Full Test Suite
  // 22568421625 - Continuous Integration
  // 22568421634 - GraphQL Federation Validation
  // 22568421630 - CodeQL
  // 22568421652 - Docker Image Builds

  const ciRunId = 22568421625; // Continuous Integration

  console.log('=== Jobs for Continuous Integration run (' + ciRunId + ') ===');
  const ciJobs = await apiCall('/repos/TalWayn72/EduSphere/actions/runs/' + ciRunId + '/jobs');
  if (ciJobs.jobs) {
    ciJobs.jobs.forEach(j => {
      const steps = (j.steps || []).map(s => s.name + '(' + s.status + '/' + (s.conclusion||'none') + ')').join(', ');
      console.log('  Job: ' + j.name + ' | status=' + j.status + ' | conclusion=' + (j.conclusion || 'none'));
      if (j.steps && j.steps.length) {
        j.steps.forEach(s => {
          console.log('    Step: ' + s.name + ' | status=' + s.status + ' | conclusion=' + (s.conclusion || 'none'));
        });
      }
    });
  } else {
    console.log('No jobs data:', JSON.stringify(ciJobs).substring(0, 300));
  }

  // Check CD Deploy jobs
  const cdRunId = 22568421650;
  console.log('');
  console.log('=== Jobs for CD Deploy run (' + cdRunId + ') ===');
  const cdJobs = await apiCall('/repos/TalWayn72/EduSphere/actions/runs/' + cdRunId + '/jobs');
  if (cdJobs.jobs) {
    cdJobs.jobs.forEach(j => {
      console.log('  Job: ' + j.name + ' | status=' + j.status + ' | conclusion=' + (j.conclusion || 'none'));
    });
  } else {
    console.log('No jobs data:', JSON.stringify(cdJobs).substring(0, 300));
  }

  // Check all check runs for the specific job names
  console.log('');
  console.log('=== Full check-runs (all 37) for 059c756 ===');
  const checksData = await apiCall('/repos/TalWayn72/EduSphere/commits/059c7568b60fb1bd81695d6f63deaa9741d39bc6/check-runs?per_page=100');
  if (checksData.check_runs) {
    checksData.check_runs.forEach(cr => {
      console.log('  ' + cr.name + ' | status=' + cr.status + ' | conclusion=' + (cr.conclusion || 'none'));
    });
  }
}

main().catch(console.error);
