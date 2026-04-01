import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  sql,
  withTenantContext,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { PLATFORM_BADGES } from './badge-definitions.js';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalPoints: number;
  badgeCount: number;
}

@Injectable()
export class BadgeQueriesService {
  private readonly logger = new Logger(BadgeQueriesService.name);
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
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

  async countUserCourses(userId: string, tenantId: string): Promise<number> {
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

  async countUserAnnotations(
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

  async seedPlatformBadges(): Promise<void> {
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
    return this.db
      .select()
      .from(schema.badges)
      .where(
        sql`${schema.badges.tenantId} IS NULL OR ${schema.badges.tenantId} = ${tenantId}::uuid`
      );
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
    if (!badge) throw new InternalServerErrorException('Badge insert failed');
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
    if (!badge) throw new NotFoundException('Badge not found');
    return badge;
  }

  async deleteBadge(id: string): Promise<boolean> {
    await this.db.delete(schema.badges).where(eq(schema.badges.id, id));
    return true;
  }
}
