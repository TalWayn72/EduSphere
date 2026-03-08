import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InProgressCoursesService } from './in-progress-courses.service';

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

const mockRows = [
  {
    id: 'uc1',
    course_id: 'c1',
    course_title: 'Math 101',
    last_accessed_at: '2026-03-08T10:00:00Z',
    instructor_name: 'Dr. Smith',
    completed_items: 3,
    total_items: 10,
  },
  {
    id: 'uc2',
    course_id: 'c2',
    course_title: 'Physics 202',
    last_accessed_at: '2026-03-07T09:00:00Z',
    instructor_name: null,
    completed_items: 0,
    total_items: 0,
  },
];

describe('InProgressCoursesService', () => {
  let service: InProgressCoursesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InProgressCoursesService();
  });

  it('returns courses not yet completed', async () => {
    mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue({ rows: mockRows }),
      };
      return fn(mockTx as never);
    });

    const result = await service.getInProgressCourses(USER_ID, TENANT_ID, 5);

    expect(result).toHaveLength(2);
    expect(result[0]?.courseId).toBe('c1');
    expect(result[0]?.title).toBe('Math 101');
    expect(result[0]?.instructorName).toBe('Dr. Smith');
    expect(result[1]?.courseId).toBe('c2');
    expect(result[1]?.instructorName).toBeNull();
  });

  it('progress is calculated as integer 0-100', async () => {
    mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue({ rows: mockRows }),
      };
      return fn(mockTx as never);
    });

    const result = await service.getInProgressCourses(USER_ID, TENANT_ID, 5);

    // 3/10 = 30%
    expect(result[0]?.progress).toBe(30);
    // 0/0 = 0% (guard for division by zero)
    expect(result[1]?.progress).toBe(0);
    // Must be integers
    expect(Number.isInteger(result[0]?.progress)).toBe(true);
    expect(Number.isInteger(result[1]?.progress)).toBe(true);
  });

  it('returns empty array when no in-progress courses', async () => {
    mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      };
      return fn(mockTx as never);
    });

    const result = await service.getInProgressCourses(USER_ID, TENANT_ID, 5);
    expect(result).toEqual([]);
  });

  it('uses fallback title when course_title is null', async () => {
    mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue({
          rows: [
            {
              id: 'uc3',
              course_id: 'c3',
              course_title: null,
              last_accessed_at: null,
              instructor_name: null,
              completed_items: 0,
              total_items: 0,
            },
          ],
        }),
      };
      return fn(mockTx as never);
    });

    const result = await service.getInProgressCourses(USER_ID, TENANT_ID, 5);
    expect(result[0]?.title).toBe('Untitled Course');
    expect(result[0]?.lastAccessedAt).toBeNull();
  });

  it('calls closeAllPools on module destroy', async () => {
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });
});
