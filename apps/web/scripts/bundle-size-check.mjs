/**
 * Bundle size smoke test.
 * Run after `pnpm build` from the project root:
 *   node apps/web/scripts/bundle-size-check.mjs
 *
 * Fails with exit code 1 if any JS chunk exceeds MAX_CHUNK_KB.
 * No external dependencies — uses Node.js built-ins only.
 */

import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const DIST_ASSETS_DIR = resolve(__dirname, '../dist/assets');
const MAX_CHUNK_KB = 600;
const MAX_CHUNK_BYTES = MAX_CHUNK_KB * 1024;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function padEnd(str, length) {
  return str.length >= length ? str : str + ' '.repeat(length - str.length);
}

function padStart(str, length) {
  return str.length >= length ? str : ' '.repeat(length - str.length) + str;
}

let files;
try {
  files = readdirSync(DIST_ASSETS_DIR);
} catch {
  console.error(`ERROR: Cannot read dist/assets directory: ${DIST_ASSETS_DIR}`);
  console.error(
    'Run "pnpm build" inside apps/web before executing this script.'
  );
  process.exit(1);
}

const jsChunks = files
  .filter((f) => f.endsWith('.js'))
  .map((f) => {
    const filePath = join(DIST_ASSETS_DIR, f);
    const { size } = statSync(filePath);
    return { name: f, size };
  })
  .sort((a, b) => b.size - a.size);

if (jsChunks.length === 0) {
  console.error('ERROR: No JS chunks found in dist/assets. Was the build run?');
  process.exit(1);
}

// Print summary table
const COL_NAME = 60;
const COL_SIZE = 12;
const COL_STATUS = 10;
const SEPARATOR = '-'.repeat(COL_NAME + COL_STATUS + COL_STATUS + 4);

console.log('\nBundle size report');
console.log(SEPARATOR);
console.log(
  padEnd('Chunk', COL_NAME) +
    padStart('Size', COL_SIZE) +
    '  ' +
    padStart('Status', COL_STATUS)
);
console.log(SEPARATOR);

let overBudget = false;

for (const chunk of jsChunks) {
  const exceeds = chunk.size > MAX_CHUNK_BYTES;
  if (exceeds) overBudget = true;

  const status = exceeds ? `OVER ${MAX_CHUNK_KB}KB` : 'OK';
  const flag = exceeds ? ' !' : '  ';
  console.log(
    flag +
      padEnd(chunk.name, COL_NAME - 2) +
      padStart(formatBytes(chunk.size), COL_SIZE) +
      '  ' +
      padStart(status, COL_STATUS)
  );
}

console.log(SEPARATOR);
console.log(`Total JS chunks: ${jsChunks.length}`);
console.log(`Budget per chunk: ${MAX_CHUNK_KB} KB\n`);

if (overBudget) {
  console.error(
    `ERROR: One or more JS chunks exceed the ${MAX_CHUNK_KB} KB budget.`
  );
  console.error(
    'Consider code splitting, lazy loading, or tree-shaking the offending chunk.'
  );
  process.exit(1);
}

console.log(`✓ All chunks within budget`);
