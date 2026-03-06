const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';
const TARGET_SHA = '264b869c289ba41a950508ecb4675b03905a48c3';

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
  console.log('=== Fetching workflow runs for master branch ===');
  const runsData = await apiCall('/repos/TalWayn72/EduSphere/actions/runs?branch=master&per_page=30');

  if (!runsData.workflow_runs) {
    console.log('ERROR fetching runs:', JSON.stringify(runsData).substring(0, 500));
    return;
  }

  const allRuns = runsData.workflow_runs;
  console.log('Total runs fetched:', allRuns.length);

  // Runs for the exact target commit
  const targetRuns = allRuns.filter(function(r) { return r.head_sha === TARGET_SHA; });
  // Also collect recent runs (last 5 distinct SHAs)
  const recentRuns = allRuns.slice(0, 15);

  console.log('\n=== Runs for HEAD commit 264b869 (fix(ci): Trivy non-blocking) ===');
  console.log('Matching runs:', targetRuns.length);

  function printRun(r) {
    var sha7 = r.head_sha ? r.head_sha.substring(0, 7) : 'N/A';
    var icon = '?';
    if (r.conclusion === 'success') icon = 'PASS';
    else if (r.conclusion === 'failure') icon = 'FAIL';
    else if (r.conclusion === 'cancelled') icon = 'CANCELLED';
    else if (r.conclusion === 'skipped') icon = 'SKIP';
    else if (r.status === 'in_progress') icon = 'RUNNING';
    else if (r.status === 'queued') icon = 'QUEUED';
    console.log('[' + icon + '] ' + r.name);
    console.log('  sha=' + sha7 + ' | event=' + r.event + ' | status=' + r.status + ' | conclusion=' + (r.conclusion || 'none'));
    console.log('  created=' + r.created_at + ' | id=' + r.id);
    console.log('  url=' + r.html_url);
  }

  if (targetRuns.length === 0) {
    console.log('No runs found for 264b869 yet. Showing most recent 15 runs across all SHAs:');
    recentRuns.forEach(printRun);
  } else {
    targetRuns.forEach(printRun);
  }

  // Summary by SHA
  console.log('\n=== SHA Summary (most recent 15 runs) ===');
  var bySha = {};
  recentRuns.forEach(function(r) {
    var sha = r.head_sha ? r.head_sha.substring(0, 7) : 'N/A';
    if (!bySha[sha]) bySha[sha] = { runs: [], sha_full: r.head_sha };
    bySha[sha].runs.push({ name: r.name, status: r.status, conclusion: r.conclusion });
  });
  Object.keys(bySha).forEach(function(sha) {
    var entry = bySha[sha];
    console.log('\nSHA: ' + sha + (entry.sha_full === TARGET_SHA ? ' <-- TARGET HEAD' : ''));
    entry.runs.forEach(function(r) {
      var icon = '?';
      if (r.conclusion === 'success') icon = 'PASS';
      else if (r.conclusion === 'failure') icon = 'FAIL';
      else if (r.status === 'in_progress') icon = 'RUNNING';
      else if (r.status === 'queued') icon = 'QUEUED';
      else if (r.conclusion === 'cancelled') icon = 'CANCELLED';
      console.log('  [' + icon + '] ' + r.name + ' — ' + (r.conclusion || r.status));
    });
  });

  // Check runs (individual job statuses) for the target commit
  console.log('\n=== Check Runs for commit 264b869 ===');
  const checksData = await apiCall('/repos/TalWayn72/EduSphere/commits/' + TARGET_SHA + '/check-runs?per_page=100');
  if (checksData.message) {
    console.log('Check runs error:', checksData.message);
  } else {
    var checkRuns = checksData.check_runs || [];
    console.log('Total check runs:', checkRuns.length);
    checkRuns.forEach(function(cr) {
      var icon = '?';
      if (cr.conclusion === 'success') icon = 'PASS';
      else if (cr.conclusion === 'failure') icon = 'FAIL';
      else if (cr.conclusion === 'skipped') icon = 'SKIP';
      else if (cr.status === 'in_progress') icon = 'RUNNING';
      else if (cr.status === 'queued') icon = 'QUEUED';
      console.log('[' + icon + '] ' + cr.name + ' | ' + cr.status + ' | ' + (cr.conclusion || 'pending'));
      if (cr.output && cr.output.summary) console.log('  summary: ' + cr.output.summary);
    });
  }

  // Combined commit status
  console.log('\n=== Combined Commit Status for 264b869 ===');
  const statusData = await apiCall('/repos/TalWayn72/EduSphere/commits/' + TARGET_SHA + '/status');
  if (statusData.state !== undefined) {
    console.log('Combined state:', statusData.state);
    console.log('Total sub-statuses:', statusData.total_count);
    var statuses = statusData.statuses || [];
    statuses.forEach(function(s) {
      console.log('  [' + s.state + '] ' + s.context + ': ' + (s.description || ''));
    });
  } else {
    console.log('Status response:', JSON.stringify(statusData).substring(0, 300));
  }

  // Get workflow job details for any failed target runs
  if (targetRuns.length > 0) {
    console.log('\n=== Job Details for Target Runs ===');
    for (var i = 0; i < Math.min(targetRuns.length, 5); i++) {
      var run = targetRuns[i];
      console.log('\nWorkflow: ' + run.name + ' (id=' + run.id + ')');
      var jobsData = await apiCall('/repos/TalWayn72/EduSphere/actions/runs/' + run.id + '/jobs?per_page=50');
      var jobs = (jobsData.jobs || []);
      jobs.forEach(function(job) {
        var icon = '?';
        if (job.conclusion === 'success') icon = 'PASS';
        else if (job.conclusion === 'failure') icon = 'FAIL';
        else if (job.conclusion === 'skipped') icon = 'SKIP';
        else if (job.status === 'in_progress') icon = 'RUNNING';
        else if (job.status === 'queued') icon = 'QUEUED';
        console.log('  [' + icon + '] Job: ' + job.name + ' | ' + job.status + ' | ' + (job.conclusion || 'pending'));
        // Show failed steps
        var steps = job.steps || [];
        steps.forEach(function(step) {
          if (step.conclusion === 'failure') {
            console.log('    FAILED STEP: ' + step.name);
          }
        });
      });
    }
  }
}

main().catch(console.error);
