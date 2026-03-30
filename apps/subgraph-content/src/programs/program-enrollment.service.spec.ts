/**
 * ProgramEnrollmentService unit tests — enrollment and progress tracking.
 * 14 tests covering enrollInProgram, getUserEnrollments, getProgramProgress,
 * getEnrollmentCounts, and cleanup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockWithTenantContext, mockCloseAllPools } = vi.hoisted(() => ({
  mockWithTenantContext: vi.fn(),
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: mockCloseAllPools,
  withTenantContext: mockWithTenantContext,
  schema: {
    programEnrollments: {
      userId: 'userId',
      programId: 'programId',
      tenantId: 'tenantId',
    },
    credentialPrograms: {
      id: 'id',
    },
    userCourses: {
      userId: 'userId',
      courseId: 'courseId',
    },
  },
  eq: vi.fn(),
  and: vi.fn(),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { ProgramEnrollmentService } from './program-enrollment.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT = 'tenant-001';
const USER = 'user-abc';
const PROGRAM = 'program-1';

function makeEnrollment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'enrollment-1',
    programId: PROGRAM,
    userId: USER,
    enrolledAt: new Date('2025-06-01'),
    completedAt: null,
    certificateId: null,
    ...overrides,
  };
}

function makeProgram(overrides: Record<string, unknown> = {}) {
  return {
    id: PROGRAM,
    tenantId: TENANT,
    name: 'AI Nanodegree',
    published: true,
    requiredCourseIds: ['course-a', 'course-b', 'course-c'],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProgramEnrollmentService', () => {
  let svc: ProgramEnrollmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new ProgramEnrollmentService();
  });

  it('constructs without errors', () => {
    expect(svc).toBeInstanceOf(ProgramEnrollmentService);
  });

  it('onModuleDestroy calls closeAllPools', async () => {
    await svc.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  // ── enrollInProgram ───────────────────────────────────────────────────────

  it('enrollInProgram returns existing enrollment idempotently', async () => {
    const existing = makeEnrollment();
    mockWithTenantContext.mockResolvedValueOnce([existing]);

    const result = await svc.enrollInProgram(PROGRAM, USER, TENANT);

    expect(result.id).toBe('enrollment-1');
    expect(mockWithTenantContext).toHaveBeenCalledOnce();
  });

  it('enrollInProgram creates new enrollment when none exists', async () => {
    const program = makeProgram();
    const newEnrollment = makeEnrollment({ id: 'enrollment-new' });
    mockWithTenantContext
      .mockResolvedValueOnce([]) // no existing
      .mockResolvedValueOnce([program]) // program lookup
      .mockResolvedValueOnce([newEnrollment]); // insert

    const result = await svc.enrollInProgram(PROGRAM, USER, TENANT);

    expect(result.id).toBe('enrollment-new');
    expect(mockWithTenantContext).toHaveBeenCalledTimes(3);
  });

  it('enrollInProgram throws NotFoundException when program not found', async () => {
    mockWithTenantContext
      .mockResolvedValueOnce([]) // no existing enrollment
      .mockResolvedValueOnce([]); // no program

    await expect(
      svc.enrollInProgram(PROGRAM, USER, TENANT)
    ).rejects.toThrow(NotFoundException);
  });

  it('enrollInProgram throws ConflictException when program not published', async () => {
    const unpublished = makeProgram({ published: false });
    mockWithTenantContext
      .mockResolvedValueOnce([]) // no existing enrollment
      .mockResolvedValueOnce([unpublished]); // program not published

    await expect(
      svc.enrollInProgram(PROGRAM, USER, TENANT)
    ).rejects.toThrow(ConflictException);
  });

  // ── getUserEnrollments ────────────────────────────────────────────────────

  it('getUserEnrollments returns mapped enrollments', async () => {
    const enrollments = [
      makeEnrollment(),
      makeEnrollment({ id: 'e-2', programId: 'program-2' }),
    ];
    mockWithTenantContext.mockResolvedValueOnce(enrollments);

    const results = await svc.getUserEnrollments(USER, TENANT);

    expect(results).toHaveLength(2);
    expect(results[0]!.enrolledAt).toBe('2025-06-01T00:00:00.000Z');
  });

  it('getUserEnrollments returns empty when no enrollments', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    const results = await svc.getUserEnrollments(USER, TENANT);

    expect(results).toEqual([]);
  });

  // ── getProgramProgress ────────────────────────────────────────────────────

  it('getProgramProgress returns 100% when no required courses', async () => {
    const program = makeProgram({ requiredCourseIds: [] });
    mockWithTenantContext.mockResolvedValueOnce([program]);

    const progress = await svc.getProgramProgress(PROGRAM, USER, TENANT);

    expect(progress.percentComplete).toBe(100);
    expect(progress.totalCourses).toBe(0);
  });

  it('getProgramProgress calculates correct percentage', async () => {
    const program = makeProgram({ requiredCourseIds: ['c-1', 'c-2', 'c-3', 'c-4'] });
    const completions = [{ courseId: 'c-1' }, { courseId: 'c-3' }];
    mockWithTenantContext
      .mockResolvedValueOnce([program])
      .mockResolvedValueOnce(completions);

    const progress = await svc.getProgramProgress(PROGRAM, USER, TENANT);

    expect(progress.totalCourses).toBe(4);
    expect(progress.completedCourses).toBe(2);
    expect(progress.percentComplete).toBe(50);
    expect(progress.completedCourseIds).toEqual(['c-1', 'c-3']);
  });

  it('getProgramProgress throws NotFoundException when program not found', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    await expect(
      svc.getProgramProgress(PROGRAM, USER, TENANT)
    ).rejects.toThrow(NotFoundException);
  });

  // ── getEnrollmentCounts ───────────────────────────────────────────────────

  it('getEnrollmentCounts returns empty map for empty input', async () => {
    const result = await svc.getEnrollmentCounts([], TENANT, USER);

    expect(result.size).toBe(0);
    expect(mockWithTenantContext).not.toHaveBeenCalled();
  });

  it('getEnrollmentCounts counts enrollments per program', async () => {
    const rows = [
      { programId: 'p-1' },
      { programId: 'p-1' },
      { programId: 'p-2' },
    ];
    mockWithTenantContext.mockResolvedValueOnce(rows);

    const counts = await svc.getEnrollmentCounts(['p-1', 'p-2'], TENANT, USER);

    expect(counts.get('p-1')).toBe(2);
    expect(counts.get('p-2')).toBe(1);
  });
});
