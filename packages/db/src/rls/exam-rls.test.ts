/**
 * RLS validation tests for exam_sessions and exam_results tables.
 *
 * All tests are unit-style (no live DB required). They verify:
 *  1. exam_sessions RLS enforces tenant isolation AND user isolation
 *  2. exam_results RLS allows INSTRUCTOR/ORG_ADMIN/SUPER_ADMIN to read all in tenant
 *  3. Students can only see their own sessions/results (SI-1 + SI-3)
 *  4. withTenantContext isolation: student A cannot see student B data
 *
 * Security Invariants SI-1 (user isolation) and SI-3 (tenant isolation).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
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

const STUDENT_A_CTX: TenantContext = {
  tenantId: 'tenant-aaaa-0001',
  userId: 'student-aaaa-0001',
  userRole: 'STUDENT',
};

const STUDENT_B_CTX: TenantContext = {
  tenantId: 'tenant-aaaa-0001',
  userId: 'student-bbbb-0002',
  userRole: 'STUDENT',
};

const INSTRUCTOR_CTX: TenantContext = {
  tenantId: 'tenant-aaaa-0001',
  userId: 'instructor-0001',
  userRole: 'INSTRUCTOR',
};

// ---------------------------------------------------------------------------
// exam_sessions schema static analysis
// ---------------------------------------------------------------------------

describe('exam_sessions RLS policy structure', () => {
  const sessionsFile = readFileSync(
    resolve(__dirname, '../schema/exam/exam-sessions.ts'),
    'utf8'
  );

  it('uses app.current_tenant for tenant isolation', () => {
    expect(sessionsFile).toContain('app.current_tenant');
  });

  it('uses app.current_user_id for user isolation (SI-1)', () => {
    expect(sessionsFile).toContain('app.current_user_id');
    expect(sessionsFile).not.toMatch(
      /current_setting\('app\.current_user'[^_]/
    );
  });

  it('allows INSTRUCTOR/ORG_ADMIN/SUPER_ADMIN to read all sessions in tenant', () => {
    expect(sessionsFile).toContain('INSTRUCTOR');
    expect(sessionsFile).toContain('ORG_ADMIN');
    expect(sessionsFile).toContain('SUPER_ADMIN');
  });

  it('WITH CHECK restricts writes to own user_id via withCheck property', () => {
    expect(sessionsFile).toContain('withCheck');
  });

  it('enableRLS is called on exam_sessions table', () => {
    expect(sessionsFile).toContain('enableRLS()');
  });
});

// ---------------------------------------------------------------------------
// exam_results schema static analysis
// ---------------------------------------------------------------------------

describe('exam_results RLS policy structure', () => {
  const resultsFile = readFileSync(
    resolve(__dirname, '../schema/exam/exam-results.ts'),
    'utf8'
  );

  it('uses app.current_tenant for tenant isolation', () => {
    expect(resultsFile).toContain('app.current_tenant');
  });

  it('uses app.current_user_id for student isolation (SI-1)', () => {
    expect(resultsFile).toContain('app.current_user_id');
    expect(resultsFile).not.toMatch(/current_setting\('app\.current_user'[^_]/);
  });

  it('allows INSTRUCTOR/ORG_ADMIN/SUPER_ADMIN to read across users in tenant', () => {
    expect(resultsFile).toContain('INSTRUCTOR');
    expect(resultsFile).toContain('ORG_ADMIN');
    expect(resultsFile).toContain('SUPER_ADMIN');
  });

  it('withCheck restricts writes to privileged roles', () => {
    expect(resultsFile).toContain('withCheck');
  });

  it('enableRLS is called on exam_results table', () => {
    expect(resultsFile).toContain('enableRLS()');
  });
});

// ---------------------------------------------------------------------------
// withTenantContext: student context isolation
// ---------------------------------------------------------------------------

describe('withTenantContext: student exam session isolation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('student-A context sets their own user ID', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, STUDENT_A_CTX, async () => null);

    const userIdCall = calls.find((c) => c.includes('current_user_id'));
    expect(userIdCall).toBeDefined();
    expect(userIdCall).toContain('student-aaaa-0001');
  });

  it('student-A context does not set student-B user ID', async () => {
    const callsA: string[] = [];
    const dbA = buildMockDb(callsA);
    await withTenantContext(dbA, STUDENT_A_CTX, async () => 'a');

    const leaksB = callsA.some((c) => c.includes('student-bbbb-0002'));
    expect(leaksB).toBe(false);
  });

  it('student-B context does not set student-A user ID', async () => {
    const callsB: string[] = [];
    const dbB = buildMockDb(callsB);
    await withTenantContext(dbB, STUDENT_B_CTX, async () => 'b');

    const leaksA = callsB.some((c) => c.includes('student-aaaa-0001'));
    expect(leaksA).toBe(false);
  });

  it('INSTRUCTOR context sets role to INSTRUCTOR', async () => {
    const calls: string[] = [];
    const db = buildMockDb(calls);
    await withTenantContext(db, INSTRUCTOR_CTX, async () => null);

    const roleCall = calls.find((c) => c.includes('current_user_role'));
    expect(roleCall).toContain('INSTRUCTOR');
  });

  it('parallel student transactions do not bleed user IDs', async () => {
    const callsA: string[] = [];
    const callsB: string[] = [];
    const dbA = buildMockDb(callsA);
    const dbB = buildMockDb(callsB);

    await Promise.all([
      withTenantContext(dbA, STUDENT_A_CTX, async () => 'a'),
      withTenantContext(dbB, STUDENT_B_CTX, async () => 'b'),
    ]);

    expect(callsA.some((c) => c.includes('student-bbbb-0002'))).toBe(false);
    expect(callsB.some((c) => c.includes('student-aaaa-0001'))).toBe(false);
  });
});
