import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LessonQueryService } from './lesson-query.service';

const mockTx = { select: vi.fn() };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: {
    lessons: {
      id: 'id',
      tenant_id: 'tenant_id',
      course_id: 'course_id',
      deleted_at: 'deleted_at',
      created_at: 'created_at',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...c) => ({ and: c })),
  desc: vi.fn((col) => ({ desc: col })),
  isNull: vi.fn((col) => ({ isNull: col })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn((_db, _ctx, fn) => fn(mockTx)),
}));

vi.mock('./lesson.helpers.js', () => ({
  mapLesson: vi.fn((row) => {
    if (!row) return null;
    return { id: row.id, title: row.title, courseId: row.course_id };
  }),
}));

function makeSelectChain(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const offset = vi.fn().mockReturnValue(rows);
  const orderByResult = { limit: vi.fn().mockReturnValue({ offset }) };
  const where = vi.fn().mockReturnValue({
    limit,
    orderBy: vi.fn().mockReturnValue(orderByResult),
  });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, limit };
}

describe('LessonQueryService', () => {
  let service: LessonQueryService;
  const ctx = { tenantId: 't1', userId: 'u1', userRole: 'INSTRUCTOR' as const };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LessonQueryService();
  });

  describe('onModuleDestroy()', () => {
    it('closes DB pools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });

  describe('findById()', () => {
    it('returns mapped lesson when found', async () => {
      const chain = makeSelectChain([
        { id: 'l1', title: 'Intro', course_id: 'c1' },
      ]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.findById('l1', ctx);

      expect(result).toEqual({ id: 'l1', title: 'Intro', courseId: 'c1' });
    });

    it('returns null when lesson not found', async () => {
      const chain = makeSelectChain([]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.findById('missing', ctx);
      expect(result).toBeNull();
    });
  });

  describe('findByCourse()', () => {
    it('returns array of mapped lessons', async () => {
      const rows = [
        { id: 'l1', title: 'Lesson 1', course_id: 'c1' },
        { id: 'l2', title: 'Lesson 2', course_id: 'c1' },
      ];
      const chain = makeSelectChain(rows);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.findByCourse('c1', ctx, 10, 0);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'l1', title: 'Lesson 1' });
    });

    it('returns empty array when no lessons exist', async () => {
      const chain = makeSelectChain([]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.findByCourse('c1', ctx, 10, 0);
      expect(result).toEqual([]);
    });
  });
});
