import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export type ChallengeTargetType =
  | 'LESSON_COUNT'
  | 'XP_EARNED'
  | 'QUIZ_COUNT'
  | 'DISCUSSION_COUNT';

export interface ActiveChallenge {
  id: string;
  title: string;
  description: string;
  targetType: ChallengeTargetType;
  targetValue: number;
  xpReward: number;
  endDate: string;
}

export interface UserChallenge extends ActiveChallenge {
  currentValue: number;
  completed: boolean;
}

@Injectable()
export class ChallengesService implements OnModuleDestroy {
  private readonly logger = new Logger(ChallengesService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async getUserChallenges(userId: string, tenantId: string): Promise<UserChallenge[]> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) => {
      const result = await tx.execute<{
        id: string;
        title: string;
        description: string;
        target_type: ChallengeTargetType;
        target_value: number;
        xp_reward: number;
        end_date: string;
        current_value: number | null;
        completed: boolean | null;
      }>(sql`
        SELECT c.id, c.title, c.description, c.target_type, c.target_value, c.xp_reward, c.end_date,
               ucp.current_value, ucp.completed
        FROM challenges c
        LEFT JOIN user_challenge_progress ucp
          ON ucp.challenge_id = c.id AND ucp.user_id = ${userId}::uuid
        WHERE c.tenant_id = ${tenantId}::uuid
          AND c.is_active = true
          AND c.end_date >= CURRENT_DATE
        ORDER BY c.end_date ASC
      `);

      return result.rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        targetType: r.target_type,
        targetValue: r.target_value,
        xpReward: r.xp_reward,
        endDate: r.end_date,
        currentValue: r.current_value ?? 0,
        completed: r.completed ?? false,
      }));
    });
  }

  async incrementProgress(
    userId: string,
    tenantId: string,
    eventType: ChallengeTargetType,
    amount: number
  ): Promise<void> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    await withTenantContext(this.db, ctx, async (tx) => {
      const activeChallenges = await tx.execute<{
        id: string;
        target_value: number;
        xp_reward: number;
      }>(sql`
        SELECT id, target_value, xp_reward FROM challenges
        WHERE tenant_id = ${tenantId}::uuid
          AND target_type = ${eventType}::challenge_target_type
          AND is_active = true
          AND end_date >= CURRENT_DATE
      `);

      for (const challenge of activeChallenges.rows) {
        const progressResult = await tx.execute<{
          current_value: number;
          completed: boolean;
        }>(sql`
          INSERT INTO user_challenge_progress (user_id, tenant_id, challenge_id, current_value, completed, updated_at)
          VALUES (${userId}::uuid, ${tenantId}::uuid, ${challenge.id}::uuid, ${amount}, false, NOW())
          ON CONFLICT (user_id, challenge_id)
          DO UPDATE SET
            current_value = user_challenge_progress.current_value + ${amount},
            updated_at = NOW()
          RETURNING current_value, completed
        `);

        const progress = progressResult.rows[0];
        if (progress && !progress.completed && progress.current_value >= challenge.target_value) {
          await tx.execute(sql`
            UPDATE user_challenge_progress
            SET completed = true, completed_at = NOW()
            WHERE user_id = ${userId}::uuid AND challenge_id = ${challenge.id}::uuid
          `);
          this.logger.log(
            { userId, tenantId, challengeId: challenge.id },
            '[ChallengesService] Challenge completed'
          );
        }
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }
}
