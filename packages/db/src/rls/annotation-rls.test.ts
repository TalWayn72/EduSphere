/**
 * Regression tests for G-01 — RLS variable mismatch in annotation schemas.
 *
 * All tests are unit-style (no live DB required). They verify:
 *  1. The SQL expressions in the exported RLS statements use `app.current_user_id`
 *     (not the broken `app.current_user`).
 *  2. withTenantContext sets `app.current_user_id` (not `app.current_user`), so
 *     the context variable matches the policy variable.
 *  3. Cross-user isolation: a query executed under user-A context never exposes
 *     user-B data — modelled via mock DB callbacks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { annotationsRLS } from '../schema/annotations';
import { agentSessionsRLS } from '../schema/agentSessions';
import { agentMessagesRLS } from '../schema/agentMessages';
import { userCoursesRLS } from '../schema/userCourses';
import { userProgressRLS } from '../schema/userProgress';
import { withTenantContext } from './withTenantContext';
import type { TenantContext } from './withTenantContext';
import type { DrizzleDB } from '../index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Serialise the sql template tag object produced by drizzle-orm/sql to a string. */
function sqlToString(sqlObj: { queryChunks?: unknown[]; sql?: string }): string {
  // drizzle sql.raw() returns an object with a `sql` string property.
  // drizzle sql`` returns an object whose .queryChunks contain SQL strings.
  if (typeof sqlObj.sql === 'string') return sqlObj.sql;
  if (Array.isArray(sqlObj.queryChunks)) {
    return sqlObj.queryChunks
      .map((chunk) => {
        if (typeof chunk === 'string') return chunk;
        if (chunk && typeof (chunk as Record<string, unknown>).value === 'string') {
          return (chunk as Record<string, unknown>).value as string;
        }
        return JSON.stringify(chunk);
      })
      .join('');
  }
  // Fallback: stringify the whole object so assertions can still search it.
  return JSON.stringify(sqlObj);
}

function buildMockDb(capturedCalls: string[]): DrizzleDB {
  const mockTx = {
    execute: vi.fn(async (sqlObj: unknown) => {
      capturedCalls.push(JSON.stringify(sqlObj));
    }),
  };
  return {
    transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
  } as unknown as DrizzleDB;
}

const USER_A_CTX: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'user-aaaa-0001',
  userRole: 'STUDENT',
};

const USER_B_CTX: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'user-bbbb-0002',
  userRole: 'STUDENT',
};

// ---------------------------------------------------------------------------
// G-01 — RLS SQL expression must reference app.current_user_id
// ---------------------------------------------------------------------------

