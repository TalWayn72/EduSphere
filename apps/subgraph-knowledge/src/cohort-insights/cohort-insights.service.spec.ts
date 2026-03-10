/**
 * Unit tests for CohortInsightsService (GAP-7)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { CohortInsightsService } from './cohort-insights.service.js';
import * as db from '@edusphere/db';

vi.mock('@edusphere/db', async (importOriginal) => {
  const actual = await importOriginal<typeof db>();
  return {
    ...actual,
    createDatabaseConnection: vi.fn(),
    withTenantContext: vi.fn(),
    closeAllPools: vi.fn(),
  };
});

const mockWithTenantContext = db.withTenantContext as MockedFunction<
  typeof db.withTenantContext
>;
const mockCreateDb = db.createDatabaseConnection as MockedFunction<
  typeof db.createDatabaseConnection
>;

describe('CohortInsightsService', () => {
  let service: CohortInsightsService;

  beforeEach(() => {
    mockCreateDb.mockReturnValue({} as ReturnType<typeof db.createDatabaseConnection>);
    service = new CohortInsightsService();
  });

  it('returns insights mapped from social feed items', async () => {
    const feedRows = [
      {
        id: 'feed-1',
        verb: 'COMPLETED',
        objectTitle: 'React Hooks',
        cohortId: 'cohort-abc123',
        createdAt: new Date('2024-01-15'),
      },
      {
        id: 'feed-2',
        verb: 'DISCUSSED',
        objectTitle: 'State Management',
        cohortId: 'cohort-def456',
        createdAt: new Date('2024-01-10'),
      },
    ];

    mockWithTenantContext.mockImplementation(async (_db, _ctx, operation) => {
      const fakeTx = {
        execute: vi.fn().mockResolvedValue(feedRows),
      } as unknown as db.DrizzleDB;
      return operation(fakeTx);
    });

    const result = await service.getCohortInsights(
      'concept-1',
      'course-1',
      'tenant-1',
      'user-1',
      5,
    );

    expect(result.conceptId).toBe('concept-1');
    expect(result.courseId).toBe('course-1');
    expect(result.insights).toHaveLength(2);
    expect(result.totalPastDiscussions).toBe(2);

    const first = result.insights[0];
    expect(first.annotationId).toBe('feed-1');
    expect(first.content).toContain('COMPLETED');
    expect(first.content).toContain('React Hooks');
    expect(first.authorCohortLabel).toContain('cohort-a');
    expect(first.relevanceScore).toBe(1.0);
    expect(first.conceptId).toBe('concept-1');
  });

  it('returns empty insights when no past cohort data', async () => {
    mockWithTenantContext.mockImplementation(async (_db, _ctx, operation) => {
      const fakeTx = {
        execute: vi.fn().mockResolvedValue([]),
      } as unknown as db.DrizzleDB;
      return operation(fakeTx);
    });

    const result = await service.getCohortInsights(
      'concept-x',
      'course-x',
      'tenant-x',
      'user-x',
    );

    expect(result.insights).toHaveLength(0);
    expect(result.totalPastDiscussions).toBe(0);
  });

  it('cleans up on module destroy', async () => {
    const mockClose = vi.mocked(db.closeAllPools).mockResolvedValue(undefined);
    await service.onModuleDestroy();
    expect(mockClose).toHaveBeenCalled();
  });
});
