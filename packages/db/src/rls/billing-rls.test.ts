/**
 * RLS validation tests for billing/subscription tables.
 *
 * Tables covered:
 *   subscription_plans   — no RLS (global catalogue, readable by all authenticated)
 *   tenant_subscriptions — tenant isolation + SUPER_ADMIN cross-tenant
 *   yau_events           — tenant isolation
 *
 * All tests are unit-style (no live DB required). They verify the pgPolicy
 * SQL expressions in the billing schema enforce correct access patterns.
 *
 * Security Invariant SI-3: Tenant isolation via app.current_tenant
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getTableName } from 'drizzle-orm';
import { tenantSubscriptions } from '../schema/billing';
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

const TENANT_B_CTX: TenantContext = {
  tenantId: 'tenant-bbbb-0002',
  userId: 'user-bbbb-0002',
  userRole: 'ORG_ADMIN',
};

const SUPER_ADMIN_CTX: TenantContext = {
  tenantId: 'tenant-aaaa-0001',
  userId: 'user-super-admin',
  userRole: 'SUPER_ADMIN',
};

const billingFile = readFileSync(
  resolve(__dirname, '../schema/billing.ts'),
  'utf8'
);

// ---------------------------------------------------------------------------
// tenant_subscriptions RLS
// ---------------------------------------------------------------------------

describe('tenant_subscriptions: tenant isolation policy', () => {
  it('tenant_subscriptions_tenant_isolation uses app.current_tenant', () => {
    const policyStart = billingFile.indexOf(
      'tenant_subscriptions_tenant_isolation'
    );
    const policyEnd = billingFile.indexOf(
      'tenant_subscriptions_admin_write',
      policyStart
    );
    const policySection = billingFile.slice(policyStart, policyEnd);
    expect(policySection).toContain('app.current_tenant');
  });

  it('tenant_subscriptions_tenant_isolation has withCheck for tenant enforcement', () => {
    const policyStart = billingFile.indexOf(
      'tenant_subscriptions_tenant_isolation'
    );
    const policyEnd = billingFile.indexOf(
      'tenant_subscriptions_admin_write',
      policyStart
    );
    const policySection = billingFile.slice(policyStart, policyEnd);
    expect(policySection).toContain('withCheck');
  });
});

describe('tenant_subscriptions: admin write policy allows SUPER_ADMIN', () => {
  it('admin_write policy allows SUPER_ADMIN cross-tenant', () => {
    const policyStart = billingFile.indexOf(
      'tenant_subscriptions_admin_write'
    );
    const policyEnd = billingFile.indexOf('].enableRLS()', policyStart);
    const policySection = billingFile.slice(policyStart, policyEnd);
    expect(policySection).toContain('SUPER_ADMIN');
  });

  it('admin_write policy also allows same-tenant access', () => {
    const policyStart = billingFile.indexOf(
      'tenant_subscriptions_admin_write'
    );
    const policyEnd = billingFile.indexOf('].enableRLS()', policyStart);
    const policySection = billingFile.slice(policyStart, policyEnd);
    expect(policySection).toContain('app.current_tenant');
  });
});

// ---------------------------------------------------------------------------
// subscription_plans: NO RLS (global catalogue)
// ---------------------------------------------------------------------------

describe('subscription_plans: no RLS (global catalogue)', () => {
  it('subscriptionPlans table section does NOT contain pgPolicy', () => {
    const tableStart = billingFile.indexOf("'subscription_plans'");
    const tableEnd = billingFile.indexOf("'tenant_subscriptions'");
    const tableSection = billingFile.slice(tableStart, tableEnd);
    expect(tableSection).not.toContain('pgPolicy');
  });
});

// ---------------------------------------------------------------------------
// yau_events RLS
// ---------------------------------------------------------------------------

describe('yau_events RLS: tenant isolation', () => {
  it('yau_events_tenant_isolation policy uses app.current_tenant', () => {
    const policyStart = billingFile.indexOf('yau_events_tenant_isolation');
    expect(policyStart).toBeGreaterThan(-1);
    const policySection = billingFile.slice(policyStart, policyStart + 300);
    expect(policySection).toContain('app.current_tenant');
  });
});

// ---------------------------------------------------------------------------
// Drizzle table structure
// ---------------------------------------------------------------------------

describe('tenantSubscriptions Drizzle table is defined correctly', () => {
  it('tenantSubscriptions table is defined', () => {
    expect(tenantSubscriptions).toBeDefined();
    expect(getTableName(tenantSubscriptions)).toBe('tenant_subscriptions');
  });
});

// ---------------------------------------------------------------------------
// withTenantContext: billing isolation
// ---------------------------------------------------------------------------

describe('withTenantContext: billing tenant isolation', () => {
  beforeEach(() => vi.clearAllMocks());

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

  it('SUPER_ADMIN context sets role to SUPER_ADMIN', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, SUPER_ADMIN_CTX, async () => null);

    const roleCall = calls.find((c) => c.includes('current_user_role'));
    expect(roleCall).toContain('SUPER_ADMIN');
  });
});
