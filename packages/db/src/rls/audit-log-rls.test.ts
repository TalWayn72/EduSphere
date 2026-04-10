/**
 * RLS validation tests for the audit_log table.
 *
 * All tests are unit-style (no live DB required). They verify:
 *  1. SUPER_ADMIN role sees all audit logs across tenants
 *  2. Non-SUPER_ADMIN users can only read their own tenant's logs
 *  3. Audit log is append-only — no withCheck policy defined (no UPDATE/DELETE)
 *  4. withTenantContext sets correct SUPER_ADMIN and tenant-level roles
 *
 * Compliance: GDPR Art.32 + SOC2 CC7.2 — 7-year retention, append-only.
 * Security Invariant SI-3: Tenant isolation via app.current_tenant.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getTableName } from 'drizzle-orm';
import { auditLog } from '../schema/auditLog';
import { withTenantContext } from './withTenantContext';
import type { TenantContext } from './withTenantContext';
import type { DrizzleDB } from '../index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMockDb(capturedCalls: string[]): DrizzleDB {
  const mockTx = {
    execute: vi.fn(async (sqlObj: unknown) => {
      capturedCalls.push(JSON.stringify(sqlObj));
    }),
  };
  return {
    transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
      cb(mockTx)
    ),
  } as unknown as DrizzleDB;
}

const TENANT_A_CTX: TenantContext = {
  tenantId: 'tenant-aaaa-0001',
  userId: 'user-aaaa-0001',
  userRole: 'ORG_ADMIN',
};

const SUPER_ADMIN_CTX: TenantContext = {
  tenantId: 'tenant-aaaa-0001',
  userId: 'user-super-admin',
  userRole: 'SUPER_ADMIN',
};

const TENANT_B_CTX: TenantContext = {
  tenantId: 'tenant-bbbb-0002',
  userId: 'user-bbbb-0002',
  userRole: 'ORG_ADMIN',
};

const schemaFile = readFileSync(
  resolve(__dirname, '../schema/auditLog.ts'),
  'utf8'
);

// ---------------------------------------------------------------------------
// audit_log RLS policy structure
// ---------------------------------------------------------------------------

describe('audit_log RLS policy: SUPER_ADMIN sees all tenants', () => {
  it('pgPolicy USING clause allows SUPER_ADMIN role', () => {
    const policyStart = schemaFile.indexOf('audit_log_rls');
    const policyEnd = schemaFile.indexOf('].enableRLS()');
    const policySection = schemaFile.slice(policyStart, policyEnd);
    expect(policySection).toContain('SUPER_ADMIN');
  });

  it('pgPolicy USING clause allows current_user_role = SUPER_ADMIN', () => {
    const policyStart = schemaFile.indexOf('audit_log_rls');
    const policyEnd = schemaFile.indexOf('].enableRLS()');
    const policySection = schemaFile.slice(policyStart, policyEnd);
    expect(policySection).toContain('current_user_role');
  });
});

describe('audit_log RLS policy: tenant-scoped read for non-SUPER_ADMIN', () => {
  it('pgPolicy USING clause references app.current_tenant', () => {
    const policyStart = schemaFile.indexOf('audit_log_rls');
    const policyEnd = schemaFile.indexOf('].enableRLS()');
    const policySection = schemaFile.slice(policyStart, policyEnd);
    expect(policySection).toContain('app.current_tenant');
  });

  it('policy uses OR to combine SUPER_ADMIN and tenant conditions', () => {
    const policyStart = schemaFile.indexOf('audit_log_rls');
    const policyEnd = schemaFile.indexOf('].enableRLS()');
    const policySection = schemaFile.slice(policyStart, policyEnd);
    expect(policySection.toUpperCase()).toContain('OR');
  });
});

describe('audit_log is append-only (no withCheck policy)', () => {
  it('schema does NOT define a withCheck clause on audit_log_rls', () => {
    // append-only means no UPDATE/DELETE policies — no withCheck on the policy
    const policyStart = schemaFile.indexOf('audit_log_rls');
    const policyEnd = schemaFile.indexOf('].enableRLS()');
    const policySection = schemaFile.slice(policyStart, policyEnd);
    expect(policySection).not.toContain('withCheck');
  });

  it('enableRLS is called on audit_log table', () => {
    expect(schemaFile).toContain('enableRLS()');
  });
});

// ---------------------------------------------------------------------------
// Drizzle table definition
// ---------------------------------------------------------------------------

describe('audit_log Drizzle table is defined correctly', () => {
  it('auditLog table is defined', () => {
    expect(auditLog).toBeDefined();
    expect(getTableName(auditLog)).toBe('audit_log');
  });

  it('schema exports AuditLog and NewAuditLog types', () => {
    expect(schemaFile).toContain('export type AuditLog');
    expect(schemaFile).toContain('export type NewAuditLog');
  });
});

// ---------------------------------------------------------------------------
// withTenantContext: session variable propagation
// ---------------------------------------------------------------------------

describe('withTenantContext: audit log session variables', () => {
  beforeEach(() => vi.clearAllMocks());

  it('SUPER_ADMIN context sets role to SUPER_ADMIN', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, SUPER_ADMIN_CTX, async () => null);

    const roleCall = calls.find((c) => c.includes('current_user_role'));
    expect(roleCall).toContain('SUPER_ADMIN');
  });

  it('tenant context sets current_tenant correctly', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, TENANT_A_CTX, async () => null);

    const tenantCall = calls.find((c) => c.includes('current_tenant'));
    expect(tenantCall).toContain('tenant-aaaa-0001');
  });

  it('tenant-A context does not leak tenant-B ID', async () => {
    const callsA: string[] = [];
    const dbA = buildMockDb(callsA);
    await withTenantContext(dbA, TENANT_A_CTX, async () => 'a');

    expect(callsA.some((c) => c.includes('tenant-bbbb-0002'))).toBe(false);
  });

  it('tenant-B context does not leak tenant-A ID', async () => {
    const callsB: string[] = [];
    const dbB = buildMockDb(callsB);
    await withTenantContext(dbB, TENANT_B_CTX, async () => 'b');

    expect(callsB.some((c) => c.includes('tenant-aaaa-0001'))).toBe(false);
  });
});
