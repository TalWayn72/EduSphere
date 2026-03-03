const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/P0039217/.claude/projects/EduSphere/scripts/ci_head.json', 'utf8'));
const runs = d.check_runs || [];
console.log('Total check runs for HEAD:', runs.length);
console.log('\n✅ SUCCESSES:');
runs.filter(r => r.conclusion === 'success').forEach(r => console.log('  ✅  ' + r.name));
console.log('\n⏭ SKIPPED:');
runs.filter(r => r.conclusion === 'skipped').forEach(r => console.log('  ⏭  ' + r.name));
console.log('\n🔄 IN PROGRESS:');
runs.filter(r => r.status === 'in_progress').forEach(r => console.log('  🔄  ' + r.name));
console.log('\n❌ FAILURES:');
const failures = runs.filter(r => r.conclusion === 'failure' || r.conclusion === 'timed_out');
if (failures.length === 0) { console.log('  None!'); }
failures.forEach(r => console.log('  ❌  ' + r.name));
