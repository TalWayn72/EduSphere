/**
 * BUG-091: Workspace Package Hoisting — Regression Tests
 *
 * Validates that startup.sh correctly symlinks ALL @edusphere/* workspace
 * packages and all npm dependencies from subgraph node_modules to the root
 * node_modules. Without this, subgraphs crash with ERR_MODULE_NOT_FOUND
 * because pnpm strict mode doesn't hoist transitive deps.
 *
 * Also validates that supervisord.conf has sufficient startretries
 * to survive transient startup failures.
 *
 * No Docker required — these are static analysis tests.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(join(import.meta.dirname, '../..'));

function readFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf-8');
}

describe('BUG-091: Workspace package hoisting in Docker container', () => {
  const startup = readFile('infrastructure/docker/startup.sh');
  const supervisor = readFile('infrastructure/docker/supervisord.conf');

  describe('startup.sh — workspace symlink loop', () => {
    it('should symlink ALL @edusphere/* workspace packages, not just individual ones', () => {
      // BUG-091 regression guard: old code only symlinked langgraph-workflows
      // New code must have a loop that iterates /app/packages/*/
      expect(startup).toContain('/app/packages/*/');
      expect(startup).toContain('@edusphere');
      expect(startup).toContain('ln -sf');
    });

    it('should NOT have individual hardcoded package symlinks only', () => {
      // The old pattern was: individual if-blocks for each package
      // The new pattern uses a for loop over all packages
      const forLoopMatch = startup.match(/for\s+\w+\s+in\s+\/app\/packages\/\*\//);
      expect(forLoopMatch).not.toBeNull();
    });

    it('should hoist npm dependencies from subgraph node_modules', () => {
      // Shared packages (e.g. packages/auth) import @nestjs/graphql etc.
      // which only exist in subgraph node_modules due to pnpm strict mode
      expect(startup).toContain('/app/apps/subgraph-*/node_modules');
    });

    it('should handle @scoped packages from subgraph node_modules', () => {
      // Must handle packages like @nestjs/graphql, @ai-sdk/openai
      expect(startup).toMatch(/@\*\//);
    });

    it('should skip @edusphere scope in subgraph hoisting (already handled)', () => {
      // Avoid double-linking @edusphere packages
      expect(startup).toContain('@edusphere');
      expect(startup).toMatch(/continue/);
    });
  });

  describe('startup.sh — must NOT use old individual symlink pattern', () => {
    it('should not have the old prom-client-only symlink block', () => {
      // BUG-091: The old code only hoisted prom-client and nats
      // This was the root cause of ERR_MODULE_NOT_FOUND for all other packages
      expect(startup).not.toMatch(
        /if \[ ! -d "\/app\/node_modules\/prom-client" \]/
      );
    });

    it('should not have the old nats-only symlink block', () => {
      expect(startup).not.toMatch(
        /if \[ ! -d "\/app\/node_modules\/nats" \]/
      );
    });
  });

  describe('supervisord.conf — subgraph resilience', () => {
    const subgraphNames = [
      'subgraph-core',
      'subgraph-content',
      'subgraph-annotation',
      'subgraph-collaboration',
      'subgraph-agent',
      'subgraph-knowledge',
    ];

    it('all 6 subgraphs should have startretries >= 5', () => {
      for (const name of subgraphNames) {
        // Extract the [program:name] section
        const sectionRegex = new RegExp(
          `\\[program:${name}\\][\\s\\S]*?(?=\\[program:|$)`
        );
        const section = supervisor.match(sectionRegex)?.[0];
        expect(section, `section for ${name} not found`).toBeDefined();

        const retriesMatch = section!.match(/startretries\s*=\s*(\d+)/);
        expect(
          retriesMatch,
          `startretries missing for ${name}`
        ).not.toBeNull();

        const retries = parseInt(retriesMatch![1], 10);
        expect(retries, `${name} startretries=${retries} < 5`).toBeGreaterThanOrEqual(5);
      }
    });

    it('all 6 subgraphs should have autorestart=true', () => {
      for (const name of subgraphNames) {
        const sectionRegex = new RegExp(
          `\\[program:${name}\\][\\s\\S]*?(?=\\[program:|$)`
        );
        const section = supervisor.match(sectionRegex)?.[0];
        expect(section).toBeDefined();
        expect(section).toContain('autorestart=true');
      }
    });
  });

  describe('all workspace packages are covered', () => {
    it('packages/ directory should have entries that startup.sh can discover', () => {
      const packageDirs = readdirSync(join(ROOT, 'packages'), {
        withFileTypes: true,
      })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      // Must have at least the core packages that subgraphs depend on
      const criticalPackages = [
        'auth',
        'config',
        'db',
        'nats-client',
        'health',
        'metrics',
        'graphql-shared',
      ];

      for (const pkg of criticalPackages) {
        expect(
          packageDirs,
          `critical package '${pkg}' missing from packages/`
        ).toContain(pkg);
      }
    });
  });
});
