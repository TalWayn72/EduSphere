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
  // Get the run details for audit-export failure on a59fbc7
  console.log('=== audit-export.yml run details for a59fbc7 (ID: 22474372412) ===');
  const auditRun = await apiCall('/repos/TalWayn72/EduSphere/actions/runs/22474372412');
  if (auditRun.name) {
    console.log('Name:', auditRun.name);
    console.log('Status:', auditRun.status);
    console.log('Conclusion:', auditRun.conclusion);
    console.log('Workflow:', auditRun.path);
  }

  // Get jobs for audit run
  const auditJobs = await apiCall('/repos/TalWayn72/EduSphere/actions/runs/22474372412/jobs');
  if (auditJobs.jobs) {
    auditJobs.jobs.forEach(function(j) {
      console.log('  Job:', j.name, '| Status:', j.status, '| Conclusion:', j.conclusion);
    });
  }

  // Get the 71f7f0b PR run details to confirm the passing workflows
  console.log('\n=== Most recent FULL CI run — SHA 71f7f0b (PR #4 previous HEAD) ===');
  const workflows = [
    { name: 'Continuous Integration', id: 22471409964 },
    { name: 'PR Quality Gate', id: 22471409961 },
    { name: 'Full Test Suite', id: 22471409998 },
    { name: 'Docker Image Builds', id: 22471409963 },
    { name: 'GraphQL Federation Validation', id: 22471409959 },
    { name: 'CodeQL Security Analysis', id: 22471409986 }
  ];

  for (var i = 0; i < workflows.length; i++) {
    var wf = workflows[i];
    var run = await apiCall('/repos/TalWayn72/EduSphere/actions/runs/' + wf.id);
    console.log(wf.name + ':');
    console.log('  SHA:', run.head_sha ? run.head_sha.substring(0,7) : 'N/A');
    console.log('  Status:', run.status);
    console.log('  Conclusion:', run.conclusion);
    console.log('  URL:', run.html_url);
  }

  // Check if 71f7f0b CI results are still ACTIVE/VALID for PR (GitHub re-uses check results for PRs)
  console.log('\n=== PR #4 current check-runs (all check-runs against PR HEAD a59fbc7) ===');
  // GitHub check-runs for the PR
  const prChecks = await apiCall('/repos/TalWayn72/EduSphere/commits/a59fbc7/check-runs?per_page=50');
  if (prChecks.check_runs) {
    console.log('Total check-runs on HEAD a59fbc7:', prChecks.total_count);
    prChecks.check_runs.forEach(function(cr) {
      console.log('  -', cr.name, '| Status:', cr.status, '| Conclusion:', cr.conclusion);
    });
  }

  // The KEY question: why did workflows not run on a59fbc7 push to PR branch?
  // Check workflow files for trigger conditions
  console.log('\n=== Investigating workflow trigger conditions ===');
  var ciYml = await apiCall('/repos/TalWayn72/EduSphere/contents/.github/workflows/ci.yml');
  if (ciYml.content) {
    var content = Buffer.from(ciYml.content, 'base64').toString('utf8');
    // Show just the on: section
    var lines = content.split('\n');
    var inOn = false;
    var onLines = [];
    for (var j = 0; j < lines.length; j++) {
      if (lines[j].startsWith('on:')) { inOn = true; }
      if (inOn) {
        onLines.push(lines[j]);
        if (onLines.length > 20) break;
      }
    }
    console.log('ci.yml trigger section:');
    console.log(onLines.join('\n'));
  }
}

main().catch(console.error);
