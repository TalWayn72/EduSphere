import { describe, it, expect, vi } from 'vitest';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  __esModule: true,
}));

import {
  getGraphAuthContext,
  assertRelationshipType,
  type GraphQLContext,
} from './graph-resolver.helpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeContext(overrides: Record<string, unknown> = {}): GraphQLContext {
  return {
    authContext: {
      tenantId: 'tenant-1',
      userId: 'user-1',
      roles: ['INSTRUCTOR'],
      scopes: [],
      ...overrides,
    },
  } as GraphQLContext;
}

describe('getGraphAuthContext', () => {
  it('extracts tenantId, userId, and first role', () => {
    const ctx = makeContext();
    const result = getGraphAuthContext(ctx);
    expect(result).toEqual({
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: 'INSTRUCTOR',
    });
  });

  it('defaults role to STUDENT when roles array is empty', () => {
    const ctx = makeContext({ roles: [] });
    const result = getGraphAuthContext(ctx);
    expect(result.role).toBe('STUDENT');
  });

  it('throws UnauthorizedException when authContext is missing', () => {
    expect(() => getGraphAuthContext({} as GraphQLContext)).toThrow(
      UnauthorizedException
    );
  });

  it('throws UnauthorizedException when userId is missing', () => {
    const ctx = {
      authContext: { tenantId: 't', userId: '', roles: [] },
    } as GraphQLContext;
    expect(() => getGraphAuthContext(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when tenantId is missing', () => {
    const ctx = {
      authContext: { tenantId: '', userId: 'u', roles: [] },
    } as GraphQLContext;
    expect(() => getGraphAuthContext(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when authContext is null', () => {
    expect(() =>
      getGraphAuthContext({ authContext: null } as unknown as GraphQLContext)
    ).toThrow(UnauthorizedException);
  });

  it('uses first role from multiple roles', () => {
    const ctx = makeContext({ roles: ['ORG_ADMIN', 'STUDENT'] });
    const result = getGraphAuthContext(ctx);
    expect(result.role).toBe('ORG_ADMIN');
  });
});

describe('assertRelationshipType', () => {
  it.each([
    'RELATED_TO',
    'RELATES_TO',
    'PREREQUISITE_OF',
    'CONTRADICTS',
    'DERIVED_FROM',
    'PART_OF',
    'AUTHORED_BY',
  ])('accepts valid type: %s', (type) => {
    expect(assertRelationshipType(type)).toBe(type);
  });

  it('throws BadRequestException for invalid type', () => {
    expect(() => assertRelationshipType('INVALID_TYPE')).toThrow(
      BadRequestException
    );
  });

  it('includes valid types in error message', () => {
    try {
      assertRelationshipType('WRONG');
    } catch (e) {
      expect((e as Error).message).toContain('RELATED_TO');
      expect((e as Error).message).toContain('WRONG');
    }
  });

  it('throws for empty string', () => {
    expect(() => assertRelationshipType('')).toThrow(BadRequestException);
  });

  it('is case-sensitive', () => {
    expect(() => assertRelationshipType('related_to')).toThrow(
      BadRequestException
    );
  });
});
