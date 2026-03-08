import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
}

const STREAK_MILESTONES = new Set([7, 30, 100]);

@Injectable()
export class StreakService implements OnModuleDestroy {
  private readonly logger = new Logger(StreakService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async updateStreak(userId: string, tenantId: string): Promise<void> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    await withTenantContext(this.db, ctx, async (tx) => {
      const today = new Date().toISOString().split('T')[0]!;
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]!;

      const result = await tx.execute<{
        current_streak: number;
        longest_streak: number;
        last_activity_date: string | null;
      }>(sql`
        SELECT current_streak, longest_streak, last_activity_date
        FROM user_streaks
        WHERE user_id = ${userId}::uuid AND tenant_id = ${tenantId}::uuid
        LIMIT 1
      `);

      const current = result.rows[0] ?? {
        current_streak: 0,
        longest_streak: 0,
        last_activity_date: null,
      };

      // Already updated today — no-op
      if (current.last_activity_date === today) {
        return;
      }

      const newStreak =
        current.last_activity_date === yesterday
          ? current.current_streak + 1
          : 1;

      const newLongest = Math.max(newStreak, current.longest_streak);

      await tx.execute(sql`
        INSERT INTO user_streaks (user_id, tenant_id, current_streak, longest_streak, last_activity_date, updated_at)
        VALUES (${userId}::uuid, ${tenantId}::uuid, ${newStreak}, ${newLongest}, ${today}, NOW())
        ON CONFLICT (user_id, tenant_id)
        DO UPDATE SET
          current_streak = ${newStreak},
          longest_streak = ${newLongest},
          last_activity_date = ${today},
          updated_at = NOW()
      `);

      if (STREAK_MILESTONES.has(newStreak)) {
        this.logger.log(
          { userId, tenantId, streak: newStreak },
          '[StreakService] Streak milestone reached'
        );
      }
    });
  }

  async getStreak(userId: string, tenantId: string): Promise<StreakData> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) => {
      const result = await tx.execute<{
        current_streak: number;
        longest_streak: number;
        last_activity_date: string | null;
      }>(sql`
        SELECT current_streak, longest_streak, last_activity_date
        FROM user_streaks
        WHERE user_id = ${userId}::uuid AND tenant_id = ${tenantId}::uuid
        LIMIT 1
      `);

      const row = result.rows[0];
      return {
        currentStreak: row?.current_streak ?? 0,
        longestStreak: row?.longest_streak ?? 0,
        lastActivityDate: row?.last_activity_date ?? null,
      };
    });
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }
}
