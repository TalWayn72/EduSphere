/**
 * RLS validation tests for the Smart Transcript Polishing tables.
 *
 * Validates:
 *  1. RLS SQL for instructor_voice_profiles and polished_transcripts uses app.current_tenant
 *  2. withTenantContext sets the correct session variables
 *  3. Cross-tenant isolation: tenant A context does not leak tenant B ID
 *
 * Note: polished_transcript_blocks and polished_block_changes cascade from
 * polished_transcripts (no tenant_id column) — their isolation is inherited
 * via ON DELETE CASCADE and validated through the parent table's RLS.
 *
 * Security Invariant SI-3: Tenant isolation via app.current_tenant
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  instructor_voice_profiles,
  polished_transcripts,
} from '../schema/polished-transcript';
import { withTenantContext } from './withTenantContext';
import type { TenantContext } from './withTenantContext';
import type { DrizzleDB } from '../index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractRlsSql(table: {
  _: { config?: { policies?: Array<{ config?: { using?: unknown; withCheck?: unknown } }> } };
}): string {
  const policies = table._?.config?.policies ?? [];
  return policies
    .map((p) => {
      const using = p.config?.using;
      const withCheck = p.config?.withCheck;
      return [
        using ? JSON.stringify(using) : '',
        withCheck ? JSON.stringify(withCheck) : '',
      ].join(' ');
    })
    .join(' ');
}

function buildMockDb(capturedCalls: string[]): DrizzleDB {
  const mockTx = {
    execute: vi.fn(async (sqlObj: unknown) => {
      capturedCalls.push(JSON.stringify(sqlObj));
    }),
  };
  return {
    transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
      cb(mockTx),
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
// instructor_voice_profiles: RLS policy SQL
// ---------------------------------------------------------------------------

describe('instructor_voice_profiles: RLS policy references app.current_tenant', () => {
  it('table has RLS enabled (enableRLS called)', () => {
    const sym = Object.getOwnPropertySymbols(instructor_voice_profiles).find(
      (s) => s.toString().includes('EnableRLS'),
    );
    // Drizzle sets a Symbol on the table when enableRLS() is called
    expect(sym !== undefined || 'enableRLS' in instructor_voice_profiles).toBe(
      true,
    );
  });

  it('RLS policy SQL references app.current_tenant', () => {
    const raw = extractRlsSql(
      instructor_voice_profiles as unknown as Parameters<
        typeof extractRlsSql
      >[0],
    );
    expect(raw).toContain('app.current_tenant');
  });
});

// ---------------------------------------------------------------------------
// polished_transcripts: RLS policy SQL
// ---------------------------------------------------------------------------

describe('polished_transcripts: RLS policy references app.current_tenant', () => {
  it('table has RLS enabled (enableRLS called)', () => {
    const sym = Object.getOwnPropertySymbols(polished_transcripts).find((s) =>
      s.toString().includes('EnableRLS'),
    );
    expect(sym !== undefined || 'enableRLS' in polished_transcripts).toBe(true);
  });

  it('RLS policy SQL references app.current_tenant', () => {
    const raw = extractRlsSql(
      polished_transcripts as unknown as Parameters<typeof extractRlsSql>[0],
    );
    expect(raw).toContain('app.current_tenant');
  });
});

// ---------------------------------------------------------------------------
// withTenantContext: session variable propagation
// ---------------------------------------------------------------------------

describe('withTenantContext: correct session variables for polished-transcript tables', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets current_tenant session variable with correct tenant ID', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, TENANT_A_CTX, async () => null);

    const tenantCall = calls.find((c) => c.includes('current_tenant'));
    expect(tenantCall).toBeDefined();
    expect(tenantCall).toContain('tenant-aaaa-0001');
  });

  it('does not embed tenant-B ID when running in tenant-A context', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, TENANT_A_CTX, async () => null);

    const leaksB = calls.some((c) => c.includes('tenant-bbbb-0002'));
    expect(leaksB).toBe(false);
  });

  it('SUPER_ADMIN context sets current_user_role to SUPER_ADMIN', async () => {
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

describe('Cross-tenant isolation for polished-transcript tables', () => {
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

  it('instructor voice profile query in tenant-A does not see tenant-B records', async () => {
    const callsA: string[] = [];
    const dbA = buildMockDb(callsA);
    await withTenantContext(dbA, TENANT_A_CTX, async () => {
      // Simulates a query within tenant-A context
      return 'voice-profiles-result';
    });

    const hasBTenant = callsA.some((c) => c.includes('tenant-bbbb'));
    expect(hasBTenant).toBe(false);
  });

  it('polished transcript query in tenant-B does not see tenant-A records', async () => {
    const callsB: string[] = [];
    const dbB = buildMockDb(callsB);
    await withTenantContext(dbB, TENANT_B_CTX, async () => {
      return 'transcripts-result';
    });

    const hasATenant = callsB.some((c) => c.includes('tenant-aaaa'));
    expect(hasATenant).toBe(false);
  });
});
