import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { SavedSearchService } from './saved-search.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

// Use vi.hoisted() so these variables are available when vi.mock factories are hoisted
const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    insert: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
  };
  return { mockDb };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    savedSearches: { id: 'id', userId: 'userId', tenantId: 'tenantId' },
  },
  eq: vi.fn((field: unknown, val: unknown) => ({ field, val })),
  and: vi.fn((...args: unknown[]) => args),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

describe('SavedSearchService', () => {
  let service: SavedSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SavedSearchService],
    }).compile();
    service = module.get<SavedSearchService>(SavedSearchService);
    vi.clearAllMocks();
  });

  describe('createSavedSearch', () => {
    it('persists with correct userId + tenantId', async () => {
      const saved = {
        id: 'ss-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        name: 'My Search',
        query: 'foo',
        createdAt: new Date(),
      };
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([saved]),
        }),
      });
      const result = await service.createSavedSearch({
        userId: 'user-1',
        tenantId: 'tenant-1',
        name: 'My Search',
        query: 'foo',
      });
      expect(result?.userId).toBe('user-1');
      expect(result?.tenantId).toBe('tenant-1');
    });
  });

  describe('listSavedSearches', () => {
    it('returns only current user searches', async () => {
      const rows = [{ id: 'ss-1', userId: 'user-1', query: 'test' }];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(rows),
        }),
      });
      const result = await service.listSavedSearches('user-1', 'tenant-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('deleteSavedSearch', () => {
    it('succeeds for owner', async () => {
      const found = { id: 'ss-1', userId: 'user-1', tenantId: 'tenant-1' };
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([found]),
          }),
        }),
      });
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      });
      const result = await service.deleteSavedSearch(
        'ss-1',
        'user-1',
        'tenant-1'
      );
      expect(result).toBe(true);
    });

    it('throws NotFoundException when not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      await expect(
        service.deleteSavedSearch('bad', 'user-1', 'tenant-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for non-owner', async () => {
      const found = { id: 'ss-1', userId: 'user-2', tenantId: 'tenant-1' };
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([found]),
          }),
        }),
      });
      await expect(
        service.deleteSavedSearch('ss-1', 'user-1', 'tenant-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('calls closeAllPools on module destroy', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
