import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withTenantContext, withBypassRLS } from './withTenantContext';
import type { TenantContext } from './withTenantContext';
import type { DrizzleDB } from '../index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock DrizzleDB whose transaction() delegates to a callback. */
function buildMockDb(txOverrides: Partial<typeof mockTx> = {}): DrizzleDB {
  const tx = { ...mockTx, ...txOverrides };
  const db = {
    transaction: vi.fn(async (cb: (tx: typeof tx) => Promise<unknown>) =>
      cb(tx)
    ),
  } as unknown as DrizzleDB;
  return db;
}

const mockExecute = vi.fn().mockResolvedValue(undefined);

const mockTx = {
  execute: mockExecute,
};

const BASE_CONTEXT: TenantContext = {
  tenantId: 'tenant-abc',
  userId: 'user-xyz',
  userRole: 'STUDENT',
};

// ---------------------------------------------------------------------------
// withTenantContext
// ---------------------------------------------------------------------------

describe('withTenantContext()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue(undefined);
  });

  it('opens a transaction and returns the operation result', async () => {
    const db = buildMockDb();
    const result = await withTenantContext(db, BASE_CONTEXT, async () => 42);
    expect(result).toBe(42);
    expect(db.transaction as ReturnType<typeof vi.fn>).toHaveBeenCalledOnce();
  });

  it('executes SET LOCAL for current_tenant with correct tenant ID', async () => {
    const db = buildMockDb();
    await withTenantContext(db, BASE_CONTEXT, async () => null);

    const calls: string[] = mockExecute.mock.calls.map((c) =>
      JSON.stringify(c[0])
    );
    const tenantCall = calls.find((c) => c.includes('current_tenant'));
    expect(tenantCall).toBeDefined();
    expect(tenantCall).toContain('tenant-abc');
  });

  it('executes SET LOCAL for current_user_id with correct user ID', async () => {
    const db = buildMockDb();
    await withTenantContext(db, BASE_CONTEXT, async () => null);

    const calls: string[] = mockExecute.mock.calls.map((c) =>
      JSON.stringify(c[0])
    );
    const userCall = calls.find((c) => c.includes('current_user_id'));
    expect(userCall).toBeDefined();
    expect(userCall).toContain('user-xyz');
  });

  it('executes SET LOCAL for current_user_role with correct role', async () => {
    const db = buildMockDb();
    await withTenantContext(db, BASE_CONTEXT, async () => null);

    const calls: string[] = mockExecute.mock.calls.map((c) =>
      JSON.stringify(c[0])
    );
    const roleCall = calls.find((c) => c.includes('current_user_role'));
    expect(roleCall).toBeDefined();
    expect(roleCall).toContain('STUDENT');
  });

  it('calls execute exactly 3 times (one per SET LOCAL)', async () => {
    const db = buildMockDb();
    await withTenantContext(db, BASE_CONTEXT, async () => null);
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it('passes the tx instance to the operation callback', async () => {
    const db = buildMockDb();
    let capturedDb: unknown;
    await withTenantContext(db, BASE_CONTEXT, async (txDb) => {
      capturedDb = txDb;
    });
    // The tx received by the operation should be the same mock tx
    expect(capturedDb).toBeDefined();
  });

  it('propagates the operation return value (object)', async () => {
    const db = buildMockDb();
    const payload = { rows: [{ id: '1' }] };
    const result = await withTenantContext(
      db,
      BASE_CONTEXT,
      async () => payload
    );
    expect(result).toEqual(payload);
  });

  it('handles SUPER_ADMIN role correctly', async () => {
    const db = buildMockDb();
    const adminCtx: TenantContext = {
      ...BASE_CONTEXT,
      userRole: 'SUPER_ADMIN',
    };
    await withTenantContext(db, adminCtx, async () => null);

    const calls: string[] = mockExecute.mock.calls.map((c) =>
      JSON.stringify(c[0])
    );
    const roleCall = calls.find((c) => c.includes('current_user_role'));
    expect(roleCall).toContain('SUPER_ADMIN');
  });

  it('handles INSTRUCTOR role correctly', async () => {
    const db = buildMockDb();
    const instructorCtx: TenantContext = {
      ...BASE_CONTEXT,
      userRole: 'INSTRUCTOR',
    };
    await withTenantContext(db, instructorCtx, async () => null);

    const calls: string[] = mockExecute.mock.calls.map((c) =>
      JSON.stringify(c[0])
    );
    const roleCall = calls.find((c) => c.includes('current_user_role'));
    expect(roleCall).toContain('INSTRUCTOR');
  });

  it('propagates errors thrown inside the operation', async () => {
    const db = buildMockDb();
    await expect(
      withTenantContext(db, BASE_CONTEXT, async () => {
        throw new Error('query failed');
      })
    ).rejects.toThrow('query failed');
  });

  it('propagates errors from SET LOCAL execute calls (rollback scenario)', async () => {
    mockExecute.mockRejectedValueOnce(new Error('SET LOCAL failed'));
    const db = buildMockDb();
    await expect(
      withTenantContext(db, BASE_CONTEXT, async () => 'never')
    ).rejects.toThrow('SET LOCAL failed');
  });

  it('cross-tenant isolation: Tenant A context does not bleed into Tenant B', async () => {
    const tenantACalls: string[] = [];
    const tenantBCalls: string[] = [];

    const executeA = vi.fn(async (sqlObj: unknown) => {
      tenantACalls.push(JSON.stringify(sqlObj));
    });
    const executeB = vi.fn(async (sqlObj: unknown) => {
      tenantBCalls.push(JSON.stringify(sqlObj));
    });

    const dbA = buildMockDb({ execute: executeA });
    const dbB = buildMockDb({ execute: executeB });

    const ctxA: TenantContext = {
      tenantId: 'tenant-A',
      userId: 'user-A',
      userRole: 'STUDENT',
    };
    const ctxB: TenantContext = {
      tenantId: 'tenant-B',
      userId: 'user-B',
      userRole: 'ORG_ADMIN',
    };

    await withTenantContext(dbA, ctxA, async () => 'a');
    await withTenantContext(dbB, ctxB, async () => 'b');

    const aTenantSet = tenantACalls.find((c) => c.includes('current_tenant'));
    const bTenantSet = tenantBCalls.find((c) => c.includes('current_tenant'));

    // Tenant A's SET LOCAL only contains tenant-A
    expect(aTenantSet).toContain('tenant-A');
    expect(aTenantSet).not.toContain('tenant-B');

    // Tenant B's SET LOCAL only contains tenant-B
    expect(bTenantSet).toContain('tenant-B');
    expect(bTenantSet).not.toContain('tenant-A');
  });

  it('SET LOCAL calls happen before the operation', async () => {
    const callOrder: string[] = [];
    const orderExecute = vi.fn(async () => {
      callOrder.push('set_local');
    });
    const db = buildMockDb({ execute: orderExecute });
    await withTenantContext(db, BASE_CONTEXT, async () => {
      callOrder.push('operation');
    });
    expect(callOrder.indexOf('set_local')).toBeLessThan(
      callOrder.indexOf('operation')
    );
  });
});

