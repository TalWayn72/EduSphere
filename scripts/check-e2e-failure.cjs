const https = require('https');
const TOKEN = process.env.GITHUB_TOKEN;

function apiCall(path) {
  return new Promise((res, rej) => {
    https.get({
      hostname: 'api.github.com',
      path,
      headers: {
        'User-Agent': 'EduSphere',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${TOKEN}`,
      }
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch(e) { res(d); } }); }).on('error', rej);
  });
}

async function main() {
  const sha = process.argv[2] || 'e5ac5a8';
  const runs = await apiCall(`/repos/TalWayn72/EduSphere/actions/runs?branch=feat/improvements-wave1&per_page=20`);
  const ciRun = runs.workflow_runs.find(r => r.head_sha.startsWith(sha) && r.name === 'Continuous Integration');
  if (!ciRun) { console.log('CI run not found'); return; }

  const jobs = await apiCall(`/repos/TalWayn72/EduSphere/actions/runs/${ciRun.id}/jobs`);
  const e2eJob = jobs.jobs.find(j => j.name.includes('E2E'));
  if (!e2eJob) { console.log('E2E job not found'); return; }

  console.log('E2E Job:', e2eJob.name, e2eJob.conclusion);
  console.log('Steps:');
  e2eJob.steps.forEach(s => {
    if (s.conclusion === 'failure' || s.conclusion === 'skipped') {
      console.log(`  [${s.conclusion}] ${s.name}`);
    }
  });

  // Also check annotations
  const annotations = await apiCall(`/repos/TalWayn72/EduSphere/check-runs/${e2eJob.check_run_url?.split('/').pop() || e2eJob.id}/annotations`);
  if (Array.isArray(annotations)) {
    annotations.slice(0, 10).forEach(a => {
      console.log('\nANNOTATION:', a.annotation_level, a.title);
      console.log('  ', a.message?.substring(0, 200));
    });
  }
}
main().catch(console.error);
