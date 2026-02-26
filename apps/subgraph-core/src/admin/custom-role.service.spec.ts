/**
 * custom-role.service.spec.ts — Unit tests for CustomRoleService.
 * F-113 Sub-Admin Delegation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockTx } = vi.hoisted(() => {
  const mockTx = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return { mockTx };
});

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockTx),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(async (_d, _c, fn) => fn(mockTx)),
  schema: {
    customRoles: {
      id: 'id',
      tenantId: 'tenant_id',
      name: 'name',
      isSystem: 'is_system',
      createdAt: 'created_at',
    },
    userRoleDelegations: {
      id: 'id',
      tenantId: 'tenant_id',
      userId: 'user_id',
      roleId: 'role_id',
      isActive: 'is_active',
    },
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...a) => ({ and: a })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { CustomRoleService } from './custom-role.service.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TENANT_CTX = {
  tenantId: 'tenant-1',
  userId: 'admin-1',
  role: 'ORG_ADMIN',
};

const makeRole = (overrides = {}) => ({
  id: 'role-1',
  tenantId: 'tenant-1',
  name: 'Content Manager',
  description: 'Manages courses',
  permissions: ['courses:view'],
  isSystem: false,
  createdBy: 'admin-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeDelegation = (overrides = {}) => ({
  id: 'del-1',
  userId: 'user-1',
  roleId: 'role-1',
  delegatedBy: 'admin-1',
  validUntil: null,
  isActive: true,
  createdAt: new Date(),
  ...overrides,
});

const setupSelectLimit = (rows) =>
  mockTx.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi
        .fn()
        .mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) }),
    }),
  });
const setupSelectOrderBy = (rows) =>
  mockTx.select.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi
        .fn()
        .mockReturnValue({ orderBy: vi.fn().mockResolvedValue(rows) }),
    }),
  });
const setupInsert = (result) =>
  mockTx.insert.mockReturnValue({
    values: vi
      .fn()
      .mockReturnValue({ returning: vi.fn().mockResolvedValue(result) }),
  });
const setupUpdateNoReturn = () =>
  mockTx.update.mockReturnValue({
    set: vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  });
const setupUpdateWithReturn = (result) =>
  mockTx.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi
        .fn()
        .mockReturnValue({ returning: vi.fn().mockResolvedValue(result) }),
    }),
  });
const setupDelete = () =>
  mockTx.delete.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CustomRoleService', () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CustomRoleService();
  });

  it('should return mapped roles from database', async () => {
    setupSelectOrderBy([makeRole()]);
    const result = await service.listRoles(TENANT_CTX);
    expect(result).toBeInstanceOf(Array);
    expect(result[0]?.name).toBe('Content Manager');
  });

  it('should throw NotFoundException for unknown role', async () => {
    setupSelectLimit([]);
    await expect(
      service.getRole('unknown-id', TENANT_CTX)
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should return role data when found', async () => {
    setupSelectLimit([makeRole()]);
    const result = await service.getRole('role-1', TENANT_CTX);
    expect(result.id).toBe('role-1');
  });

  it('should create and return new role', async () => {
    setupInsert([makeRole()]);
    const result = await service.createRole(
      {
        name: 'Content Manager',
        description: 'Manages courses',
        permissions: ['courses:view'],
      },
      TENANT_CTX
    );
    expect(result.name).toBe('Content Manager');
    expect(result.isSystem).toBe(false);
  });

  it('should throw BadRequestException when updating system role', async () => {
    setupSelectLimit([makeRole({ isSystem: true })]);
    await expect(
      service.updateRole('role-1', { name: 'X' }, TENANT_CTX)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should update and return custom role', async () => {
    const updated = makeRole({ name: 'Updated' });
    setupSelectLimit([makeRole()]);
    setupUpdateWithReturn([updated]);
    const result = await service.updateRole(
      'role-1',
      { name: 'Updated' },
      TENANT_CTX
    );
    expect(result.name).toBe('Updated');
  });

  it('should throw BadRequestException when deleting system role', async () => {
    setupSelectLimit([makeRole({ isSystem: true })]);
    await expect(
      service.deleteRole('role-1', TENANT_CTX)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should return true when deleting a custom role', async () => {
    setupSelectLimit([makeRole({ isSystem: false })]);
    setupUpdateNoReturn();
    setupDelete();
    const result = await service.deleteRole('role-1', TENANT_CTX);
    expect(result).toBe(true);
  });

  it('should throw NotFoundException when delegating non-existent role', async () => {
    setupSelectLimit([]);
    await expect(
      service.delegateRole('user-1', 'bad-role', null, TENANT_CTX)
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should create delegation and return delegation data', async () => {
    setupSelectLimit([makeRole()]);
    setupInsert([makeDelegation()]);
    const result = await service.delegateRole(
      'user-1',
      'role-1',
      null,
      TENANT_CTX
    );
    expect(result.roleId).toBe('role-1');
    expect(result.isActive).toBe(true);
  });
});
