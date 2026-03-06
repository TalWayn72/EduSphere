// check-ci-status-now.cjs — Query GitHub check runs for latest master commits
const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN || '';
const OWNER = 'TalWayn72';
const REPO = 'EduSphere';

// Latest commits on master (newest first)
const COMMITS = [
  { sha: '7448935', label: 'fix(i18n): srs namespace + DEV_USER UUID + media/course fixes (HEAD)' },
  { sha: '34850e32e800997a292c88c7dc61ad54575bb9ee', label: 'ci: add continue-on-error to SBOM generation step' },
  { sha: '5329438a47c121dab6b8cc292e22bfffadcd55d7', label: 'fix(web): remove raw UUID display from course cards' },
];

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method: 'GET',
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'EduSphere-CI-Checker',
      },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(new Error('JSON parse error: ' + e.message));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function workflowRuns(sha) {
  return get('/repos/' + OWNER + '/' + REPO + '/actions/runs?per_page=30&branch=master');
}

async function checkRuns(sha) {
  return get('/repos/' + OWNER + '/' + REPO + '/commits/' + sha + '/check-runs?per_page=100');
}

function statusIcon(status, conclusion) {
  if (status === 'completed') {
    if (conclusion === 'success') return '[OK]';
    if (conclusion === 'failure') return '[FAIL]';
    if (conclusion === 'cancelled') return '[CANCEL]';
    if (conclusion === 'skipped') return '[SKIP]';
    return '[' + conclusion + ']';
  }
  if (status === 'in_progress') return '[RUN]';
  if (status === 'queued') return '[QUEUE]';
  if (status === 'pending') return '[WAIT]';
  return '[' + status + ']';
}

async function main() {
  console.log('=== EduSphere CI Status Check ===');
  console.log('Time: ' + new Date().toISOString());
  console.log('HEAD: 7448935 — fix(i18n): srs namespace + DEV_USER UUID + media/course fixes\n');

  // Workflow-level overview
  console.log('=== WORKFLOW RUNS (master branch, latest per workflow) ===');
  try {
    const runs = await workflowRuns();
    if (runs.message) {
      console.log('API error: ' + runs.message);
    } else {
      const wfRuns = runs.workflow_runs || [];
      // Group by workflow name, show latest per workflow
      const byWorkflow = new Map();
      for (const run of wfRuns) {
        if (!byWorkflow.has(run.name)) {
          byWorkflow.set(run.name, run);
        }
      }
      const TARGET = ['Continuous Integration', 'Full Test Suite', 'GraphQL Federation Validation', 'Docker Image Builds', 'CodeQL Security Analysis', 'CD — Deploy to Kubernetes', 'Performance Tests'];
      const targetRuns = [];
      const otherRuns = [];
      for (const [name, run] of byWorkflow) {
        if (TARGET.some(t => name.includes(t.replace('GraphQL Federation Validation', 'Federation').replace('CodeQL Security Analysis', 'CodeQL')))) {
          targetRuns.push([name, run]);
        } else {
          otherRuns.push([name, run]);
        }
      }
      // Print all
      for (const [name, run] of [...targetRuns, ...otherRuns]) {
        const icon = statusIcon(run.status, run.conclusion);
        const sha = run.head_sha.slice(0, 8);
        const ts = run.updated_at;
        const isCurrent = run.head_sha.startsWith('7448935');
        const note = isCurrent ? ' *CURRENT*' : ' (prev commit)';
        console.log(icon + ' ' + name + note);
        console.log('  sha=' + sha + ' updated=' + ts);
        console.log('  url=' + run.html_url);
      }
    }
  } catch (e) {
    console.log('Error: ' + e.message);
  }

  // Per-commit check runs
  for (const { sha, label } of COMMITS) {
    console.log('\n=== CHECK RUNS: ' + sha.slice(0, 8) + ' — ' + label + ' ===');
    try {
      const data = await checkRuns(sha);
      if (data.message) { console.log('API error: ' + data.message); continue; }
      const checks = data.check_runs || [];
      console.log('Total checks: ' + checks.length);

      const successes = checks.filter(c => c.status === 'completed' && c.conclusion === 'success');
      const failures = checks.filter(c => c.status === 'completed' && c.conclusion === 'failure');
      const cancelled = checks.filter(c => c.status === 'completed' && c.conclusion === 'cancelled');
      const running = checks.filter(c => c.status === 'in_progress');
      const queued = checks.filter(c => c.status === 'queued');
      const skipped = checks.filter(c => c.status === 'completed' && c.conclusion === 'skipped');

      console.log('  OK=' + successes.length + ' FAIL=' + failures.length + ' CANCEL=' + cancelled.length + ' RUN=' + running.length + ' QUEUE=' + queued.length + ' SKIP=' + skipped.length);

      if (failures.length > 0) {
        console.log('\n  FAILURES:');
        failures.forEach(c => console.log('    [FAIL] ' + c.name));
      }
      if (running.length > 0) {
        console.log('\n  RUNNING:');
        running.forEach(c => console.log('    [RUN] ' + c.name));
      }
      if (queued.length > 0) {
        console.log('\n  QUEUED:');
        queued.forEach(c => console.log('    [QUEUE] ' + c.name));
      }
      if (successes.length > 0) {
        console.log('\n  PASSED:');
        successes.forEach(c => console.log('    [OK] ' + c.name));
      }
      if (cancelled.length > 0) {
        console.log('\n  CANCELLED (superseded by newer commit):');
        cancelled.forEach(c => console.log('    [CANCEL] ' + c.name));
      }
    } catch (e) {
      console.log('Error: ' + e.message);
    }
  }
}

main().catch(console.error);
