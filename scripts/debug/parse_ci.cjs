const fs = require('fs');
const data = fs.readFileSync('C:/Users/P0039217/.claude/projects/EduSphere/scripts/ci_check.json', 'utf8');
const d = JSON.parse(data);
const runs = d.check_runs || [];
console.log('Total check runs:', runs.length);
runs.forEach(r => {
  const result = r.conclusion || r.status;
  console.log(result + '  ' + r.name);
});