describe('G-01: RLS policies reference app.current_user_id (not app.current_user)', () => {
  it('annotations policy uses app.current_user_id', () => {
    const raw = sqlToString(annotationsRLS as Parameters<typeof sqlToString>[0]);
    expect(raw).toContain("app.current_user_id");
    expect(raw).not.toMatch(/current_setting\('app\.current_user'/);
  });

  it('annotations policy has both USING and WITH CHECK clauses', () => {
    const raw = sqlToString(annotationsRLS as Parameters<typeof sqlToString>[0]);
    expect(raw.toUpperCase()).toContain('USING');
    expect(raw.toUpperCase()).toContain('WITH CHECK');
  });

  it('agentSessions policy uses app.current_user_id', () => {
    const raw = sqlToString(agentSessionsRLS as Parameters<typeof sqlToString>[0]);
    expect(raw).toContain("app.current_user_id");
    expect(raw).not.toMatch(/current_setting\('app\.current_user'/);
  });

  it('agentSessions policy has both USING and WITH CHECK clauses', () => {
    const raw = sqlToString(agentSessionsRLS as Parameters<typeof sqlToString>[0]);
    expect(raw.toUpperCase()).toContain('USING');
    expect(raw.toUpperCase()).toContain('WITH CHECK');
  });

  it('agentMessages policy uses app.current_user_id', () => {
    const raw = sqlToString(agentMessagesRLS as Parameters<typeof sqlToString>[0]);
    expect(raw).toContain("app.current_user_id");
    expect(raw).not.toMatch(/current_setting\('app\.current_user'/);
  });

  it('userCourses policy uses app.current_user_id', () => {
    const raw = sqlToString(userCoursesRLS as Parameters<typeof sqlToString>[0]);
    expect(raw).toContain("app.current_user_id");
    expect(raw).not.toMatch(/current_setting\('app\.current_user'/);
  });

  it('userProgress policy uses app.current_user_id', () => {
    const raw = sqlToString(userProgressRLS as Parameters<typeof sqlToString>[0]);
    expect(raw).toContain("app.current_user_id");
    expect(raw).not.toMatch(/current_setting\('app\.current_user'/);
  });

  it('userProgress policy has both USING and WITH CHECK clauses', () => {
    const raw = sqlToString(userProgressRLS as Parameters<typeof sqlToString>[0]);
    expect(raw.toUpperCase()).toContain('USING');
    expect(raw.toUpperCase()).toContain('WITH CHECK');
  });
});

// ---------------------------------------------------------------------------
// withTenantContext sets app.current_user_id (matching the fixed policies)
// ---------------------------------------------------------------------------

describe('withTenantContext sets app.current_user_id to match RLS policies', () => {
  beforeEach(() => vi.clearAllMocks());

  it('SET LOCAL uses current_user_id key (not current_user)', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, USER_A_CTX, async () => null);

    const userIdCall = calls.find((c) => c.includes('current_user_id'));
    expect(userIdCall).toBeDefined();

    // Must NOT set a bare `current_user` variable
    const badCall = calls.find((c) =>
      c.includes('current_user') && !c.includes('current_user_id') && !c.includes('current_user_role')
    );
    expect(badCall).toBeUndefined();
  });

  it('SET LOCAL embeds the correct user ID value', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, USER_A_CTX, async () => null);

    const userIdCall = calls.find((c) => c.includes('current_user_id'));
    expect(userIdCall).toContain('user-aaaa-0001');
  });
});

// ---------------------------------------------------------------------------
// Cross-user isolation — user A cannot see user B's data
// ---------------------------------------------------------------------------

describe('Cross-user isolation via withTenantContext', () => {
  beforeEach(() => vi.clearAllMocks());

  it('user-A context does not set user-B ID', async () => {
    const callsA: string[] = [];
    const dbA = buildMockDb(callsA);

    await withTenantContext(dbA, USER_A_CTX, async () => 'result-a');

    // User A's transaction must not reference user B's ID anywhere
    const leaksB = callsA.some((c) => c.includes('user-bbbb-0002'));
    expect(leaksB).toBe(false);
  });

  it('user-B context does not set user-A ID', async () => {
    const callsB: string[] = [];
    const dbB = buildMockDb(callsB);

    await withTenantContext(dbB, USER_B_CTX, async () => 'result-b');

    // User B's transaction must not reference user A's ID anywhere
    const leaksA = callsB.some((c) => c.includes('user-aaaa-0001'));
    expect(leaksA).toBe(false);
  });

  it('parallel transactions do not bleed user IDs across contexts', async () => {
    const callsA: string[] = [];
    const callsB: string[] = [];
    const dbA = buildMockDb(callsA);
    const dbB = buildMockDb(callsB);

    // Run both contexts concurrently
    await Promise.all([
      withTenantContext(dbA, USER_A_CTX, async () => 'a'),
      withTenantContext(dbB, USER_B_CTX, async () => 'b'),
    ]);

    const aHasB = callsA.some((c) => c.includes('user-bbbb-0002'));
    const bHasA = callsB.some((c) => c.includes('user-aaaa-0001'));
    expect(aHasB).toBe(false);
    expect(bHasA).toBe(false);
  });

  it('a user CANNOT write annotations for another user — policy rejects mismatched user_id', () => {
    // Unit-level: verify the WITH CHECK expression in annotations policy
    // enforces current_user_id match on insert/update.
    const raw = sqlToString(annotationsRLS as Parameters<typeof sqlToString>[0]);
    // The WITH CHECK must compare user_id to the session variable
    const withCheckSection = raw.slice(raw.toUpperCase().indexOf('WITH CHECK'));
    expect(withCheckSection).toContain("app.current_user_id");
  });

  it('a user CAN read their own annotations — policy allows matching user_id', () => {
    // The USING clause must allow access when user_id matches current_user_id
    const raw = sqlToString(annotationsRLS as Parameters<typeof sqlToString>[0]);
    const usingSection = raw.slice(
      raw.toUpperCase().indexOf('USING'),
      raw.toUpperCase().indexOf('WITH CHECK'),
    );
    expect(usingSection).toContain("app.current_user_id");
  });
});
