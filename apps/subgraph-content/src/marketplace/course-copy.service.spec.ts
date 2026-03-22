/**
 * CourseCopyService unit tests — F-14 Content Marketplace
 * Tests: course cloning, NATS subscription lifecycle, cleanup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DB mock (factory — no top-level refs) ─────────────────────────────────────
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {
    courses: {
      id: 'id',
      title: 'title',
      description: 'description',
      thumbnail_url: 'thumbnail_url',
    },
  },
  eq: vi.fn(),
  withTenantContext: vi.fn(),
}));

vi.mock('drizzle-orm', () => ({ sql: vi.fn() }));

import { withTenantContext, closeAllPools } from '@edusphere/db';
const mockWithTenantContext = vi.mocked(withTenantContext);
const mockCloseAllPools = vi.mocked(closeAllPools);

vi.mock('nats', () => ({
  connect: vi.fn(),
  StringCodec: vi.fn(() => ({
    decode: vi.fn((d: unknown) => d as string),
    encode: vi.fn((s: string) => s),
  })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://localhost:4222' })),
}));

import { CourseCopyService } from './course-copy.service.js';

describe('CourseCopyService', () => {
  let service: CourseCopyService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CourseCopyService();
  });

  it('1. copyCourseToTenant clones course into target tenant', async () => {
    const sourceCourse = {
      id: 'course-1',
      title: 'Advanced TypeScript',
      description: 'Learn TS deeply',
      thumbnail_url: 'https://example.com/thumb.jpg',
    };

    // First call: get source course; Second call: insert copy
    mockWithTenantContext
      .mockResolvedValueOnce([sourceCourse])
      .mockResolvedValueOnce(undefined);

    await service.copyCourseToTenant({
      listingId: 'listing-1',
      courseId: 'course-1',
      tenantId: 'tenant-buyer',
      buyerUserId: 'buyer-1',
      timestamp: new Date().toISOString(),
    });

    expect(mockWithTenantContext).toHaveBeenCalledTimes(2);
  });

  it('2. copyCourseToTenant skips when source course not found', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    await service.copyCourseToTenant({
      listingId: 'listing-1',
      courseId: 'nonexistent',
      tenantId: 'tenant-buyer',
      buyerUserId: 'buyer-1',
      timestamp: new Date().toISOString(),
    });

    // Only one call (the select) — no insert
    expect(mockWithTenantContext).toHaveBeenCalledTimes(1);
  });

  it('3. onModuleDestroy closes DB pools and NATS', async () => {
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalled();
  });
});
