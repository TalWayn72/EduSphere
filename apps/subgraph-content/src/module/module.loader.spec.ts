import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModuleLoader } from './module.loader.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ModuleMapped = {
  id: string;
  course_id: string;
  courseId: string;
  title: string;
  description: string | null;
  order_index: number;
  orderIndex: number;
  created_at: Date;
  createdAt: Date;
  updated_at: Date;
  updatedAt: Date;
};

function makeModule(id: string, courseId: string): ModuleMapped {
  const now = new Date('2026-01-01');
  return {
    id,
    course_id: courseId,
    courseId,
    title: `Module ${id}`,
    description: null,
    order_index: 0,
    orderIndex: 0,
    created_at: now,
    createdAt: now,
    updated_at: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Mock ModuleService
// ---------------------------------------------------------------------------

function makeServiceMock(
  courseData: Map<string, ModuleMapped[]>,
  idData: Map<string, ModuleMapped>
) {
  return {
    findByCourseIdBatch: vi.fn(async (courseIds: string[]) => {
      const result = new Map<string, ModuleMapped[]>();
      for (const id of courseIds) {
        result.set(id, courseData.get(id) ?? []);
      }
      return result;
    }),
    findByIdBatch: vi.fn(async (ids: string[]) => {
      const result = new Map<string, ModuleMapped>();
      for (const id of ids) {
        const item = idData.get(id);
        if (item) result.set(id, item);
      }
      return result;
    }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ModuleLoader', () => {
  const MOD_A1 = makeModule('mod-a1', 'course-a');
  const MOD_A2 = makeModule('mod-a2', 'course-a');
  const MOD_B1 = makeModule('mod-b1', 'course-b');

  const courseData = new Map<string, ModuleMapped[]>([
    ['course-a', [MOD_A1, MOD_A2]],
    ['course-b', [MOD_B1]],
    ['course-empty', []],
  ]);

  const idData = new Map<string, ModuleMapped>([
    ['mod-a1', MOD_A1],
    ['mod-a2', MOD_A2],
    ['mod-b1', MOD_B1],
  ]);

  let serviceMock: ReturnType<typeof makeServiceMock>;
  let loader: ModuleLoader;

  beforeEach(() => {
    serviceMock = makeServiceMock(courseData, idData);
    // ModuleLoader accepts the service via constructor injection
    loader = new ModuleLoader(serviceMock as never);
  });

  describe('byCourseId.load()', () => {
    it('returns modules for a single course', async () => {
      const modules = await loader.byCourseId.load('course-a');
      expect(modules).toHaveLength(2);
      expect(modules.map((m) => m.id)).toEqual(['mod-a1', 'mod-a2']);
    });

    it('returns empty array for a course with no modules', async () => {
      const modules = await loader.byCourseId.load('course-empty');
      expect(modules).toEqual([]);
    });

    it('batches multiple concurrent .load() calls into ONE findByCourseIdBatch call', async () => {
      // Fire three loads in the same tick — DataLoader must coalesce them
      const [resA, resB, resEmpty] = await Promise.all([
        loader.byCourseId.load('course-a'),
        loader.byCourseId.load('course-b'),
        loader.byCourseId.load('course-empty'),
      ]);

      // Results are correct
      expect(resA).toHaveLength(2);
      expect(resB).toHaveLength(1);
      expect(resEmpty).toHaveLength(0);

      // The critical assertion: service called ONCE, not three times
      expect(serviceMock.findByCourseIdBatch).toHaveBeenCalledTimes(1);

      // All three courseIds were passed in one batch call
      const calledWith: string[] =
        serviceMock.findByCourseIdBatch.mock.calls[0]![0];
      expect(calledWith).toHaveLength(3);
      expect(calledWith).toContain('course-a');
      expect(calledWith).toContain('course-b');
      expect(calledWith).toContain('course-empty');
    });

    it('preserves correct result order regardless of DB return order', async () => {
      // DataLoader must still match results to the original key positions.
      const [resB, resA] = await Promise.all([
        loader.byCourseId.load('course-b'),
        loader.byCourseId.load('course-a'),
      ]);

      expect(resB[0]?.id).toBe('mod-b1');
      expect(resA[0]?.id).toBe('mod-a1');
    });

    it('returns module objects with all required fields', async () => {
      const [mod] = await loader.byCourseId.load('course-a');
      expect(mod).toMatchObject({
        id: expect.any(String) as string,
        courseId: 'course-a',
        title: expect.any(String) as string,
        orderIndex: expect.any(Number) as number,
      });
    });
  });

  describe('byId.load()', () => {
    it('returns a module by id', async () => {
      const mod = await loader.byId.load('mod-a1');
      expect(mod.id).toBe('mod-a1');
      expect(mod.courseId).toBe('course-a');
    });

    it('batches multiple concurrent byId .load() calls into ONE findByIdBatch call', async () => {
      const [modA1, modA2, modB1] = await Promise.all([
        loader.byId.load('mod-a1'),
        loader.byId.load('mod-a2'),
        loader.byId.load('mod-b1'),
      ]);

      expect(modA1.id).toBe('mod-a1');
      expect(modA2.id).toBe('mod-a2');
      expect(modB1.id).toBe('mod-b1');

      // The critical assertion: service called ONCE, not three times
      expect(serviceMock.findByIdBatch).toHaveBeenCalledTimes(1);

      const calledWith: string[] = serviceMock.findByIdBatch.mock.calls[0]![0];
      expect(calledWith).toHaveLength(3);
      expect(calledWith).toContain('mod-a1');
      expect(calledWith).toContain('mod-a2');
      expect(calledWith).toContain('mod-b1');
    });

    it('returns an Error for a missing module id', async () => {
      await expect(loader.byId.load('nonexistent-id')).rejects.toThrow(
        'Module with ID nonexistent-id not found'
      );
    });
  });

  describe('batching isolation', () => {
    it('does not share batch state between loader instances', async () => {
      const serviceMock2 = makeServiceMock(courseData, idData);
      const loader2 = new ModuleLoader(serviceMock2 as never);

      await loader.byCourseId.load('course-a');
      await loader2.byCourseId.load('course-b');

      // Each loader has its own DataLoader instance — separate batch calls
      expect(serviceMock.findByCourseIdBatch).toHaveBeenCalledTimes(1);
      expect(serviceMock2.findByCourseIdBatch).toHaveBeenCalledTimes(1);
    });
  });
});
