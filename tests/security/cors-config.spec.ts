/**
 * SI-2 / G-06 Security Test: CORS Configuration
 *
 * Static source-analysis test — validates that:
 *   1. Gateway enforces a strict CORS policy (no wildcard, env-driven origin)
 *   2. No production source files use wildcard Access-Control-Allow-Origin
 *
 * No running server is required; this reads committed source files.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../..');

const GATEWAY_INDEX = resolve(
  join(import.meta.dirname, '../../apps/gateway/src/index.ts')
);

const AEO_CONTROLLER = resolve(
  ROOT,
  'apps/subgraph-content/src/aeo/aeo.controller.ts'
);

function loadGatewaySource(): string {
  return readFileSync(GATEWAY_INDEX, 'utf-8');
}

function loadAeoController(): string {
  return readFileSync(AEO_CONTROLLER, 'utf-8');
}

/** Recursively collect .ts files (excluding node_modules, dist, test files). */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      if (['node_modules', 'dist', '.git', 'e2e'].includes(entry)) continue;
      const full = join(dir, entry);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          results.push(...collectTsFiles(full));
        } else if (
          stat.isFile() &&
          full.endsWith('.ts') &&
          !full.endsWith('.spec.ts') &&
          !full.endsWith('.test.ts')
        ) {
          results.push(full);
        }
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }
  return results;
}

describe('Gateway CORS configuration (SI-2, G-06)', () => {
  let source: string;

  beforeAll(() => {
    source = loadGatewaySource();
  });

  it('must NOT have wildcard origin string literal', () => {
    // The string '*' must never appear as the cors origin value.
    // Any of these forms would be a violation.
    expect(source).not.toMatch(/origin:\s*['"`]\*['"`]/);
  });

  it('must NOT fall back to wildcard via logical OR', () => {
    // Old bug: `CORS_ORIGIN?.split(',') || '*'`
    // The || fallback to '*' is forbidden.
    expect(source).not.toMatch(/\|\|\s*['"`]\*['"`]/);
  });

  it('must read origin from CORS_ORIGIN environment variable', () => {
    expect(source).toContain('CORS_ORIGIN');
  });

  it('must fail closed with an empty array when CORS_ORIGIN is not set', () => {
    // The safe fallback is [] which denies all cross-origin requests.
    // Matches the ternary pattern: `? ... : []`
    expect(source).toMatch(/:\s*\[\]/);
  });

  it('must restrict allowed HTTP methods to GET, POST, OPTIONS', () => {
    // Only the minimal method set required by GraphQL over HTTP.
    expect(source).toContain("'GET'");
    expect(source).toContain("'POST'");
    expect(source).toContain("'OPTIONS'");
  });

  it('must enable credentials flag for JWT cookie support', () => {
    expect(source).toContain('credentials: true');
  });
});

describe('AEO Controller CORS (SI-2, W0-4)', () => {
  let aeoSource: string;

  beforeAll(() => {
    aeoSource = loadAeoController();
  });

  it('must NOT have wildcard Access-Control-Allow-Origin header', () => {
    expect(aeoSource).not.toMatch(
      /@Header\(\s*['"]Access-Control-Allow-Origin['"],\s*['"]\*['"]\s*\)/
    );
  });

  it('must NOT contain any literal wildcard CORS string', () => {
    expect(aeoSource).not.toContain("'*'");
  });
});

describe('No wildcard CORS in any production source (SI-2 global)', () => {
  const violations: { file: string; line: number }[] = [];

  beforeAll(() => {
    const dirs = ['apps', 'packages'].map((d) => resolve(ROOT, d));
    for (const dir of dirs) {
      for (const file of collectTsFiles(dir)) {
        try {
          const content = readFileSync(file, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (
              lines[i].includes('Access-Control-Allow-Origin') &&
              lines[i].includes("'*'")
            ) {
              violations.push({
                file: file.replace(ROOT + '/', '').replace(ROOT + '\\', ''),
                line: i + 1,
              });
            }
          }
        } catch {
          /* skip */
        }
      }
    }
  });

  it('must have zero wildcard CORS headers in production TypeScript files', () => {
    if (violations.length > 0) {
      const details = violations.map((v) => `  ${v.file}:${v.line}`).join('\n');
      expect.fail(
        `Found ${violations.length} wildcard CORS violation(s):\n${details}`
      );
    }
  });
});
