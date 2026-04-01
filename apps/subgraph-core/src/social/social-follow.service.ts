/**
 * SocialFollowService — Follow/unfollow, follower queries, mutual connections.
 * Extracted from SocialService for file-size compliance (<300 lines).
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  ilike,
  withTenantContext,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import type { PublicProfileDto } from './social.service';

const DEFAULT_LIMIT = 50;

@Injectable()
export class SocialFollowService {
  private readonly logger = new Logger(SocialFollowService.name);
  readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  tenantCtx(tenantId: string, userId: string): TenantContext {
    return { tenantId, userId, userRole: 'STUDENT' };
  }

  async followUser(
    followerId: string,
    followingId: string,
    tenantId: string
  ): Promise<boolean> {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }
    const ctx = this.tenantCtx(tenantId, followerId);
    await withTenantContext(this.db, ctx, async (tx) => {
      await tx
        .insert(schema.userFollows)
        .values({ followerId, followingId, tenantId })
        .onConflictDoNothing();
    });
    return true;
  }

  async unfollowUser(
    followerId: string,
    followingId: string,
    tenantId: string
  ): Promise<boolean> {
    const ctx = this.tenantCtx(tenantId, followerId);
    const result = await withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .delete(schema.userFollows)
        .where(
          and(
            eq(schema.userFollows.followerId, followerId),
            eq(schema.userFollows.followingId, followingId)
          )
        )
        .returning({ id: schema.userFollows.id });
    });
    return result.length > 0;
  }

  async getFollowers(userId: string, tenantId: string, limit = DEFAULT_LIMIT) {
    const ctx = this.tenantCtx(tenantId, userId);
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select({ followerId: schema.userFollows.followerId })
        .from(schema.userFollows)
        .where(eq(schema.userFollows.followingId, userId))
        .limit(limit);
      return rows.map((r) => r.followerId);
    });
  }

  async getFollowing(userId: string, tenantId: string, limit = DEFAULT_LIMIT) {
    const ctx = this.tenantCtx(tenantId, userId);
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select({ followingId: schema.userFollows.followingId })
        .from(schema.userFollows)
        .where(eq(schema.userFollows.followerId, userId))
        .limit(limit);
      return rows.map((r) => r.followingId);
    });
  }

  async isFollowing(
    followerId: string,
    followingId: string,
    tenantId: string
  ): Promise<boolean> {
    const ctx = this.tenantCtx(tenantId, followerId);
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select({ id: schema.userFollows.id })
        .from(schema.userFollows)
        .where(
          and(
            eq(schema.userFollows.followerId, followerId),
            eq(schema.userFollows.followingId, followingId)
          )
        )
        .limit(1)
    );
    return rows.length > 0;
  }

  async getFollowersCount(userId: string, tenantId: string): Promise<number> {
    const followers = await this.getFollowers(userId, tenantId, 10000);
    return followers.length;
  }

  async getFollowingCount(userId: string, tenantId: string): Promise<number> {
    const following = await this.getFollowing(userId, tenantId, 10000);
    return following.length;
  }

  async getMutualFollowers(userId1: string, userId2: string, tenantId: string) {
    const [followers1, followers2] = await Promise.all([
      this.getFollowers(userId1, tenantId),
      this.getFollowers(userId2, tenantId),
    ]);
    const set2 = new Set(followers2);
    return followers1.filter((id) => set2.has(id));
  }

  async searchUsers(
    query: string,
    tenantId: string,
    limit = 20
  ): Promise<PublicProfileDto[]> {
    if (query.length < 3) return [];
    const ctx = this.tenantCtx(tenantId, 'service');
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select({
          id: schema.users.id,
          display_name: schema.users.display_name,
        })
        .from(schema.users)
        .where(
          and(
            eq(schema.users.tenant_id, tenantId),
            ilike(schema.users.display_name, `%${query}%`)
          )
        )
        .limit(limit);
      return rows.map((r) => ({ id: r.id, displayName: r.display_name }));
    });
  }
}
