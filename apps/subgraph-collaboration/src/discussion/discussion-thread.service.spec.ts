import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';

// ─── DB mock ───────────────────────────────────────────────────────────────
const mockWithTenantContext = vi.fn(
  async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    fn(mockTx)
);

const mockSelectResult: unknown[] = [];
const mockInsertResult: unknown[] = [];

const mockTx = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue(mockSelectResult),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn().mockResolvedValue(mockSelectResult),
          })),
        })),
      })),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn().mockResolvedValue(mockInsertResult),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn().mockResolvedValue(undefined),
  })),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockTx,
  schema: {
    discussions: {
      id: 'id',
      course_id: 'course_id',
      created_at: 'created_at',
      creator_id: 'creator_id',
    },
    discussion_participants: {
      discussion_id: 'discussion_id',
      user_id: 'user_id',
    },
  },
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  inArray: vi.fn(),
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
  sql: vi.fn(),
  closeAllPools: vi.fn(),
}));

import { DiscussionThreadService } from './discussion-thread.service.js';

const authContext: AuthContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  roles: ['INSTRUCTOR'],
  scopes: [],
  sub: 'user-1',
};

const sampleDiscussion = {
  id: 'disc-1',
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  title: 'Test Discussion',
  creator_id: 'user-1',
  discussion_type: 'GENERAL',
};

describe('DiscussionThreadService', () => {
  let service: DiscussionThreadService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiscussionThreadService();
    // Reset select result
    mockSelectResult.length = 0;
    mockInsertResult.length = 0;
  });

  // ── toTenantContext ───────────────────────────────────────────────────
  describe('toTenantContext', () => {
    it('converts AuthContext to TenantContext', () => {
      const result = service.toTenantContext(authContext);
      expect(result).toEqual({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: 'INSTRUCTOR',
      });
    });

    it('defaults role to STUDENT when roles empty', () => {
      const ctx = { ...authContext, roles: [] as string[] };
      const result = service.toTenantContext(ctx as AuthContext);
      expect(result.userRole).toBe('STUDENT');
    });

    it('defaults tenantId to empty string when missing', () => {
      const ctx = { ...authContext, tenantId: undefined };
      const result = service.toTenantContext(ctx as unknown as AuthContext);
      expect(result.tenantId).toBe('');
    });
  });

  // ── findDiscussionById ────────────────────────────────────────────────
  describe('findDiscussionById', () => {
    it('returns discussion when found', async () => {
      mockSelectResult.push(sampleDiscussion);
      const mockLimit = vi.fn().mockResolvedValue([sampleDiscussion]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      mockTx.select.mockReturnValue({ from: mockFrom });

      const result = await service.findDiscussionById('disc-1', authContext);
      expect(result).toEqual(sampleDiscussion);
    });

    it('throws NotFoundException when not found', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      mockTx.select.mockReturnValue({ from: mockFrom });

      await expect(
        service.findDiscussionById('bad-id', authContext)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── findDiscussionsByCourse ───────────────────────────────────────────
  describe('findDiscussionsByCourse', () => {
    it('returns paginated discussions', async () => {
      const discussions = [sampleDiscussion];
      const mockOffset = vi.fn().mockResolvedValue(discussions);
      const mockLimit = vi.fn(() => ({ offset: mockOffset }));
      const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
      const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      mockTx.select.mockReturnValue({ from: mockFrom });

      const result = await service.findDiscussionsByCourse(
        'course-1',
        10,
        0,
        authContext
      );
      expect(result).toEqual(discussions);
    });
  });

  // ── onModuleDestroy ───────────────────────────────────────────────────
  describe('onModuleDestroy', () => {
    it('calls closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });

  // ── joinDiscussion ────────────────────────────────────────────────────
  describe('joinDiscussion', () => {
    it('returns true when user already a participant', async () => {
      // Mock findDiscussionById chain
      const mockLimit1 = vi.fn().mockResolvedValue([sampleDiscussion]);
      const mockWhere1 = vi.fn(() => ({ limit: mockLimit1 }));
      const mockFrom1 = vi.fn(() => ({ where: mockWhere1 }));

      // Mock existing participant check
      const mockLimit2 = vi.fn().mockResolvedValue([{ user_id: 'user-1' }]);
      const mockWhere2 = vi.fn(() => ({ limit: mockLimit2 }));
      const mockFrom2 = vi.fn(() => ({ where: mockWhere2 }));

      let callCount = 0;
      mockTx.select.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? { from: mockFrom1 } : { from: mockFrom2 };
      });

      const result = await service.joinDiscussion('disc-1', authContext);
      expect(result).toBe(true);
    });
  });

  // ── leaveDiscussion ───────────────────────────────────────────────────
  describe('leaveDiscussion', () => {
    it('throws ForbiddenException when creator tries to leave', async () => {
      const mockLimit = vi.fn().mockResolvedValue([sampleDiscussion]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      mockTx.select.mockReturnValue({ from: mockFrom });

      await expect(
        service.leaveDiscussion('disc-1', authContext)
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows non-creator to leave', async () => {
      const disc = { ...sampleDiscussion, creator_id: 'other-user' };
      const mockLimit = vi.fn().mockResolvedValue([disc]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      mockTx.select.mockReturnValue({ from: mockFrom });

      const result = await service.leaveDiscussion('disc-1', authContext);
      expect(result).toBe(true);
    });
  });
});
