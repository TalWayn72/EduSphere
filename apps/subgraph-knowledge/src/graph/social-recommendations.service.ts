/**
 * SocialRecommendationsService — F-036 Social Content Recommendations.
 * Uses collaborative filtering on the social follow graph (pure Drizzle, no AGE needed).
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  db,
  sql,
  withTenantContext,
  userFollows,
  userProgress,
  closeAllPools,
  eq,
  and,
} from '@edusphere/db';
import { toUserRole } from './graph-types';

export interface SocialRecommendation {
  contentItemId: string;
  contentTitle: string;
  followersCount: number;
  isMutualFollower: boolean;
  lastActivity: Date;
  weight: number;
}

export interface SocialFeedItem {
  userId: string;
  userDisplayName: string;
  action: 'started' | 'completed' | 'progressed';
  contentItemId: string;
  contentTitle: string;
  timestamp: Date;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MUTUAL_WEIGHT_MULTIPLIER = 2;

@Injectable()
export class SocialRecommendationsService implements OnModuleDestroy {
  private readonly logger = new Logger(SocialRecommendationsService.name);

  async getRecommendations(
    userId: string,
    tenantId: string,
    limit = 10
  ): Promise<SocialRecommendation[]> {
    const ctx = { tenantId, userId, userRole: toUserRole('STUDENT') };

    const followedIds = await this.getFollowedUserIds(userId, tenantId, ctx);
    if (followedIds.length === 0) return [];

    const mutualIds = await this.getMutualFollowerIds(
      userId,
      tenantId,
      followedIds,
      ctx
    );
    const mutualSet = new Set(mutualIds);

    const completedIds = await this.getCompletedContentIds(
      userId,
      tenantId,
      ctx
    );

    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
    const activityRows = await this.getFollowedActivity(
      followedIds,
      tenantId,
      cutoff,
      ctx
    );

    const aggregated = this.aggregateActivity(
      activityRows,
      completedIds,
      mutualSet
    );

    const ranked = aggregated
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit);

    this.logger.debug(
      { userId, followedCount: followedIds.length, ranked: ranked.length },
      'socialRecommendations computed'
    );
    return ranked;
  }

  async getSocialFeed(
    userId: string,
    tenantId: string,
    limit = 20
  ): Promise<SocialFeedItem[]> {
    const ctx = { tenantId, userId, userRole: toUserRole('STUDENT') };
    const followedIds = await this.getFollowedUserIds(userId, tenantId, ctx);
    if (followedIds.length === 0) return [];

    const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);
    type FeedRow = {
      user_id: string;
      display_name: string;
      content_item_id: string;
      content_title: string;
      is_completed: boolean;
      progress: number;
      last_accessed_at: Date;
    };

    const rows = await withTenantContext(db, ctx, async (tx) => {
      const result = await tx.execute(sql`
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
      return (result.rows ?? result) as FeedRow[];
    });

    return rows.map((r) => ({
      userId: r.user_id,
      userDisplayName: r.display_name,
      action: r.is_completed
        ? 'completed'
        : r.progress > 0
          ? 'progressed'
          : 'started',
      contentItemId: r.content_item_id,
      contentTitle: r.content_title,
      timestamp: new Date(r.last_accessed_at),
    }));
  }

  onModuleDestroy(): void {
    closeAllPools().catch((err) =>
      this.logger.error({ err }, 'closeAllPools error on destroy')
    );
  }

  private async getFollowedUserIds(
    userId: string,
    tenantId: string,
    ctx: Parameters<typeof withTenantContext>[1]
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

  private async getMutualFollowerIds(
    userId: string,
    tenantId: string,
    followedIds: string[],
    ctx: Parameters<typeof withTenantContext>[1]
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

  private async getCompletedContentIds(
    userId: string,
    tenantId: string,
    ctx: Parameters<typeof withTenantContext>[1]
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

  private async getFollowedActivity(
    followedIds: string[],
    _tenantId: string,
    cutoff: Date,
    ctx: Parameters<typeof withTenantContext>[1]
  ): Promise<
    {
      contentItemId: string;
      contentTitle: string;
      userId: string;
      lastAccessedAt: Date;
      isCompleted: boolean;
    }[]
  > {
    type ActivityRow = {
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
      return (result.rows ?? result) as ActivityRow[];
    });
    return rows.map((r) => ({
      contentItemId: r.content_item_id,
      contentTitle: r.content_title,
      userId: r.user_id,
      lastAccessedAt: new Date(r.last_accessed_at),
      isCompleted: r.is_completed,
    }));
  }

  private aggregateActivity(
    rows: {
      contentItemId: string;
      contentTitle: string;
      userId: string;
      lastAccessedAt: Date;
    }[],
    completedIds: Set<string>,
    mutualSet: Set<string>
  ): SocialRecommendation[] {
    const map = new Map<string, SocialRecommendation>();
    for (const row of rows) {
      if (completedIds.has(row.contentItemId)) continue;
      const existing = map.get(row.contentItemId);
      const isMutual = mutualSet.has(row.userId);
      if (!existing) {
        map.set(row.contentItemId, {
          contentItemId: row.contentItemId,
          contentTitle: row.contentTitle,
          followersCount: 1,
          isMutualFollower: isMutual,
          lastActivity: row.lastAccessedAt,
          weight: isMutual ? MUTUAL_WEIGHT_MULTIPLIER : 1,
        });
      } else {
        existing.followersCount += 1;
        existing.weight += isMutual ? MUTUAL_WEIGHT_MULTIPLIER : 1;
        if (isMutual) existing.isMutualFollower = true;
        if (row.lastAccessedAt > existing.lastActivity)
          existing.lastActivity = row.lastAccessedAt;
      }
    }
    return Array.from(map.values());
  }
}
