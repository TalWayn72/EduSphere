#!/usr/bin/env node
/**
 * CI Gate: Detect physical CSS direction properties in Tailwind classes and inline styles.
 *
 * Physical properties (left/right, ml-/mr-, pl-/pr-) break RTL layouts.
 * Use logical equivalents (start/end, ms-/me-, ps-/pe-) instead.
 *
 * Exit 0 = clean, Exit 1 = violations found.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

// Files to skip
const SKIP_PATTERNS = [/\.test\.tsx$/, /\.spec\.tsx$/, /\.stories\.tsx$/];

/**
 * Physical Tailwind class patterns and their logical replacements.
 * Each entry: [regex, suggestion]
 *
 * We match inside className strings. The regex matches the physical class.
 * We exempt ml-auto and mr-auto explicitly.
 */
const TAILWIND_RULES = [
  // margin-left / margin-right (except ml-auto, mr-auto)
  [
    /\bml-(?!auto\b)(\[?\d)/g,
    'Use `ms-` (margin-inline-start) instead of `ml-`',
  ],
  [/\bmr-(?!auto\b)(\[?\d)/g, 'Use `me-` (margin-inline-end) instead of `mr-`'],
  // padding-left / padding-right
  [/\bpl-(\[?\d)/g, 'Use `ps-` (padding-inline-start) instead of `pl-`'],
  [/\bpr-(\[?\d)/g, 'Use `pe-` (padding-inline-end) instead of `pr-`'],
  // positional: left- / right-
  [/\bleft-/g, 'Use `start-` (inset-inline-start) instead of `left-`'],
  [/\bright-/g, 'Use `end-` (inset-inline-end) instead of `right-`'],
  // text alignment
  [/\btext-left\b/g, 'Use `text-start` instead of `text-left`'],
  [/\btext-right\b/g, 'Use `text-end` instead of `text-right`'],
  // border sides
  [
    /\bborder-l-/g,
    'Use `border-s-` (border-inline-start) instead of `border-l-`',
  ],
  [
    /\bborder-r-/g,
    'Use `border-e-` (border-inline-end) instead of `border-r-`',
  ],
  // rounded corners
  [
    /\brounded-l-/g,
    'Use `rounded-s-` (border-start-radius) instead of `rounded-l-`',
  ],
  [
    /\brounded-r-/g,
    'Use `rounded-e-` (border-end-radius) instead of `rounded-r-`',
  ],
];

/**
 * Physical inline style properties and their logical replacements.
 */
const INLINE_STYLE_RULES = [
  [/\bmarginLeft\b/g, 'Use `marginInlineStart` instead of `marginLeft`'],
  [/\bmarginRight\b/g, 'Use `marginInlineEnd` instead of `marginRight`'],
  [/\bpaddingLeft\b/g, 'Use `paddingInlineStart` instead of `paddingLeft`'],
  [/\bpaddingRight\b/g, 'Use `paddingInlineEnd` instead of `paddingRight`'],
  [/\bleft\s*:/g, 'Use `insetInlineStart` instead of `left` in inline styles'],
  [/\bright\s*:/g, 'Use `insetInlineEnd` instead of `right` in inline styles'],
];

/**
 * Recursively collect all .tsx files.
 */
function collectFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some((p) => p.test(filePath));
}

// --- Main ---

const violations = [];
let scannedCount = 0;
const files = collectFiles(SRC_DIR);

for (const filePath of files) {
  if (shouldSkip(filePath)) continue;

  scannedCount++;
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relPath = path.relative(path.join(__dirname, '..'), filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip lines with rtl-safe exemption comment
    if (line.includes('// rtl-safe') || line.includes('/* rtl-safe */'))
      continue;

    // Check Tailwind classes
    for (const [pattern, suggestion] of TAILWIND_RULES) {
      // Reset regex lastIndex for global patterns
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        violations.push({
          file: relPath,
          line: lineNum,
          suggestion,
          text: line.trim(),
        });
      }
    }

    // Check inline style properties
    for (const [pattern, suggestion] of INLINE_STYLE_RULES) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        violations.push({
          file: relPath,
          line: lineNum,
          suggestion,
          text: line.trim(),
        });
      }
    }
  }
}

// --- Report ---

console.log(`\nlint-physical-css: Scanned ${scannedCount} files\n`);

if (violations.length === 0) {
  console.log('No physical CSS direction violations found.');
  process.exit(0);
} else {
  console.error(`Found ${violations.length} violation(s):\n`);

  // Group by file for readability
  const grouped = {};
  for (const v of violations) {
    if (!grouped[v.file]) grouped[v.file] = [];
    grouped[v.file].push(v);
  }

  for (const [file, items] of Object.entries(grouped)) {
    console.error(`  ${file}`);
    for (const item of items) {
      console.error(`    L${item.line}: ${item.suggestion}`);
      console.error(`           ${item.text.substring(0, 120)}`);
    }
    console.error('');
  }

  console.error(
    'Fix: Replace physical direction properties with logical equivalents for RTL support.'
  );
  console.error(
    'Add `// rtl-safe` comment to exempt intentionally physical properties.\n'
  );
  process.exit(1);
}
