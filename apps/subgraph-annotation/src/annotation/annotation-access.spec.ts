import { describe, it, expect, vi } from 'vitest';

// Mock @edusphere/db to provide a sql tagged template function
vi.mock('@edusphere/db', () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    _tag: 'sql',
    strings: [...strings],
    values,
  }),
}));

import {
  isInstructorRole,
  buildLayerVisibilityConditions,
} from './annotation-access';
import type { AuthContext } from '@edusphere/auth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAuthContext(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    userId: 'user-1',
    tenantId: 'tenant-1',
    roles: ['STUDENT'],
    scopes: [],
    ...overrides,
  } as AuthContext;
}

const mockAnnotationsTable = {
  layer: Symbol('annotations.layer'),
  user_id: Symbol('annotations.user_id'),
};

// ---------------------------------------------------------------------------
// isInstructorRole
// ---------------------------------------------------------------------------

describe('isInstructorRole', () => {
  it('returns true for INSTRUCTOR role', () => {
    expect(isInstructorRole(makeAuthContext({ roles: ['INSTRUCTOR'] }))).toBe(
      true
    );
  });

  it('returns true for ORG_ADMIN role', () => {
    expect(isInstructorRole(makeAuthContext({ roles: ['ORG_ADMIN'] }))).toBe(
      true
    );
  });

  it('returns true for SUPER_ADMIN role', () => {
    expect(isInstructorRole(makeAuthContext({ roles: ['SUPER_ADMIN'] }))).toBe(
      true
    );
  });

  it('returns false for STUDENT role', () => {
    expect(isInstructorRole(makeAuthContext({ roles: ['STUDENT'] }))).toBe(
      false
    );
  });

  it('returns false for RESEARCHER role', () => {
    expect(isInstructorRole(makeAuthContext({ roles: ['RESEARCHER'] }))).toBe(
      false
    );
  });

  it('defaults to STUDENT when roles array is empty', () => {
    expect(isInstructorRole(makeAuthContext({ roles: [] }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildLayerVisibilityConditions
// ---------------------------------------------------------------------------

describe('buildLayerVisibilityConditions', () => {
  it('filters by specific layer when layer param is provided', () => {
    const auth = makeAuthContext({ roles: ['STUDENT'] });
    const conditions = buildLayerVisibilityConditions(
      mockAnnotationsTable as never,
      auth,
      'SHARED'
    );

    // Should have layer = 'SHARED' condition
    expect(conditions.length).toBeGreaterThanOrEqual(1);
    const layerCond = conditions[0] as { values: unknown[] };
    expect(layerCond.values).toContain('SHARED');
  });

  it('adds user_id filter for PERSONAL layer', () => {
    const auth = makeAuthContext({ userId: 'user-42', roles: ['STUDENT'] });
    const conditions = buildLayerVisibilityConditions(
      mockAnnotationsTable as never,
      auth,
      'PERSONAL'
    );

    // Should have 2 conditions: layer = PERSONAL AND user_id = user-42
    expect(conditions.length).toBe(2);
    const userCond = conditions[1] as { values: unknown[] };
    expect(userCond.values).toContain('user-42');
  });

  it('does not add user_id filter for non-PERSONAL specific layer', () => {
    const auth = makeAuthContext({ roles: ['STUDENT'] });
    const conditions = buildLayerVisibilityConditions(
      mockAnnotationsTable as never,
      auth,
      'INSTRUCTOR'
    );

    // Only the layer filter, no user_id filter
    expect(conditions.length).toBe(1);
  });

  it('allows instructors to see all layers except others PERSONAL', () => {
    const auth = makeAuthContext({
      userId: 'instructor-1',
      roles: ['INSTRUCTOR'],
    });
    const conditions = buildLayerVisibilityConditions(
      mockAnnotationsTable as never,
      auth
    );

    // One compound condition for instructors
    expect(conditions.length).toBe(1);
    const cond = conditions[0] as { strings: string[] };
    // Should reference PERSONAL and user_id
    const sqlText = cond.strings.join('');
    expect(sqlText).toContain('PERSONAL');
  });

  it('restricts students to SHARED, INSTRUCTOR, AI_GENERATED, and own PERSONAL', () => {
    const auth = makeAuthContext({ userId: 'student-1', roles: ['STUDENT'] });
    const conditions = buildLayerVisibilityConditions(
      mockAnnotationsTable as never,
      auth
    );

    expect(conditions.length).toBe(1);
    const cond = conditions[0] as { strings: string[] };
    const sqlText = cond.strings.join('');
    expect(sqlText).toContain('SHARED');
    expect(sqlText).toContain('INSTRUCTOR');
    expect(sqlText).toContain('AI_GENERATED');
    expect(sqlText).toContain('PERSONAL');
  });

  it('applies instructor visibility for ORG_ADMIN', () => {
    const auth = makeAuthContext({ roles: ['ORG_ADMIN'] });
    const conditions = buildLayerVisibilityConditions(
      mockAnnotationsTable as never,
      auth
    );

    // Should use the instructor path (1 compound condition)
    expect(conditions.length).toBe(1);
    const cond = conditions[0] as { strings: string[] };
    const sqlText = cond.strings.join('');
    // Instructor path checks != PERSONAL OR user_id match
    expect(sqlText).toContain('PERSONAL');
  });

  it('applies instructor visibility for SUPER_ADMIN', () => {
    const auth = makeAuthContext({ roles: ['SUPER_ADMIN'] });
    const conditions = buildLayerVisibilityConditions(
      mockAnnotationsTable as never,
      auth
    );

    expect(conditions.length).toBe(1);
  });
});
