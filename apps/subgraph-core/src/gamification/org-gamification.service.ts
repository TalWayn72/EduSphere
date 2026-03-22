/**
 * OrgGamificationService — Per-org gamification configuration.
 *
 * Features:
 *   - Get/update gamification config (enable/disable, XP rules, scopes)
 *   - Org-scoped leaderboard configuration
 *   - Custom XP rules per organization
 *   - All queries scoped via withTenantContext (RLS enforced)
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface GamificationConfig {
  enabled: boolean;
  showLeaderboard: boolean;
  showBadges: boolean;
  showPoints: boolean;
  showStreaks: boolean;
  xpRules: Record<string, number>;
  leaderboardScope: string;
}

export interface UpdateGamificationConfigInput {
  enabled?: boolean;
  showLeaderboard?: boolean;
  showBadges?: boolean;
  showPoints?: boolean;
  showStreaks?: boolean;
  xpRules?: Record<string, number>;
  leaderboardScope?: string;
}

const DEFAULT_XP_RULES: Record<string, number> = {
  course_completion: 100,
  lesson_completion: 10,
  quiz_pass: 25,
  discussion_post: 5,
  peer_review: 15,
  streak_bonus_per_day: 2,
  daily_login: 1,
};

const DEFAULT_CONFIG: GamificationConfig = {
  enabled: true,
  showLeaderboard: true,
  showBadges: true,
  showPoints: true,
  showStreaks: true,
  xpRules: DEFAULT_XP_RULES,
  leaderboardScope: 'TENANT',
};

@Injectable()
export class OrgGamificationService implements OnModuleDestroy {
  private readonly logger = new Logger(OrgGamificationService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[OrgGamificationService] onModuleDestroy: cleaned up');
  }

  async getConfig(ctx: TenantContext): Promise<GamificationConfig> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const result = await tx.execute<{
        enabled: boolean;
        show_leaderboard: boolean;
        show_badges: boolean;
        show_points: boolean;
        show_streaks: boolean;
        xp_rules: Record<string, number>;
        leaderboard_scope: string;
      }>(sql`
        SELECT enabled, show_leaderboard, show_badges, show_points,
               show_streaks, xp_rules, leaderboard_scope
        FROM gamification_config
        WHERE tenant_id = ${ctx.tenantId}::uuid
        LIMIT 1
      `);

      const row = result.rows[0];
      if (!row) return { ...DEFAULT_CONFIG };

      return {
        enabled: row.enabled,
        showLeaderboard: row.show_leaderboard,
        showBadges: row.show_badges,
        showPoints: row.show_points,
        showStreaks: row.show_streaks,
        xpRules: row.xp_rules ?? DEFAULT_XP_RULES,
        leaderboardScope: row.leaderboard_scope,
      };
    });
  }

  async updateConfig(
    ctx: TenantContext,
    input: UpdateGamificationConfigInput
  ): Promise<GamificationConfig> {
    await withTenantContext(this.db, ctx, async (tx) => {
      // Build SET clause dynamically for provided fields
      const setClauses: string[] = [];
      const values: unknown[] = [];

      if (input.enabled !== undefined) {
        setClauses.push('enabled = $enabled');
        values.push(input.enabled);
      }
      if (input.showLeaderboard !== undefined) {
        setClauses.push('show_leaderboard = $showLeaderboard');
        values.push(input.showLeaderboard);
      }
      if (input.showBadges !== undefined) {
        setClauses.push('show_badges = $showBadges');
        values.push(input.showBadges);
      }
      if (input.showPoints !== undefined) {
        setClauses.push('show_points = $showPoints');
        values.push(input.showPoints);
      }
      if (input.showStreaks !== undefined) {
        setClauses.push('show_streaks = $showStreaks');
        values.push(input.showStreaks);
      }
      if (input.leaderboardScope !== undefined) {
        setClauses.push('leaderboard_scope = $leaderboardScope');
        values.push(input.leaderboardScope);
      }

      // Upsert gamification config
      await tx.execute(sql`
        INSERT INTO gamification_config (
          tenant_id, enabled, show_leaderboard, show_badges,
          show_points, show_streaks, xp_rules, leaderboard_scope
        ) VALUES (
          ${ctx.tenantId}::uuid,
          ${input.enabled ?? DEFAULT_CONFIG.enabled},
          ${input.showLeaderboard ?? DEFAULT_CONFIG.showLeaderboard},
          ${input.showBadges ?? DEFAULT_CONFIG.showBadges},
          ${input.showPoints ?? DEFAULT_CONFIG.showPoints},
          ${input.showStreaks ?? DEFAULT_CONFIG.showStreaks},
          ${JSON.stringify(input.xpRules ?? DEFAULT_XP_RULES)}::jsonb,
          ${input.leaderboardScope ?? DEFAULT_CONFIG.leaderboardScope}
        )
        ON CONFLICT (tenant_id) DO UPDATE SET
          enabled = COALESCE(${input.enabled ?? null}::boolean, gamification_config.enabled),
          show_leaderboard = COALESCE(${input.showLeaderboard ?? null}::boolean, gamification_config.show_leaderboard),
          show_badges = COALESCE(${input.showBadges ?? null}::boolean, gamification_config.show_badges),
          show_points = COALESCE(${input.showPoints ?? null}::boolean, gamification_config.show_points),
          show_streaks = COALESCE(${input.showStreaks ?? null}::boolean, gamification_config.show_streaks),
          xp_rules = CASE
            WHEN ${input.xpRules ? 'true' : 'false'}::boolean
            THEN ${JSON.stringify(input.xpRules ?? DEFAULT_XP_RULES)}::jsonb
            ELSE gamification_config.xp_rules
          END,
          leaderboard_scope = COALESCE(${input.leaderboardScope ?? null}, gamification_config.leaderboard_scope),
          updated_at = NOW()
      `);
    });

    this.logger.log(
      { tenantId: ctx.tenantId },
      '[OrgGamificationService] Config updated'
    );

    return this.getConfig(ctx);
  }
}
