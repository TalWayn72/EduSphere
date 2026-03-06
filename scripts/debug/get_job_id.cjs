const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/P0039217/.claude/projects/EduSphere/scripts/ci_jobs2.json', 'utf8'));
const jobs = d.jobs || [];
jobs.forEach(j => {
  console.log(j.id + '  ' + (j.conclusion || j.status) + '  ' + j.name);
  if (j.name === 'Integration Tests') {
    console.log('  HTML URL:', j.html_url);
    console.log('  Steps:');
    (j.steps||[]).forEach(s => console.log('    [' + (s.conclusion||s.status) + '] ' + s.name));
  }
});
