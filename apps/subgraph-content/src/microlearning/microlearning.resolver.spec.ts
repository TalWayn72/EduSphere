import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
}));

import { MicrolearningResolver } from './microlearning.resolver.js';
import type { MicrolearningService } from './microlearning.service.js';
import type { ContentItemService } from '../content-item/content-item.service.js';

// ── Mock services ─────────────────────────────────────────────────────────────

const mockGetDailyLesson = vi.fn();
const mockListPaths = vi.fn();
const mockCreatePath = vi.fn();

const mockMicrolearningService = {
  getDailyLesson: mockGetDailyLesson,
  listPaths: mockListPaths,
  createPath: mockCreatePath,
} as unknown as MicrolearningService;

const mockFindById = vi.fn();

const mockContentItemService = {
  findById: mockFindById,
} as unknown as ContentItemService;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const AUTH_CTX = { userId: 'user-1', tenantId: 'tenant-1', roles: ['STUDENT'] };
const makeCtx = (auth = AUTH_CTX) => ({ authContext: auth });
const noAuthCtx = { authContext: undefined };

const MOCK_PATH = {
  id: 'path-1',
  title: 'Intro to ML',
  contentItemIds: ['item-1', 'item-2'],
};

const MOCK_CONTENT_ITEM = {
  id: 'item-42',
  type: 'VIDEO',
  title: 'Daily tip video',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MicrolearningResolver', () => {
  let resolver: MicrolearningResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new MicrolearningResolver(
      mockMicrolearningService,
      mockContentItemService
    );
  });

  // ── requireAuth ────────────────────────────────────────────────────────────

  describe('requireAuth (tested via getDailyMicrolesson)', () => {
    it('throws UnauthorizedException when authContext is absent', async () => {
      await expect(resolver.getDailyMicrolesson(noAuthCtx)).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockGetDailyLesson).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when userId is missing', async () => {
      const ctx = makeCtx({
        userId: undefined as unknown as string,
        tenantId: 't1',
        roles: [],
      });
      await expect(resolver.getDailyMicrolesson(ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('throws UnauthorizedException when tenantId is missing', async () => {
      const ctx = makeCtx({
        userId: 'u1',
        tenantId: undefined as unknown as string,
        roles: [],
      });
      await expect(resolver.getDailyMicrolesson(ctx)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── getDailyMicrolesson ───────────────────────────────────────────────────

  describe('getDailyMicrolesson()', () => {
    it('returns null when service returns null itemId', async () => {
      mockGetDailyLesson.mockResolvedValueOnce(null);

      const result = await resolver.getDailyMicrolesson(makeCtx());

      expect(result).toBeNull();
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it('delegates to contentItemService.findById when itemId is returned', async () => {
      mockGetDailyLesson.mockResolvedValueOnce('item-42');
      mockFindById.mockResolvedValueOnce(MOCK_CONTENT_ITEM);

      const result = await resolver.getDailyMicrolesson(makeCtx());

      expect(mockFindById).toHaveBeenCalledWith('item-42');
      expect(result).toEqual(MOCK_CONTENT_ITEM);
    });

    it('passes correct TenantContext to microlearningService.getDailyLesson', async () => {
      mockGetDailyLesson.mockResolvedValueOnce(null);
      const ctx = makeCtx({
        userId: 'u99',
        tenantId: 't99',
        roles: ['INSTRUCTOR'],
      });

      await resolver.getDailyMicrolesson(ctx);

      expect(mockGetDailyLesson).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't99',
          userId: 'u99',
          userRole: 'INSTRUCTOR',
        })
      );
    });
  });

  // ── getMicrolearningPaths ─────────────────────────────────────────────────

  describe('getMicrolearningPaths()', () => {
    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(resolver.getMicrolearningPaths(noAuthCtx)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('delegates to service.listPaths and returns result', async () => {
      mockListPaths.mockResolvedValueOnce([MOCK_PATH]);

      const result = await resolver.getMicrolearningPaths(makeCtx());

      expect(result).toEqual([MOCK_PATH]);
      expect(mockListPaths).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' })
      );
    });

    it('returns empty array when no paths exist', async () => {
      mockListPaths.mockResolvedValueOnce([]);
      const result = await resolver.getMicrolearningPaths(makeCtx());
      expect(result).toEqual([]);
    });
  });

  // ── createMicrolearningPath ───────────────────────────────────────────────

  describe('createMicrolearningPath()', () => {
    it('throws UnauthorizedException when unauthenticated', async () => {
      await expect(
        resolver.createMicrolearningPath('Path', ['i1'], undefined, noAuthCtx)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('delegates to service.createPath with correct args and returns created path', async () => {
      mockCreatePath.mockResolvedValueOnce(MOCK_PATH);

      const result = await resolver.createMicrolearningPath(
        'Intro to ML',
        ['item-1', 'item-2'],
        'cluster-1',
        makeCtx()
      );

      expect(result).toEqual(MOCK_PATH);
      expect(mockCreatePath).toHaveBeenCalledWith(
        {
          title: 'Intro to ML',
          contentItemIds: ['item-1', 'item-2'],
          topicClusterId: 'cluster-1',
        },
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' })
      );
    });

    it('passes undefined topicClusterId to service when not provided', async () => {
      mockCreatePath.mockResolvedValueOnce(MOCK_PATH);

      await resolver.createMicrolearningPath(
        'Path',
        ['i1'],
        undefined,
        makeCtx()
      );

      const [pathInput] = mockCreatePath.mock.calls[0];
      expect(pathInput.topicClusterId).toBeUndefined();
    });
  });
});
