/**
 * Federation @link Import Integrity Tests
 *
 * BUG-065 Root Cause Guard:
 *   challenges.graphql had "@requiresRole" in its @link import list from
 *   https://specs.apollo.dev/federation/v2.7. This is illegal because
 *   "@requiresRole" is a LOCAL custom directive defined in user.graphql —
 *   it is NOT a Federation specification element.
 *
 *   The illegal import crashed subgraph-core at startup:
 *     [GraphQLValidationFailed] Cannot import unknown element "@requiresRole".
 *     Did you mean "@requires" or "@requiresScopes"?
 *
 *   This caused the gateway to return ECONNREFUSED for all core subgraph
 *   operations, making the updateUserPreferences mutation always fail.
 *
 * What this suite checks (static analysis — no running server needed):
 *   1. No .graphql file imports @requiresRole from the Federation spec URL
 *   2. No .graphql file imports custom directives from the Federation spec URL
 *   3. The legal Federation v2.7 import elements are within the known-good list
 *   4. @requiresRole is defined as a LOCAL directive in user.graphql only
 *
 * Run: pnpm test:security
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { globSync } from 'node:fs';
import { resolve, relative } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

// Federation v2.7 elements that are LEGAL to import from the spec URL
const FEDERATION_LEGAL_IMPORTS = new Set([
  '@key',
  '@external',
  '@requires',
  '@provides',
  '@authenticated',
  '@requiresScopes',
  '@override',
  '@inaccessible',
  '@shareable',
  '@tag',
  '@composeDirective',
  '@interfaceObject',
  '@policy',
  '@link',
  '@extends',
]);

// Custom directives that are defined locally and must NOT appear in @link imports
const LOCAL_CUSTOM_DIRECTIVES = [
  '@requiresRole',
];

function findAllGraphqlFiles(): string[] {
  const pattern = resolve(ROOT, 'apps/subgraph-*/src/**/*.graphql');
  // Use manual glob via readdirSync to avoid dependency on glob package
  const results: string[] = [];

  function walkDir(dir: string): void {
    let entries: string[];
    try {
      const { readdirSync, statSync } = require('node:fs');
      entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = resolve(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.endsWith('.graphql')) {
          results.push(fullPath);
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  // Walk all subgraph src directories
  const subgraphDirs = [
    resolve(ROOT, 'apps/subgraph-core/src'),
    resolve(ROOT, 'apps/subgraph-content/src'),
    resolve(ROOT, 'apps/subgraph-annotation/src'),
    resolve(ROOT, 'apps/subgraph-collaboration/src'),
    resolve(ROOT, 'apps/subgraph-agent/src'),
    resolve(ROOT, 'apps/subgraph-knowledge/src'),
  ];

  for (const dir of subgraphDirs) {
    if (existsSync(dir)) {
      walkDir(dir);
    }
  }

  return results;
}

function parseLinkImports(content: string): string[] {
  // Match: @link(url: "https://specs.apollo.dev/federation/...", import: [...])
  const linkMatch = content.match(
    /@link\s*\(\s*url\s*:\s*"https:\/\/specs\.apollo\.dev\/federation\/[^"]*"\s*,\s*import\s*:\s*\[([^\]]*)\]/
  );
  if (!linkMatch) return [];

  const importBlock = linkMatch[1];
  // Extract quoted strings like "@key", "@external", etc.
  const imports = [...importBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  return imports;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Federation @link Import Integrity (BUG-065 regression guard)', () => {
  let graphqlFiles: string[];

  beforeAll(() => {
    graphqlFiles = findAllGraphqlFiles();
  });

  it('should find at least one .graphql file in subgraph-core', () => {
    const coreFiles = graphqlFiles.filter((f) => f.includes('subgraph-core'));
    expect(coreFiles.length).toBeGreaterThan(0);
  });

  it('challenges.graphql must NOT import @requiresRole from the Federation spec URL', () => {
    const challengesFile = graphqlFiles.find((f) =>
      f.includes('challenges.graphql')
    );
    expect(challengesFile).toBeDefined();

    if (!challengesFile) return;
    const content = readFileSync(challengesFile, 'utf-8');
    const imports = parseLinkImports(content);

    expect(imports).not.toContain('@requiresRole');
  });

  it('no .graphql file imports @requiresRole from the Federation spec URL', () => {
    const violations: string[] = [];

    for (const filePath of graphqlFiles) {
      const content = readFileSync(filePath, 'utf-8');
      const imports = parseLinkImports(content);

      for (const localDirective of LOCAL_CUSTOM_DIRECTIVES) {
        if (imports.includes(localDirective)) {
          violations.push(
            `${relative(ROOT, filePath)}: illegal @link import "${localDirective}" (custom directive, not a Federation spec element)`
          );
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `BUG-065 REGRESSION DETECTED — @link imports contain custom directives:\n` +
        violations.map((v) => `  - ${v}`).join('\n') +
        `\n\nFix: Remove the custom directive from the @link import list. ` +
        `Custom directives must be defined locally with "directive @name ON FIELD_DEFINITION".`
      );
    }

    expect(violations).toHaveLength(0);
  });

  it('all Federation @link imports use only known-legal spec elements', () => {
    const violations: string[] = [];

    for (const filePath of graphqlFiles) {
      const content = readFileSync(filePath, 'utf-8');
      const imports = parseLinkImports(content);

      for (const imported of imports) {
        if (!FEDERATION_LEGAL_IMPORTS.has(imported)) {
          violations.push(
            `${relative(ROOT, filePath)}: unknown Federation import "${imported}" — ` +
            `if this is a custom directive, define it locally instead`
          );
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Unknown elements in Federation @link imports:\n` +
        violations.map((v) => `  - ${v}`).join('\n') +
        `\n\nLegal Federation v2.7 imports: ${[...FEDERATION_LEGAL_IMPORTS].join(', ')}`
      );
    }

    expect(violations).toHaveLength(0);
  });

  it('@requiresRole directive is defined as a local directive in user.graphql', () => {
    const userGraphql = resolve(
      ROOT,
      'apps/subgraph-core/src/user/user.graphql'
    );
    expect(existsSync(userGraphql)).toBe(true);

    const content = readFileSync(userGraphql, 'utf-8');
    // Must define it as a local directive (NOT inside @link import)
    expect(content).toMatch(/directive\s+@requiresRole\s*\(/);
  });

  it('@requiresRole in user.graphql @link section must NOT include it in federation import', () => {
    const userGraphql = resolve(
      ROOT,
      'apps/subgraph-core/src/user/user.graphql'
    );
    if (!existsSync(userGraphql)) return;

    const content = readFileSync(userGraphql, 'utf-8');
    const imports = parseLinkImports(content);

    // user.graphql is the home of @requiresRole — but it should still NOT import it
    // from the federation spec URL (it defines it locally)
    expect(imports).not.toContain('@requiresRole');
  });
});
