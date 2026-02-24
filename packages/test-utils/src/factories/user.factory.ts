import type { AuthContext } from './tenant.factory.js';

export interface UserRecord {
  id: string;
  tenantId: string;
  role: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

export function createUser(overrides?: Partial<UserRecord>): UserRecord {
  return {
    id: 'user-test-001',
    tenantId: 'tenant-test-001',
    role: 'STUDENT',
    email: 'student@test.example',
    displayName: 'Test Student',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

export function createStudentContext(
  overrides?: Partial<AuthContext>
): AuthContext {
  return {
    userId: 'user-student-001',
    tenantId: 'tenant-test-001',
    role: 'STUDENT',
    scopes: ['course:read'],
    email: 'student@test.example',
    ...overrides,
  };
}

export function createInstructorContext(
  overrides?: Partial<AuthContext>
): AuthContext {
  return {
    userId: 'user-instructor-001',
    tenantId: 'tenant-test-001',
    role: 'INSTRUCTOR',
    scopes: ['course:read', 'course:write', 'annotation:read'],
    email: 'instructor@test.example',
    ...overrides,
  };
}

export function createAdminContext(
  overrides?: Partial<AuthContext>
): AuthContext {
  return {
    userId: 'user-admin-001',
    tenantId: 'tenant-test-001',
    role: 'ORG_ADMIN',
    scopes: ['course:read', 'course:write', 'org:manage', 'user:manage'],
    email: 'admin@test.example',
    ...overrides,
  };
}
