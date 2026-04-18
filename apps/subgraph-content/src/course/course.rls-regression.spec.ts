/**
 * REGRESSION TEST — courses query RLS tenant context (bug: empty results)
 *
 * Root cause: getCourses resolver called findAll(limit, offset) without
 * passing tenantCtx, so withTenantContext() was never called and the RLS
 * policy (which requires app.current_tenant to be set) blocked all rows.
 *
 * This file tests two contracts:
 *  1. CourseService.findAll() MUST call withTenantContext() — not just
 *     withReadReplica() alone — so that RLS is satisfied.
 *  2. CourseResolver.getCourses() MUST forward the authenticated tenant
 *     context (from GqlContext) to CourseService.findAll().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  const mockOffset = vi.fn();
  const mockLimit = vi.fn(() => ({ offset: mockOffset }));
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
  const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));

  const mockDb = { select: mockSelect };

  /**
   * withTenantContext spy: executes the callback immediately so the inner
   * DB chain still runs — this lets us assert both "was called" AND
   * "returned courses" in the same test.
   */
  const withTenantContextMock = vi.fn(
    (
      _db: unknown,
      _ctx: unknown,
      fn: (db: typeof mockDb) => unknown
    ) => fn(mockDb)
  );

  const withReadReplicaMock = vi.fn(
    (fn: (db: typeof mockDb) => unknown) => fn(mockDb)
  );

  return {
    mockOffset,
    mockLimit,
    mockOrderBy,
    mockWhere,
    mockFrom,
    mockSelect,
    mockDb,
    withTenantContextMock,
    withReadReplicaMock,
  };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mocks.mockDb),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: mocks.withTenantContextMock,
  withReadReplica: mocks.withReadReplicaMock,
  schema: {
    courses: {
      id: 'id',
      tenantId: 'tenant_id',
      title: 'title',
      description: 'description',
      instructorId: 'instructor_id',
      is_published: 'is_published',
      createdAt: 'created_at',
      deleted_at: 'deleted_at',
    },
    lessons: { id: 'id', course_id: 'course_id', status: 'status', deleted_at: 'deleted_at' },
    lesson_pipeline_runs: { id: 'id', lesson_id: 'lesson_id' },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  desc: vi.fn((col) => ({ col, direction: 'desc' })),
  and: vi.fn((...args) => ({ args, op: 'and' })),
  isNull: vi.fn((col) => ({ col, op: 'isNull' })),
  ilike: vi.fn((col, pattern) => ({ col, pattern, op: 'ilike' })),
  or: vi.fn((...args) => ({ args, op: 'or' })),
  count: vi.fn(() => 'count(*)'),
  sql: vi.fn(),
}));

import { CourseService } from './course.service';
import { CoursePublishService } from './course-publish.service';
import { CourseResolver } from './course.resolver';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const TENANT_CTX = {
  tenantId: 'tenant-abc',
  userId: 'user-xyz',
  userRole: 'STUDENT' as const,
};

const MOCK_COURSE = {
  id: 'course-1',
  tenant_id: 'tenant-abc',
  title: 'Published Course',
  description: 'Visible to tenant',
  instructor_id: 'user-xyz',
  is_published: true,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  deleted_at: null,
  slug: 'published-course',
  thumbnail_url: null,
  estimated_hours: null,
  forked_from_id: null,
};

const AUTH_CTX = {
  authContext: {
    userId: TENANT_CTX.userId,
    tenantId: TENANT_CTX.tenantId,
    email: 'student@test.com',
    username: 'student',
    roles: ['STUDENT' as const],
    scopes: [],
    isSuperAdmin: false,
  },
};

