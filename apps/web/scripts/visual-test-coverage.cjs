/**
 * Visual Test Coverage Report Generator
 *
 * Scans E2E spec files for toHaveScreenshot assertions and Storybook stories,
 * then outputs a comprehensive coverage summary.
 *
 * Usage:
 *   node apps/web/scripts/visual-test-coverage.cjs
 */

const fs = require('fs');
const path = require('path');

const E2E_DIR = path.resolve(__dirname, '../e2e');
const SRC_DIR = path.resolve(__dirname, '../src');

// --- Helpers ---

function walkDir(dir, ext) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

function countMatches(content, pattern) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

// --- Scan E2E visual assertions ---

const specFiles = walkDir(E2E_DIR, '.spec.ts');
const visualSpecs = [];
let totalAssertions = 0;

const categories = {
  admin: 0,
  'dark-mode': 0,
  rtl: 0,
  accessibility: 0,
  charts: 0,
  'user-flows': 0,
  'error-states': 0,
  'loading-states': 0,
  'cross-browser': 0,
  viewport: 0,
  forms: 0,
  other: 0,
};

function classifyFile(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('admin')) return 'admin';
  if (lower.includes('dark-mode') || lower.includes('dark_mode')) return 'dark-mode';
  if (lower.includes('rtl')) return 'rtl';
  if (lower.includes('a11y') || lower.includes('accessibility') || lower.includes('focus') || lower.includes('contrast') || lower.includes('motion')) return 'accessibility';
  if (lower.includes('chart')) return 'charts';
  if (lower.includes('flow') || lower.includes('onboarding') || lower.includes('lifecycle')) return 'user-flows';
  if (lower.includes('error')) return 'error-states';
  if (lower.includes('loading')) return 'loading-states';
  if (lower.includes('cross-browser') || lower.includes('xbrowser')) return 'cross-browser';
  if (lower.includes('viewport') || lower.includes('4k') || lower.includes('laptop') || lower.includes('mobile')) return 'viewport';
  if (lower.includes('form')) return 'forms';
  return 'other';
}

for (const file of specFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const assertionCount = countMatches(content, /toHaveScreenshot\s*\(/g);
  if (assertionCount > 0) {
    const relPath = path.relative(path.resolve(__dirname, '../../..'), file).replace(/\\/g, '/');
    visualSpecs.push({ file: relPath, assertions: assertionCount });
    totalAssertions += assertionCount;

    const category = classifyFile(path.basename(file));
    categories[category] += assertionCount;
  }
}

// --- Scan Storybook stories ---

const storyFiles = walkDir(SRC_DIR, '.stories.tsx');
let totalStories = 0;

for (const file of storyFiles) {
  const content = fs.readFileSync(file, 'utf8');
  // Count named exports (each is a story) excluding default/meta
  const namedExports = countMatches(content, /export\s+(?:const|function)\s+\w+/g);
  // Subtract the meta export (usually `export default meta` or `const meta`)
  const metaExports = countMatches(content, /export\s+default/g);
  const storyCount = Math.max(namedExports - metaExports, 1);
  totalStories += storyCount;
}

// --- Output Report ---

const divider = '='.repeat(50);
const line = '-'.repeat(50);

console.log('');
console.log(divider);
console.log('  Visual Testing Coverage Report');
console.log(divider);
console.log('');
console.log(`  E2E Visual Assertions:  ${totalAssertions}`);
console.log(`  Storybook Stories:      ${totalStories} (across ${storyFiles.length} files)`);
console.log(`  Visual Spec Files:      ${visualSpecs.length}`);
console.log('');
console.log(line);
console.log('  Coverage by Category:');
console.log(line);

const maxLabel = Math.max(...Object.keys(categories).map(k => k.length));
for (const [category, count] of Object.entries(categories)) {
  const label = category.padEnd(maxLabel + 2);
  const bar = count > 0 ? ' ' + '#'.repeat(Math.min(count, 40)) : '';
  console.log(`    ${label} ${String(count).padStart(4)} assertions${bar}`);
}

console.log('');
console.log(line);
console.log('  Spec File Breakdown:');
console.log(line);

// Sort by assertion count descending
visualSpecs.sort((a, b) => b.assertions - a.assertions);

for (const { file, assertions } of visualSpecs) {
  const shortFile = file.replace('apps/web/e2e/', '');
  console.log(`    ${shortFile.padEnd(55)} ${String(assertions).padStart(4)}`);
}

console.log('');
console.log(divider);
console.log(`  Total Visual Assertions: ${totalAssertions}`);
console.log(`  Total Storybook Stories: ${totalStories}`);
console.log(`  Target: 500+ assertions | Current: ${totalAssertions >= 500 ? 'MET' : `${500 - totalAssertions} remaining`}`);
console.log(divider);
console.log('');
