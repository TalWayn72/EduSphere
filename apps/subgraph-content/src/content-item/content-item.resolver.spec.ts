import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
}));

import { ContentItemResolver } from './content-item.resolver.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockContentItemService = {
  findById: vi.fn(),
  findByModule: vi.fn(),
  create: vi.fn(),
};

const mockByIdLoader = { load: vi.fn() };
const mockContentItemLoader = { byId: mockByIdLoader };

const makeCtx = (opts: { tenantId?: string; userId?: string } = {}) => ({
  authContext: opts.tenantId
    ? { tenantId: opts.tenantId, userId: opts.userId ?? 'user-1', roles: [] }
    : null,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ContentItemResolver', () => {
  let resolver: ContentItemResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new ContentItemResolver(
      mockContentItemService as never,
      mockContentItemLoader as never
    );
  });

  // Test 1: getContentItem delegates to service.findById
  it('getContentItem — delegates to contentItemService.findById', async () => {
    const item = { id: 'ci-1', title: 'Intro' };
    mockContentItemService.findById.mockResolvedValue(item);

    const result = await resolver.getContentItem('ci-1');

    expect(mockContentItemService.findById).toHaveBeenCalledWith('ci-1');
    expect(result).toEqual(item);
  });

  // Test 2: getContentItemsByModule delegates to service.findByModule
  it('getContentItemsByModule — delegates to contentItemService.findByModule', async () => {
    const items = [{ id: 'ci-1' }, { id: 'ci-2' }];
    mockContentItemService.findByModule.mockResolvedValue(items);

    const result = await resolver.getContentItemsByModule('mod-1');

    expect(mockContentItemService.findByModule).toHaveBeenCalledWith('mod-1');
    expect(result).toEqual(items);
  });

  // Test 3: createContentItem throws UnauthorizedException when no authContext
  it('createContentItem — throws UnauthorizedException when authContext is null', async () => {
    const ctx = makeCtx();

    await expect(
      resolver.createContentItem(
        { title: 'Lesson 1', type: 'VIDEO' } as never,
        ctx as never
      )
    ).rejects.toThrow(UnauthorizedException);

    expect(mockContentItemService.create).not.toHaveBeenCalled();
  });

  // Test 4: createContentItem throws UnauthorizedException when tenantId is missing
  it('createContentItem — throws UnauthorizedException when tenantId is falsy', async () => {
    const ctx = {
      authContext: { userId: 'user-1', tenantId: '', roles: [] },
    };

    await expect(
      resolver.createContentItem(
        { title: 'Lesson 1', type: 'VIDEO' } as never,
        ctx as never
      )
    ).rejects.toThrow(UnauthorizedException);

    expect(mockContentItemService.create).not.toHaveBeenCalled();
  });

  // Test 5: createContentItem delegates to service with tenantId from auth context
  it('createContentItem — delegates to contentItemService.create with tenantId', async () => {
    const input = { title: 'Lesson 1', type: 'VIDEO' };
    const created = { id: 'ci-new', ...input };
    mockContentItemService.create.mockResolvedValue(created);

    const ctx = makeCtx({ tenantId: 'tenant-abc', userId: 'user-1' });
    const result = await resolver.createContentItem(
      input as never,
      ctx as never
    );

    expect(mockContentItemService.create).toHaveBeenCalledWith(
      input,
      'tenant-abc'
    );
    expect(result).toEqual(created);
  });

  // Test 6: createContentItem returns what the service returns
  it('createContentItem — returns the value from contentItemService.create', async () => {
    const returnValue = { id: 'ci-42', title: 'Test', type: 'QUIZ' };
    mockContentItemService.create.mockResolvedValue(returnValue);

    const ctx = makeCtx({ tenantId: 'tenant-xyz' });
    const result = await resolver.createContentItem(
      { title: 'Test', type: 'QUIZ' } as never,
      ctx as never
    );

    expect(result).toBe(returnValue);
  });

  // Test 7: resolveReference delegates to contentItemLoader.byId.load
  it('resolveReference — calls contentItemLoader.byId.load with reference id', async () => {
    const item = { id: 'ci-ref-1', title: 'Ref Item' };
    mockByIdLoader.load.mockResolvedValue(item);

    const result = await resolver.resolveReference({
      __typename: 'ContentItem',
      id: 'ci-ref-1',
    });

    expect(mockByIdLoader.load).toHaveBeenCalledWith('ci-ref-1');
    expect(result).toEqual(item);
  });

  // Test 8: resolveReference returns whatever the loader resolves
  it('resolveReference — propagates loader result (null case)', async () => {
    mockByIdLoader.load.mockResolvedValue(null);

    const result = await resolver.resolveReference({
      __typename: 'ContentItem',
      id: 'missing-id',
    });

    expect(result).toBeNull();
  });
});
