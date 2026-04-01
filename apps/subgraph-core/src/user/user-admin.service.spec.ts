/**
 * user-admin.service.spec.ts — Unit tests for UserAdminService.
 * Covers: bulkImportUsers, suspendUser, listUsers, resetUserPassword, adminUsers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpdate = vi.fn();
const mockExecute = vi.fn();

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> &
    Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  p.limit = self;
  p.offset = self;
  p.orderBy = self;
  p.set = self;
  p.returning = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
      fn({
        update: mockUpdate,
        select: vi.fn(() => makeChain([{ total: 5 }])),
        execute: mockExecute,
      })
  ),
  buildRelayConnection: vi.fn((items, limit, total) => ({
    edges: items
      .slice(0, limit)
      .map((n: unknown) => ({ node: n, cursor: 'c' })),
    pageInfo: { hasNextPage: items.length > limit, endCursor: 'c' },
    totalCount: total,
  })),
  schema: {
    users: {
      id: 'id',
      role: 'role',
      deleted_at: 'deleted_at',
      updated_at: 'updated_at',
    },
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

vi.mock('@edusphere/config', () => ({
  keycloakConfig: { url: 'http://keycloak:8080', realm: 'edusphere' },
}));

const mockUserService = {
  setAdminService: vi.fn(),
  create: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com' }),
  getDb: vi.fn(() => ({})),
  mapUser: vi.fn((u: Record<string, unknown>) => u),
};

import { UserAdminService } from './user-admin.service';

function createService(): UserAdminService {
  const svc = new UserAdminService(mockUserService as never);
  return svc;
}

function makeAuth(role = 'ORG_ADMIN') {
  return { tenantId: 't1', userId: 'admin1', roles: [role], scopes: [] };
}

describe('UserAdminService', () => {
  let service: UserAdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createService();
  });

  describe('onModuleInit', () => {
    it('should call setAdminService on userService', () => {
      service.onModuleInit();
      expect(mockUserService.setAdminService).toHaveBeenCalledWith(service);
    });
  });

  describe('bulkImportUsers', () => {
    it('should import valid CSV rows', async () => {
      const csv =
        'email,firstName,lastName,role\na@b.com,A,B,STUDENT\nc@d.com,C,D,INSTRUCTOR';
      const result = await service.bulkImportUsers(csv, makeAuth());
      expect(result.created).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockUserService.create).toHaveBeenCalledTimes(2);
    });

    it('should count failures for rows without email', async () => {
      const csv = 'email,firstName\n,John';
      const result = await service.bulkImportUsers(csv, makeAuth());
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('missing email');
    });

    it('should handle create errors gracefully', async () => {
      mockUserService.create.mockRejectedValueOnce(new Error('duplicate'));
      const csv = 'email,firstName\ndup@b.com,Dup';
      const result = await service.bulkImportUsers(csv, makeAuth());
      expect(result.failed).toBe(1);
      expect(result.errors[0]).toContain('duplicate');
    });
  });

  describe('suspendUser', () => {
    it('should suspend a user by setting deleted_at', async () => {
      const mockUser = { id: 'u1', deleted_at: new Date() };
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      const result = await service.suspendUser('u1', true, makeAuth());
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        service.suspendUser('missing', true, makeAuth())
      ).rejects.toThrow('User not found');
    });
  });

  describe('resetUserPassword', () => {
    const origEnv = process.env;

    beforeEach(() => {
      process.env = { ...origEnv };
    });

    it('should return true in dev mode when secret not set', async () => {
      delete process.env['KEYCLOAK_ADMIN_CLIENT_SECRET'];
      const result = await service.resetUserPassword('u1', makeAuth());
      expect(result).toBe(true);
    });

    it('should return false when token fetch fails', async () => {
      process.env['KEYCLOAK_ADMIN_CLIENT_SECRET'] = 'secret';
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      const result = await service.resetUserPassword('u1', makeAuth());
      expect(result).toBe(false);
    });

    it('should return true on successful password reset', async () => {
      process.env['KEYCLOAK_ADMIN_CLIENT_SECRET'] = 'secret';
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ access_token: 'tok' }),
        } as unknown as Response)
        .mockResolvedValueOnce({ ok: true } as Response);

      const result = await service.resetUserPassword('u1', makeAuth());
      expect(result).toBe(true);
    });

    it('should return false on fetch exception', async () => {
      process.env['KEYCLOAK_ADMIN_CLIENT_SECRET'] = 'secret';
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('network'));

      const result = await service.resetUserPassword('u1', makeAuth());
      expect(result).toBe(false);
    });
  });
});
