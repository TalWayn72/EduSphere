import { spawnSync } from 'child_process';
import { writeFileSync } from 'fs';

const result = spawnSync(
  'pnpm',
  ['--filter', '@edusphere/web', 'test', '--', '--run', '--reporter=verbose'],
  {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    shell: true,
    cwd: 'C:/Users/P0039217/.claude/projects/EduSphere',
    timeout: 300000,
  }
);

const combined = (result.stdout || '') + (result.stderr || '');
const lines = combined.split('\n');

// Extract summary lines and any FAIL lines
const summaryLines = lines.filter(
  (l) =>
    l.includes('Test Files') ||
    l.includes('Tests ') ||
    l.match(/^\s*FAIL\s/) ||
    l.includes('Duration') ||
    l.includes('passed') ||
    l.includes('failed')
);

const failLines = lines.filter((l) => l.match(/\s*FAIL\s/));

writeFileSync(
  'C:/Users/P0039217/.claude/projects/EduSphere/test-summary.txt',
  `EXIT_CODE: ${result.status}\n\nSUMMARY LINES:\n${summaryLines.join('\n')}\n\nFAIL LINES:\n${failLines.join('\n')}\n\nLAST 30 LINES:\n${lines.slice(-30).join('\n')}`
);

console.log('Done. Exit:', result.status);
