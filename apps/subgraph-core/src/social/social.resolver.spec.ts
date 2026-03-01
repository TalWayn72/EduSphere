import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('./social.service', () => ({
  SocialService: vi.fn(),
}));

import { SocialResolver } from './social.resolver.js';

const CTX_AUTHED = {
  req: {},
  authContext: {
    tenantId: 'tenant-1',
    userId: 'user-1',
    roles: ['STUDENT'],
    scopes: [],
  },
};

const CTX_ANON = { req: {}, authContext: undefined };

const USER_REF = { id: 'user-2', tenantId: 'tenant-1' };

describe('SocialResolver', () => {
  let resolver: SocialResolver;
  let socialService: {
    getFollowersCount: ReturnType<typeof vi.fn>;
    getFollowingCount: ReturnType<typeof vi.fn>;
    isFollowing: ReturnType<typeof vi.fn>;
    getFollowers: ReturnType<typeof vi.fn>;
    getFollowing: ReturnType<typeof vi.fn>;
    followUser: ReturnType<typeof vi.fn>;
    unfollowUser: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    socialService = {
      getFollowersCount: vi.fn(),
      getFollowingCount: vi.fn(),
      isFollowing: vi.fn(),
      getFollowers: vi.fn(),
      getFollowing: vi.fn(),
      followUser: vi.fn(),
      unfollowUser: vi.fn(),
    };
    resolver = new SocialResolver(socialService as never);
  });

  // ── ResolveField: followersCount ────────────────────────────────────────────

  describe('followersCount()', () => {
    it('delegates to service with user.id and tenantId from context', async () => {
      socialService.getFollowersCount.mockResolvedValue(42);
      const result = await resolver.followersCount(USER_REF, CTX_AUTHED);
      expect(result).toBe(42);
      expect(socialService.getFollowersCount).toHaveBeenCalledWith(
        'user-2', 'tenant-1'
      );
    });

    it('falls back to user.tenantId when context has no authContext', async () => {
      socialService.getFollowersCount.mockResolvedValue(5);
      await resolver.followersCount(USER_REF, CTX_ANON);
      expect(socialService.getFollowersCount).toHaveBeenCalledWith(
        'user-2', 'tenant-1'
      );
    });
  });

  // ── ResolveField: followingCount ────────────────────────────────────────────

  describe('followingCount()', () => {
    it('delegates to service with user.id and tenantId', async () => {
      socialService.getFollowingCount.mockResolvedValue(10);
      const result = await resolver.followingCount(USER_REF, CTX_AUTHED);
      expect(result).toBe(10);
      expect(socialService.getFollowingCount).toHaveBeenCalledWith(
        'user-2', 'tenant-1'
      );
    });
  });

  // ── ResolveField: isFollowedByMe ────────────────────────────────────────────

  describe('isFollowedByMe()', () => {
    it('delegates to service with myUserId, targetUserId and tenantId', async () => {
      socialService.isFollowing.mockResolvedValue(true);
      const result = await resolver.isFollowedByMe(USER_REF, CTX_AUTHED);
      expect(result).toBe(true);
      expect(socialService.isFollowing).toHaveBeenCalledWith(
        'user-1', 'user-2', 'tenant-1'
      );
    });

    it('returns false without calling service when unauthenticated', async () => {
      const result = await resolver.isFollowedByMe(USER_REF, CTX_ANON);
      expect(result).toBe(false);
      expect(socialService.isFollowing).not.toHaveBeenCalled();
    });
  });

  // ── myFollowers ─────────────────────────────────────────────────────────────

  describe('myFollowers()', () => {
    it('delegates to service and returns follower list', async () => {
      socialService.getFollowers.mockResolvedValue(['user-3', 'user-4']);
      const result = await resolver.myFollowers(20, CTX_AUTHED);
      expect(result).toEqual(['user-3', 'user-4']);
      expect(socialService.getFollowers).toHaveBeenCalledWith(
        'user-1', 'tenant-1', 20
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(resolver.myFollowers(10, CTX_ANON)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── myFollowing ─────────────────────────────────────────────────────────────

  describe('myFollowing()', () => {
    it('delegates to service and returns following list', async () => {
      socialService.getFollowing.mockResolvedValue(['user-5']);
      const result = await resolver.myFollowing(10, CTX_AUTHED);
      expect(result).toEqual(['user-5']);
      expect(socialService.getFollowing).toHaveBeenCalledWith(
        'user-1', 'tenant-1', 10
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(resolver.myFollowing(10, CTX_ANON)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── followUser ──────────────────────────────────────────────────────────────

  describe('followUser()', () => {
    it('delegates to service and returns true', async () => {
      socialService.followUser.mockResolvedValue(true);
      const result = await resolver.followUser('user-2', CTX_AUTHED);
      expect(result).toBe(true);
      expect(socialService.followUser).toHaveBeenCalledWith(
        'user-1', 'user-2', 'tenant-1'
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(resolver.followUser('user-2', CTX_ANON)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ── unfollowUser ────────────────────────────────────────────────────────────

  describe('unfollowUser()', () => {
    it('delegates to service and returns true', async () => {
      socialService.unfollowUser.mockResolvedValue(true);
      const result = await resolver.unfollowUser('user-2', CTX_AUTHED);
      expect(result).toBe(true);
      expect(socialService.unfollowUser).toHaveBeenCalledWith(
        'user-1', 'user-2', 'tenant-1'
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(resolver.unfollowUser('user-2', CTX_ANON)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
