import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
  eq: vi.fn(),
  and: vi.fn(),
  withTenantContext: vi.fn(),
}));

vi.mock('@edusphere/auth', () => ({
  AuthContext: {},
}));

import { AnalyticsResolver } from './analytics.resolver.js';
import type { AnalyticsService } from './analytics.service.js';

// ── Mock service ──────────────────────────────────────────────────────────────

const mockGetCourseAnalytics = vi.fn();

const mockService = {
  getCourseAnalytics: mockGetCourseAnalytics,
} as unknown as AnalyticsService;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_ANALYTICS = {
  courseId: 'course-1',
  enrollmentCount: 42,
  activeLearnersLast7Days: 10,
  completionRate: 75,
  avgQuizScore: null,
  contentItemMetrics: [],
  dropOffFunnel: [],
};

const makeCtx = (roles: string[] = ['INSTRUCTOR']) => ({
  authContext: { userId: 'u1', tenantId: 't1', roles },
});

const noAuthCtx = { authContext: undefined };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AnalyticsResolver', () => {
  let resolver: AnalyticsResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new AnalyticsResolver(mockService);
  });

  // Test 1: returns service result for INSTRUCTOR role
  it('getCourseAnalytics returns service result for instructor role', async () => {
    mockGetCourseAnalytics.mockResolvedValueOnce(MOCK_ANALYTICS);

    const result = await resolver.getCourseAnalytics('course-1', makeCtx(['INSTRUCTOR']));

    expect(result).toEqual(MOCK_ANALYTICS);
    expect(mockGetCourseAnalytics).toHaveBeenCalledWith(
      'course-1',
      expect.objectContaining({ tenantId: 't1', userId: 'u1', userRole: 'INSTRUCTOR' })
    );
  });

  // Test 2: throws UnauthorizedException when no auth
  it('getCourseAnalytics throws UnauthorizedException when no auth', async () => {
    await expect(
      resolver.getCourseAnalytics('course-1', noAuthCtx)
    ).rejects.toThrow(UnauthorizedException);
    expect(mockGetCourseAnalytics).not.toHaveBeenCalled();
  });

  // Test 3: throws UnauthorizedException for STUDENT role
  it('getCourseAnalytics throws UnauthorizedException for STUDENT role', async () => {
    await expect(
      resolver.getCourseAnalytics('course-1', makeCtx(['STUDENT']))
    ).rejects.toThrow(UnauthorizedException);
    expect(mockGetCourseAnalytics).not.toHaveBeenCalled();
  });

  // Test 4: allows ORG_ADMIN
  it('getCourseAnalytics allows ORG_ADMIN', async () => {
    mockGetCourseAnalytics.mockResolvedValueOnce(MOCK_ANALYTICS);

    const result = await resolver.getCourseAnalytics('course-1', makeCtx(['ORG_ADMIN']));

    expect(result).toEqual(MOCK_ANALYTICS);
    expect(mockGetCourseAnalytics).toHaveBeenCalledWith(
      'course-1',
      expect.objectContaining({ userRole: 'ORG_ADMIN' })
    );
  });

  // Test 5: allows SUPER_ADMIN
  it('getCourseAnalytics allows SUPER_ADMIN', async () => {
    mockGetCourseAnalytics.mockResolvedValueOnce(MOCK_ANALYTICS);

    const result = await resolver.getCourseAnalytics('course-1', makeCtx(['SUPER_ADMIN']));

    expect(result).toEqual(MOCK_ANALYTICS);
    expect(mockGetCourseAnalytics).toHaveBeenCalledWith(
      'course-1',
      expect.objectContaining({ userRole: 'SUPER_ADMIN' })
    );
  });

  // Test 6: requireInstructor builds correct TenantContext
  it('requireInstructor builds correct TenantContext (tenantId, userId, userRole)', async () => {
    mockGetCourseAnalytics.mockResolvedValueOnce(MOCK_ANALYTICS);

    const ctx = {
      authContext: { userId: 'instructor-99', tenantId: 'tenant-42', roles: ['INSTRUCTOR'] },
    };

    await resolver.getCourseAnalytics('course-abc', ctx);

    expect(mockGetCourseAnalytics).toHaveBeenCalledWith(
      'course-abc',
      { tenantId: 'tenant-42', userId: 'instructor-99', userRole: 'INSTRUCTOR' }
    );
  });

  // Test 7: returns service result with correct courseId
  it('getCourseAnalytics returns service result with correct courseId', async () => {
    const analyticsForCourse2 = { ...MOCK_ANALYTICS, courseId: 'course-2' };
    mockGetCourseAnalytics.mockResolvedValueOnce(analyticsForCourse2);

    const result = await resolver.getCourseAnalytics('course-2', makeCtx());

    expect(result.courseId).toBe('course-2');
    expect(mockGetCourseAnalytics).toHaveBeenCalledWith('course-2', expect.any(Object));
  });

  // Test 8: missing tenantId throws UnauthorizedException
  it('missing tenantId throws UnauthorizedException', async () => {
    const ctx = {
      authContext: { userId: 'u1', tenantId: undefined as unknown as string, roles: ['INSTRUCTOR'] },
    };

    await expect(
      resolver.getCourseAnalytics('course-1', ctx)
    ).rejects.toThrow(UnauthorizedException);
    expect(mockGetCourseAnalytics).not.toHaveBeenCalled();
  });
});
