import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';

// ── Shared mock fns ──────────────────────────────────────────────────────────
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockDb = { select: mockSelect, insert: mockInsert, delete: mockDelete };

// withTenantContext just runs the callback with mockDb
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    courses: { id: 'id' },
    userCourses: {
      id: 'id',
      userId: 'user_id',
      courseId: 'course_id',
      status: 'status',
      enrolledAt: 'enrolled_at',
      completedAt: 'completed_at',
    },
    userProgress: {
      id: 'id',
      userId: 'user_id',
      contentItemId: 'content_item_id',
      isCompleted: 'is_completed',
      completedAt: 'completed_at',
    },
    contentItems: { id: 'id', moduleId: 'module_id' },
    modules: { id: 'id', courseId: 'course_id' },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...conds) => ({ and: conds })),
  withTenantContext: vi.fn((_db, _ctx, fn) => fn(mockDb)),
}));

const TENANT_CTX = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  userRole: 'STUDENT' as const,
};

const MOCK_ENROLLMENT = {
  id: 'enroll-1',
  userId: 'user-1',
  courseId: 'course-1',
  status: 'ACTIVE',
  enrolledAt: new Date('2026-01-01'),
  completedAt: null,
};

/** Build a fluent select chain that resolves with `rows` at `.limit()` */
function makeSelectChain(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, limit };
}

/** Build a select chain that resolves directly at `.where()` (no .limit()) */
function makeSelectChainNoLimit(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  return { from, where };
}

describe('EnrollmentService', () => {
  let service: EnrollmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EnrollmentService();
  });

  // ── enrollCourse ───────────────────────────────────────────────────────────
  describe('enrollCourse()', () => {
    it('returns mapped enrollment on success', async () => {
      // Two sequential selects: course exists, then not-enrolled-yet
      const chain1 = makeSelectChain([{ id: 'course-1' }]);
      const chain2 = makeSelectChain([]);
      mockSelect.mockReturnValueOnce({ from: chain1.from })
                .mockReturnValueOnce({ from: chain2.from });

      const mockReturning = vi.fn().mockResolvedValue([MOCK_ENROLLMENT]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      mockInsert.mockReturnValue({ values: mockValues });

      const result = await service.enrollCourse('course-1', TENANT_CTX);
      expect(result).toMatchObject({
        id: 'enroll-1',
        userId: 'user-1',
        courseId: 'course-1',
        status: 'ACTIVE',
        enrolledAt: new Date('2026-01-01').toISOString(),
        completedAt: null,
      });
    });

    it('throws NotFoundException when course not found', async () => {
      const chain = makeSelectChain([]);
      mockSelect.mockReturnValueOnce({ from: chain.from });
      await expect(service.enrollCourse('no-course', TENANT_CTX)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when already enrolled', async () => {
      const chain1 = makeSelectChain([{ id: 'course-1' }]);
      const chain2 = makeSelectChain([{ id: 'enroll-1' }]);
      mockSelect.mockReturnValueOnce({ from: chain1.from })
                .mockReturnValueOnce({ from: chain2.from });
      await expect(service.enrollCourse('course-1', TENANT_CTX)).rejects.toThrow(ConflictException);
    });

    it('maps enrolledAt to ISO string', async () => {
      const chain1 = makeSelectChain([{ id: 'course-1' }]);
      const chain2 = makeSelectChain([]);
      mockSelect.mockReturnValueOnce({ from: chain1.from })
                .mockReturnValueOnce({ from: chain2.from });

      const mockReturning = vi.fn().mockResolvedValue([MOCK_ENROLLMENT]);
      mockInsert.mockReturnValue({ values: vi.fn().mockReturnValue({ returning: mockReturning }) });

      const result = await service.enrollCourse('course-1', TENANT_CTX);
      expect(typeof result.enrolledAt).toBe('string');
      expect(result.enrolledAt).toBe(new Date('2026-01-01').toISOString());
    });

    it('maps null completedAt correctly', async () => {
      const chain1 = makeSelectChain([{ id: 'course-1' }]);
      const chain2 = makeSelectChain([]);
      mockSelect.mockReturnValueOnce({ from: chain1.from })
                .mockReturnValueOnce({ from: chain2.from });

      const mockReturning = vi.fn().mockResolvedValue([{ ...MOCK_ENROLLMENT, completedAt: null }]);
      mockInsert.mockReturnValue({ values: vi.fn().mockReturnValue({ returning: mockReturning }) });

      const result = await service.enrollCourse('course-1', TENANT_CTX);
      expect(result.completedAt).toBeNull();
    });
  });

  // ── unenrollCourse ─────────────────────────────────────────────────────────
  describe('unenrollCourse()', () => {
    it('returns true on successful unenrollment', async () => {
      const mockReturning = vi.fn().mockResolvedValue([MOCK_ENROLLMENT]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      mockDelete.mockReturnValue({ where: mockWhere });

      const result = await service.unenrollCourse('course-1', TENANT_CTX);
      expect(result).toBe(true);
    });

    it('throws NotFoundException when enrollment not found', async () => {
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      mockDelete.mockReturnValue({ where: mockWhere });

      await expect(service.unenrollCourse('course-1', TENANT_CTX)).rejects.toThrow(NotFoundException);
    });

    it('calls delete on userCourses table', async () => {
      const mockReturning = vi.fn().mockResolvedValue([MOCK_ENROLLMENT]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      mockDelete.mockReturnValue({ where: mockWhere });

      await service.unenrollCourse('course-1', TENANT_CTX);
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  // ── getMyEnrollments ───────────────────────────────────────────────────────
  describe('getMyEnrollments()', () => {
    it('returns array of mapped enrollments', async () => {
      const chain = makeSelectChainNoLimit([MOCK_ENROLLMENT]);
      mockSelect.mockReturnValue({ from: chain.from });

      const result = await service.getMyEnrollments(TENANT_CTX);
      expect(Array.isArray(result)).toBe(true);
    });

    it('maps enrollment fields correctly', async () => {
      const chain = makeSelectChainNoLimit([MOCK_ENROLLMENT]);
      mockSelect.mockReturnValue({ from: chain.from });

      const result = await service.getMyEnrollments(TENANT_CTX);
      expect(result[0]).toMatchObject({
        id: 'enroll-1',
        courseId: 'course-1',
        status: 'ACTIVE',
      });
    });

    it('returns empty array when no enrollments', async () => {
      const chain = makeSelectChainNoLimit([]);
      mockSelect.mockReturnValue({ from: chain.from });

      const result = await service.getMyEnrollments(TENANT_CTX);
      expect(result).toHaveLength(0);
    });
  });

  // ── markContentViewed ──────────────────────────────────────────────────────
  describe('markContentViewed()', () => {
    it('returns true on success', async () => {
      const mockOnConflict = vi.fn().mockResolvedValue(undefined);
      const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict });
      mockInsert.mockReturnValue({ values: mockValues });

      const result = await service.markContentViewed('item-1', TENANT_CTX);
      expect(result).toBe(true);
    });

    it('calls insert on userProgress table', async () => {
      const mockOnConflict = vi.fn().mockResolvedValue(undefined);
      mockInsert.mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict }) });

      await service.markContentViewed('item-1', TENANT_CTX);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('uses onConflictDoUpdate for upsert behavior', async () => {
      const mockOnConflict = vi.fn().mockResolvedValue(undefined);
      mockInsert.mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict }) });

      await service.markContentViewed('item-1', TENANT_CTX);
      expect(mockOnConflict).toHaveBeenCalled();
    });
  });
});
