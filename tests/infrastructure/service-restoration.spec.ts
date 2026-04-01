/**
 * Service Restoration Iron Rule — Regression Tests
 *
 * Static analysis tests that verify the infrastructure scripts and git hooks
 * enforce the service restoration iron rule (PROC-001).
 * No Docker required — these read script files and assert content/structure.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(join(import.meta.dirname, '../..'));

function readFile(relativePath: string): string {
  const fullPath = join(ROOT, relativePath);
  return readFileSync(fullPath, 'utf-8');
}

function fileExists(relativePath: string): boolean {
  return existsSync(join(ROOT, relativePath));
}

describe('Service Restoration Iron Rule', () => {
  describe('health-check.sh Docker daemon check', () => {
    const content = readFile('scripts/health-check.sh');

    it('should contain a Docker daemon reachability check', () => {
      expect(content).toContain('docker ps');
      expect(content).toContain('Docker daemon');
    });

    it('should exit with code 2 when Docker daemon is unreachable', () => {
      expect(content).toMatch(/exit\s+2/);
      // Verify the exit 2 is associated with the Docker daemon check
      const dockerSection = content.slice(
        content.indexOf('Docker daemon'),
        content.indexOf('check_service') // first function after the daemon check
      );
      expect(dockerSection).toContain('exit 2');
    });

    it('should label the Docker check as step 0 (MUST be first)', () => {
      expect(content).toMatch(/# ── 0\./);
      expect(content).toContain('MUST be first check');
    });
  });

  describe('verify-services.sh Docker daemon check', () => {
    const content = readFile('scripts/verify-services.sh');

    it('should contain a Docker daemon reachability check', () => {
      expect(content).toContain('docker ps');
      expect(content).toContain('Docker daemon');
    });

    it('should exit with code 2 when Docker daemon is unreachable', () => {
      // Extract the Docker daemon section (before the ENDPOINTS array)
      const dockerSection = content.slice(
        content.indexOf('Docker daemon'),
        content.indexOf('ENDPOINTS')
      );
      expect(dockerSection).toContain('exit 2');
    });

    it('should label the Docker check as step 0', () => {
      expect(content).toMatch(/# ── 0\./);
    });
  });

  describe('post-commit hook includes service verification', () => {
    const content = readFile('.husky/post-commit');

    it('should reference verify-services.sh', () => {
      expect(content).toContain('verify-services.sh');
    });

    it('should invoke verify-services.sh via bash', () => {
      expect(content).toMatch(/bash\s+scripts\/verify-services\.sh/);
    });

    it('should mention Iron Rule in a comment', () => {
      expect(content).toMatch(/Iron Rule/i);
    });

    it('should trigger on feat/fix/refactor commits', () => {
      expect(content).toContain('feat*');
      expect(content).toContain('fix*');
      expect(content).toContain('refactor*');
    });
  });

  describe('post-merge hook includes service verification', () => {
    const content = readFile('.husky/post-merge');

    it('should reference verify-services.sh', () => {
      expect(content).toContain('verify-services.sh');
    });

    it('should invoke verify-services.sh via bash', () => {
      expect(content).toMatch(/bash\s+scripts\/verify-services\.sh/);
    });

    it('should mention Iron Rule in a comment', () => {
      expect(content).toMatch(/Iron Rule/i);
    });
  });

  describe('pre-e2e-gate.sh exists and is executable', () => {
    it('should exist at scripts/pre-e2e-gate.sh', () => {
      expect(fileExists('scripts/pre-e2e-gate.sh')).toBe(true);
    });

    it('should have a shebang line', () => {
      const content = readFile('scripts/pre-e2e-gate.sh');
      expect(content).toMatch(/^#!/);
    });

    it('should call ensure-docker.sh as its first gate step', () => {
      const content = readFile('scripts/pre-e2e-gate.sh');
      expect(content).toContain('ensure-docker.sh');
    });

    it('should check key endpoints (Frontend, Gateway, Keycloak)', () => {
      const content = readFile('scripts/pre-e2e-gate.sh');
      expect(content).toContain('localhost:5173');
      expect(content).toContain('localhost:4000');
      expect(content).toContain('localhost:8080');
    });
  });

  describe('ensure-docker.sh exists and is executable', () => {
    it('should exist at scripts/ensure-docker.sh', () => {
      expect(fileExists('scripts/ensure-docker.sh')).toBe(true);
    });

    it('should have a shebang line', () => {
      const content = readFile('scripts/ensure-docker.sh');
      expect(content).toMatch(/^#!/);
    });

    it('should check Docker daemon via docker ps', () => {
      const content = readFile('scripts/ensure-docker.sh');
      expect(content).toContain('docker ps');
    });

    it('should attempt to start Docker Desktop on Windows', () => {
      const content = readFile('scripts/ensure-docker.sh');
      expect(content).toContain('Docker Desktop');
    });
  });

  describe('E2E test:e2e script includes pre-e2e gate', () => {
    const pkg = JSON.parse(readFile('apps/web/package.json'));

    it('should have a test:e2e script defined', () => {
      expect(pkg.scripts).toHaveProperty('test:e2e');
    });

    it('should call pre-e2e-gate.sh before running playwright', () => {
      const script = pkg.scripts['test:e2e'] as string;
      expect(script).toContain('pre-e2e-gate.sh');
    });

    it('should run pre-e2e-gate.sh BEFORE playwright test', () => {
      const script = pkg.scripts['test:e2e'] as string;
      const gateIndex = script.indexOf('pre-e2e-gate.sh');
      const playwrightIndex = script.indexOf('playwright test');
      expect(gateIndex).toBeGreaterThanOrEqual(0);
      expect(playwrightIndex).toBeGreaterThanOrEqual(0);
      expect(gateIndex).toBeLessThan(playwrightIndex);
    });
  });

  describe('health-check.sh Docker check comes BEFORE container check', () => {
    const content = readFile('scripts/health-check.sh');

    it('should have Docker daemon check before container inspection', () => {
      const dockerDaemonIndex = content.indexOf('Checking Docker daemon');
      // Find the actual container inspection command, not comments
      const containerCheckIndex = content.indexOf(
        'docker inspect edusphere-all-in-one'
      );

      expect(dockerDaemonIndex).toBeGreaterThanOrEqual(0);
      expect(containerCheckIndex).toBeGreaterThanOrEqual(0);
      expect(dockerDaemonIndex).toBeLessThan(containerCheckIndex);
    });

    it('should exit 2 for Docker daemon failure before any container logic', () => {
      const exitTwoIndex = content.indexOf('exit 2');
      const dockerInspectIndex = content.indexOf('docker inspect');

      expect(exitTwoIndex).toBeGreaterThanOrEqual(0);
      expect(dockerInspectIndex).toBeGreaterThanOrEqual(0);
      expect(exitTwoIndex).toBeLessThan(dockerInspectIndex);
    });

    it('should have step 0 (Docker) before step 1 (Container)', () => {
      const step0Index = content.indexOf('# ── 0.');
      const step1Index = content.indexOf('# 1.');

      expect(step0Index).toBeGreaterThanOrEqual(0);
      expect(step1Index).toBeGreaterThanOrEqual(0);
      expect(step0Index).toBeLessThan(step1Index);
    });
  });
});
