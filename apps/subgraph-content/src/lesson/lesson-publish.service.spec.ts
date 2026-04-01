/**
 * Unit tests for LessonPublishService.
 * Covers: publishLesson success/failure, NATS event emission, onModuleDestroy cleanup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ── hoisted mocks ────────────────────────────────────────────────────────── */

const { mockCloseAllPools, mockNatsDrain, mockNatsPublish, mockNatsConnect } =
  vi.hoisted(() => ({
    mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
    mockNatsDrain: vi.fn().mockResolvedValue(undefined),
    mockNatsPublish: vi.fn(),
    mockNatsConnect: vi.fn(),
  }));

const mockSelect = vi.fn();
const _mockFrom = vi.fn();
const _mockWhere = vi.fn();
const _mockLimit = vi.fn();
const mockUpdate = vi.fn();
const _mockSet = vi.fn();
const _mockReturning = vi.fn();

const mockDb = {
  select: mockSelect,
  update: mockUpdate,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: mockCloseAllPools,
  schema: {
    lessons: { id: 'id', tenant_id: 'tenant_id', deleted_at: 'deleted_at' },
    lesson_pipeline_runs: { id: 'id', status: 'status' },
  },
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  desc: vi.fn(),
}));

vi.mock('nats', () => ({
  connect: (...args: unknown[]) => mockNatsConnect(...args),
  StringCodec: vi.fn(() => ({
    encode: (s: string) => Buffer.from(s),
    decode: (b: Uint8Array) => Buffer.from(b).toString(),
  })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
  NatsSubjects: {
    LESSON_PUBLISHED: 'EDUSPHERE.lesson.published',
  },
}));

import { LessonPublishService } from './lesson-publish.service';
import type { TenantContext } from '@edusphere/db';

/* ── test data ────────────────────────────────────────────────────────────── */

const TENANT_CTX: TenantContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  userRole: 'INSTRUCTOR',
};

const MOCK_LESSON = {
  id: 'lesson-1',
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  title: 'Test Lesson',
  status: 'DRAFT',
  deleted_at: null,
};

const MOCK_RUN_COMPLETED = {
  id: 'run-1',
  status: 'COMPLETED',
  lesson_id: 'lesson-1',
};

const MOCK_RUN_RUNNING = {
  id: 'run-2',
  status: 'RUNNING',
  lesson_id: 'lesson-1',
};

/* ── helpers ──────────────────────────────────────────────────────────────── */

function _setupFindLesson(lesson: unknown = MOCK_LESSON) {
  const limitFn = vi.fn().mockResolvedValue(lesson ? [lesson] : []);
  const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
  const fromFn = vi.fn().mockReturnValue({ where: whereFn });
  mockSelect.mockReturnValue({ from: fromFn });
  return { limitFn, whereFn, fromFn };
}

function _setupFindRun(run: unknown = MOCK_RUN_COMPLETED) {
  // Called second time via select().from().where().limit()
  const limitFn = vi.fn().mockResolvedValue(run ? [run] : []);
  const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
  const fromFn = vi.fn().mockReturnValue({ where: whereFn });
  return { limitFn, whereFn, fromFn };
}

function setupUpdateLesson(
  updated: unknown = { ...MOCK_LESSON, status: 'PUBLISHED' }
) {
  const returningFn = vi.fn().mockResolvedValue([updated]);
  const whereFn = vi.fn().mockReturnValue({ returning: returningFn });
  const setFn = vi.fn().mockReturnValue({ where: whereFn });
  mockUpdate.mockReturnValue({ set: setFn });
  return { returningFn, setFn };
}

/* ── tests ────────────────────────────────────────────────────────────────── */

