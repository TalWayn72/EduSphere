#!/usr/bin/env node
/**
 * CI Gate: Detect hardcoded English strings in JSX files
 *
 * Checks that all .tsx files rendering user-visible JSX text
 * import `useTranslation` from react-i18next.
 *
 * Exit 0 = clean, Exit 1 = violations found.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Directories to scan
const SCAN_DIRS = [
  path.join(__dirname, '..', 'src', 'pages'),
  path.join(__dirname, '..', 'src', 'components'),
];

// Files to skip (test/story files)
const SKIP_PATTERNS = [/\.test\.tsx$/, /\.spec\.tsx$/, /\.stories\.tsx$/];

// Allowlist of pure wrapper/utility components that genuinely have no text.
// Use basenames (case-insensitive match).
const ALLOWLIST = new Set([
  'errorboundary.tsx',
  'error-boundary.tsx',
  'layout.tsx',
  'app-layout.tsx',
  'root-layout.tsx',
  'providers.tsx',
  'app-providers.tsx',
  'theme-provider.tsx',
  'auth-provider.tsx',
  'query-provider.tsx',
  'route-guard.tsx',
  'protected-route.tsx',
  'suspense-wrapper.tsx',
  'lazy-load.tsx',
  'portal.tsx',
  'slot.tsx',
  'index.tsx',
]);

// Patterns indicating the file renders user-visible JSX text.
// We look for JSX elements that likely contain text content.
const JSX_TEXT_PATTERNS = [
  // JSX element with text content: <tag>Some text</tag>
  /<[A-Za-z][A-Za-z0-9.]*[^>]*>\s*[A-Z][a-z]/,
  // Common text-bearing elements
  /<(?:h[1-6]|p|span|label|button|a|li|th|td|title|caption|legend)[^>]*>/i,
  // String literals that look like English sentences (in JSX context)
  />\s*[A-Z][a-z]+(?:\s+[a-z]+){1,}/,
];

// Pattern for useTranslation import
const USE_TRANSLATION_PATTERN =
  /useTranslation|import.*from\s+['"]react-i18next['"]/;

// Pattern for t() usage (alternative: sometimes t is imported directly)
const T_FUNCTION_PATTERN = /\bt\s*\(/;

/**
 * Recursively collect all .tsx files in a directory.
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

/**
 * Check if a file should be skipped.
 */
function shouldSkip(filePath) {
  const basename = path.basename(filePath).toLowerCase();

  // Skip test/story files
  if (SKIP_PATTERNS.some((p) => p.test(filePath))) return true;

  // Skip allowlisted utility components
  if (ALLOWLIST.has(basename)) return true;

  return false;
}

/**
 * Check if file content appears to render user-visible JSX text.
 */
function hasJsxText(content) {
  return JSX_TEXT_PATTERNS.some((p) => p.test(content));
}

/**
 * Check if file imports/uses translation.
 */
function hasTranslation(content) {
  return (
    USE_TRANSLATION_PATTERN.test(content) || T_FUNCTION_PATTERN.test(content)
  );
}

// --- Main ---

const violations = [];
let scannedCount = 0;

for (const dir of SCAN_DIRS) {
  const files = collectFiles(dir);

  for (const filePath of files) {
    if (shouldSkip(filePath)) continue;

    scannedCount++;
    const content = fs.readFileSync(filePath, 'utf-8');

    if (hasJsxText(content) && !hasTranslation(content)) {
      // Compute relative path for readable output
      const relPath = path.relative(path.join(__dirname, '..'), filePath);
      violations.push(relPath);
    }
  }
}

// --- Report ---

console.log(`\nlint-i18n-hardcoded: Scanned ${scannedCount} files\n`);

if (violations.length === 0) {
  console.log('No hardcoded string violations found.');
  process.exit(0);
} else {
  console.error(
    `Found ${violations.length} file(s) with JSX text but no useTranslation import:\n`
  );
  for (const v of violations) {
    console.error(`  - ${v}`);
  }
  console.error(
    '\nFix: Add `const { t } = useTranslation();` and wrap all user-visible strings with t().\n'
  );
  process.exit(1);
}
