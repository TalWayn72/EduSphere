import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserResolver } from './user.resolver';
import type { AuthContext } from '@edusphere/auth';

// Mock UserService
const mockUserService = {
  findById: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

const MOCK_AUTH: AuthContext = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: ['read'],
};

const MOCK_USER = {
  id: 'user-1',
  tenant_id: 'tenant-1',
  email: 'test@example.com',
  display_name: 'Test User',
  role: 'STUDENT',
};

describe('UserResolver', () => {
  let resolver: UserResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new UserResolver(mockUserService as any);
  });

  // ─── health ──────────────────────────────────────────────────────────────

  describe('health()', () => {
    it('returns "ok"', () => {
      expect(resolver.health()).toBe('ok');
    });
  });

  // ─── getUser ─────────────────────────────────────────────────────────────

  describe('getUser()', () => {
    it('delegates to userService.findById with id and authContext', async () => {
      mockUserService.findById.mockResolvedValue(MOCK_USER);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.getUser('user-1', ctx);
      expect(mockUserService.findById).toHaveBeenCalledWith('user-1', MOCK_AUTH);
      expect(result).toEqual(MOCK_USER);
    });

    it('passes undefined authContext when not in context', async () => {
      mockUserService.findById.mockResolvedValue(null);
      const ctx = { req: {} };
      await resolver.getUser('user-1', ctx);
      expect(mockUserService.findById).toHaveBeenCalledWith('user-1', undefined);
    });
  });

  // ─── getUsers ────────────────────────────────────────────────────────────

  describe('getUsers()', () => {
    it('delegates to userService.findAll with limit, offset, authContext', async () => {
      mockUserService.findAll.mockResolvedValue([MOCK_USER]);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.getUsers(10, 0, ctx);
      expect(mockUserService.findAll).toHaveBeenCalledWith(10, 0, MOCK_AUTH);
      expect(result).toEqual([MOCK_USER]);
    });

    it('passes correct pagination params', async () => {
      mockUserService.findAll.mockResolvedValue([]);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      await resolver.getUsers(25, 50, ctx);
      expect(mockUserService.findAll).toHaveBeenCalledWith(25, 50, MOCK_AUTH);
    });
  });

  // ─── getCurrentUser (me) ─────────────────────────────────────────────────

  describe('getCurrentUser()', () => {
    it('returns current user when authenticated', async () => {
      mockUserService.findById.mockResolvedValue(MOCK_USER);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.getCurrentUser(ctx);
      expect(mockUserService.findById).toHaveBeenCalledWith('user-1', MOCK_AUTH);
      expect(result).toEqual(MOCK_USER);
    });

    it('throws "Unauthenticated" when no authContext', async () => {
      const ctx = { req: {} };
      await expect(resolver.getCurrentUser(ctx)).rejects.toThrow('Unauthenticated');
    });

    it('uses userId from authContext', async () => {
      mockUserService.findById.mockResolvedValue(MOCK_USER);
      const customAuth: AuthContext = { ...MOCK_AUTH, userId: 'admin-99' };
      await resolver.getCurrentUser({ req: {}, authContext: customAuth });
      expect(mockUserService.findById).toHaveBeenCalledWith('admin-99', customAuth);
    });
  });

  // ─── createUser ──────────────────────────────────────────────────────────

  describe('createUser()', () => {
    it('creates user and returns it', async () => {
      mockUserService.create.mockResolvedValue(MOCK_USER);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const input = { email: 'new@x.com', firstName: 'New', lastName: 'User' };
      const result = await resolver.createUser(input, ctx);
      expect(mockUserService.create).toHaveBeenCalledWith(input, MOCK_AUTH);
      expect(result).toEqual(MOCK_USER);
    });

    it('throws "Unauthenticated" when no authContext', async () => {
      const ctx = { req: {} };
      await expect(
        resolver.createUser({ email: 'x@x.com' }, ctx)
      ).rejects.toThrow('Unauthenticated');
    });

    it('does not call service when unauthenticated', async () => {
      const ctx = { req: {} };
      try {
        await resolver.createUser({}, ctx);
      } catch (_) { /* expected */ }
      expect(mockUserService.create).not.toHaveBeenCalled();
    });
  });

  // ─── updateUser ──────────────────────────────────────────────────────────

  describe('updateUser()', () => {
    it('updates user and returns it', async () => {
      const updated = { ...MOCK_USER, display_name: 'Updated Name' };
      mockUserService.update.mockResolvedValue(updated);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.updateUser('user-1', { firstName: 'Updated' }, ctx);
      expect(mockUserService.update).toHaveBeenCalledWith('user-1', { firstName: 'Updated' }, MOCK_AUTH);
      expect(result).toEqual(updated);
    });

    it('throws "Unauthenticated" when no authContext', async () => {
      const ctx = { req: {} };
      await expect(
        resolver.updateUser('user-1', {}, ctx)
      ).rejects.toThrow('Unauthenticated');
    });

    it('does not call service when unauthenticated', async () => {
      const ctx = { req: {} };
      try {
        await resolver.updateUser('user-1', {}, ctx);
      } catch (_) { /* expected */ }
      expect(mockUserService.update).not.toHaveBeenCalled();
    });
  });
});
