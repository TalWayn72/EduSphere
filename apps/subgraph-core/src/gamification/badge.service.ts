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
import { PLATFORM_BADGES, POINT_AWARDS } from './badge-definitions.js';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalPoints: number;
  badgeCount: number;
}
interface NatsCoursePayload {
  userId: string;
  tenantId: string;
  courseId?: string;
}
interface NatsAnnotationPayload {
  userId: string;
  tenantId: string;
}
interface NatsStreakPayload {
  userId: string;
  tenantId: string;
  streakDays: number;
}
const MAX_SUBS = 10;

@Injectable()
export class BadgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BadgeService.name);
  private db: Database;
  private nats: NatsConnection | null = null;
  private readonly subs: Subscription[] = [];
  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleInit(): Promise<void> {
    await this.seedPlatformBadges();
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
    void this.handleCourseEvents(courseSub);
    const annotSub = nc.subscribe('EDUSPHERE.annotation.created');
    this.subs.push(annotSub);
    void this.handleAnnotationEvents(annotSub);
    const streakSub = nc.subscribe('EDUSPHERE.streak.milestone');
    this.subs.push(streakSub);
    void this.handleStreakEvents(streakSub);
  }

  private async handleCourseEvents(sub: Subscription): Promise<void> {
    for await (const msg of sub) {
      try {
        const p = JSON.parse(
          new TextDecoder().decode(msg.data)
        ) as NatsCoursePayload;
        const pts = POINT_AWARDS['course.completed'] ?? 0;
        await this.awardPoints(
          p.userId,
          p.tenantId,
          'course.completed',
          pts,
          'Course completed'
        );
        const count = await this.countUserCourses(p.userId, p.tenantId);
        await this.checkAndAwardBadges(
          p.userId,
          p.tenantId,
          'courses_completed',
          count
        );
      } catch (err) {
        this.logger.error({ err }, 'course.completed event error');
      }
    }
  }

  private async handleAnnotationEvents(sub: Subscription): Promise<void> {
    for await (const msg of sub) {
      try {
        const p = JSON.parse(
          new TextDecoder().decode(msg.data)
        ) as NatsAnnotationPayload;
        const pts = POINT_AWARDS['annotation.created'] ?? 0;
        await this.awardPoints(
          p.userId,
          p.tenantId,
          'annotation.created',
          pts,
          'Annotation created'
        );
        const count = await this.countUserAnnotations(p.userId, p.tenantId);
        await this.checkAndAwardBadges(
          p.userId,
          p.tenantId,
          'annotations_created',
          count
        );
      } catch (err) {
        this.logger.error({ err }, 'annotation.created event error');
      }
    }
  }

  private async handleStreakEvents(sub: Subscription): Promise<void> {
    for await (const msg of sub) {
      try {
        const p = JSON.parse(
          new TextDecoder().decode(msg.data)
        ) as NatsStreakPayload;
        const key = 'streak.milestone.' + String(p.streakDays);
        const pts =
          (Object.prototype.hasOwnProperty.call(POINT_AWARDS, key)
            ? POINT_AWARDS[key as keyof typeof POINT_AWARDS]
            : undefined) ?? 0;
        if (pts > 0)
          await this.awardPoints(
            p.userId,
            p.tenantId,
            key,
            pts,
            String(p.streakDays) + '-day streak'
          );
        await this.checkAndAwardBadges(
          p.userId,
          p.tenantId,
          'streak_days',
          p.streakDays
        );
      } catch (err) {
        this.logger.error({ err }, 'streak.milestone event error');
      }
    }
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

  async myBadges(
    userId: string,
    tenantId: string
  ): Promise<
    Array<{
      id: string;
      badge: typeof schema.badges.$inferSelect;
      earnedAt: Date;
    }>
  > {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select({
          id: schema.userBadges.id,
          earnedAt: schema.userBadges.earnedAt,
          badge: schema.badges,
        })
        .from(schema.userBadges)
        .innerJoin(
          schema.badges,
          eq(schema.userBadges.badgeId, schema.badges.id)
        )
        .where(eq(schema.userBadges.userId, userId));
      return rows.map((r) => ({
        id: r.id,
        badge: r.badge,
        earnedAt: r.earnedAt,
      }));
    });
  }

  async leaderboard(
    tenantId: string,
    limit: number
  ): Promise<LeaderboardEntry[]> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx.execute<{
        user_id: string;
        first_name: string;
        last_name: string;
        total_points: number;
        badge_count: string;
      }>(sql`
        SELECT up.user_id, u.first_name, u.last_name, up.total_points, COUNT(ub.id)::text AS badge_count
        FROM user_points up JOIN users u ON u.id = up.user_id
        LEFT JOIN user_badges ub ON ub.user_id = up.user_id AND ub.tenant_id = up.tenant_id
        WHERE up.tenant_id = ${tenantId}::uuid
        GROUP BY up.user_id, u.first_name, u.last_name, up.total_points
        ORDER BY up.total_points DESC LIMIT ${limit}
      `);
      return rows.rows.map((r, i) => ({
        rank: i + 1,
        userId: r.user_id,
        displayName: (r.first_name + ' ' + r.last_name).trim(),
        totalPoints: Number(r.total_points),
        badgeCount: Number(r.badge_count),
      }));
    });
  }

  async myRank(userId: string, tenantId: string): Promise<number> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx.execute<{ rank: string }>(sql`
        SELECT (SELECT COUNT(*) + 1 FROM user_points
                WHERE tenant_id = ${tenantId}::uuid
                  AND total_points > COALESCE(
                    (SELECT total_points FROM user_points WHERE user_id = ${userId}::uuid), 0
                  ))::text AS rank
      `);
      return Number((rows.rows[0] as { rank: string } | undefined)?.rank ?? 1);
    });
  }

  async myTotalPoints(userId: string, tenantId: string): Promise<number> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select({ total: schema.userPoints.totalPoints })
        .from(schema.userPoints)
        .where(eq(schema.userPoints.userId, userId));
      return rows[0]?.total ?? 0;
    });
  }

  private async countUserCourses(
    userId: string,
    tenantId: string
  ): Promise<number> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx.execute<{ count: string }>(sql`
        SELECT COUNT(*)::text AS count FROM user_courses
        WHERE user_id = ${userId}::uuid AND status = 'COMPLETED'
      `);
      return Number(
        (rows.rows[0] as { count: string } | undefined)?.count ?? 0
      );
    });
  }

  private async countUserAnnotations(
    userId: string,
    tenantId: string
  ): Promise<number> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select({ count: sql`COUNT(*)` })
        .from(schema.annotations)
        .where(
          and(
            eq(schema.annotations.user_id, userId),
            eq(schema.annotations.tenant_id, tenantId)
          )
        );
      return Number(rows[0]?.count ?? 0);
    });
  }

  private async seedPlatformBadges(): Promise<void> {
    try {
      const ctx: TenantContext = {
        tenantId: 'system',
        userId: 'system',
        userRole: 'SUPER_ADMIN',
      };
      await withTenantContext(this.db, ctx, async (tx) => {
        for (const def of PLATFORM_BADGES) {
          await tx.execute(sql`
            INSERT INTO badges (name, description, icon_emoji, category, points_reward, condition_type, condition_value)
            VALUES (${def.name}, ${def.description}, ${def.icon}, ${def.category}, ${def.pointsReward}, ${def.conditionType}, ${def.conditionValue})
            ON CONFLICT (name) DO NOTHING
          `);
        }
      });
      this.logger.log('Platform badges seeded');
    } catch (err) {
      this.logger.warn({ err }, 'Badge seeding skipped');
    }
  }

  async adminBadges(
    tenantId: string
  ): Promise<(typeof schema.badges.$inferSelect)[]> {
    const rows = await this.db
      .select()
      .from(schema.badges)
      .where(
        sql`${schema.badges.tenantId} IS NULL OR ${schema.badges.tenantId} = ${tenantId}::uuid`
      );
    return rows;
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
  ): Promise<typeof schema.badges.$inferSelect> {
    const [badge] = await this.db
      .insert(schema.badges)
      .values({
        name: input.name,
        description: input.description,
        iconEmoji: input.iconEmoji,
        category: input.category,
        pointsReward: input.pointsReward,
        conditionType: input.conditionType,
        conditionValue: input.conditionValue,
        tenantId,
      })
      .returning();
    if (!badge) throw new Error('Badge insert failed');
    return badge;
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
  ): Promise<typeof schema.badges.$inferSelect> {
    const [badge] = await this.db
      .update(schema.badges)
      .set(input)
      .where(eq(schema.badges.id, id))
      .returning();
    if (!badge) throw new Error('Badge not found');
    return badge;
  }

  async deleteBadge(id: string): Promise<boolean> {
    await this.db.delete(schema.badges).where(eq(schema.badges.id, id));
    return true;
  }
}
