/**
 * Static security tests for audit logging compliance (G-08).
 * GDPR Art.32 + SOC2 CC7.2: All data access and mutations must be logged.
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

describe('G-08: Audit Log Schema', () => {
  it('auditLog.ts schema file exists', () => {
    expect(
      existsSync(resolve(ROOT, 'packages/db/src/schema/auditLog.ts'))
    ).toBe(true);
  });

  it('audit_log table has tenant_id column', () => {
    const content = readFile('packages/db/src/schema/auditLog.ts');
    expect(content).toContain('tenant_id');
  });

  it('audit_log table has user_id column', () => {
    const content = readFile('packages/db/src/schema/auditLog.ts');
    expect(content).toContain('user_id');
  });

  it('audit_log table has action column', () => {
    const content = readFile('packages/db/src/schema/auditLog.ts');
    expect(content).toContain('action');
  });

  it('audit_log table has ip_address column', () => {
    const content = readFile('packages/db/src/schema/auditLog.ts');
    expect(content).toContain('ip_address');
  });

  it('audit_log table has RLS enabled', () => {
    const content = readFile('packages/db/src/schema/auditLog.ts');
    expect(content).toContain('enableRLS');
  });

  it('audit_log RLS uses correct variable app.current_tenant', () => {
    const content = readFile('packages/db/src/schema/auditLog.ts');
    expect(content).toContain('app.current_tenant');
    // Must NOT use the wrong variable name
    expect(content).not.toContain("'app.current_user'");
  });

  it('audit_log schema is exported from schema index', () => {
    const content = readFile('packages/db/src/schema/index.ts');
    expect(content).toMatch(/auditLog/);
  });
});

describe('G-08: Audit Service', () => {
  it('AuditService file exists', () => {
    expect(
      existsSync(resolve(ROOT, 'packages/audit/src/audit.service.ts'))
    ).toBe(true);
  });

  it('AuditService never throws (fire-and-forget pattern)', () => {
    const content = readFile('packages/audit/src/audit.service.ts');
    expect(content).toContain('catch');
    // Should log error but not re-throw
    expect(content).not.toMatch(/catch[^}]*throw/s);
  });

  it('AuditInterceptor file exists', () => {
    expect(
      existsSync(resolve(ROOT, 'packages/audit/src/audit.interceptor.ts'))
    ).toBe(true);
  });

  it('AuditInterceptor logs both success and failure', () => {
    const content = readFile('packages/audit/src/audit.interceptor.ts');
    expect(content).toContain('SUCCESS');
    expect(content).toContain('FAILED');
  });

  it('AuditInterceptor captures IP address', () => {
    const content = readFile('packages/audit/src/audit.interceptor.ts');
    expect(content).toContain('ipAddress');
  });
});
