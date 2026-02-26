import { vi } from 'vitest';

export interface MockJwtPayload {
  sub: string;
  tenant_id: string;
  role: string;
  scopes: string[];
  email: string;
  iat: number;
  exp: number;
}

export interface MockAuthContext {
  userId: string;
  tenantId: string;
  role: string;
  scopes: string[];
  email: string;
}

export function createMockJwtPayload(
  overrides?: Partial<MockJwtPayload>
): MockJwtPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: 'user-test-001',
    tenant_id: 'tenant-test-001',
    role: 'STUDENT',
    scopes: ['course:read'],
    email: 'student@test.example',
    iat: now,
    exp: now + 3600,
    ...overrides,
  };
}

export function createMockAuthContext(
  overrides?: Partial<MockAuthContext>
): MockAuthContext {
  return {
    userId: 'user-test-001',
    tenantId: 'tenant-test-001',
    role: 'STUDENT',
    scopes: ['course:read'],
    email: 'student@test.example',
    ...overrides,
  };
}

export function mockJwt(payload?: Partial<MockJwtPayload>): string {
  // Returns a fake JWT string (not cryptographically valid — for unit tests only)
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' })
  ).toString('base64url');
  const body = Buffer.from(
    JSON.stringify(createMockJwtPayload(payload))
  ).toString('base64url');
  return `${header}.${body}.mock-signature`;
}

export interface MockJwtValidator {
  validate: ReturnType<typeof vi.fn>;
  extractContext: ReturnType<typeof vi.fn>;
}

export function createMockJwtValidator(): MockJwtValidator {
  return {
    validate: vi.fn().mockResolvedValue(createMockAuthContext()),
    extractContext: vi.fn().mockReturnValue(createMockAuthContext()),
  };
}
