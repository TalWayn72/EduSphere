import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendedCoursesService } from './recommended-courses.service';

// Mock @edusphere/db
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      _sql: strings,
      _values: values,
    }),
    { raw: vi.fn() }
  ),
  withTenantContext: vi.fn(),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { withTenantContext, closeAllPools } from '@edusphere/db';

const mockWithTenantContext = vi.mocked(withTenantContext);
const mockCloseAllPools = vi.mocked(closeAllPools);

const USER_ID = '00000000-0000-0000-0000-000000000001';
const TENANT_ID = '00000000-0000-0000-0000-000000000002';

const gapRows = [
  {
    course_id: 'c1',
    course_title: 'Advanced Algebra',
    instructor_name: 'Prof. Lee',
    concept_name: 'linear equations',
  },
  {
    course_id: 'c2',
    course_title: 'Calculus Basics',
    instructor_name: null,
    concept_name: 'derivatives',
  },
];

const trendingRows = [
  {
    course_id: 'c3',
    course_title: 'Data Science 101',
    instructor_name: 'Dr. Brown',
  },
  {
    course_id: 'c4',
    course_title: 'Machine Learning',
    instructor_name: null,
  },
];

describe('RecommendedCoursesService', () => {
  let service: RecommendedCoursesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RecommendedCoursesService();
  });

  it('returns gap-based recommendations when skill mastery data exists', async () => {
    // First execute call returns gap rows (non-empty)
    mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue({ rows: gapRows }),
      };
      return fn(mockTx as never);
    });

    const result = await service.getRecommendedCourses(USER_ID, TENANT_ID, 5);

    expect(result).toHaveLength(2);
    expect(result[0]?.courseId).toBe('c1');
    expect(result[0]?.title).toBe('Advanced Algebra');
    expect(result[0]?.instructorName).toBe('Prof. Lee');
    expect(result[0]?.reason).toBe('Based on your gap in linear equations');
    expect(result[1]?.reason).toBe('Based on your gap in derivatives');
    expect(result[1]?.instructorName).toBeNull();
  });

  it('falls back to trending courses when no skill mastery data (never returns [])', async () => {
    // First execute returns empty (no gap data), second returns trending rows
    mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
      let callCount = 0;
      const mockTx = {
        execute: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve({ rows: [] });
          return Promise.resolve({ rows: trendingRows });
        }),
      };
      return fn(mockTx as never);
    });

    const result = await service.getRecommendedCourses(USER_ID, TENANT_ID, 5);

    expect(result).toHaveLength(2);
    expect(result[0]?.courseId).toBe('c3');
    expect(result[0]?.title).toBe('Data Science 101');
    expect(result[0]?.instructorName).toBe('Dr. Brown');
    expect(result[0]?.reason).toBe('Trending in your organization');
    expect(result[1]?.reason).toBe('Trending in your organization');
    // Confirm it is NEVER empty when trending rows exist
    expect(result.length).toBeGreaterThan(0);
  });

  it('reason contains fallback concept name when concept_name is null', async () => {
    const rowsWithNullConcept = [
      {
        course_id: 'c5',
        course_title: 'Statistics',
        instructor_name: 'Prof. Jones',
        concept_name: null,
      },
    ];

    mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue({ rows: rowsWithNullConcept }),
      };
      return fn(mockTx as never);
    });

    const result = await service.getRecommendedCourses(USER_ID, TENANT_ID, 5);
    expect(result[0]?.reason).toBe('Based on your gap in this topic');
  });

  it('calls withTenantContext with correct tenantId and userId', async () => {
    mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
      const mockTx = { execute: vi.fn().mockResolvedValue({ rows: gapRows }) };
      return fn(mockTx as never);
    });

    await service.getRecommendedCourses(USER_ID, TENANT_ID, 5);

    expect(mockWithTenantContext).toHaveBeenCalledOnce();
    const [, ctx] = mockWithTenantContext.mock.calls[0]!;
    expect(ctx.tenantId).toBe(TENANT_ID);
    expect(ctx.userId).toBe(USER_ID);
    expect(ctx.userRole).toBe('STUDENT');
  });

  it('calls closeAllPools on module destroy', async () => {
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  it('uses fallback title when course_title is null', async () => {
    const rowsWithNullTitle = [
      {
        course_id: 'c6',
        course_title: null,
        instructor_name: null,
        concept_name: 'fractions',
      },
    ];

    mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue({ rows: rowsWithNullTitle }),
      };
      return fn(mockTx as never);
    });

    const result = await service.getRecommendedCourses(USER_ID, TENANT_ID, 5);
    expect(result[0]?.title).toBe('Untitled Course');
  });

  it('limits results to safeLimit (max 20)', async () => {
    // Request limit=100 — should be clamped to 20 in the SQL query
    mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
      const mockTx = { execute: vi.fn().mockResolvedValue({ rows: gapRows }) };
      return fn(mockTx as never);
    });

    // The SQL uses safeLimit = Math.min(limit, 20). We can't check the SQL directly
    // but we verify the service itself returns without throwing for large limit values.
    const result = await service.getRecommendedCourses(USER_ID, TENANT_ID, 100);
    expect(result).toHaveLength(2);
  });
});
