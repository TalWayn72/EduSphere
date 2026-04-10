/**
 * RLS validation tests for the certificates table.
 *
 * All tests are unit-style (no live DB required). They verify:
 *  1. certificatesRLS USING clause enforces tenant isolation + user ownership
 *  2. INSTRUCTOR/ORG_ADMIN/SUPER_ADMIN can read all certificates in their tenant
 *  3. WITH CHECK enforces tenant isolation for writes
 *  4. withTenantContext sets the correct session variables
 *  5. Cross-tenant isolation via withTenantContext mock
 *
 * Security Invariants SI-1 (user isolation) and SI-3 (tenant isolation).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { certificatesRLS, certificates } from '../schema/certificates';
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

const STUDENT_CTX: TenantContext = {
  tenantId: 'tenant-aaaa-0001',
  userId: 'student-aaaa-0001',
  userRole: 'STUDENT',
};

const TENANT_B_STUDENT_CTX: TenantContext = {
  tenantId: 'tenant-bbbb-0002',
  userId: 'student-bbbb-0002',
  userRole: 'STUDENT',
};

const INSTRUCTOR_CTX: TenantContext = {
  tenantId: 'tenant-aaaa-0001',
  userId: 'instructor-0001',
  userRole: 'INSTRUCTOR',
};

// ---------------------------------------------------------------------------
// certificatesRLS SQL expression validation
// ---------------------------------------------------------------------------

describe('certificatesRLS: USING clause structure', () => {
  it('USING clause references app.current_tenant', () => {
    const raw = sqlToString(certificatesRLS as Parameters<typeof sqlToString>[0]);
    const usingIdx = raw.toUpperCase().indexOf('USING');
    expect(usingIdx).toBeGreaterThan(-1);
    const usingSection = raw.slice(
      usingIdx,
      raw.toUpperCase().indexOf('WITH CHECK')
    );
    expect(usingSection).toContain('app.current_tenant');
  });

  it('USING clause references app.current_user_id for student access (SI-1)', () => {
    const raw = sqlToString(certificatesRLS as Parameters<typeof sqlToString>[0]);
    const usingIdx = raw.toUpperCase().indexOf('USING');
    const withCheckIdx = raw.toUpperCase().indexOf('WITH CHECK');
    const usingSection = raw.slice(usingIdx, withCheckIdx);
    expect(usingSection).toContain('app.current_user_id');
  });

  it('USING clause allows INSTRUCTOR/ORG_ADMIN/SUPER_ADMIN', () => {
    const raw = sqlToString(certificatesRLS as Parameters<typeof sqlToString>[0]);
    expect(raw).toContain('INSTRUCTOR');
    expect(raw).toContain('ORG_ADMIN');
    expect(raw).toContain('SUPER_ADMIN');
  });

  it('has both USING and WITH CHECK clauses', () => {
    const raw = sqlToString(certificatesRLS as Parameters<typeof sqlToString>[0]);
    expect(raw.toUpperCase()).toContain('USING');
    expect(raw.toUpperCase()).toContain('WITH CHECK');
  });

  it('WITH CHECK enforces tenant isolation only (not user restriction)', () => {
    const raw = sqlToString(certificatesRLS as Parameters<typeof sqlToString>[0]);
    const withCheckIdx = raw.toUpperCase().indexOf('WITH CHECK');
    const withCheckSection = raw.slice(withCheckIdx);
    expect(withCheckSection).toContain('app.current_tenant');
  });
});

// ---------------------------------------------------------------------------
// Drizzle table structure
// ---------------------------------------------------------------------------

describe('certificates Drizzle table is defined correctly', () => {
  it('certificates table is defined', () => {
    expect(certificates).toBeDefined();
    expect(getTableName(certificates)).toBe('certificates');
  });
});

// ---------------------------------------------------------------------------
// withTenantContext: session variable propagation
// ---------------------------------------------------------------------------

describe('withTenantContext: certificate access session variables', () => {
  beforeEach(() => vi.clearAllMocks());

  it('student context sets current_user_id correctly', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, STUDENT_CTX, async () => null);

    const userIdCall = calls.find((c) => c.includes('current_user_id'));
    expect(userIdCall).toContain('student-aaaa-0001');
  });

  it('INSTRUCTOR context sets role to INSTRUCTOR', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, INSTRUCTOR_CTX, async () => null);

    const roleCall = calls.find((c) => c.includes('current_user_role'));
    expect(roleCall).toContain('INSTRUCTOR');
  });
});

// ---------------------------------------------------------------------------
// Cross-tenant isolation for certificates
// ---------------------------------------------------------------------------

describe('Cross-tenant isolation for certificates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tenant-A student context does not leak tenant-B ID', async () => {
    const callsA: string[] = [];
    const dbA = buildMockDb(callsA);
    await withTenantContext(dbA, STUDENT_CTX, async () => 'result-a');

    const leaksB = callsA.some((c) => c.includes('tenant-bbbb-0002'));
    expect(leaksB).toBe(false);
  });

  it('tenant-B student context does not leak tenant-A ID', async () => {
    const callsB: string[] = [];
    const dbB = buildMockDb(callsB);
    await withTenantContext(dbB, TENANT_B_STUDENT_CTX, async () => 'result-b');

    const leaksA = callsB.some((c) => c.includes('tenant-aaaa-0001'));
    expect(leaksA).toBe(false);
  });
});
