import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// ── Mock @edusphere/db before importing the service ──────────────────────────
const mockLimit = vi.fn();
const mockOrderByResolvable = vi.fn();
const mockWhere = vi.fn(() => ({ limit: mockLimit, orderBy: mockOrderByResolvable }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockDb = { select: mockSelect };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    contentItems: {
      id: 'id',
      moduleId: 'moduleId',
      title: 'title',
      type: 'type',
      content: 'content',
      fileId: 'fileId',
      duration: 'duration',
      orderIndex: 'orderIndex',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  asc: vi.fn((col) => ({ col, dir: 'asc' })),
}));

import { ContentItemService } from './content-item.service.js';

const NOW = new Date('2026-02-23T10:00:00.000Z');

const makeDbRow = (overrides = {}) => ({
  id: 'item-1',
  moduleId: 'module-1',
  title: 'Introduction to Torah',
  type: 'VIDEO',
  content: null,
  fileId: 'file-uuid-1',
  duration: 1200,
  orderIndex: 0,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

describe('ContentItemService', () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ContentItemService();
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns a mapped ContentItemMapped when the row exists', async () => {
      mockLimit.mockResolvedValue([makeDbRow()]);

      const result = await service.findById('item-1');

      expect(result.id).toBe('item-1');
      expect(result.moduleId).toBe('module-1');
      expect(result.contentType).toBe('VIDEO');
      expect(result.createdAt).toBe(NOW.toISOString());
      expect(result.updatedAt).toBe(NOW.toISOString());
    });

    it('maps nullable fields (content, fileId, duration) correctly', async () => {
      mockLimit.mockResolvedValue([
        makeDbRow({ content: 'some text', fileId: null, duration: null }),
      ]);

      const result = await service.findById('item-1');

      expect(result.content).toBe('some text');
      expect(result.fileId).toBeNull();
      expect(result.duration).toBeNull();
    });

    it('throws NotFoundException when the item does not exist', async () => {
      mockLimit.mockResolvedValue([]);

      await expect(service.findById('ghost-item')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException with the item ID in the error message', async () => {
      mockLimit.mockResolvedValue([]);

      await expect(service.findById('ghost-item')).rejects.toThrow('ghost-item');
    });

    it('queries DB using eq on the item id', async () => {
      mockLimit.mockResolvedValue([makeDbRow()]);
      const { eq } = await import('@edusphere/db');

      await service.findById('item-1');

      expect(eq).toHaveBeenCalledWith(expect.anything(), 'item-1');
    });

    it('applies limit(1) so at most one row is fetched', async () => {
      mockLimit.mockResolvedValue([makeDbRow()]);

      await service.findById('item-1');

      expect(mockLimit).toHaveBeenCalledWith(1);
    });
  });

  // ─── findByModule ─────────────────────────────────────────────────────────

  describe('findByModule()', () => {
    it('returns an empty array when no items exist for the module', async () => {
      mockWhere.mockReturnValueOnce({ orderBy: vi.fn().mockResolvedValue([]) });

      const result = await service.findByModule('module-empty');

      expect(result).toEqual([]);
    });

    it('returns a mapped array for all items in the module', async () => {
      const rows = [
        makeDbRow({ id: 'item-1', orderIndex: 0 }),
        makeDbRow({ id: 'item-2', orderIndex: 1, title: 'Chapter 2' }),
      ];
      mockWhere.mockReturnValueOnce({ orderBy: vi.fn().mockResolvedValue(rows) });

      const result = await service.findByModule('module-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('item-1');
      expect(result[1].id).toBe('item-2');
    });

    it('filters results by moduleId using eq', async () => {
      mockWhere.mockReturnValueOnce({ orderBy: vi.fn().mockResolvedValue([makeDbRow()]) });
      const { eq } = await import('@edusphere/db');

      await service.findByModule('module-xyz');

      expect(eq).toHaveBeenCalledWith(expect.anything(), 'module-xyz');
    });

    it('orders results by orderIndex ascending', async () => {
      const ascMock = vi.fn().mockResolvedValue([makeDbRow()]);
      mockWhere.mockReturnValueOnce({ orderBy: ascMock });
      const { asc } = await import('@edusphere/db');

      await service.findByModule('module-1');

      expect(asc).toHaveBeenCalled();
    });

    it('maps the returned rows using the private map() method', async () => {
      const row = makeDbRow({ id: 'item-x', type: 'DOCUMENT', content: 'PDF content' });
      mockWhere.mockReturnValueOnce({ orderBy: vi.fn().mockResolvedValue([row]) });

      const result = await service.findByModule('module-1');

      expect(result[0].contentType).toBe('DOCUMENT');
      expect(result[0].content).toBe('PDF content');
    });
  });

  // ─── onModuleDestroy — memory safety ──────────────────────────────────────

  describe('onModuleDestroy()', () => {
    it('calls closeAllPools to release DB connections', async () => {
      const { closeAllPools } = await import('@edusphere/db');

      await service.onModuleDestroy();

      expect(closeAllPools).toHaveBeenCalledTimes(1);
    });
  });
});
