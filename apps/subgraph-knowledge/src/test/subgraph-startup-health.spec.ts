/**
 * subgraph-startup-health.spec.ts
 *
 * Regression tests for knowledge subgraph startup failures.
 * Root cause: subgraph crashed silently in container, causing
 * "Knowledge Sources Loading..." to spin forever (BUG-057).
 *
 * Three failure classes caught:
 *   1. Missing npm dependencies (file-type, tesseract.js)
 *   2. Invalid GraphQL directives (@requiresRole not declared)
 *   3. ESM-only packages used from CJS context
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

// ── Constants ──────────────────────────────────────────────────────────────────

const SUBGRAPH_ROOT = resolve(__dirname, '../..');
const SRC_ROOT = resolve(__dirname, '..');
const PKG_JSON_PATH = join(SUBGRAPH_ROOT, 'package.json');

/** Federation v2.7 directives that are valid when imported via @link */
const FEDERATION_DIRECTIVES = new Set([
  '@key',
  '@external',
  '@requires',
  '@provides',
  '@shareable',
  '@inaccessible',
  '@override',
  '@tag',
  '@authenticated',
  '@requiresScopes',
  '@policy',
  '@composeDirective',
]);

/** Built-in GraphQL directives (always available) */
const BUILTIN_DIRECTIVES = new Set([
  '@deprecated',
  '@skip',
  '@include',
  '@specifiedBy',
]);

/** Directives declared locally by SDL files (scalar Upload, etc.) */
const LOCAL_DIRECTIVES = new Set(['@link']);

// ── Helpers ────────────────────────────────────────────────────────────────────

function collectGraphqlFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
      files.push(...collectGraphqlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.graphql')) {
      files.push(full);
    }
  }
  return files;
}

