import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  desc,
  inArray,
  ilike,
  sql,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { connect, type NatsConnection, type Subscription } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import type {
  UserFollowedPayload,
  CourseCompletedPayload,
} from '@edusphere/nats-client';

const SUBJECT_USER_FOLLOWED = 'EDUSPHERE.user.followed';
const SUBJECT_COURSE_COMPLETED = 'EDUSPHERE.course.completed';
const DEFAULT_LIMIT = 50;

export interface SocialFeedItemDto {
  id: string;
  tenantId: string;
  actorId: string;
  verb: string;
  objectType: string;
  objectId: string;
  objectTitle: string;
  createdAt: Date;
}

export interface SocialRecommendationDto {
  contentItemId: string;
  contentTitle: string;
  followersCount: number;
  isMutualFollower: boolean;
  lastActivity: Date;
}

export interface PublicProfileDto {
  id: string;
  displayName: string;
}

@Injectable()
export class SocialService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SocialService.name);
  private readonly db: Database;
  private nats: NatsConnection | null = null;
  private readonly feedSubs: Subscription[] = [];

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleInit(): Promise<void> {
    try {
      this.nats = await connect(buildNatsOptions());
      this.logger.log('SocialService: NATS connected');
      await this.registerFeedSubscriptions();
    } catch (err) {
      this.logger.warn(
        { err },
        'SocialService: NATS unavailable — events will be skipped'
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const sub of this.feedSubs) {
      sub.unsubscribe();
    }
    this.feedSubs.length = 0;
    if (this.nats) {
      await this.nats.drain();
      this.nats = null;
    }
    await closeAllPools();
  }

  private tenantCtx(tenantId: string, userId: string): TenantContext {
    return { tenantId, userId, userRole: 'STUDENT' };
  }

  async followUser(
    followerId: string,
    followingId: string,
    tenantId: string
  ): Promise<boolean> {
    // SEC-1: Cannot follow yourself
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
    await this.publishFollowEvent(followerId, followingId, tenantId);
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

  async getSocialFeed(
    userId: string,
    tenantId: string,
    limit = 20
  ): Promise<SocialFeedItemDto[]> {
    const followingIds = await this.getFollowing(userId, tenantId, 100);
    if (followingIds.length === 0) return [];

    const ctx = this.tenantCtx(tenantId, userId);
    return withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .select()
        .from(schema.socialFeedItems)
        .where(
          and(
            eq(schema.socialFeedItems.tenantId, tenantId),
            inArray(schema.socialFeedItems.actorId, followingIds)
          )
        )
        .orderBy(desc(schema.socialFeedItems.createdAt))
        .limit(limit);
    });
  }

  async getSocialRecommendations(
    userId: string,
    tenantId: string,
    limit = 10
  ): Promise<SocialRecommendationDto[]> {
    const followingIds = await this.getFollowing(userId, tenantId, 100);
    if (followingIds.length === 0) return [];

    const ctx = this.tenantCtx(tenantId, userId);
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select({
          contentItemId: schema.socialFeedItems.objectId,
          contentTitle: schema.socialFeedItems.objectTitle,
          followersCount: sql<number>`count(distinct ${schema.socialFeedItems.actorId})`.as('followers_count'),
          lastActivity: sql<Date>`max(${schema.socialFeedItems.createdAt})`.as('last_activity'),
        })
        .from(schema.socialFeedItems)
        .where(
          and(
            eq(schema.socialFeedItems.tenantId, tenantId),
            inArray(schema.socialFeedItems.actorId, followingIds),
            eq(schema.socialFeedItems.verb, 'COMPLETED')
          )
        )
        .groupBy(
          schema.socialFeedItems.objectId,
          schema.socialFeedItems.objectTitle
        )
        .orderBy(desc(sql`followers_count`))
        .limit(limit);

      return rows.map((r) => ({
        contentItemId: r.contentItemId,
        contentTitle: r.contentTitle,
        followersCount: Number(r.followersCount),
        isMutualFollower: false,
        lastActivity: r.lastActivity,
      }));
    });
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

  private async registerFeedSubscriptions(): Promise<void> {
    if (!this.nats) return;
    const courseCompletedSub = this.nats.subscribe(SUBJECT_COURSE_COMPLETED, {
      queue: 'social-feed-fan-out',
    });
    this.feedSubs.push(courseCompletedSub);
    void this.processCourseCompletedMessages(courseCompletedSub);
  }

  private async processCourseCompletedMessages(
    sub: Subscription
  ): Promise<void> {
    const sc = new TextDecoder();
    for await (const msg of sub) {
      try {
        const payload = JSON.parse(sc.decode(msg.data)) as CourseCompletedPayload;
        await this.writeFeedItem({
          actorId: payload.userId,
          tenantId: payload.tenantId,
          verb: 'COMPLETED',
          objectType: 'course',
          objectId: payload.courseId,
          objectTitle: payload.courseTitle ?? 'A course',
        });
      } catch (e) {
        this.logger.error(
          { err: e },
          'SocialService: Error writing feed item from course.completed'
        );
      }
    }
  }

  private async writeFeedItem(item: {
    actorId: string;
    tenantId: string;
    verb: string;
    objectType: string;
    objectId: string;
    objectTitle: string;
  }): Promise<void> {
    await this.db.insert(schema.socialFeedItems).values({
      tenantId: item.tenantId,
      actorId: item.actorId,
      verb: item.verb,
      objectType: item.objectType,
      objectId: item.objectId,
      objectTitle: item.objectTitle,
    });
  }

  private async publishFollowEvent(
    followerId: string,
    followingId: string,
    tenantId: string
  ): Promise<void> {
    if (!this.nats) return;
    try {
      const payload: UserFollowedPayload = {
        followerId,
        followingId,
        tenantId,
        timestamp: new Date().toISOString(),
      };
      this.nats.publish(
        SUBJECT_USER_FOLLOWED,
        new TextEncoder().encode(JSON.stringify(payload))
      );
    } catch (err) {
      this.logger.warn({ err }, 'Failed to publish user.followed event');
    }
  }
}
