import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export type XpEventType =
  | 'LESSON_COMPLETED'
  | 'QUIZ_PASSED'
  | 'STREAK_BONUS'
  | 'COURSE_COMPLETED';

export interface UserXpResult {
  totalXp: number;
  level: number;
}

// XP awarded per event type
const XP_TABLE: Record<XpEventType, number> = {
  LESSON_COMPLETED: 10,
  QUIZ_PASSED: 25,
  STREAK_BONUS: 5,
  COURSE_COMPLETED: 100,
} as const;

/**
 * Compute level from total XP.
 * Formula: level = max(1, floor(sqrt(totalXp / 100)) + 1)
 * Examples: 0 XP → 1, 100 XP → 2, 400 XP → 3, 900 XP → 4
 */
export function computeLevel(totalXp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);
}

@Injectable()
export class XpService implements OnModuleDestroy {
  private readonly logger = new Logger(XpService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /**
   * Award XP to a user for a given event type.
   * Inserts an xp_event record and upserts the running total + level.
   */
  async awardXP(
    userId: string,
    tenantId: string,
    eventType: XpEventType,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const xpAmount = XP_TABLE[eventType];
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    await withTenantContext(this.db, ctx, async (tx) => {
      // 1. Insert XP event record
      await tx.execute(sql`
        INSERT INTO user_xp_events (user_id, tenant_id, event_type, xp_awarded, metadata)
        VALUES (
          ${userId}::uuid,
          ${tenantId}::uuid,
          ${eventType}::xp_event_type,
          ${xpAmount},
          ${metadata ? JSON.stringify(metadata) : null}::jsonb
        )
      `);

      // 2. Upsert totals: total_xp += xpAmount, recompute level
      await tx.execute(sql`
        INSERT INTO user_xp_totals (user_id, tenant_id, total_xp, level, updated_at)
        VALUES (
          ${userId}::uuid,
          ${tenantId}::uuid,
          ${xpAmount},
          ${computeLevel(xpAmount)},
          NOW()
        )
        ON CONFLICT (user_id) DO UPDATE
          SET total_xp   = user_xp_totals.total_xp + ${xpAmount},
              level      = GREATEST(1, FLOOR(SQRT((user_xp_totals.total_xp + ${xpAmount})::float / 100))::int + 1),
              updated_at = NOW()
      `);
    });

    this.logger.log(
      { userId, tenantId, eventType, xpAmount },
      '[XpService] XP awarded'
    );
  }

  /**
   * Get current XP total and level for a user.
   * Returns { totalXp: 0, level: 1 } for new users with no record.
   */
  async getUserXP(userId: string, tenantId: string): Promise<UserXpResult> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx.execute<{ total_xp: number; level: number }>(sql`
        SELECT total_xp, level
        FROM user_xp_totals
        WHERE user_id = ${userId}::uuid
        LIMIT 1
      `);
      const row = rows.rows[0];
      if (!row) {
        return { totalXp: 0, level: 1 };
      }
      return {
        totalXp: Number(row.total_xp),
        level: Number(row.level),
      };
    });
  }
}
