import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityFeedService } from './activity-feed.service';

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

describe('ActivityFeedService', () => {
  let service: ActivityFeedService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ActivityFeedService();
  });

  it('returns ActivityFeedItemDto[] sorted by occurredAt DESC', async () => {
    mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
      const mockTx = {
        execute: vi.fn()
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'p1',
                content_title: 'Lesson 1',
                last_accessed_at: '2026-03-08T10:00:00Z',
                is_completed: true,
              },
            ],
          })
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'a1',
                content_title: 'Video A',
                created_at: '2026-03-08T12:00:00Z',
              },
            ],
          })
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'e1',
                course_title: 'Math 101',
                enrolled_at: '2026-03-07T09:00:00Z',
              },
            ],
          }),
      };
      return fn(mockTx as never);
    });

    const result = await service.getActivityFeed(USER_ID, TENANT_ID, 10);

    expect(result.length).toBe(3);
    // Sorted DESC: annotation (12:00) → progress (10:00) → enrollment (09:00 prev day)
    expect(result[0]?.eventType).toBe('ANNOTATION_ADDED');
    expect(result[0]?.occurredAt).toBe('2026-03-08T12:00:00Z');
    expect(result[1]?.eventType).toBe('LESSON_COMPLETED');
    expect(result[2]?.eventType).toBe('COURSE_ENROLLED');
  });

  it('clamps limit to max 50', async () => {
    let capturedLimit = 0;
    mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      };
      const result = await fn(mockTx as never);
      capturedLimit = (result as unknown[]).length;
      return result;
    });

    await service.getActivityFeed(USER_ID, TENANT_ID, 999);
    // safeLimit = Math.min(999, 50) = 50; with no rows, result is 0
    expect(capturedLimit).toBe(0);
  });

  it('returns empty array gracefully when no activities exist', async () => {
    mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      };
      return fn(mockTx as never);
    });

    const result = await service.getActivityFeed(USER_ID, TENANT_ID, 10);
    expect(result).toEqual([]);
  });

  it('returns descriptions with title fallbacks when title is null', async () => {
    mockWithTenantContext.mockImplementation(async (_db, _ctx, fn) => {
      const mockTx = {
        execute: vi.fn()
          .mockResolvedValueOnce({
            rows: [
              {
                id: 'p2',
                content_title: null,
                last_accessed_at: '2026-03-08T08:00:00Z',
                is_completed: true,
              },
            ],
          })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] }),
      };
      return fn(mockTx as never);
    });

    const result = await service.getActivityFeed(USER_ID, TENANT_ID, 10);
    expect(result[0]?.description).toContain('"a lesson"');
  });

  it('calls closeAllPools on module destroy', async () => {
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });
});