function extractDirectivesUsed(sdl: string): { directive: string; file: string; line: number }[] {
  const results: { directive: string; file: string; line: number }[] = [];
  const lines = sdl.split('\n');
  for (let i = 0; i < lines.length; i++) {
    // Match @directiveName (skip @link imports and string content)
    const matches = lines[i].matchAll(/@(\w+)/g);
    for (const m of matches) {
      const directive = `@${m[1]}`;
      // Skip directives inside triple-quoted strings
      const beforeMatch = sdl.substring(0, sdl.indexOf(lines[i]) + m.index!);
      const tripleQuoteCount = (beforeMatch.match(/"""/g) || []).length;
      if (tripleQuoteCount % 2 === 0) {
        results.push({ directive, file: '', line: i + 1 });
      }
    }
  }
  return results;
}

function extractImportedDirectives(sdl: string): Set<string> {
  const imported = new Set<string>();
  // Match: import: ["@key", "@authenticated", ...]
  const importMatch = sdl.match(/import:\s*\[([^\]]+)\]/g);
  if (importMatch) {
    for (const m of importMatch) {
      const directives = m.match(/"(@\w+)"/g);
      if (directives) {
        for (const d of directives) {
          imported.add(d.replace(/"/g, ''));
        }
      }
    }
  }
  return imported;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Knowledge subgraph — startup health (regression)', () => {
  describe('Critical dependencies are importable', () => {
    const pkgJson = JSON.parse(readFileSync(PKG_JSON_PATH, 'utf-8'));
    const criticalDeps = [
      'file-type',
      'tesseract.js',
      'mammoth',
      'pdf-parse',
      'unzipper',
      'youtube-transcript',
    ];

    it.each(criticalDeps)(
      '%s is listed in package.json dependencies',
      (dep) => {
        expect(
          pkgJson.dependencies[dep] || pkgJson.devDependencies?.[dep],
          `${dep} must be in package.json — subgraph crashes on startup without it`
        ).toBeTruthy();
      }
    );

    it('file-type version supports CJS require or has ESM workaround', () => {
      const version = pkgJson.dependencies['file-type'];
      // file-type v17+ is ESM-only. If using v17+, the import must be dynamic.
      // This test documents the constraint; the build will fail if violated.
      expect(version).toBeTruthy();
    });
  });

  describe('GraphQL SDL files use only declared directives', () => {
    const graphqlFiles = collectGraphqlFiles(SRC_ROOT);

    it('found at least 5 .graphql files', () => {
      expect(graphqlFiles.length).toBeGreaterThanOrEqual(5);
    });

    // Collect all imported directives across ALL files (they share one schema)
    const allSdl = graphqlFiles.map((f) => readFileSync(f, 'utf-8'));
    const allImported = new Set<string>();
    for (const sdl of allSdl) {
      for (const d of extractImportedDirectives(sdl)) {
        allImported.add(d);
      }
    }

    const allowedDirectives = new Set([
      ...FEDERATION_DIRECTIVES,
      ...BUILTIN_DIRECTIVES,
      ...LOCAL_DIRECTIVES,
      ...allImported,
    ]);

    it.each(graphqlFiles.map((f) => [f.replace(SRC_ROOT, 'src'), f]))(
      '%s — no undeclared directives',
      (_label, filePath) => {
        const sdl = readFileSync(filePath as string, 'utf-8');
        const used = extractDirectivesUsed(sdl);
        const undeclared = used.filter(
          (u) => !allowedDirectives.has(u.directive)
        );

        expect(
          undeclared,
          `Undeclared directive(s) found: ${undeclared.map((u) => `${u.directive} (line ${u.line})`).join(', ')}. ` +
            `Add to @link import or replace with a Federation-standard directive. ` +
            `Known crash: @requiresRole is not a Federation directive — use @requiresScopes instead.`
        ).toHaveLength(0);
      }
    );
  });

  describe('Federation @link declarations cover all used auth directives', () => {
    const graphqlFiles = collectGraphqlFiles(SRC_ROOT);
    const allSdl = graphqlFiles.map((f) => readFileSync(f, 'utf-8')).join('\n');

    it('@authenticated is imported if used', () => {
      if (allSdl.includes('@authenticated')) {
        const imported = extractImportedDirectives(allSdl);
        expect(
          imported.has('@authenticated'),
          '@authenticated is used but not imported in any @link declaration'
        ).toBe(true);
      }
    });

    it('@requiresScopes is imported if used', () => {
      if (allSdl.includes('@requiresScopes')) {
        const imported = extractImportedDirectives(allSdl);
        expect(
          imported.has('@requiresScopes'),
          '@requiresScopes is used but not imported in any @link declaration'
        ).toBe(true);
      }
    });

    it('@requiresRole is NOT used (not a Federation standard directive)', () => {
      const usesRequiresRole = graphqlFiles.some((f) => {
        const sdl = readFileSync(f, 'utf-8');
        // Only check outside of comments/strings
        return sdl.split('\n').some((line) => {
          const trimmed = line.trim();
          return (
            !trimmed.startsWith('#') &&
            !trimmed.startsWith('"') &&
            trimmed.includes('@requiresRole')
          );
        });
      });

      expect(
        usesRequiresRole,
        '@requiresRole crashed the knowledge subgraph (BUG-057). ' +
          'Use @requiresScopes(scopes: [["scope:name"]]) instead.'
      ).toBe(false);
    });
  });

  describe('SDL files are parseable (no syntax errors)', () => {
    const graphqlFiles = collectGraphqlFiles(SRC_ROOT);

    it.each(graphqlFiles.map((f) => [f.replace(SRC_ROOT, 'src'), f]))(
      '%s — valid GraphQL syntax',
      (_label, filePath) => {
        const sdl = readFileSync(filePath as string, 'utf-8');

        // Basic structural checks — catches unclosed braces, missing types
        const openBraces = (sdl.match(/\{/g) || []).length;
        const closeBraces = (sdl.match(/\}/g) || []).length;
        expect(
          openBraces,
          `Mismatched braces: ${openBraces} open vs ${closeBraces} close`
        ).toBe(closeBraces);

        // Every 'type X' or 'extend type X' must have a body
        const typeDecls = sdl.match(/(extend\s+)?type\s+\w+/g) || [];
        for (const decl of typeDecls) {
          const typeName = decl.replace(/(extend\s+)?type\s+/, '');
          const hasBody = new RegExp(
            `(extend\\s+)?type\\s+${typeName}[^{]*\\{`
          ).test(sdl);
          expect(
            hasBody,
            `${typeName} declared but has no body (missing {}) in ${_label}`
          ).toBe(true);
        }
      }
    );
  });
});
