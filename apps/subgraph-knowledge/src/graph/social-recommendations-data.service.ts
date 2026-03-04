/**
 * SocialRecommendationsDataService — low-level data access for social recommendations.
 * Provides getFollowedUserIds, getMutualFollowerIds, getCompletedContentIds, getFollowedActivity.
 *
 * Aggregation logic lives in SocialRecommendationsService.
 */
import { Injectable } from '@nestjs/common';
import {
  db,
  sql,
  withTenantContext,
  userFollows,
  userProgress,
  eq,
  and,
} from '@edusphere/db';

export type TenantCtx = Parameters<typeof withTenantContext>[1];

export type ActivityRow = {
  contentItemId: string;
  contentTitle: string;
  userId: string;
  lastAccessedAt: Date;
  isCompleted: boolean;
};

@Injectable()
export class SocialRecommendationsDataService {
  async getFollowedUserIds(
    userId: string,
    tenantId: string,
    ctx: TenantCtx
  ): Promise<string[]> {
    const follows = await withTenantContext(db, ctx, async (tx) =>
      tx
        .select({ followingId: userFollows.followingId })
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerId, userId),
            eq(userFollows.tenantId, tenantId)
          )
        )
    );
    return follows.map((f) => f.followingId);
  }

  async getMutualFollowerIds(
    userId: string,
    tenantId: string,
    followedIds: string[],
    ctx: TenantCtx
  ): Promise<string[]> {
    const myFollowers = await withTenantContext(db, ctx, async (tx) =>
      tx
        .select({ followerId: userFollows.followerId })
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followingId, userId),
            eq(userFollows.tenantId, tenantId)
          )
        )
    );
    const followerSet = new Set(myFollowers.map((f) => f.followerId));
    return followedIds.filter((id) => followerSet.has(id));
  }

  async getCompletedContentIds(
    userId: string,
    ctx: TenantCtx
  ): Promise<Set<string>> {
    const rows = await withTenantContext(db, ctx, async (tx) =>
      tx
        .select({ contentItemId: userProgress.contentItemId })
        .from(userProgress)
        .where(
          and(
            eq(userProgress.userId, userId),
            eq(userProgress.isCompleted, true)
          )
        )
    );
    return new Set(rows.map((r) => r.contentItemId));
  }

  async getFollowedActivity(
    followedIds: string[],
    cutoff: Date,
    ctx: TenantCtx
  ): Promise<ActivityRow[]> {
    type RawRow = {
      content_item_id: string;
      content_title: string;
      user_id: string;
      last_accessed_at: Date;
      is_completed: boolean;
    };
    const rows = await withTenantContext(db, ctx, async (tx) => {
      const result = await tx.execute(sql`
        SELECT up.content_item_id, ci.title AS content_title, up.user_id, up.last_accessed_at, up.is_completed
        FROM user_progress up
        JOIN content_items ci ON ci.id = up.content_item_id
        WHERE up.user_id = ANY(${followedIds}::uuid[])
          AND up.last_accessed_at >= ${cutoff}
          AND up.is_completed = FALSE
      `);
      return (result.rows ?? result) as RawRow[];
    });
    return rows.map((r) => ({
      contentItemId: r.content_item_id,
      contentTitle: r.content_title,
      userId: r.user_id,
      lastAccessedAt: new Date(r.last_accessed_at),
      isCompleted: r.is_completed,
    }));
  }

  async getSocialFeedRows(
    followedIds: string[],
    cutoff: Date,
    limit: number,
    ctx: TenantCtx
  ): Promise<
    {
      user_id: string;
      display_name: string;
      content_item_id: string;
      content_title: string;
      is_completed: boolean;
      progress: number;
      last_accessed_at: Date;
    }[]
  > {
    type FeedRow = {
      user_id: string;
      display_name: string;
      content_item_id: string;
      content_title: string;
      is_completed: boolean;
      progress: number;
      last_accessed_at: Date;
    };
    const result = await withTenantContext(db, ctx, async (tx) => {
      const res = await tx.execute(sql`
        SELECT
          up.user_id,
          COALESCE(u.display_name, u.email, up.user_id::text) AS display_name,
          up.content_item_id,
          ci.title AS content_title,
          up.is_completed,
          up.progress,
          up.last_accessed_at
        FROM user_progress up
        JOIN content_items ci ON ci.id = up.content_item_id
        LEFT JOIN users u ON u.id = up.user_id
        WHERE up.user_id = ANY(${followedIds}::uuid[])
          AND up.last_accessed_at >= ${cutoff}
        ORDER BY up.last_accessed_at DESC
        LIMIT ${limit}
      `);
      return (res.rows ?? res) as FeedRow[];
    });
    return result;
  }
}
