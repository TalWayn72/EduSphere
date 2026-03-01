import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
  withTenantContext: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
}));
vi.mock('@edusphere/auth', () => ({}));

import { LibraryResolver } from './library.resolver.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-abc';
const USER_ID = 'user-xyz';

const AUTH_CTX = {
  tenantId: TENANT_ID,
  userId: USER_ID,
  roles: ['ORG_ADMIN'],
};

/** Pass `null` to simulate missing authContext */
const makeCtx = (auth: typeof AUTH_CTX | null = AUTH_CTX) => ({
  authContext: auth ?? undefined,
});

const mockLibraryService = {
  listLibraryCourses: vi.fn(),
  getTenantActivations: vi.fn(),
  activateCourse: vi.fn(),
  deactivateCourse: vi.fn(),
};

const COURSE_ROW = {
  id: 'c1',
  title: 'GDPR Basics',
  description: 'Learn GDPR',
  topic: 'TECH',
  licenseType: 'FREE',
  priceCents: 0,
  durationMinutes: 30,
  isActivated: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LibraryResolver', () => {
  let resolver: LibraryResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new LibraryResolver(mockLibraryService as never);
  });

  // ── requireAuth ────────────────────────────────────────────────────────────

  it('listLibraryCourses — throws UnauthorizedException when authContext absent', async () => {
    await expect(
      resolver.listLibraryCourses(undefined, makeCtx(null))
    ).rejects.toThrow(UnauthorizedException);
  });

  it('listLibraryCourses — throws UnauthorizedException when tenantId missing', async () => {
    const ctx = { authContext: { tenantId: '', userId: USER_ID, roles: [] } };
    await expect(
      resolver.listLibraryCourses(undefined, ctx as never)
    ).rejects.toThrow(UnauthorizedException);
  });

  // ── listLibraryCourses without topic ──────────────────────────────────────

  it('listLibraryCourses — calls service without filter when topic is undefined', async () => {
    mockLibraryService.listLibraryCourses.mockResolvedValue([COURSE_ROW]);
    mockLibraryService.getTenantActivations.mockResolvedValue([]);

    await resolver.listLibraryCourses(undefined, makeCtx());

    expect(mockLibraryService.listLibraryCourses).toHaveBeenCalledWith(
      undefined
    );
  });

  it('listLibraryCourses — calls service with topic filter when topic provided', async () => {
    mockLibraryService.listLibraryCourses.mockResolvedValue([COURSE_ROW]);
    mockLibraryService.getTenantActivations.mockResolvedValue([]);

    await resolver.listLibraryCourses('TECH' as never, makeCtx());

    expect(mockLibraryService.listLibraryCourses).toHaveBeenCalledWith({
      topic: 'TECH',
    });
  });

  // ── isActivated merge logic ───────────────────────────────────────────────

  it('listLibraryCourses — sets isActivated=true for course in activation set', async () => {
    mockLibraryService.listLibraryCourses.mockResolvedValue([COURSE_ROW]);
    mockLibraryService.getTenantActivations.mockResolvedValue([
      { libraryCourseId: 'c1' },
    ]);

    const result = await resolver.listLibraryCourses(undefined, makeCtx());

    expect(result[0]?.isActivated).toBe(true);
  });

  it('listLibraryCourses — sets isActivated=false when course not in activation set', async () => {
    mockLibraryService.listLibraryCourses.mockResolvedValue([COURSE_ROW]);
    mockLibraryService.getTenantActivations.mockResolvedValue([
      { libraryCourseId: 'other-course' },
    ]);

    const result = await resolver.listLibraryCourses(undefined, makeCtx());

    expect(result[0]?.isActivated).toBe(false);
  });

  it('listLibraryCourses — returns empty array when no courses exist', async () => {
    mockLibraryService.listLibraryCourses.mockResolvedValue([]);
    mockLibraryService.getTenantActivations.mockResolvedValue([]);

    const result = await resolver.listLibraryCourses(undefined, makeCtx());

    expect(result).toEqual([]);
  });

  // ── getMyLibraryActivations ───────────────────────────────────────────────

  it('getMyLibraryActivations — maps activatedAt Date to ISO string', async () => {
    const date = new Date('2026-01-15T12:00:00.000Z');
    mockLibraryService.getTenantActivations.mockResolvedValue([
      {
        id: 'act-1',
        libraryCourseId: 'c1',
        courseId: 'course-1',
        activatedAt: date,
      },
    ]);

    const result = await resolver.getMyLibraryActivations(makeCtx());

    expect(result[0]?.activatedAt).toBe('2026-01-15T12:00:00.000Z');
    expect(result[0]?.id).toBe('act-1');
    expect(result[0]?.libraryCourseId).toBe('c1');
    expect(result[0]?.courseId).toBe('course-1');
  });

  // ── activateCourse ────────────────────────────────────────────────────────

  it('activateCourse — delegates to service and maps returned activation', async () => {
    const date = new Date('2026-02-01T09:00:00.000Z');
    mockLibraryService.activateCourse.mockResolvedValue({
      id: 'act-2',
      libraryCourseId: 'c1',
      courseId: null,
      activatedAt: date,
    });

    const result = await resolver.activateCourse('c1', makeCtx());

    expect(mockLibraryService.activateCourse).toHaveBeenCalledWith(
      TENANT_ID,
      'c1',
      USER_ID
    );
    expect(result.activatedAt).toBe('2026-02-01T09:00:00.000Z');
    expect(result.courseId).toBeNull();
  });

  // ── deactivateCourse ──────────────────────────────────────────────────────

  it('deactivateCourse — calls service and returns true', async () => {
    mockLibraryService.deactivateCourse.mockResolvedValue(undefined);

    const result = await resolver.deactivateCourse('c1', makeCtx());

    expect(mockLibraryService.deactivateCourse).toHaveBeenCalledWith(
      TENANT_ID,
      'c1'
    );
    expect(result).toBe(true);
  });
});
