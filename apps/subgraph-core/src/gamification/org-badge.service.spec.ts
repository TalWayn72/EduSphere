/**
 * OrgBadgeService — Unit tests (F-12).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// Mock @edusphere/db
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockReturning = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockSet = vi.fn();
const mockValues = vi.fn();

vi.mock('@edusphere/db', () => {
  const mockTx = {
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
  };

  return {
    createDatabaseConnection: vi.fn(() => mockTx),
    closeAllPools: vi.fn(),
    withTenantContext: vi.fn((_db, _ctx, fn) => fn(mockTx)),
    schema: {
      orgBadges: {
        id: 'id',
        tenantId: 'tenant_id',
        name: 'name',
        isActive: 'is_active',
        createdAt: 'created_at',
      },
    },
    eq: vi.fn((a, b) => ({ field: a, value: b })),
    and: vi.fn((...args: unknown[]) => args),
    sql: vi.fn(),
  };
});

// Setup chain mocks
function setupChain() {
  mockInsert.mockReturnValue({ values: mockValues });
  mockValues.mockReturnValue({ returning: mockReturning });
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({ orderBy: mockOrderBy });
  mockOrderBy.mockResolvedValue([]);
  mockUpdate.mockReturnValue({ set: mockSet });
  mockSet.mockReturnValue({ where: mockWhere });
  mockDelete.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue({
    returning: mockReturning,
    orderBy: mockOrderBy,
  });
}

describe('OrgBadgeService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let service: any;
  const ctx = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    userRole: 'ORG_ADMIN' as const,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    setupChain();
    // Dynamic import to get fresh instance
    const { OrgBadgeService } = await import('./org-badge.service');
    service = new OrgBadgeService();
  });

  describe('createBadge', () => {
    it('should create a badge with valid input', async () => {
      const badge = {
        id: 'badge-1',
        name: 'Test Badge',
        description: 'A test badge',
        xpRequired: 100,
        tenantId: 'tenant-1',
        isActive: true,
      };
      mockReturning.mockResolvedValue([badge]);

      const result = await service.createBadge(ctx, {
        name: 'Test Badge',
        description: 'A test badge',
        xpRequired: 100,
      });

      expect(result).toEqual(badge);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should reject invalid input (name too short)', async () => {
      await expect(
        service.createBadge(ctx, { name: 'A', xpRequired: 100 })
      ).rejects.toThrow();
    });

    it('should reject negative xpRequired', async () => {
      await expect(
        service.createBadge(ctx, { name: 'Valid Name', xpRequired: -5 })
      ).rejects.toThrow();
    });
  });

  describe('listBadges', () => {
    it('should return badges for tenant', async () => {
      const badges = [
        { id: 'b1', name: 'Badge 1', tenantId: 'tenant-1' },
        { id: 'b2', name: 'Badge 2', tenantId: 'tenant-1' },
      ];
      mockOrderBy.mockResolvedValue(badges);

      const result = await service.listBadges(ctx);
      expect(result).toEqual(badges);
    });
  });

  describe('getBadge', () => {
    it('should return a badge by id', async () => {
      const badge = { id: 'badge-1', name: 'Test', tenantId: 'tenant-1' };
      mockWhere.mockResolvedValue([badge]);

      const result = await service.getBadge(ctx, 'badge-1');
      expect(result).toEqual(badge);
    });

    it('should throw NotFoundException when badge not found', async () => {
      mockWhere.mockResolvedValue([]);

      await expect(service.getBadge(ctx, 'nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateBadge', () => {
    it('should update a badge', async () => {
      const updated = { id: 'badge-1', name: 'Updated', tenantId: 'tenant-1' };
      mockReturning.mockResolvedValue([updated]);

      const result = await service.updateBadge(ctx, 'badge-1', {
        name: 'Updated',
      });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when updating nonexistent badge', async () => {
      mockReturning.mockResolvedValue([]);

      await expect(
        service.updateBadge(ctx, 'nonexistent', { name: 'Updated' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteBadge', () => {
    it('should delete a badge and return true', async () => {
      mockReturning.mockResolvedValue([{ id: 'badge-1' }]);

      const result = await service.deleteBadge(ctx, 'badge-1');
      expect(result).toBe(true);
    });

    it('should throw NotFoundException when deleting nonexistent badge', async () => {
      mockReturning.mockResolvedValue([]);

      await expect(service.deleteBadge(ctx, 'nonexistent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should call closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
