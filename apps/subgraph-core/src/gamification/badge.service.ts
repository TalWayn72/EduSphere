import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  sql,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { connect, type NatsConnection, type Subscription } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { BadgeEventHandlersService } from './badge-event-handlers.service';
import { BadgeQueriesService } from './badge-queries.service';
import type { BadgeAwardDelegate } from './badge-event-handlers.service';

export type { LeaderboardEntry } from './badge-queries.service';

const MAX_SUBS = 10;

@Injectable()
export class BadgeService implements OnModuleInit, OnModuleDestroy, BadgeAwardDelegate {
  private readonly logger = new Logger(BadgeService.name);
  private db: Database;
  private nats: NatsConnection | null = null;
  private readonly subs: Subscription[] = [];

  constructor(
    private readonly eventHandlers: BadgeEventHandlersService,
    private readonly queriesService: BadgeQueriesService
  ) {
    this.db = createDatabaseConnection();
  }

  async onModuleInit(): Promise<void> {
    await this.queriesService.seedPlatformBadges();
    try {
      this.nats = await connect(buildNatsOptions());
      this.logger.log('BadgeService: NATS connected');
      await this.subscribeToEvents();
    } catch (err) {
      this.logger.warn({ err }, 'BadgeService: NATS unavailable');
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const sub of this.subs) sub.unsubscribe();
    this.subs.length = 0;
    if (this.nats) {
      await this.nats.drain();
      this.nats = null;
    }
    await closeAllPools();
  }

  private async subscribeToEvents(): Promise<void> {
    if (!this.nats || this.subs.length >= MAX_SUBS) return;
    const nc = this.nats;

    const courseSub = nc.subscribe('EDUSPHERE.course.completed');
    this.subs.push(courseSub);
    void this.eventHandlers.handleCourseEvents(courseSub, this);

    const annotSub = nc.subscribe('EDUSPHERE.annotation.created');
    this.subs.push(annotSub);
    void this.eventHandlers.handleAnnotationEvents(annotSub, this);

    const streakSub = nc.subscribe('EDUSPHERE.streak.milestone');
    this.subs.push(streakSub);
    void this.eventHandlers.handleStreakEvents(streakSub, this);
  }

  async checkAndAwardBadges(
    userId: string,
    tenantId: string,
    conditionType: string,
    newValue: number
  ): Promise<void> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    await withTenantContext(this.db, ctx, async (tx) => {
      const eligible = await tx
        .select()
        .from(schema.badges)
        .where(
          and(
            eq(schema.badges.conditionType, conditionType),
            sql`${schema.badges.conditionValue} <= ${newValue}`
          )
        );
      for (const badge of eligible) {
        const already = await tx
          .select({ id: schema.userBadges.id })
          .from(schema.userBadges)
          .where(
            and(
              eq(schema.userBadges.userId, userId),
              eq(schema.userBadges.badgeId, badge.id)
            )
          );
        if (already.length > 0) continue;
        await tx
          .insert(schema.userBadges)
          .values({ userId, badgeId: badge.id, tenantId });
        await tx.insert(schema.pointEvents).values({
          userId,
          tenantId,
          eventType: 'badge.earned',
          points: badge.pointsReward,
          description: 'Badge earned: ' + badge.name,
        });
        await this.upsertPointTotal(tx, userId, tenantId, badge.pointsReward);
        this.logger.log({ userId, badge: badge.name }, 'Badge awarded');
      }
    });
  }

  async awardPoints(
    userId: string,
    tenantId: string,
    eventType: string,
    points: number,
    description: string
  ): Promise<void> {
    if (points <= 0) return;
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    await withTenantContext(this.db, ctx, async (tx) => {
      await tx
        .insert(schema.pointEvents)
        .values({ userId, tenantId, eventType, points, description });
      await this.upsertPointTotal(tx, userId, tenantId, points);
    });
  }

  private async upsertPointTotal(
    tx: Database,
    userId: string,
    tenantId: string,
    delta: number
  ): Promise<void> {
    await tx.execute(sql`
      INSERT INTO user_points (user_id, tenant_id, total_points, updated_at)
      VALUES (${userId}::uuid, ${tenantId}::uuid, ${delta}, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET total_points = user_points.total_points + ${delta},
            updated_at   = NOW()
    `);
  }

  // Delegate query methods to BadgeQueriesService
  async myBadges(userId: string, tenantId: string) {
    return this.queriesService.myBadges(userId, tenantId);
  }

  async leaderboard(tenantId: string, limit: number) {
    return this.queriesService.leaderboard(tenantId, limit);
  }

  async myRank(userId: string, tenantId: string) {
    return this.queriesService.myRank(userId, tenantId);
  }

  async myTotalPoints(userId: string, tenantId: string) {
    return this.queriesService.myTotalPoints(userId, tenantId);
  }

  async countUserCourses(userId: string, tenantId: string) {
    return this.queriesService.countUserCourses(userId, tenantId);
  }

  async countUserAnnotations(userId: string, tenantId: string) {
    return this.queriesService.countUserAnnotations(userId, tenantId);
  }

  async adminBadges(tenantId: string) {
    return this.queriesService.adminBadges(tenantId);
  }

  async createBadge(
    input: {
      name: string;
      description: string;
      iconEmoji: string;
      category: string;
      pointsReward: number;
      conditionType: string;
      conditionValue: number;
    },
    tenantId: string
  ) {
    return this.queriesService.createBadge(input, tenantId);
  }

  async updateBadge(
    id: string,
    input: Partial<{
      name: string;
      description: string;
      iconEmoji: string;
      category: string;
      pointsReward: number;
      conditionType: string;
      conditionValue: number;
    }>
  ) {
    return this.queriesService.updateBadge(id, input);
  }

  async deleteBadge(id: string) {
    return this.queriesService.deleteBadge(id);
  }
}
