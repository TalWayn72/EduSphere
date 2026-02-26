export const TENANT_A = 'tenant-a-001' as const;
export const TENANT_B = 'tenant-b-002' as const;

export interface TenantContext {
  tenantId: string;
}

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: string;
  scopes: string[];
  email: string;
}

export function createTenantContext(
  overrides?: Partial<TenantContext>
): TenantContext {
  return {
    tenantId: 'tenant-test-001',
    ...overrides,
  };
}

export function createAuthContext(
  overrides?: Partial<AuthContext>
): AuthContext {
  return {
    userId: 'user-test-001',
    tenantId: 'tenant-test-001',
    role: 'STUDENT',
    scopes: ['course:read'],
    email: 'student@test.example',
    ...overrides,
  };
}
