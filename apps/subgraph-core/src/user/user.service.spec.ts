import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './user.service';
import type { AuthContext } from '@edusphere/auth';

// Mock the entire @edusphere/db package
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();

const mockTx = {
  select: () => ({ from: mockFrom }),
  insert: mockInsert,
  update: mockUpdate,
};

const mockDb = {
  select: () => ({ from: mockFrom }),
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    users: { id: 'id', tenant_id: 'tenant_id', email: 'email' },
    tenants: { id: 'id' },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  withTenantContext: vi.fn(async (_db, _ctx, callback) => callback(mockTx)),
}));

import { withTenantContext } from '@edusphere/db';

const MOCK_AUTH: AuthContext = {
  userId: 'user-1',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: ['read'],
};

const ADMIN_AUTH: AuthContext = {
  userId: 'admin-1',
  tenantId: 'tenant-1',
  roles: ['ORG_ADMIN'],
  scopes: ['read', 'write'],
};

const MOCK_USER = {
  id: 'user-1',
  tenant_id: 'tenant-1',
  email: 'test@example.com',
  display_name: 'Test User',
  role: 'STUDENT',
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default chain: select().from().where().limit() → [MOCK_USER]
    mockLimit.mockResolvedValue([MOCK_USER]);
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere, limit: mockLimit });
    mockSelect.mockReturnValue({ from: mockFrom });

    service = new UserService();
  });

  // ─── findById ───────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns user when found (no auth context)', async () => {
      mockLimit.mockResolvedValue([MOCK_USER]);
      const result = await service.findById('user-1');
      expect(result).toEqual(MOCK_USER);
    });

    it('returns null when user not found (no auth context)', async () => {
      mockLimit.mockResolvedValue([]);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('uses withTenantContext when authContext provided', async () => {
      mockLimit.mockResolvedValue([MOCK_USER]);
      await service.findById('user-1', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
        expect.any(Function)
      );
    });

    it('extracts first role for tenant context', async () => {
      mockLimit.mockResolvedValue([MOCK_USER]);
      await service.findById('user-1', ADMIN_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ userRole: 'ORG_ADMIN' }),
        expect.any(Function)
      );
    });

    it('falls back to STUDENT when roles array is empty', async () => {
      const noRoleAuth: AuthContext = { ...MOCK_AUTH, roles: [] };
      mockLimit.mockResolvedValue([MOCK_USER]);
      await service.findById('user-1', noRoleAuth);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ userRole: 'STUDENT' }),
        expect.any(Function)
      );
    });

    it('skips withTenantContext when authContext has no tenantId', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: '' };
      mockLimit.mockResolvedValue([MOCK_USER]);
      await service.findById('user-1', noTenantAuth);
      expect(withTenantContext).not.toHaveBeenCalled();
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns users array without auth', async () => {
      const mockOffset2 = vi.fn().mockResolvedValue([MOCK_USER]);
      mockFrom.mockReturnValue({ limit: vi.fn().mockReturnValue({ offset: mockOffset2 }) });
      const result = await service.findAll(10, 0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('calls withTenantContext with correct pagination when auth provided', async () => {
      const mockOffset2 = vi.fn().mockResolvedValue([MOCK_USER]);
      mockFrom.mockReturnValue({ limit: vi.fn().mockReturnValue({ offset: mockOffset2 }) });
      await service.findAll(5, 10, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ tenantId: 'tenant-1' }),
        expect.any(Function)
      );
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates user and returns it', async () => {
      mockReturning.mockResolvedValue([MOCK_USER]);
      mockValues.mockReturnValue({ returning: mockReturning });
      mockInsert.mockReturnValue({ values: mockValues });

      const result = await service.create(
        { email: 'test@example.com', firstName: 'Test', lastName: 'User' },
        MOCK_AUTH
      );
      expect(result).toEqual(MOCK_USER);
    });

    it('always uses withTenantContext for create', async () => {
      mockReturning.mockResolvedValue([MOCK_USER]);
      mockValues.mockReturnValue({ returning: mockReturning });
      mockInsert.mockReturnValue({ values: mockValues });

      await service.create({ email: 'x@x.com' }, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledOnce();
    });

    it('builds display_name from firstName + lastName', async () => {
      let capturedValues: any;
      mockReturning.mockResolvedValue([MOCK_USER]);
      mockValues.mockImplementation((v) => {
        capturedValues = v;
        return { returning: mockReturning };
      });
      mockInsert.mockReturnValue({ values: mockValues });

      await service.create(
        { email: 'x@x.com', firstName: 'John', lastName: 'Doe' },
        MOCK_AUTH
      );
      expect(capturedValues.display_name).toBe('John Doe');
    });

    it('includes optional role when provided', async () => {
      let capturedValues: any;
      mockReturning.mockResolvedValue([MOCK_USER]);
      mockValues.mockImplementation((v) => {
        capturedValues = v;
        return { returning: mockReturning };
      });
      mockInsert.mockReturnValue({ values: mockValues });

      await service.create({ email: 'x@x.com', role: 'INSTRUCTOR' }, MOCK_AUTH);
      expect(capturedValues.role).toBe('INSTRUCTOR');
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('returns updated user', async () => {
      const updated = { ...MOCK_USER, display_name: 'New Name' };
      mockReturning.mockResolvedValue([updated]);
      mockWhere.mockReturnValue({ returning: mockReturning });
      mockSet.mockReturnValue({ where: mockWhere });
      mockUpdate.mockReturnValue({ set: mockSet });

      const result = await service.update('user-1', { firstName: 'New', lastName: 'Name' }, MOCK_AUTH);
      expect(result).toEqual(updated);
    });

    it('throws "User not found" when update returns empty', async () => {
      mockReturning.mockResolvedValue([]);
      mockWhere.mockReturnValue({ returning: mockReturning });
      mockSet.mockReturnValue({ where: mockWhere });
      mockUpdate.mockReturnValue({ set: mockSet });

      await expect(
        service.update('nonexistent', { firstName: 'X' }, MOCK_AUTH)
      ).rejects.toThrow('User not found');
    });

    it('uses withTenantContext for update', async () => {
      const updated = { ...MOCK_USER };
      mockReturning.mockResolvedValue([updated]);
      mockWhere.mockReturnValue({ returning: mockReturning });
      mockSet.mockReturnValue({ where: mockWhere });
      mockUpdate.mockReturnValue({ set: mockSet });

      await service.update('user-1', {}, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ tenantId: 'tenant-1' }),
        expect.any(Function)
      );
    });
  });
});
