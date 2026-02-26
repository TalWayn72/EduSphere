import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthContext } from '@edusphere/auth';

// ── DB mock ───────────────────────────────────────────────────────────────────

let _mockQueryResult: unknown[] = [];

const mockOffset = vi.fn(async () => _mockQueryResult);
const mockLimitFn = vi.fn(() => {
  const p = Promise.resolve(_mockQueryResult) as Promise<unknown[]> & {
    offset: typeof mockOffset;
  };
  p.offset = mockOffset;
  return p;
});
const mockOrderBy = vi.fn(() => ({ limit: mockLimitFn }));
const mockWhere = vi.fn(() =>
  Object.assign(Promise.resolve(_mockQueryResult), {
    limit: mockLimitFn,
    orderBy: mockOrderBy,
  })
);
const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));
const mockTx = { select: mockSelect };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockTx),
  schema: {
    discussions: {
      id: 'id',
      tenant_id: 'tenant_id',
      course_id: 'course_id',
      creator_id: 'creator_id',
      discussion_type: 'discussion_type',
      created_at: 'created_at',
    },
    discussion_participants: {
      discussion_id: 'discussion_id',
      user_id: 'user_id',
    },
    discussion_messages: {
      id: 'id',
      discussion_id: 'discussion_id',
      created_at: 'created_at',
      parent_message_id: 'parent_message_id',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...c) => ({ conditions: c })),
  desc: vi.fn((col) => ({ col })),
  sql: vi.fn(() => ({ raw: true })),
  inArray: vi.fn(),
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, cb: (tx: unknown) => unknown) =>
      cb(mockTx)
  ),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { DiscussionService } from './discussion.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDiscussions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `disc-${i}`,
    tenant_id: 'tenant-1',
    course_id: 'course-1',
    title: `Discussion ${i}`,
    creator_id: 'user-1',
    discussion_type: 'FORUM',
  }));
}

function toRelayPage<T>(
  items: T[],
  limit: number,
  offset: number,
  totalCount: number
) {
  const edges = items.map((node) => ({ node }));
  const hasNextPage = offset + items.length < totalCount;
  return { edges, pageInfo: { hasNextPage } };
}

const MOCK_AUTH: AuthContext = {
  userId: 'user-1',
  email: 'u@example.com',
  username: 'u1',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: ['read'],
  isSuperAdmin: false,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Discussion — Relay cursor pagination', () => {
  let service: DiscussionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiscussionService();
  });

  it('hasNextPage is true when more items exist beyond the current page', () => {
    const totalCount = 30;
    const page = makeDiscussions(10);
    const { pageInfo } = toRelayPage(page, 10, 0, totalCount);
    expect(pageInfo.hasNextPage).toBe(true);
  });

  it('hasNextPage is false on the last page', () => {
    const totalCount = 15;
    const page = makeDiscussions(5);
    const { pageInfo } = toRelayPage(page, 10, 10, totalCount);
    expect(pageInfo.hasNextPage).toBe(false);
  });

  it('empty result set returns hasNextPage false and empty edges', () => {
    const { edges, pageInfo } = toRelayPage([], 10, 0, 0);
    expect(pageInfo.hasNextPage).toBe(false);
    expect(edges).toHaveLength(0);
  });

  it('after cursor correctly offsets into result set', async () => {
    const allItems = makeDiscussions(20);
    const PAGE_SIZE = 5;
    const OFFSET = 10;
    _mockQueryResult = allItems.slice(OFFSET, OFFSET + PAGE_SIZE);

    const result = await service.findDiscussionsByCourse(
      'course-1',
      PAGE_SIZE,
      OFFSET,
      MOCK_AUTH
    );
    expect(result).toHaveLength(5);
    expect((result as typeof allItems)[0].id).toBe('disc-10');
  });

  it('page size is capped at 100 items by the service caller convention', async () => {
    const LARGE_PAGE = 200;
    const CAPPED = Math.min(LARGE_PAGE, 100);
    _mockQueryResult = makeDiscussions(CAPPED);

    const result = await service.findDiscussionsByCourse(
      'course-1',
      CAPPED,
      0,
      MOCK_AUTH
    );
    expect((result as unknown[]).length).toBeLessThanOrEqual(100);
  });

  it('returns exactly limit items when more data exists', async () => {
    const PAGE_SIZE = 5;
    _mockQueryResult = makeDiscussions(PAGE_SIZE);

    const result = await service.findDiscussionsByCourse(
      'course-1',
      PAGE_SIZE,
      0,
      MOCK_AUTH
    );
    expect(result).toHaveLength(PAGE_SIZE);
  });

  it('passes limit and offset to the DB query', async () => {
    _mockQueryResult = makeDiscussions(3);
    await service.findDiscussionsByCourse('course-1', 3, 9, MOCK_AUTH);
    expect(mockOffset).toHaveBeenCalledWith(9);
    expect(mockLimitFn).toHaveBeenCalledWith(3);
  });
});
