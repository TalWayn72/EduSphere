/**
 * RLS validation tests for the courses table.
 *
 * All tests are unit-style (no live DB required). They verify:
 *  1. coursesRLS SQL uses app.current_tenant (not app.current_user)
 *  2. USING and WITH CHECK clauses enforce tenant isolation
 *  3. withTenantContext sets correct session variables
 *  4. Cross-tenant isolation: tenant A context does not leak tenant B ID
 *
 * Security Invariant SI-3: Tenant isolation via app.current_tenant
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { coursesRLS } from '../schema/courses';
import { withTenantContext } from './withTenantContext';
import type { TenantContext } from './withTenantContext';
import type { DrizzleDB } from '../index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sqlToString(sqlObj: {
  queryChunks?: unknown[];
  sql?: string;
}): string {
  if (typeof sqlObj.sql === 'string') return sqlObj.sql;
  if (Array.isArray(sqlObj.queryChunks)) {
    return sqlObj.queryChunks
      .map((chunk) => {
        if (typeof chunk === 'string') return chunk;
        if (
          chunk &&
          typeof (chunk as Record<string, unknown>).value === 'string'
        ) {
          return (chunk as Record<string, unknown>).value as string;
        }
        return JSON.stringify(chunk);
      })
      .join('');
  }
  return JSON.stringify(sqlObj);
}

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

const TENANT_B_CTX: TenantContext = {
  tenantId: 'tenant-bbbb-0002',
  userId: 'user-bbbb-0002',
  userRole: 'ORG_ADMIN',
};

const SUPER_ADMIN_CTX: TenantContext = {
  tenantId: 'tenant-aaaa-0001',
  userId: 'user-admin-0001',
  userRole: 'SUPER_ADMIN',
};

// ---------------------------------------------------------------------------
// coursesRLS SQL expression validation
// ---------------------------------------------------------------------------

describe('coursesRLS: SQL references app.current_tenant', () => {
  it('USING clause references app.current_tenant', () => {
    const raw = sqlToString(coursesRLS as Parameters<typeof sqlToString>[0]);
    expect(raw).toContain('app.current_tenant');
  });

  it('WITH CHECK clause references app.current_tenant', () => {
    const raw = sqlToString(coursesRLS as Parameters<typeof sqlToString>[0]);
    const withCheckIdx = raw.toUpperCase().indexOf('WITH CHECK');
    expect(withCheckIdx).toBeGreaterThan(-1);
    const withCheckSection = raw.slice(withCheckIdx);
    expect(withCheckSection).toContain('app.current_tenant');
  });

  it('has both USING and WITH CHECK clauses', () => {
    const raw = sqlToString(coursesRLS as Parameters<typeof sqlToString>[0]);
    expect(raw.toUpperCase()).toContain('USING');
    expect(raw.toUpperCase()).toContain('WITH CHECK');
  });

  it('policy is for the courses table', () => {
    const raw = sqlToString(coursesRLS as Parameters<typeof sqlToString>[0]);
    expect(raw.toLowerCase()).toContain('courses');
  });

  it('enables row level security', () => {
    const raw = sqlToString(coursesRLS as Parameters<typeof sqlToString>[0]);
    expect(raw.toUpperCase()).toContain('ROW LEVEL SECURITY');
  });
});

// ---------------------------------------------------------------------------
// withTenantContext: tenant context propagation
// ---------------------------------------------------------------------------

describe('withTenantContext: correct session variables set for courses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('SET LOCAL uses current_tenant key', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, TENANT_A_CTX, async () => null);

    const tenantCall = calls.find((c) => c.includes('current_tenant'));
    expect(tenantCall).toBeDefined();
    expect(tenantCall).toContain('tenant-aaaa-0001');
  });

  it('SET LOCAL embeds the correct tenant ID', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, TENANT_A_CTX, async () => null);

    const tenantCall = calls.find((c) => c.includes('current_tenant'));
    expect(tenantCall).toContain('tenant-aaaa-0001');
    expect(tenantCall).not.toContain('tenant-bbbb-0002');
  });

  it('SUPER_ADMIN context sets role to SUPER_ADMIN', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, SUPER_ADMIN_CTX, async () => null);

    const roleCall = calls.find((c) => c.includes('current_user_role'));
    expect(roleCall).toBeDefined();
    expect(roleCall).toContain('SUPER_ADMIN');
  });
});

// ---------------------------------------------------------------------------
// Cross-tenant isolation
// ---------------------------------------------------------------------------

describe('Cross-tenant isolation for courses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tenant-A context does not set tenant-B ID', async () => {
    const callsA: string[] = [];
    const dbA = buildMockDb(callsA);
    await withTenantContext(dbA, TENANT_A_CTX, async () => 'result-a');

    const leaksB = callsA.some((c) => c.includes('tenant-bbbb-0002'));
    expect(leaksB).toBe(false);
  });

  it('tenant-B context does not set tenant-A ID', async () => {
    const callsB: string[] = [];
    const dbB = buildMockDb(callsB);
    await withTenantContext(dbB, TENANT_B_CTX, async () => 'result-b');

    const leaksA = callsB.some((c) => c.includes('tenant-aaaa-0001'));
    expect(leaksA).toBe(false);
  });

  it('parallel tenant transactions do not bleed tenant IDs', async () => {
    const callsA: string[] = [];
    const callsB: string[] = [];
    const dbA = buildMockDb(callsA);
    const dbB = buildMockDb(callsB);

    await Promise.all([
      withTenantContext(dbA, TENANT_A_CTX, async () => 'a'),
      withTenantContext(dbB, TENANT_B_CTX, async () => 'b'),
    ]);

    const aHasB = callsA.some((c) => c.includes('tenant-bbbb-0002'));
    const bHasA = callsB.some((c) => c.includes('tenant-aaaa-0001'));
    expect(aHasB).toBe(false);
    expect(bHasA).toBe(false);
  });
});
