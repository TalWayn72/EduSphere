const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/P0039217/.claude/projects/EduSphere/scripts/ci_jobs2.json', 'utf8'));
const jobs = d.jobs || [];
console.log('Total jobs:', jobs.length);
jobs.forEach(j => {
  const result = j.conclusion || j.status;
  if (result !== 'success' && result !== 'skipped') {
    console.log(result + '  [' + j.name + ']');
    if (j.steps) {
      j.steps.forEach(s => {
        const sr = s.conclusion || s.status;
        if (sr !== 'success' && sr !== 'skipped') {
          console.log('  step [' + sr + ']: ' + s.name);
        }
      });
    }
  }
});
