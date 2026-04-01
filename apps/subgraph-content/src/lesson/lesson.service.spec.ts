import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LessonService } from './lesson.service';

// ─── DB chain mocks ───────────────────────────────────────────────────────────

const mockReturning = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const _mockOffset = vi.fn();
const _mockOrderBy = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockValues = vi.fn();
const mockInsert = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
};

// withTenantContext mock: execute the operation callback with the mockDb
const mockWithTenantContext = vi.fn(
  async (_db: unknown, _ctx: unknown, op: (db: unknown) => Promise<unknown>) =>
    op(mockDb)
);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn(),
  withTenantContext: (...args: unknown[]) =>
    mockWithTenantContext(
      ...(args as [unknown, unknown, (db: unknown) => Promise<unknown>])
    ),
  schema: {
    lessons: {
      id: 'id',
      tenant_id: 'tenant_id',
      course_id: 'course_id',
      module_id: 'module_id',
      title: 'title',
      type: 'type',
      status: 'status',
      instructor_id: 'instructor_id',
      created_at: 'created_at',
      deleted_at: 'deleted_at',
    },
    courses: {
      id: 'id',
      tenant_id: 'tenant_id',
      deleted_at: 'deleted_at',
    },
    users: {
      id: 'id',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col) => ({ col, direction: 'desc' })),
  isNull: vi.fn((col) => ({ col, op: 'isNull' })),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    publish: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({ encode: vi.fn((s: string) => s) })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
  NatsSubjects: {
    LESSON_CREATED: 'EDUSPHERE.lesson.created',
    LESSON_PUBLISHED: 'EDUSPHERE.lesson.published',
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_CTX = {
  tenantId: 't-1',
  userId: 'u-1',
  userRole: 'INSTRUCTOR' as const,
};

const MOCK_ROW = {
  id: 'l-1',
  course_id: 'c-1',
  module_id: null,
  title: 'Introduction',
  type: 'THEMATIC',
  series: null,
  lesson_date: null,
  instructor_id: 'u-1',
  status: 'DRAFT',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const VALID_COURSE_ID = 'c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6';
const VALID_INSTRUCTOR_ID = '00000000-0000-0000-0000-000000000001';

// ─── Helper: set up select chain for pre-validation queries ──────────────────

/**
 * The create() method now does 2 pre-validation SELECT queries
 * (course check + instructor check) before the INSERT.
 * Each SELECT chains: select() → from() → where() → limit().
 */
function setupPreValidation(opts: {
  courseRow?: Record<string, unknown> | null;
  instructorRow?: Record<string, unknown> | null;
}) {
  let selectCallCount = 0;
  mockSelect.mockImplementation(() => {
    selectCallCount++;
    // Call 1: course check, Call 2: instructor check
    const result =
      selectCallCount === 1
        ? opts.courseRow
          ? [opts.courseRow]
          : []
        : opts.instructorRow
          ? [opts.instructorRow]
          : [];

    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(result),
        }),
      }),
    };
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LessonService', () => {
  let service: LessonService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LessonService();
  });

  describe('findById()', () => {
    beforeEach(() => {
      mockLimit.mockResolvedValue([MOCK_ROW]);
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });
    });

    it('returns mapped lesson when found', async () => {
      const result = await service.findById('l-1', TENANT_CTX);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('l-1');
    });

    it('returns null when lesson does not exist', async () => {
      mockLimit.mockResolvedValue([]);
      const result = await service.findById('no-such-id', TENANT_CTX);
      expect(result).toBeNull();
    });

    it('maps status from row', async () => {
      const result = await service.findById('l-1', TENANT_CTX);
      expect(result?.status).toBe('DRAFT');
    });

    it('calls withTenantContext for RLS compliance', async () => {
      await service.findById('l-1', TENANT_CTX);
      expect(mockWithTenantContext).toHaveBeenCalledWith(
        mockDb,
        TENANT_CTX,
        expect.any(Function)
      );
    });
  });

  describe('create()', () => {
    beforeEach(() => {
      mockReturning.mockResolvedValue([MOCK_ROW]);
      mockValues.mockReturnValue({ returning: mockReturning });
      mockInsert.mockReturnValue({ values: mockValues });

      // Default: course exists + instructor exists
      setupPreValidation({
        courseRow: { id: VALID_COURSE_ID, tenant_id: 't-1' },
        instructorRow: { id: VALID_INSTRUCTOR_ID },
      });
    });

    it('returns the newly created lesson', async () => {
      const input = {
        courseId: VALID_COURSE_ID,
        title: 'Introduction',
        type: 'THEMATIC' as const,
        instructorId: VALID_INSTRUCTOR_ID,
      };
      const result = await service.create(input, TENANT_CTX);
      expect(result?.title).toBe('Introduction');
    });

    it('calls withTenantContext for RLS compliance (SI-9)', async () => {
      await service.create(
        {
          courseId: VALID_COURSE_ID,
          title: 'T',
          type: 'THEMATIC',
          instructorId: VALID_INSTRUCTOR_ID,
        },
        TENANT_CTX
      );
      expect(mockWithTenantContext).toHaveBeenCalledWith(
        mockDb,
        TENANT_CTX,
        expect.any(Function)
      );
    });

    // ── Pre-validation: invalid courseId ──────────────────────────────────────

    it('throws BadRequestException for non-UUID courseId (BUG-044)', async () => {
      await expect(
        service.create(
          {
            courseId: 'mock-course-1',
            title: 'T',
            type: 'THEMATIC',
            instructorId: VALID_INSTRUCTOR_ID,
          },
          TENANT_CTX
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('error message for invalid courseId is in Hebrew', async () => {
      await expect(
        service.create(
          {
            courseId: 'not-a-uuid',
            title: 'T',
            type: 'THEMATIC',
            instructorId: VALID_INSTRUCTOR_ID,
          },
          TENANT_CTX
        )
      ).rejects.toMatchObject({
        message: expect.stringContaining('מזהה הקורס'),
      });
    });

    // ── Pre-validation: missing tenantId ──────────────────────────────────────

    it('throws BadRequestException when tenantId is empty', async () => {
      const noTenantCtx = { ...TENANT_CTX, tenantId: '' };
      await expect(
        service.create(
          {
            courseId: VALID_COURSE_ID,
            title: 'T',
            type: 'THEMATIC',
            instructorId: VALID_INSTRUCTOR_ID,
          },
          noTenantCtx
        )
      ).rejects.toThrow(BadRequestException);
    });

    // ── Pre-validation: course not found ─────────────────────────────────────

    it('throws NotFoundException when course does not exist', async () => {
      setupPreValidation({
        courseRow: null,
        instructorRow: { id: VALID_INSTRUCTOR_ID },
      });
      await expect(
        service.create(
          {
            courseId: VALID_COURSE_ID,
            title: 'T',
            type: 'THEMATIC',
            instructorId: VALID_INSTRUCTOR_ID,
          },
          TENANT_CTX
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('course-not-found error message is in Hebrew', async () => {
      setupPreValidation({
        courseRow: null,
        instructorRow: { id: VALID_INSTRUCTOR_ID },
      });
      await expect(
        service.create(
          {
            courseId: VALID_COURSE_ID,
            title: 'T',
            type: 'THEMATIC',
            instructorId: VALID_INSTRUCTOR_ID,
          },
          TENANT_CTX
        )
      ).rejects.toMatchObject({
        message: expect.stringContaining('הקורס לא נמצא'),
      });
    });

    // ── Pre-validation: tenant mismatch ──────────────────────────────────────

    it('throws BadRequestException when course belongs to different tenant', async () => {
      setupPreValidation({
        courseRow: { id: VALID_COURSE_ID, tenant_id: 'other-tenant' },
        instructorRow: { id: VALID_INSTRUCTOR_ID },
      });
      await expect(
        service.create(
          {
            courseId: VALID_COURSE_ID,
            title: 'T',
            type: 'THEMATIC',
            instructorId: VALID_INSTRUCTOR_ID,
          },
          TENANT_CTX
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('tenant-mismatch error message mentions permissions in Hebrew', async () => {
      setupPreValidation({
        courseRow: { id: VALID_COURSE_ID, tenant_id: 'other-tenant' },
        instructorRow: { id: VALID_INSTRUCTOR_ID },
      });
      await expect(
        service.create(
          {
            courseId: VALID_COURSE_ID,
            title: 'T',
            type: 'THEMATIC',
            instructorId: VALID_INSTRUCTOR_ID,
          },
          TENANT_CTX
        )
      ).rejects.toMatchObject({
        message: expect.stringContaining('הרשאה'),
      });
    });

    // ── Pre-validation: instructor not found ─────────────────────────────────

    it('throws BadRequestException when instructor does not exist in users table', async () => {
      setupPreValidation({
        courseRow: { id: VALID_COURSE_ID, tenant_id: 't-1' },
        instructorRow: null,
      });
      await expect(
        service.create(
          {
            courseId: VALID_COURSE_ID,
            title: 'T',
            type: 'THEMATIC',
            instructorId: 'unknown-user-uuid-0000-000000000000',
          },
          TENANT_CTX
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('instructor-not-found error message mentions sync in Hebrew', async () => {
      setupPreValidation({
        courseRow: { id: VALID_COURSE_ID, tenant_id: 't-1' },
        instructorRow: null,
      });
      await expect(
        service.create(
          {
            courseId: VALID_COURSE_ID,
            title: 'T',
            type: 'THEMATIC',
            instructorId: 'unknown-user-uuid-0000-000000000000',
          },
          TENANT_CTX
        )
      ).rejects.toMatchObject({
        message: expect.stringContaining('סנכרון'),
      });
    });

    // ── DB insert failure: specific FK error messages ────────────────────────

    it('throws BadRequestException when DB insert fails', async () => {
      mockReturning.mockRejectedValue(
        new Error('insert violates foreign key constraint')
      );
      await expect(
        service.create(
          {
            courseId: VALID_COURSE_ID,
            title: 'T',
            type: 'THEMATIC',
            instructorId: VALID_INSTRUCTOR_ID,
          },
          TENANT_CTX
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('DB error message does NOT contain raw SQL (regression guard)', async () => {
      mockReturning.mockRejectedValue(
        new Error(
          'insert violates foreign key constraint "lessons_course_id_fkey"'
        )
      );
      try {
        await service.create(
          {
            courseId: VALID_COURSE_ID,
            title: 'T',
            type: 'THEMATIC',
            instructorId: VALID_INSTRUCTOR_ID,
          },
          TENANT_CTX
        );
      } catch (err) {
        const msg = (err as { message: string }).message;
        expect(msg).not.toContain('foreign key');
        expect(msg).not.toContain('constraint');
        expect(msg).not.toContain('fkey');
      }
    });
  });

  describe('delete()', () => {
    beforeEach(() => {
      mockWhere.mockResolvedValue([]);
      mockSet.mockReturnValue({ where: mockWhere });
      mockUpdate.mockReturnValue({ set: mockSet });
    });

    it('returns true after soft-delete', async () => {
      const result = await service.delete('l-1', TENANT_CTX);
      expect(result).toBe(true);
    });

    it('calls withTenantContext for RLS compliance', async () => {
      await service.delete('l-1', TENANT_CTX);
      expect(mockWithTenantContext).toHaveBeenCalled();
    });
  });

  describe('publish()', () => {
    beforeEach(() => {
      // findById chain (uses withTenantContext internally)
      mockLimit.mockResolvedValue([MOCK_ROW]);
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });
      // update chain
      const publishedRow = { ...MOCK_ROW, status: 'PUBLISHED' };
      mockReturning.mockResolvedValue([publishedRow]);
      mockSet.mockReturnValue({ where: mockWhere });
      mockUpdate.mockReturnValue({ set: mockSet });
    });

    it('throws NotFoundException when lesson not found', async () => {
      mockLimit.mockResolvedValue([]);
      await expect(service.publish('no-id', TENANT_CTX)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('onModuleDestroy()', () => {
    it('calls closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
