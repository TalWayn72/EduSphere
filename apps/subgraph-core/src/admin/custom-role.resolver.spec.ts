import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('./custom-role.service.js', () => ({
  CustomRoleService: vi.fn(),
}));
vi.mock('@edusphere/db', () => ({ TenantContext: {} }));

import { CustomRoleResolver } from './custom-role.resolver.js';

const CTX_AUTHED = {
  req: {},
  authContext: {
    tenantId: 'tenant-1',
    userId: 'user-1',
    roles: ['ORG_ADMIN'],
    scopes: [],
  },
};

const CTX_ANON = { req: {}, authContext: undefined };

const EXPECTED_TENANT_CTX = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  userRole: 'ORG_ADMIN',
};

describe('CustomRoleResolver', () => {
  let resolver: CustomRoleResolver;
  let customRoleService: {
    listRoles: ReturnType<typeof vi.fn>;
    getRole: ReturnType<typeof vi.fn>;
    getUserDelegations: ReturnType<typeof vi.fn>;
    createRole: ReturnType<typeof vi.fn>;
    updateRole: ReturnType<typeof vi.fn>;
    deleteRole: ReturnType<typeof vi.fn>;
    delegateRole: ReturnType<typeof vi.fn>;
    revokeDelegation: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    customRoleService = {
      listRoles: vi.fn(),
      getRole: vi.fn(),
      getUserDelegations: vi.fn(),
      createRole: vi.fn(),
      updateRole: vi.fn(),
      deleteRole: vi.fn(),
      delegateRole: vi.fn(),
      revokeDelegation: vi.fn(),
    };
    resolver = new CustomRoleResolver(customRoleService as never);
  });

  // ── listRoles ───────────────────────────────────────────────────────────────

  describe('listRoles()', () => {
    it('delegates to service with tenantCtx', async () => {
      customRoleService.listRoles.mockResolvedValue([]);
      await resolver.listRoles(CTX_AUTHED);
      expect(customRoleService.listRoles).toHaveBeenCalledWith(
        EXPECTED_TENANT_CTX
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(resolver.listRoles(CTX_ANON)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── getRole ─────────────────────────────────────────────────────────────────

  describe('getRole()', () => {
    it('delegates to service with id and tenantCtx', async () => {
      customRoleService.getRole.mockResolvedValue({ id: 'role-1' });
      await resolver.getRole('role-1', CTX_AUTHED);
      expect(customRoleService.getRole).toHaveBeenCalledWith(
        'role-1',
        EXPECTED_TENANT_CTX
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(resolver.getRole('role-1', CTX_ANON)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── getUserDelegations ──────────────────────────────────────────────────────

  describe('getUserDelegations()', () => {
    it('delegates to service with userId and tenantCtx', async () => {
      customRoleService.getUserDelegations.mockResolvedValue([]);
      await resolver.getUserDelegations('user-2', CTX_AUTHED);
      expect(customRoleService.getUserDelegations).toHaveBeenCalledWith(
        'user-2',
        EXPECTED_TENANT_CTX
      );
    });
  });

  // ── createRole ──────────────────────────────────────────────────────────────

  describe('createRole()', () => {
    it('delegates to service with input and tenantCtx', async () => {
      const input = {
        name: 'Editor',
        description: 'Can edit',
        permissions: ['content:write'],
      };
      customRoleService.createRole.mockResolvedValue({
        id: 'role-2',
        ...input,
      });
      await resolver.createRole(input, CTX_AUTHED);
      expect(customRoleService.createRole).toHaveBeenCalledWith(
        input,
        EXPECTED_TENANT_CTX
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.createRole({ name: 'X', permissions: [] }, CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── updateRole ──────────────────────────────────────────────────────────────

  describe('updateRole()', () => {
    it('delegates to service with id, input and tenantCtx', async () => {
      const input = { name: 'Updated Editor' };
      customRoleService.updateRole.mockResolvedValue({ id: 'role-2' });
      await resolver.updateRole('role-2', input, CTX_AUTHED);
      expect(customRoleService.updateRole).toHaveBeenCalledWith(
        'role-2',
        input,
        EXPECTED_TENANT_CTX
      );
    });
  });

  // ── deleteRole ──────────────────────────────────────────────────────────────

  describe('deleteRole()', () => {
    it('delegates to service with id and tenantCtx', async () => {
      customRoleService.deleteRole.mockResolvedValue(true);
      await resolver.deleteRole('role-2', CTX_AUTHED);
      expect(customRoleService.deleteRole).toHaveBeenCalledWith(
        'role-2',
        EXPECTED_TENANT_CTX
      );
    });
  });

  // ── delegateRole ────────────────────────────────────────────────────────────

  describe('delegateRole()', () => {
    it('delegates to service with userId, roleId, validUntil and tenantCtx', async () => {
      customRoleService.delegateRole.mockResolvedValue({ id: 'del-1' });
      await resolver.delegateRole('user-2', 'role-1', '2027-01-01', CTX_AUTHED);
      expect(customRoleService.delegateRole).toHaveBeenCalledWith(
        'user-2',
        'role-1',
        '2027-01-01',
        EXPECTED_TENANT_CTX
      );
    });

    it('passes null when validUntil is undefined', async () => {
      customRoleService.delegateRole.mockResolvedValue({ id: 'del-1' });
      await resolver.delegateRole('user-2', 'role-1', undefined, CTX_AUTHED);
      expect(customRoleService.delegateRole).toHaveBeenCalledWith(
        'user-2',
        'role-1',
        null,
        EXPECTED_TENANT_CTX
      );
    });
  });

  // ── revokeDelegation ────────────────────────────────────────────────────────

  describe('revokeDelegation()', () => {
    it('delegates to service with delegationId and tenantCtx', async () => {
      customRoleService.revokeDelegation.mockResolvedValue(true);
      await resolver.revokeDelegation('del-1', CTX_AUTHED);
      expect(customRoleService.revokeDelegation).toHaveBeenCalledWith(
        'del-1',
        EXPECTED_TENANT_CTX
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.revokeDelegation('del-1', CTX_ANON)
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
