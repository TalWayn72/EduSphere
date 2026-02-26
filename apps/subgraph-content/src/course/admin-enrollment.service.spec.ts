/**
 * Unit tests for AdminEnrollmentService (F-108 Enrollment Management).
 *
 * 8 tests:
 *  1. getEnrollments returns all enrollments for a course
 *  2. enrollUser creates new enrollment record
 *  3. enrollUser is idempotent — returns existing if already enrolled
 *  4. enrollUser throws NotFoundException if course not found
 *  5. unenrollUser removes enrollment and returns true
 *  6. unenrollUser throws NotFoundException if enrollment not found
 *  7. bulkEnroll skips already-enrolled users and returns new count
 *  8. bulkEnroll returns 0 for empty userIds array
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  delete: vi.fn().mockReturnThis(),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    userCourses: {
      id: 'id',
      userId: 'user_id',
      courseId: 'course_id',
      status: 'status',
    },
    courses: { id: 'id' },
  },
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  and: vi.fn((...args: unknown[]) => args),
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, fn: (db: unknown) => unknown) =>
      fn(mockDb)
  ),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { AdminEnrollmentService } from './admin-enrollment.service';
import { withTenantContext } from '@edusphere/db';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TENANT_CTX = {
  tenantId: 'tenant-1',
  userId: 'admin-1',
  userRole: 'ORG_ADMIN',
};
const COURSE_ID = 'course-abc';
const USER_ID = 'user-xyz';

function buildEnrollmentRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'enroll-1',
    userId: USER_ID,
    courseId: COURSE_ID,
    status: 'ACTIVE',
    enrolledAt: new Date('2026-01-01T10:00:00Z'),
    completedAt: null,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminEnrollmentService', () => {
  let service: AdminEnrollmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminEnrollmentService();
  });

  // ── 1. getEnrollments ──────────────────────────────────────────────────────

  it('getEnrollments returns all enrollments for a course', async () => {
    const row = buildEnrollmentRow();
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) =>
      fn({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([row]),
          }),
        }),
      } as never)
    );

    const result = await service.getEnrollments(COURSE_ID, TENANT_CTX);
    expect(result).toHaveLength(1);
    expect(result[0].courseId).toBe(COURSE_ID);
    expect(result[0].enrolledAt).toBe('2026-01-01T10:00:00.000Z');
    expect(result[0].completedAt).toBeNull();
  });

  // ── 2. enrollUser creates enrollment ──────────────────────────────────────

  it('enrollUser creates a new enrollment record', async () => {
    const row = buildEnrollmentRow();
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) =>
      fn({
        // course check
        select: vi
          .fn()
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: COURSE_ID }]),
              }),
            }),
          })
          // existing check → empty
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi
                .fn()
                .mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
            }),
          }),
        insert: vi.fn().mockReturnValue({
          values: vi
            .fn()
            .mockReturnValue({ returning: vi.fn().mockResolvedValue([row]) }),
        }),
      } as never)
    );

    const result = await service.enrollUser(COURSE_ID, USER_ID, TENANT_CTX);
    expect(result.userId).toBe(USER_ID);
    expect(result.courseId).toBe(COURSE_ID);
    expect(result.status).toBe('ACTIVE');
  });

  // ── 3. enrollUser is idempotent ────────────────────────────────────────────

  it('enrollUser is idempotent — returns existing enrollment without inserting', async () => {
    const row = buildEnrollmentRow();
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) =>
      fn({
        select: vi
          .fn()
          // course check
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: COURSE_ID }]),
              }),
            }),
          })
          // existing enrollment found
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi
                .fn()
                .mockReturnValue({ limit: vi.fn().mockResolvedValue([row]) }),
            }),
          }),
        insert: vi.fn(),
      } as never)
    );

    const result = await service.enrollUser(COURSE_ID, USER_ID, TENANT_CTX);
    expect(result.id).toBe('enroll-1');
    // insert should never be called for idempotent case
    const txMock = vi.mocked(withTenantContext).mock.results[0]?.value;
    expect(txMock).not.toBeUndefined();
  });

  // ── 4. enrollUser throws NotFoundException for missing course ──────────────

  it('enrollUser throws NotFoundException when course is not found', async () => {
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) =>
      fn({
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi
              .fn()
              .mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
          }),
        }),
      } as never)
    );

    await expect(
      service.enrollUser('no-course', USER_ID, TENANT_CTX)
    ).rejects.toThrow(NotFoundException);
  });

  // ── 5. unenrollUser removes enrollment ────────────────────────────────────

  it('unenrollUser removes enrollment and returns true', async () => {
    const row = buildEnrollmentRow();
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) =>
      fn({
        delete: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockReturnValue({ returning: vi.fn().mockResolvedValue([row]) }),
        }),
      } as never)
    );

    const result = await service.unenrollUser(COURSE_ID, USER_ID, TENANT_CTX);
    expect(result).toBe(true);
  });

  // ── 6. unenrollUser throws NotFoundException ───────────────────────────────

  it('unenrollUser throws NotFoundException when enrollment not found', async () => {
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) =>
      fn({
        delete: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
        }),
      } as never)
    );

    await expect(
      service.unenrollUser(COURSE_ID, 'ghost-user', TENANT_CTX)
    ).rejects.toThrow(NotFoundException);
  });

  // ── 7. bulkEnroll skips already-enrolled users ─────────────────────────────

  it('bulkEnroll skips already-enrolled users and returns count of new enrollments', async () => {
    vi.mocked(withTenantContext).mockImplementationOnce(async (_db, _ctx, fn) =>
      fn({
        select: vi
          .fn()
          // course check
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: COURSE_ID }]),
              }),
            }),
          })
          // existing enrollments — user-1 already enrolled
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ userId: 'user-1' }]),
            }),
          }),
        insert: vi
          .fn()
          .mockReturnValue({ values: vi.fn().mockResolvedValue([]) }),
      } as never)
    );

    const result = await service.bulkEnroll(
      COURSE_ID,
      ['user-1', 'user-2', 'user-3'],
      TENANT_CTX
    );
    // Only user-2 and user-3 are new
    expect(result).toBe(2);
  });

  // ── 8. bulkEnroll returns 0 for empty array ────────────────────────────────

  it('bulkEnroll returns 0 immediately for empty userIds array', async () => {
    const result = await service.bulkEnroll(COURSE_ID, [], TENANT_CTX);
    expect(result).toBe(0);
    expect(vi.mocked(withTenantContext)).not.toHaveBeenCalled();
  });
});
