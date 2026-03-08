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

// New service issues 4 parallel queries via Promise.all:
//   [0] mastery rows  — { concept_id, mastery_level, concept_name }
//   [1] velocity row  — { lessons_completed }
//   [2] enrolled rows — { course_id }
//   [3] candidate rows — { course_id, course_title, instructor_name, tags, enrollment_count, added_at }

const masteryRows = [
  { concept_id: 'abc', mastery_level: 'NONE', concept_name: 'graphql' },
  { concept_id: 'def', mastery_level: 'ATTEMPTED', concept_name: 'react' },
];

const velocityRow = [{ lessons_completed: 4 }];
const enrolledRows: { course_id: string }[] = [];

const candidateRows = [
  {
    course_id: 'c1',
    course_title: 'GraphQL Course',
    instructor_name: 'Alice',
    tags: 'graphql,api',
    enrollment_count: 100,
    added_at: new Date('2020-01-01').toISOString(),
  },
  {
    course_id: 'c2',
    course_title: 'React Course',
    instructor_name: 'Bob',
    tags: 'react,hooks',
    enrollment_count: 50,
    added_at: new Date('2020-01-01').toISOString(),
  },
  {
    course_id: 'c3',
    course_title: 'Data Science 101',
    instructor_name: 'Carol',
    tags: 'python,data',
    enrollment_count: 200,
    added_at: new Date('2020-01-01').toISOString(),
  },
];

/** Helper: set up mockWithTenantContext to return the 4 parallel query results */
function mockParallelQueries(
  mastery = masteryRows,
  velocity = velocityRow,
  enrolled = enrolledRows,
  candidates = candidateRows,
): void {
  mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
    let callIdx = 0;
    const responses = [
      { rows: mastery },
      { rows: velocity },
      { rows: enrolled },
      { rows: candidates },
    ];
    const mockTx = {
      execute: vi.fn().mockImplementation(() => {
        const res = responses[callIdx] ?? { rows: [] };
        callIdx++;
        return Promise.resolve(res);
      }),
    };
    return fn(mockTx as never);
  });
}

describe('RecommendedCoursesService', () => {
  let service: RecommendedCoursesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RecommendedCoursesService();
  });

  it('returns gap-based recommendations ranked by score', async () => {
    mockParallelQueries();

    const result = await service.getRecommendedCourses(USER_ID, TENANT_ID, 5);

    expect(result.length).toBeGreaterThan(0);
    // c1 matches 'graphql' gap, c2 matches 'react' gap — both should be in results
    const ids = result.map((r) => r.courseId);
    expect(ids).toContain('c1');
    expect(ids).toContain('c2');
  });

  it('gap-matched courses have gap-based reason', async () => {
    mockParallelQueries();

    const result = await service.getRecommendedCourses(USER_ID, TENANT_ID, 5);
    const c1 = result.find((r) => r.courseId === 'c1');
    expect(c1?.reason).toContain('graphql');
  });

  it('falls back to trending reason when no skill mastery data exists', async () => {
    mockParallelQueries(
      [], // no mastery rows → no gaps
      velocityRow,
      enrolledRows,
      candidateRows,
    );

    const result = await service.getRecommendedCourses(USER_ID, TENANT_ID, 5);
    expect(result.length).toBeGreaterThan(0);
    // All reasons should be trending (no gap match, c3 has most enrollments)
    const topResult = result[0];
    expect(topResult?.reason).toMatch(/trending|new/i);
  });

  it('excludes already-enrolled courses', async () => {
    mockParallelQueries(
      masteryRows,
      velocityRow,
      [{ course_id: 'c1' }, { course_id: 'c2' }], // enrolled in c1 + c2
      candidateRows,
    );

    const result = await service.getRecommendedCourses(USER_ID, TENANT_ID, 5);
    const ids = result.map((r) => r.courseId);
    expect(ids).not.toContain('c1');
    expect(ids).not.toContain('c2');
    expect(ids).toContain('c3');
  });

  it('uses fallback title when course_title is null', async () => {
    const candidatesWithNull = [
      { ...candidateRows[0]!, course_title: null },
    ];
    mockParallelQueries(masteryRows, velocityRow, enrolledRows, candidatesWithNull);

    const result = await service.getRecommendedCourses(USER_ID, TENANT_ID, 5);
    expect(result[0]?.title).toBe('Untitled Course');
  });

  it('limits results to safeLimit (max 20)', async () => {
    // Request limit=100 — service clamps to 20 and only returns what candidates give
    mockParallelQueries();

    const result = await service.getRecommendedCourses(USER_ID, TENANT_ID, 100);
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it('calls withTenantContext with correct tenantId, userId, and role', async () => {
    mockParallelQueries();

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

  it('returns empty array when candidate list is empty', async () => {
    mockParallelQueries(masteryRows, velocityRow, enrolledRows, []);

    const result = await service.getRecommendedCourses(USER_ID, TENANT_ID, 5);
    expect(result).toEqual([]);
  });
});