describe('LessonPublishService', () => {
  let service: LessonPublishService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LessonPublishService();
    mockNatsConnect.mockResolvedValue({
      publish: mockNatsPublish,
      drain: mockNatsDrain,
      close: vi.fn(),
    });
  });

  describe('publishLesson()', () => {
    it('returns PublishResult with PUBLISHED status', async () => {
      // First select() call = find lesson, second = find run
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([MOCK_LESSON]),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([MOCK_RUN_COMPLETED]),
            }),
          }),
        };
      });
      setupUpdateLesson();

      const result = await service.publishLesson(
        'lesson-1',
        'run-1',
        TENANT_CTX
      );

      expect(result.status).toBe('PUBLISHED');
      expect(result.lessonId).toBe('lesson-1');
      expect(result.publishedRunId).toBe('run-1');
      expect(result.publishUrl).toBe('/lessons/lesson-1');
      expect(result.publishedAt).toBeDefined();
    });

    it('sets status to PUBLISHED and published_run_id on lesson', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([MOCK_LESSON]),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([MOCK_RUN_COMPLETED]),
            }),
          }),
        };
      });

      let capturedSet: Record<string, unknown> = {};
      const returningFn = vi
        .fn()
        .mockResolvedValue([{ ...MOCK_LESSON, status: 'PUBLISHED' }]);
      const whereFn = vi.fn().mockReturnValue({ returning: returningFn });
      const setFn = vi.fn().mockImplementation((v: Record<string, unknown>) => {
        capturedSet = v;
        return { where: whereFn };
      });
      mockUpdate.mockReturnValue({ set: setFn });

      await service.publishLesson('lesson-1', 'run-1', TENANT_CTX);

      expect(capturedSet['status']).toBe('PUBLISHED');
      expect(capturedSet['published_run_id']).toBe('run-1');
    });

    it('emits NATS LESSON_PUBLISHED event', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([MOCK_LESSON]),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([MOCK_RUN_COMPLETED]),
            }),
          }),
        };
      });
      setupUpdateLesson();

      await service.publishLesson('lesson-1', 'run-1', TENANT_CTX);

      // Wait for async NATS publish
      await new Promise((r) => setTimeout(r, 50));

      expect(mockNatsConnect).toHaveBeenCalled();
      expect(mockNatsPublish).toHaveBeenCalledWith(
        'EDUSPHERE.lesson.published',
        expect.any(Uint8Array)
      );
    });

    it('throws NotFoundException when lesson not found', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        service.publishLesson('bad-id', 'run-1', TENANT_CTX)
      ).rejects.toThrow('not found');
    });

    it('throws BadRequestException when run is not COMPLETED', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([MOCK_LESSON]),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([MOCK_RUN_RUNNING]),
            }),
          }),
        };
      });

      await expect(
        service.publishLesson('lesson-1', 'run-2', TENANT_CTX)
      ).rejects.toThrow('not in COMPLETED state');
    });

    it('throws BadRequestException when run not found', async () => {
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([MOCK_LESSON]),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      });

      await expect(
        service.publishLesson('lesson-1', 'no-run', TENANT_CTX)
      ).rejects.toThrow('not in COMPLETED state');
    });
  });

  describe('onModuleDestroy()', () => {
    it('drains NATS connection when present', async () => {
      // Force getNats to create a connection
      let selectCallCount = 0;
      mockSelect.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([MOCK_LESSON]),
              }),
            }),
          };
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([MOCK_RUN_COMPLETED]),
            }),
          }),
        };
      });
      setupUpdateLesson();
      await service.publishLesson('lesson-1', 'run-1', TENANT_CTX);
      await new Promise((r) => setTimeout(r, 50));

      await service.onModuleDestroy();

      expect(mockNatsDrain).toHaveBeenCalled();
    });

    it('calls closeAllPools', async () => {
      await service.onModuleDestroy();
      expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
    });

    it('nullifies nc after destroy', async () => {
      await service.onModuleDestroy();
      const priv = service as unknown as { nc: unknown };
      expect(priv.nc).toBeNull();
    });

    it('is safe to call without prior NATS usage', async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});
