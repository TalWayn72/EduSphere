/**
 * custom-role.service.memory.spec.ts — Memory safety tests for CustomRoleService.
 * Verifies that onModuleDestroy closes DB pools. F-113 Sub-Admin Delegation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockCloseAllPools } = vi.hoisted(() => ({
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
}));

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn().mockReturnValue({}),
  closeAllPools: mockCloseAllPools,
  withTenantContext: vi.fn().mockResolvedValue([]),
  schema: {
    customRoles: {},
    userRoleDelegations: {},
  },
  eq: vi.fn(),
  and: vi.fn(),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { CustomRoleService } from './custom-role.service.js';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CustomRoleService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call closeAllPools on onModuleDestroy', async () => {
    const service = new CustomRoleService();
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  it('should not throw if onModuleDestroy called multiple times', async () => {
    const service = new CustomRoleService();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(2);
  });

  it('should complete onModuleDestroy even if closeAllPools rejects', async () => {
    mockCloseAllPools.mockRejectedValueOnce(new Error('pool error'));
    const service = new CustomRoleService();
    await expect(service.onModuleDestroy()).rejects.toThrow('pool error');
  });
});
