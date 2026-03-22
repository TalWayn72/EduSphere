/**
 * BadgeAutoAwardService — Listens to NATS events and auto-awards org badges (F-12).
 *
 * Criteria types: COURSE_COMPLETE, XP_THRESHOLD, STREAK_DAYS, QUIZ_SCORE
 * Fire-and-forget with 5-min timeout, non-blocking.
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  schema,
  eq,
  and,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { connect, type NatsConnection, type Subscription } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import type { AutoAwardCriteria } from '@edusphere/db';

const TIMEOUT_MS = 5 * 60 * 1000; // 5-minute timeout
const MAX_SUBS = 10;

interface EventPayload {
  userId: string;
  tenantId: string;
  courseId?: string;
  xpAmount?: number;
  streakDays?: number;
  quizScore?: number;
}

@Injectable()
export class BadgeAutoAwardService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BadgeAutoAwardService.name);
  private readonly db: Database;
  private nats: NatsConnection | null = null;
  private readonly subs: Subscription[] = [];

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleInit(): Promise<void> {
    try {
      this.nats = await connect(buildNatsOptions());
      this.logger.log('[BadgeAutoAwardService] NATS connected');
      await this.subscribeToEvents();
    } catch (err) {
      this.logger.warn(
        { err },
        '[BadgeAutoAwardService] NATS unavailable — auto-award disabled'
      );
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
    this.logger.log('[BadgeAutoAwardService] onModuleDestroy: cleaned up');
  }

  private async subscribeToEvents(): Promise<void> {
    if (!this.nats || this.subs.length >= MAX_SUBS) return;
    const nc = this.nats;

    const subjects = [
      'EDUSPHERE.course.completed',
      'EDUSPHERE.xp.earned',
      'EDUSPHERE.streak.achieved',
      'EDUSPHERE.quiz.completed',
    ];

    for (const subject of subjects) {
      const sub = nc.subscribe(subject);
      this.subs.push(sub);
      void this.handleEvents(sub, subject);
    }
  }

  private async handleEvents(
    sub: Subscription,
    subject: string
  ): Promise<void> {
    for await (const msg of sub) {
      try {
        const payload = JSON.parse(
          new TextDecoder().decode(msg.data)
        ) as EventPayload;

        // Fire-and-forget with 5-min timeout
        const task = this.processAutoAward(payload, subject);
        const timeout = new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Auto-award timeout')), TIMEOUT_MS)
        );

        void Promise.race([task, timeout]).catch((err) => {
          this.logger.error(
            { err, userId: payload.userId, tenantId: payload.tenantId },
            `[BadgeAutoAwardService] ${subject} processing failed`
          );
        });
      } catch (err) {
        this.logger.error(
          { err },
          `[BadgeAutoAwardService] ${subject} parse error`
        );
      }
    }
  }

  private async processAutoAward(
    payload: EventPayload,
    subject: string
  ): Promise<void> {
    const ctx: TenantContext = {
      tenantId: payload.tenantId,
      userId: payload.userId,
      userRole: 'STUDENT',
    };

    await withTenantContext(this.db, ctx, async (tx) => {
      // Fetch all active org badges with auto-award criteria
      const badges = await tx
        .select()
        .from(schema.orgBadges)
        .where(
          and(
            eq(schema.orgBadges.tenantId, payload.tenantId),
            eq(schema.orgBadges.isActive, true),
            sql`${schema.orgBadges.autoAwardCriteria} IS NOT NULL`
          )
        );

      for (const badge of badges) {
        const criteria = badge.autoAwardCriteria as AutoAwardCriteria | null;
        if (!criteria) continue;

        const matches = this.matchesCriteria(criteria, payload, subject);
        if (!matches) continue;

        // Check if already awarded (use user_badges table)
        const alreadyAwarded = await tx.execute<{ cnt: string }>(sql`
          SELECT COUNT(*)::text AS cnt FROM user_badges
          WHERE user_id = ${payload.userId}::uuid
            AND badge_id = ${badge.id}::uuid
        `);

        if (Number(alreadyAwarded.rows[0]?.cnt ?? 0) > 0) continue;

        // Award the badge
        await tx.insert(schema.userBadges).values({
          userId: payload.userId,
          badgeId: badge.id,
          tenantId: payload.tenantId,
          context: { autoAwarded: true, subject, criteria },
        });

        // Award XP points if configured
        if (badge.xpRequired > 0) {
          await tx.insert(schema.pointEvents).values({
            userId: payload.userId,
            tenantId: payload.tenantId,
            eventType: 'org_badge.earned',
            points: badge.xpRequired,
            description: `Org badge earned: ${badge.name}`,
          });
        }

        this.logger.log(
          {
            userId: payload.userId,
            tenantId: payload.tenantId,
            badgeId: badge.id,
            badgeName: badge.name,
          },
          '[BadgeAutoAwardService] Org badge auto-awarded'
        );
      }
    });
  }

  private matchesCriteria(
    criteria: AutoAwardCriteria,
    payload: EventPayload,
    subject: string
  ): boolean {
    switch (criteria.type) {
      case 'COURSE_COMPLETE':
        return (
          subject === 'EDUSPHERE.course.completed' &&
          (!criteria.courseId || criteria.courseId === payload.courseId)
        );
      case 'XP_THRESHOLD':
        return (
          subject === 'EDUSPHERE.xp.earned' &&
          typeof payload.xpAmount === 'number' &&
          typeof criteria.amount === 'number' &&
          payload.xpAmount >= criteria.amount
        );
      case 'STREAK_DAYS':
        return (
          subject === 'EDUSPHERE.streak.achieved' &&
          typeof payload.streakDays === 'number' &&
          typeof criteria.count === 'number' &&
          payload.streakDays >= criteria.count
        );
      case 'QUIZ_SCORE':
        return (
          subject === 'EDUSPHERE.quiz.completed' &&
          typeof payload.quizScore === 'number' &&
          typeof criteria.minScore === 'number' &&
          payload.quizScore >= criteria.minScore
        );
      default:
        return false;
    }
  }
}
