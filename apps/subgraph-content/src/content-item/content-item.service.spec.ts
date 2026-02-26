/**
 * Unit tests for ContentItemService.
 *
 * Covers:
 *  1. findById() returns a mapped ContentItemMapped when the row exists.
 *  2. findById() throws NotFoundException when the row is not found.
 *  3. findByModule() returns all mapped items for a module, ordered by orderIndex.
 *  4. findByModuleIdBatch() groups items by moduleId correctly.
 *  5. findByModuleIdBatch() returns an empty Map when moduleIds is [].
 *  6. validateMicrolessonIfNeeded() passes for a valid MICROLESSON payload.
 *  7. validateMicrolessonIfNeeded() throws BadRequestException for invalid JSON.
 *  8. validateMicrolessonIfNeeded() throws BadRequestException when durationSeconds exceeds 420.
 *  9. onModuleDestroy() calls closeAllPools().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ContentItemService } from './content-item.service';

// ── DB mocks ─────────────────────────────────────────────────────────────────

const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);

const mockSelectBuilder = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
};

const mockDb = {
  select: vi.fn(() => mockSelectBuilder),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  closeAllPools: (...args: unknown[]) => mockCloseAllPools(...args),
  withReadReplica: vi.fn((fn: (db: typeof mockDb) => unknown) => fn(mockDb)),
  schema: {
    contentItems: {
      id: 'id',
      moduleId: 'moduleId',
      type: 'type',
      orderIndex: 'orderIndex',
    },
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'eq' })),
  asc: vi.fn((col: unknown) => ({ col, dir: 'asc' })),
  inArray: vi.fn((col: unknown, vals: unknown) => ({
    col,
    vals,
    op: 'inArray',
  })),
}));

// Mock the microlearning schemas used by validateMicrolessonIfNeeded
vi.mock('../microlearning/microlearning.schemas', () => ({
  MICROLESSON_MAX_DURATION_SECONDS: 420,
  microlessonContentSchema: {
    safeParse: vi.fn((input: unknown) => {
      const data = input as { durationSeconds?: number; title?: string };
      if (typeof data?.durationSeconds !== 'number' || !data.title) {
        return {
          success: false,
          error: { issues: [{ message: 'durationSeconds is required' }] },
        };
      }
      return { success: true, data };
    }),
  },
}));

// ── Fixture helpers ───────────────────────────────────────────────────────────

function makeDbRow(
  overrides: Partial<{
    id: string;
    moduleId: string;
    title: string;
    type: string;
    content: string | null;
    fileId: string | null;
    duration: number | null;
    orderIndex: number;
    createdAt: Date;
    updatedAt: Date;
  }> = {}
) {
  return {
    id: 'item-1',
    moduleId: 'module-1',
    title: 'Intro to Testing',
    type: 'VIDEO',
    content: null,
    fileId: null,
    duration: 300,
    orderIndex: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ContentItemService', () => {
  let service: ContentItemService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset builder chain
    mockSelectBuilder.from.mockReturnThis();
    mockSelectBuilder.where.mockReturnThis();
    mockSelectBuilder.limit.mockReturnThis();
    mockSelectBuilder.orderBy.mockReturnThis();

    service = new ContentItemService();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  it('should return a mapped ContentItemMapped when item exists', async () => {
    const row = makeDbRow();
    mockSelectBuilder.limit.mockResolvedValueOnce([row]);

    const result = await service.findById('item-1');

    expect(result.id).toBe('item-1');
    expect(result.contentType).toBe('VIDEO');
    expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  it('should throw NotFoundException when item is not found', async () => {
    mockSelectBuilder.limit.mockResolvedValueOnce([]);

    await expect(service.findById('nonexistent')).rejects.toThrow(
      NotFoundException
    );
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  it('should return all items for a module ordered by orderIndex', async () => {
    const rows = [
      makeDbRow({ id: 'item-1', orderIndex: 0 }),
      makeDbRow({ id: 'item-2', orderIndex: 1 }),
      makeDbRow({ id: 'item-3', orderIndex: 2 }),
    ];
    mockSelectBuilder.orderBy.mockResolvedValueOnce(rows);

    const result = await service.findByModule('module-1');

    expect(result).toHaveLength(3);
    expect(result[0]?.id).toBe('item-1');
    expect(result[2]?.id).toBe('item-3');
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  it('should group items by moduleId in findByModuleIdBatch()', async () => {
    const rows = [
      makeDbRow({ id: 'item-1', moduleId: 'module-A', orderIndex: 0 }),
      makeDbRow({ id: 'item-2', moduleId: 'module-A', orderIndex: 1 }),
      makeDbRow({ id: 'item-3', moduleId: 'module-B', orderIndex: 0 }),
    ];
    mockSelectBuilder.orderBy.mockResolvedValueOnce(rows);

    const map = await service.findByModuleIdBatch(['module-A', 'module-B']);

    expect(map.get('module-A')).toHaveLength(2);
    expect(map.get('module-B')).toHaveLength(1);
    expect(map.get('module-A')?.[0]?.id).toBe('item-1');
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  it('should return an empty Map when moduleIds array is empty', async () => {
    const map = await service.findByModuleIdBatch([]);

    expect(map.size).toBe(0);
    // DB should NOT be queried at all
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  // ── Test 6 ──────────────────────────────────────────────────────────────────
  it('should pass validation for a valid MICROLESSON payload', () => {
    const validContent = JSON.stringify({
      title: 'Quick Quiz',
      durationSeconds: 300,
    });

    expect(() =>
      service.validateMicrolessonIfNeeded('MICROLESSON', validContent)
    ).not.toThrow();
  });

  // ── Test 7 ──────────────────────────────────────────────────────────────────
  it('should throw BadRequestException for invalid JSON in MICROLESSON content', () => {
    expect(() =>
      service.validateMicrolessonIfNeeded('MICROLESSON', '{ not valid json }')
    ).toThrow(BadRequestException);
  });

  // ── Test 8 ──────────────────────────────────────────────────────────────────
  it('should throw BadRequestException when MICROLESSON durationSeconds exceeds 420', () => {
    const tooLong = JSON.stringify({
      title: 'Long Lesson',
      durationSeconds: 421,
    });

    expect(() =>
      service.validateMicrolessonIfNeeded('MICROLESSON', tooLong)
    ).toThrow(BadRequestException);
  });

  // ── Test 9 ──────────────────────────────────────────────────────────────────
  it('should call closeAllPools on onModuleDestroy()', async () => {
    await service.onModuleDestroy();

    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });
});
