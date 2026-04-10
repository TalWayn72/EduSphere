/**
 * RLS validation tests for the users table.
 *
 * All tests are unit-style (no live DB required). They verify:
 *  1. usersRLSPolicy SQL uses app.current_tenant for tenant isolation
 *  2. USING and WITH CHECK clauses present and correct
 *  3. withTenantContext sets correct session variables
 *  4. Cross-tenant isolation: tenant A context does not leak tenant B ID
 *
 * Security Invariant SI-3: Tenant isolation via app.current_tenant
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getTableName } from 'drizzle-orm';
import { usersRLSPolicy, users } from '../schema/users';
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
  userRole: 'STUDENT',
};

const TENANT_B_CTX: TenantContext = {
  tenantId: 'tenant-bbbb-0002',
  userId: 'user-bbbb-0002',
  userRole: 'STUDENT',
};

const SUPER_ADMIN_CTX: TenantContext = {
  tenantId: 'tenant-aaaa-0001',
  userId: 'user-admin-0001',
  userRole: 'SUPER_ADMIN',
};

// ---------------------------------------------------------------------------
// usersRLSPolicy SQL expression validation
// ---------------------------------------------------------------------------

describe('usersRLSPolicy: SQL references app.current_tenant', () => {
  it('USING clause references app.current_tenant', () => {
    const raw = sqlToString(usersRLSPolicy as Parameters<typeof sqlToString>[0]);
    expect(raw).toContain('app.current_tenant');
  });

  it('WITH CHECK clause references app.current_tenant', () => {
    const raw = sqlToString(usersRLSPolicy as Parameters<typeof sqlToString>[0]);
    const withCheckIdx = raw.toUpperCase().indexOf('WITH CHECK');
    expect(withCheckIdx).toBeGreaterThan(-1);
    const withCheckSection = raw.slice(withCheckIdx);
    expect(withCheckSection).toContain('app.current_tenant');
  });

  it('has both USING and WITH CHECK clauses', () => {
    const raw = sqlToString(usersRLSPolicy as Parameters<typeof sqlToString>[0]);
    expect(raw.toUpperCase()).toContain('USING');
    expect(raw.toUpperCase()).toContain('WITH CHECK');
  });

  it('policy enables row level security', () => {
    const raw = sqlToString(usersRLSPolicy as Parameters<typeof sqlToString>[0]);
    expect(raw.toUpperCase()).toContain('ROW LEVEL SECURITY');
  });
});

// ---------------------------------------------------------------------------
// Schema file static analysis
// ---------------------------------------------------------------------------

describe('users schema file structure', () => {
  const schemaFile = readFileSync(
    resolve(__dirname, '../schema/users.ts'),
    'utf8'
  );

  it('users table has tenant_id column', () => {
    expect(schemaFile).toContain('tenantId');
    expect(schemaFile).toContain('tenant_id');
  });

  it('users table has role column with SUPER_ADMIN value', () => {
    expect(schemaFile).toContain('SUPER_ADMIN');
    expect(schemaFile).toContain('userRoleEnum');
  });

  it('exports User and NewUser types', () => {
    expect(schemaFile).toContain('export type User');
    expect(schemaFile).toContain('export type NewUser');
  });
});

// ---------------------------------------------------------------------------
// Drizzle table structure
// ---------------------------------------------------------------------------

describe('users Drizzle table is defined correctly', () => {
  it('users table is defined', () => {
    expect(users).toBeDefined();
    expect(getTableName(users)).toBe('users');
  });
});

// ---------------------------------------------------------------------------
// withTenantContext: correct session variables for users
// ---------------------------------------------------------------------------

describe('withTenantContext: session variables for users RLS', () => {
  beforeEach(() => vi.clearAllMocks());

  it('SET LOCAL sets current_tenant to the provided tenant ID', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, TENANT_A_CTX, async () => null);

    const tenantCall = calls.find((c) => c.includes('current_tenant'));
    expect(tenantCall).toBeDefined();
    expect(tenantCall).toContain('tenant-aaaa-0001');
  });

  it('SUPER_ADMIN context sets role to SUPER_ADMIN', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, SUPER_ADMIN_CTX, async () => null);

    const roleCall = calls.find((c) => c.includes('current_user_role'));
    expect(roleCall).toContain('SUPER_ADMIN');
  });
});

// ---------------------------------------------------------------------------
// Cross-tenant isolation for users
// ---------------------------------------------------------------------------

describe('Cross-tenant isolation for users table', () => {
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

  it('parallel user transactions do not bleed tenant IDs', async () => {
    const callsA: string[] = [];
    const callsB: string[] = [];
    const dbA = buildMockDb(callsA);
    const dbB = buildMockDb(callsB);

    await Promise.all([
      withTenantContext(dbA, TENANT_A_CTX, async () => 'a'),
      withTenantContext(dbB, TENANT_B_CTX, async () => 'b'),
    ]);

    expect(callsA.some((c) => c.includes('tenant-bbbb-0002'))).toBe(false);
    expect(callsB.some((c) => c.includes('tenant-aaaa-0001'))).toBe(false);
  });
});
