/**
 * Static security tests for CI pipeline compliance (Phase 7).
 * SOC2 CC8.1: Change management — all changes pass security gates before merge.
 * Tests verify that the CI pipeline includes required security scanning steps.
 * No DB/network required — pure static file analysis.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

function readFile(relativePath: string): string {
  const fullPath = resolve(ROOT, relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

// ─── ci.yml — security-scanning job ──────────────────────────────────────────

describe('CI Pipeline: Security Scanning Job (Phase 7)', () => {
  const CI_YML = readFile('.github/workflows/ci.yml');

  it('ci.yml exists', () => {
    expect(existsSync(resolve(ROOT, '.github/workflows/ci.yml'))).toBe(true);
  });

  it('should have a security-scanning job', () => {
    expect(CI_YML).toMatch(/security-scanning:/);
  });

  it('should run Trivy IaC scan on infrastructure/ directory', () => {
    expect(CI_YML).toContain('trivy-action');
    expect(CI_YML).toContain('scan-type: config');
    expect(CI_YML).toContain('./infrastructure/');
  });

  it('should block on HIGH and CRITICAL Trivy findings', () => {
    expect(CI_YML).toContain("severity: 'HIGH,CRITICAL'");
  });

  it('should generate SBOM in CycloneDX format', () => {
    expect(CI_YML).toContain('cyclonedx');
    expect(CI_YML).toContain('sbom.json');
  });

  it('should upload SBOM as build artifact with 90-day retention', () => {
    expect(CI_YML).toContain('sbom-${{ github.sha }}');
    expect(CI_YML).toContain('retention-days: 90');
  });

  it('should run OWASP Dependency-Check', () => {
    expect(CI_YML).toContain('Dependency-Check_Action');
    expect(CI_YML).toContain('project: EduSphere');
  });

  it('should reference OWASP suppressions file', () => {
    expect(CI_YML).toContain('owasp-suppressions.xml');
  });

  it('should upload OWASP report artifact', () => {
    expect(CI_YML).toContain('owasp-report-${{ github.sha }}');
  });
});

// ─── ci.yml — security-policy-tests job ──────────────────────────────────────

describe('CI Pipeline: Security Policy Tests Gate', () => {
  const CI_YML = readFile('.github/workflows/ci.yml');

  it('should have security-policy-tests job', () => {
    expect(CI_YML).toMatch(/security-policy-tests:/);
  });

  it('should run pnpm test:security in CI', () => {
    expect(CI_YML).toContain('pnpm test:security');
  });

  it('should run pnpm test:rls in CI', () => {
    expect(CI_YML).toContain('pnpm test:rls');
  });

  it('should run security test suite via turbo', () => {
    expect(CI_YML).toContain("pnpm turbo test --filter='./tests/security'");
  });

  it('security-scanning should depend on lint and typecheck', () => {
    // Find the security-scanning section and check needs
    const scanningSection = CI_YML.substring(
      CI_YML.indexOf('security-scanning:')
    );
    const needsSection = scanningSection.substring(
      0,
      scanningSection.indexOf('\n\n')
    );
    expect(needsSection).toMatch(
      /needs:.*lint.*typecheck|needs:.*\[.*lint.*typecheck/s
    );
  });

  it('ci-complete job should require security-scanning to pass', () => {
    expect(CI_YML).toContain('security-scanning');
    // ci-complete needs list includes security-scanning
    const completeSection = CI_YML.substring(CI_YML.indexOf('ci-complete:'));
    expect(completeSection).toContain('security-scanning');
  });
});

// ─── OWASP suppressions file ──────────────────────────────────────────────────

describe('OWASP Dependency-Check: Suppressions File', () => {
  it('owasp-suppressions.xml exists at repo root', () => {
    expect(existsSync(resolve(ROOT, 'owasp-suppressions.xml'))).toBe(true);
  });

  it('should be valid XML with suppressions root element', () => {
    const content = readFile('owasp-suppressions.xml');
    expect(content).toContain('<?xml');
    expect(content).toContain('<suppressions');
  });

  it('should reference the OWASP suppression schema', () => {
    const content = readFile('owasp-suppressions.xml');
    expect(content).toContain('jeremylong.github.io/DependencyCheck');
  });
});

// ─── Audit log export workflow ────────────────────────────────────────────────

describe('GitHub Audit Log Export Workflow (Phase 7 — SOC2 CC3.3)', () => {
  const AUDIT_WF = readFile('.github/workflows/audit-export.yml');

  it('audit-export.yml workflow exists', () => {
    expect(
      existsSync(resolve(ROOT, '.github/workflows/audit-export.yml'))
    ).toBe(true);
  });

  it('should run on a schedule (cron trigger)', () => {
    expect(AUDIT_WF).toContain('schedule:');
    expect(AUDIT_WF).toContain('cron:');
  });

  it('should export audit logs at least every 6 hours', () => {
    // cron: '0 */6 * * *' or similar
    expect(AUDIT_WF).toMatch(/\*\/6|\*\/4|\*\/3|\*\/2|0 \*\//);
  });

  it('should support manual workflow_dispatch trigger', () => {
    expect(AUDIT_WF).toContain('workflow_dispatch');
  });

  it('should use GitHub CLI to export audit logs', () => {
    expect(AUDIT_WF).toContain('audit-log');
  });

  it('should commit exported audit logs to repo', () => {
    expect(AUDIT_WF).toContain('git commit');
  });
});
