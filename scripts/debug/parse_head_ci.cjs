const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/P0039217/.claude/projects/EduSphere/scripts/ci_head.json', 'utf8'));
const runs = d.check_runs || [];
console.log('Total check runs for HEAD:', runs.length);
const counts = {};
runs.forEach(r => {
  const res = r.conclusion || r.status;
  counts[res] = (counts[res] || 0) + 1;
  if (res !== 'success' && res !== 'skipped') {
    console.log(res + '  ' + r.name);
  }
});
console.log('---');
Object.keys(counts).forEach(k => console.log(k + ': ' + counts[k]));
