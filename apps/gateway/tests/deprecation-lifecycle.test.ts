import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

// Resolve the monorepo root from this test file's location
// test file is at: apps/gateway/tests/deprecation-lifecycle.test.ts
// monorepo root is: ../../../
const __filename = fileURLToPath(import.meta.url);
const __dirname_test = resolve(__filename, '..'); // apps/gateway/tests/
const MONOREPO_ROOT = resolve(__dirname_test, '..', '..', '..'); // project root

const SUBGRAPH_NAMES = [
  'subgraph-core',
  'subgraph-annotation',
  'subgraph-content',
  'subgraph-agent',
  'subgraph-knowledge',
  'subgraph-collaboration',
] as const;

/** Recursively find all .graphql files in a directory */
function findGraphqlFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findGraphqlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.graphql')) {
      files.push(fullPath);
    }
  }
  return files;
}

/** Extract all @deprecated directives with their reasons from SDL text */
function extractDeprecations(sdl: string): Array<{ reason: string; context: string }> {
  const results: Array<{ reason: string; context: string }> = [];
  // Match @deprecated(reason: "...") patterns
  const regex = /@deprecated\(reason:\s*"([^"]+)"\)/g;
  let match;
  while ((match = regex.exec(sdl)) !== null) {
    results.push({
      reason: match[1] ?? '',
      context: sdl.substring(Math.max(0, match.index - 80), match.index + match[0].length),
    });
  }
  return results;
}

/** Parse a date string in YYYY-MM-DD format from a deprecation reason */
function parseRemovalDate(reason: string): Date | null {
  const dateMatch = /Will be removed (\d{4}-\d{2}-\d{2})/.exec(reason);
  if (!dateMatch || !dateMatch[1]) return null;
  const d = new Date(dateMatch[1]);
  return isNaN(d.getTime()) ? null : d;
}

describe('Deprecation Lifecycle Policy Enforcement', () => {
  const allGraphqlFiles: string[] = [];
  const allDeprecations: Array<{ file: string; reason: string; context: string }> = [];

  // Collect all subgraph SDL files and their @deprecated usages
  for (const subgraph of SUBGRAPH_NAMES) {
    const srcDir = join(MONOREPO_ROOT, 'apps', subgraph, 'src');
    const files = findGraphqlFiles(srcDir);
    allGraphqlFiles.push(...files);
    for (const file of files) {
      const sdl = readFileSync(file, 'utf-8');
      const deprecations = extractDeprecations(sdl);
      for (const dep of deprecations) {
        allDeprecations.push({ file, ...dep });
      }
    }
  }

  it('finds at least 2 @deprecated usages across subgraph SDL files', () => {
    // Wave 1C added @deprecated to offset arguments in user and annotation subgraphs
    expect(allDeprecations.length).toBeGreaterThanOrEqual(2);
  });

  it('all @deprecated directives include "Will be removed YYYY-MM-DD" in reason', () => {
    const violations = allDeprecations.filter(
      ({ reason }) => !/Will be removed \d{4}-\d{2}-\d{2}/.test(reason),
    );
    expect(
      violations,
      `Deprecations missing removal date:\n${violations.map(v => `  ${v.file}: "${v.reason}"`).join('\n')}`,
    ).toHaveLength(0);
  });

  it('all @deprecated removal dates are at least 90 days in the future from the deprecation reason', () => {
    // Note: we check that dates are at least 90 days from 2026-02-22 (plan creation date)
    // In practice, the date is fixed in the SDL so this ensures a minimum 90-day grace window
    const PLAN_DATE = new Date('2026-02-22');
    const NINETY_DAYS_FROM_PLAN = new Date(PLAN_DATE);
    NINETY_DAYS_FROM_PLAN.setDate(NINETY_DAYS_FROM_PLAN.getDate() + 90);

    const violations = allDeprecations.filter(({ reason }) => {
      const removalDate = parseRemovalDate(reason);
      if (!removalDate) return true; // no date = violation
      return removalDate < NINETY_DAYS_FROM_PLAN;
    });

    expect(
      violations,
      `Deprecations with removal dates less than 90 days from plan date (2026-02-22):\n${violations.map(v => `  ${v.file}: "${v.reason}"`).join('\n')}`,
    ).toHaveLength(0);
  });

  it('all @deprecated removal dates are parseable ISO dates', () => {
    const violations = allDeprecations.filter(({ reason }) => {
      const date = parseRemovalDate(reason);
      return date === null;
    });
    expect(
      violations,
      `Deprecations with invalid date format:\n${violations.map(v => `  ${v.file}: "${v.reason}"`).join('\n')}`,
    ).toHaveLength(0);
  });

  it('all subgraph SDL files are readable (schema files not corrupted)', () => {
    expect(allGraphqlFiles.length).toBeGreaterThanOrEqual(6); // at least one per subgraph
    for (const file of allGraphqlFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content.length, `${file} is empty`).toBeGreaterThan(0);
    }
  });
});
