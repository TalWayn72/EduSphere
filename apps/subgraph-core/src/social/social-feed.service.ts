/**
 * SocialFeedService — Feed generation, recommendations, NATS subscriptions.
 * Extracted from SocialService for file-size compliance (<300 lines).
 */
import {
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  schema,
  eq,
  and,
  desc,
  inArray,
  sql,
  withTenantContext,
} from '@edusphere/db';
import type { Subscription, NatsConnection } from 'nats';
import type {
  CourseCompletedPayload,
} from '@edusphere/nats-client';
import type { SocialFeedItemDto, SocialRecommendationDto } from './social.service';
import { SocialFollowService } from './social-follow.service';

@Injectable()
export class SocialFeedService {
  private readonly logger = new Logger(SocialFeedService.name);

  constructor(private readonly followService: SocialFollowService) {}

  async getSocialFeed(
    userId: string,
    tenantId: string,
    limit = 20
  ): Promise<SocialFeedItemDto[]> {
    const followingIds = await this.followService.getFollowing(userId, tenantId, 100);
    if (followingIds.length === 0) return [];

    const ctx = this.followService.tenantCtx(tenantId, userId);
    return withTenantContext(this.followService.db, ctx, async (tx) => {
      const rows = await tx
        .select({
          id: schema.socialFeedItems.id,
          tenantId: schema.socialFeedItems.tenantId,
          actorId: schema.socialFeedItems.actorId,
          actorDisplayName: sql<string>`COALESCE(${schema.users.display_name}, 'Unknown User')`.as('actor_display_name'),
          verb: schema.socialFeedItems.verb,
          objectType: schema.socialFeedItems.objectType,
          objectId: schema.socialFeedItems.objectId,
          objectTitle: schema.socialFeedItems.objectTitle,
          createdAt: schema.socialFeedItems.createdAt,
        })
        .from(schema.socialFeedItems)
        .leftJoin(schema.users, eq(schema.socialFeedItems.actorId, schema.users.id))
        .where(
          and(
            eq(schema.socialFeedItems.tenantId, tenantId),
            inArray(schema.socialFeedItems.actorId, followingIds)
          )
        )
        .orderBy(desc(schema.socialFeedItems.createdAt))
        .limit(limit);
      return rows;
    });
  }

  async getSocialRecommendations(
    userId: string,
    tenantId: string,
    limit = 10
  ): Promise<SocialRecommendationDto[]> {
    const followingIds = await this.followService.getFollowing(userId, tenantId, 100);
    if (followingIds.length === 0) return [];

    const ctx = this.followService.tenantCtx(tenantId, userId);
    return withTenantContext(this.followService.db, ctx, async (tx) => {
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

  async registerFeedSubscriptions(
    nats: NatsConnection,
    feedSubs: Subscription[]
  ): Promise<void> {
    const courseCompletedSub = nats.subscribe('EDUSPHERE.course.completed', {
      queue: 'social-feed-fan-out',
    });
    feedSubs.push(courseCompletedSub);
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
          'SocialFeedService: Error writing feed item from course.completed'
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
    await this.followService.db.insert(schema.socialFeedItems).values({
      tenantId: item.tenantId,
      actorId: item.actorId,
      verb: item.verb,
      objectType: item.objectType,
      objectId: item.objectId,
      objectTitle: item.objectTitle,
    });
  }
}