// ---------------------------------------------------------------------------
// withBypassRLS
// ---------------------------------------------------------------------------

describe('withBypassRLS()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue(undefined);
  });

  it('opens a transaction and returns the operation result', async () => {
    const db = buildMockDb();
    const result = await withBypassRLS(db, async () => 'bypassed');
    expect(result).toBe('bypassed');
    expect(db.transaction as ReturnType<typeof vi.fn>).toHaveBeenCalledOnce();
  });

  it('executes SET LOCAL row_security = OFF before the operation', async () => {
    const callOrder: string[] = [];
    const orderExecute = vi.fn(async (sqlObj: unknown) => {
      callOrder.push(JSON.stringify(sqlObj));
    });
    const db = buildMockDb({ execute: orderExecute });
    await withBypassRLS(db, async () => {
      callOrder.push('operation');
    });

    const offIdx = callOrder.findIndex((c) => c.includes('OFF'));
    const opIdx = callOrder.indexOf('operation');
    expect(offIdx).toBeGreaterThanOrEqual(0);
    expect(offIdx).toBeLessThan(opIdx);
  });

  it('executes SET LOCAL row_security = ON after the operation', async () => {
    const callOrder: string[] = [];
    const orderExecute = vi.fn(async (sqlObj: unknown) => {
      callOrder.push(JSON.stringify(sqlObj));
    });
    const db = buildMockDb({ execute: orderExecute });
    await withBypassRLS(db, async () => {
      callOrder.push('operation');
    });

    const onIdx = callOrder.findIndex((c) => c.includes('ON'));
    const opIdx = callOrder.indexOf('operation');
    expect(onIdx).toBeGreaterThan(opIdx);
  });

  it('calls execute exactly twice (OFF then ON)', async () => {
    const db = buildMockDb();
    await withBypassRLS(db, async () => null);
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it('propagates errors thrown inside the operation', async () => {
    const db = buildMockDb();
    await expect(
      withBypassRLS(db, async () => {
        throw new Error('bypass op failed');
      })
    ).rejects.toThrow('bypass op failed');
  });

  it('propagates an object return value correctly', async () => {
    const db = buildMockDb();
    const data = [{ id: 'row-1' }];
    const result = await withBypassRLS(db, async () => data);
    expect(result).toEqual(data);
  });
});
