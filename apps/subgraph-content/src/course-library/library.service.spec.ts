import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LibraryService } from './library.service.js';

// ── Mock @edusphere/db ────────────────────────────────────────────────────────
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  closeAllPools: vi.fn(),
  withTenantContext: vi.fn(
    (_db: unknown, _ctx: unknown, fn: (db: unknown) => unknown) => fn(mockDb)
  ),
  schema: {
    libraryCourses: {
      id: 'id',
      isActive: 'is_active',
      topic: 'topic',
      licenseType: 'license_type',
      scormPackageUrl: 'scorm_package_url',
    },
    tenantLibraryActivations: {
      id: 'id',
      tenantId: 'tenant_id',
      libraryCourseId: 'library_course_id',
      courseId: 'course_id',
    },
    courses: {},
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
}));

// ── Mock S3 ───────────────────────────────────────────────────────────────────
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function S3ClientCtor() {
    return { send: vi.fn() };
  }),
  CopyObjectCommand: vi.fn(),
}));

const TENANT_A = 'tenant-a';
const TENANT_B = 'tenant-b';
const COURSE_LIB_ID = 'lib-course-1';
const USER_ID = 'user-1';

const mockActiveCourses = [
  {
    id: COURSE_LIB_ID,
    title: 'GDPR Essentials',
    topic: 'GDPR',
    isActive: true,
    licenseType: 'FREE',
    priceCents: 0,
    durationMinutes: 45,
    description: '',
    scormPackageUrl: 'library/GDPR/course.zip',
    lastUpdated: new Date(),
  },
  {
    id: 'lib-course-2',
    title: 'HIPAA Privacy',
    topic: 'HIPAA',
    isActive: true,
    licenseType: 'FREE',
    priceCents: 0,
    durationMinutes: 90,
    description: '',
    scormPackageUrl: 'library/HIPAA/course.zip',
    lastUpdated: new Date(),
  },
];

describe('LibraryService', () => {
  let service: LibraryService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [LibraryService],
    }).compile();

    service = module.get<LibraryService>(LibraryService);
  });

  afterAll(async () => {
    await service.onModuleDestroy();
  });

  // ── Test 1: listLibraryCourses returns all active courses ─────────────────
  it('listLibraryCourses returns all active courses', async () => {
    mockDb.where.mockResolvedValueOnce(mockActiveCourses);

    const result = await service.listLibraryCourses();

    expect(result).toHaveLength(2);
    expect(result[0]?.title).toBe('GDPR Essentials');
  });

  // ── Test 2: listLibraryCourses filters by topic ───────────────────────────
  it('listLibraryCourses filters by topic', async () => {
    mockDb.where.mockResolvedValueOnce(mockActiveCourses);

    const result = await service.listLibraryCourses({ topic: 'GDPR' });

    expect(result).toHaveLength(1);
    expect(result[0]?.topic).toBe('GDPR');
  });

  // ── Test 3: activateCourse creates activation record + course ─────────────
  it('activateCourse creates activation record and course', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    const mockActivation = {
      id: 'activation-1',
      tenantId: TENANT_A,
      libraryCourseId: COURSE_LIB_ID,
      activatedBy: USER_ID,
      courseId: 'new-course-id',
      activatedAt: new Date(),
    };

    // First withTenantContext call: check existing (empty)
    vi.mocked(withTenantContext).mockResolvedValueOnce([]);
    // getLibraryCourse: returns a course
    mockDb.where.mockResolvedValueOnce([mockActiveCourses[0]]);
    // S3 copy: service.s3.send is already mocked
    // insert courses + insert activation
    vi.mocked(withTenantContext).mockResolvedValueOnce(undefined); // courses insert
    vi.mocked(withTenantContext).mockResolvedValueOnce([mockActivation]); // activation insert

    const result = await service.activateCourse(
      TENANT_A,
      COURSE_LIB_ID,
      USER_ID
    );

    expect(result.tenantId).toBe(TENANT_A);
    expect(result.libraryCourseId).toBe(COURSE_LIB_ID);
    expect(result.courseId).toBe('new-course-id');
  });

  // ── Test 4: activateCourse is idempotent ──────────────────────────────────
  it('activateCourse returns existing activation on second call', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    const existingActivation = {
      id: 'activation-existing',
      tenantId: TENANT_A,
      libraryCourseId: COURSE_LIB_ID,
      activatedBy: USER_ID,
      courseId: 'existing-course-id',
      activatedAt: new Date(),
    };

    // withTenantContext returns existing activation (already activated)
    vi.mocked(withTenantContext).mockResolvedValueOnce([existingActivation]);

    const result = await service.activateCourse(
      TENANT_A,
      COURSE_LIB_ID,
      USER_ID
    );

    expect(result.id).toBe('activation-existing');
    // Should NOT have called insert
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  // ── Test 5: getTenantActivations returns only tenant's activations ─────────
  it('getTenantActivations returns only the calling tenant activations', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    const tenantAActivation = {
      id: 'act-a',
      tenantId: TENANT_A,
      libraryCourseId: COURSE_LIB_ID,
      activatedBy: USER_ID,
      courseId: null,
      activatedAt: new Date(),
    };

    vi.mocked(withTenantContext).mockResolvedValueOnce([tenantAActivation]);

    const result = await service.getTenantActivations(TENANT_A);

    expect(result).toHaveLength(1);
    expect(result[0]?.tenantId).toBe(TENANT_A);
    // Tenant B's data is not present
    expect(result.every((a) => a.tenantId !== TENANT_B)).toBe(true);
  });

  // ── Test 6: deactivateCourse removes activation record ────────────────────
  it('deactivateCourse removes the activation record', async () => {
    const { withTenantContext } = await import('@edusphere/db');

    await service.deactivateCourse(TENANT_A, COURSE_LIB_ID);

    expect(withTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: TENANT_A, userRole: 'ORG_ADMIN' }),
      expect.any(Function)
    );
    expect(mockDb.delete).toHaveBeenCalled();
  });
});