// ---------------------------------------------------------------------------
// 1. CourseService.findAll() — RLS wrapper contract
// ---------------------------------------------------------------------------
describe('CourseService.findAll() — RLS regression', () => {
  let service: CourseService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default chain: returns one published course
    mocks.mockOffset.mockResolvedValue([MOCK_COURSE]);
    mocks.mockLimit.mockReturnValue({ offset: mocks.mockOffset });
    mocks.mockOrderBy.mockReturnValue({ limit: mocks.mockLimit });
    mocks.mockWhere.mockReturnValue({ orderBy: mocks.mockOrderBy });
    mocks.mockFrom.mockReturnValue({ where: mocks.mockWhere });
    mocks.mockSelect.mockReturnValue({ from: mocks.mockFrom });
    service = new CourseService(new CoursePublishService());
  });

  it('REGRESSION: calls withTenantContext() — RLS requires app.current_tenant to be set', async () => {
    await service.findAll(10, 0, TENANT_CTX);
    expect(mocks.withTenantContextMock).toHaveBeenCalledTimes(1);
  });

  it('passes the tenantCtx object to withTenantContext()', async () => {
    await service.findAll(10, 0, TENANT_CTX);
    const [, receivedCtx] = mocks.withTenantContextMock.mock.calls[0] as [
      unknown,
      typeof TENANT_CTX,
      unknown,
    ];
    expect(receivedCtx).toMatchObject({
      tenantId: TENANT_CTX.tenantId,
      userId: TENANT_CTX.userId,
    });
  });

  it('returns courses (not empty) when withTenantContext is called correctly', async () => {
    const result = await service.findAll(10, 0, TENANT_CTX);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'course-1' });
  });

  it('filters only published courses — is_published = true', async () => {
    await service.findAll(10, 0, TENANT_CTX);
    // The `eq` mock should have been called with is_published = true
    const { eq } = await import('@edusphere/db');
    const eqCalls = vi.mocked(eq).mock.calls;
    const publishedCall = eqCalls.find(([, val]) => val === true);
    expect(publishedCall).toBeDefined();
  });

  it('applies the provided limit', async () => {
    await service.findAll(25, 0, TENANT_CTX);
    expect(mocks.mockLimit).toHaveBeenCalledWith(25);
  });

  it('applies the provided offset', async () => {
    await service.findAll(10, 50, TENANT_CTX);
    expect(mocks.mockOffset).toHaveBeenCalledWith(50);
  });

  it('applies descending order by createdAt', async () => {
    const { desc } = await import('@edusphere/db');
    await service.findAll(10, 0, TENANT_CTX);
    expect(vi.mocked(desc)).toHaveBeenCalled();
    expect(mocks.mockOrderBy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. CourseResolver.getCourses() — must forward tenantCtx
// ---------------------------------------------------------------------------
describe('CourseResolver.getCourses() — tenant context propagation regression', () => {
  const mockCourseService = {
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setPublished: vi.fn(),
    delete: vi.fn(),
    getEnrollmentCount: vi.fn(),
    search: vi.fn(),
    forkCourse: vi.fn(),
    checkCourseReadiness: vi.fn(),
  };

  const mockEnrollmentService = {
    enrollCourse: vi.fn(),
    unenrollCourse: vi.fn(),
    getMyEnrollments: vi.fn(),
    getCourseProgress: vi.fn(),
    markContentViewed: vi.fn(),
  };

  const mockAdminEnrollmentService = {
    getEnrollments: vi.fn(),
    enrollUser: vi.fn(),
    unenrollUser: vi.fn(),
    bulkEnroll: vi.fn(),
  };

  const mockComplianceLibraryService = {
    getComplianceCourses: vi.fn(),
    cloneComplianceCourse: vi.fn(),
  };

  const mockModuleLoader = { byCourseId: { load: vi.fn() } };

  let resolver: CourseResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    /* eslint-disable @typescript-eslint/no-explicit-any */
    resolver = new CourseResolver(
      mockCourseService as any,
      mockEnrollmentService as any,
      mockAdminEnrollmentService as any,
      mockComplianceLibraryService as any,
      mockModuleLoader as any
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */
    mockCourseService.findAll.mockResolvedValue([MOCK_COURSE]);
  });

  it('REGRESSION: getCourses() passes tenantCtx to service.findAll — not just limit/offset', async () => {
    await resolver.getCourses(10, 0, AUTH_CTX);
    expect(mockCourseService.findAll).toHaveBeenCalledWith(
      10,
      0,
      expect.objectContaining({
        tenantId: TENANT_CTX.tenantId,
        userId: TENANT_CTX.userId,
      })
    );
  });

  it('returns courses from service when auth context is valid', async () => {
    const result = await resolver.getCourses(10, 0, AUTH_CTX);
    expect(result).toEqual([MOCK_COURSE]);
  });

  it('throws UnauthorizedException when no auth context provided', async () => {
    await expect(
      resolver.getCourses(10, 0, { authContext: undefined })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('passes limit and offset through to service', async () => {
    await resolver.getCourses(20, 40, AUTH_CTX);
    expect(mockCourseService.findAll).toHaveBeenCalledWith(
      20,
      40,
      expect.anything()
    );
  });

  it('returns empty array when service returns no courses', async () => {
    mockCourseService.findAll.mockResolvedValue([]);
    const result = await resolver.getCourses(10, 0, AUTH_CTX);
    expect(result).toEqual([]);
  });
});
