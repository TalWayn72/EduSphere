/**
 * AtRiskLearnerService — Org-level at-risk learner detection for analytics dashboard.
 *
 * Criteria:
 *   - last_accessed_at > 14 days ago
 *   - quiz pass rate < 50%
 *   - course completion < 20% in last 30 days
 *
 * Risk levels:
 *   HIGH   = 2+ criteria met
 *   MEDIUM = 1 criteria met
 *   LOW    = borderline (within 20% of any threshold)
 *
 * All queries scoped via withTenantContext (RLS enforced).
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

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AtRiskLearnerResult {
  userId: string;
  email: string;
  name: string;
  lastActive: Date | null;
  quizPassRate: number;
  completionRate: number;
  riskLevel: RiskLevel;
}

export interface LearnerDetailResult {
  userId: string;
  email: string;
  name: string;
  coursesEnrolled: number;
  coursesCompleted: number;
  avgQuizScore: number;
  totalLearningHours: number;
  activityTimeline: ActivityEntryResult[];
}

export interface ActivityEntryResult {
  date: Date;
  type: string;
  description: string;
}

const INACTIVE_DAYS_THRESHOLD = 14;
const QUIZ_PASS_RATE_THRESHOLD = 50;
const COMPLETION_RATE_THRESHOLD = 20;
const BORDERLINE_FACTOR = 0.2; // within 20% of threshold = LOW risk

@Injectable()
export class AtRiskLearnerService implements OnModuleDestroy {
  private readonly logger = new Logger(AtRiskLearnerService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[AtRiskLearnerService] onModuleDestroy: cleaned up');
  }

  async getAtRiskLearners(
    ctx: TenantContext,
    limit = 20,
    offset = 0
  ): Promise<AtRiskLearnerResult[]> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      const result = await tx.execute<{
        user_id: string;
        email: string;
        name: string;
        last_active: Date | null;
        quiz_pass_rate: string;
        completion_rate: string;
        criteria_met: string;
      }>(sql`
        WITH learner_stats AS (
          SELECT
            u.id AS user_id,
            u.email,
            COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name,
            MAX(up.last_accessed_at) AS last_active,
            CASE
              WHEN COUNT(qr.id) = 0 THEN 100.0
              ELSE (COUNT(CASE WHEN qr.passed = true THEN 1 END)::float
                    / NULLIF(COUNT(qr.id), 0) * 100.0)
            END AS quiz_pass_rate,
            CASE
              WHEN COUNT(uc.id) = 0 THEN 100.0
              ELSE (COUNT(CASE WHEN uc.completed_at IS NOT NULL THEN 1 END)::float
                    / NULLIF(COUNT(uc.id), 0) * 100.0)
            END AS completion_rate,
            (
              CASE WHEN MAX(up.last_accessed_at) IS NULL
                        OR MAX(up.last_accessed_at) < ${fourteenDaysAgo.toISOString()}::timestamptz
                   THEN 1 ELSE 0 END
              +
              CASE WHEN COUNT(qr.id) > 0
                        AND (COUNT(CASE WHEN qr.passed = true THEN 1 END)::float
                             / NULLIF(COUNT(qr.id), 0) * 100.0) < ${QUIZ_PASS_RATE_THRESHOLD}
                   THEN 1 ELSE 0 END
              +
              CASE WHEN COUNT(uc.id) > 0
                        AND (COUNT(CASE WHEN uc.completed_at IS NOT NULL THEN 1 END)::float
                             / NULLIF(COUNT(uc.id), 0) * 100.0) < ${COMPLETION_RATE_THRESHOLD}
                   THEN 1 ELSE 0 END
            ) AS criteria_met
          FROM users u
          INNER JOIN user_courses uc ON uc.user_id = u.id
            AND uc.enrolled_at >= ${thirtyDaysAgo.toISOString()}::timestamptz
          LEFT JOIN user_progress up ON up.user_id = u.id
          LEFT JOIN quiz_results qr ON qr.user_id = u.id
          WHERE u.tenant_id = ${ctx.tenantId}::uuid
          GROUP BY u.id, u.email, u.first_name, u.last_name
          HAVING (
            MAX(up.last_accessed_at) IS NULL
            OR MAX(up.last_accessed_at) < ${fourteenDaysAgo.toISOString()}::timestamptz
            OR (COUNT(qr.id) > 0
                AND (COUNT(CASE WHEN qr.passed = true THEN 1 END)::float
                     / NULLIF(COUNT(qr.id), 0) * 100.0) < ${QUIZ_PASS_RATE_THRESHOLD * (1 + BORDERLINE_FACTOR)})
            OR (COUNT(uc.id) > 0
                AND (COUNT(CASE WHEN uc.completed_at IS NOT NULL THEN 1 END)::float
                     / NULLIF(COUNT(uc.id), 0) * 100.0) < ${COMPLETION_RATE_THRESHOLD * (1 + BORDERLINE_FACTOR)})
          )
        )
        SELECT
          user_id, email, name, last_active,
          quiz_pass_rate::text, completion_rate::text,
          criteria_met::text
        FROM learner_stats
        ORDER BY criteria_met DESC, last_active ASC NULLS FIRST
        LIMIT ${limit} OFFSET ${offset}
      `);

      return result.rows.map((r) => ({
        userId: r.user_id,
        email: r.email,
        name: r.name,
        lastActive: r.last_active,
        quizPassRate: Math.round(Number(r.quiz_pass_rate) * 100) / 100,
        completionRate: Math.round(Number(r.completion_rate) * 100) / 100,
        riskLevel: this.computeRiskLevel(
          Number(r.criteria_met),
          Number(r.quiz_pass_rate),
          Number(r.completion_rate),
          r.last_active
        ),
      }));
    });
  }

  async getLearnerDetail(
    ctx: TenantContext,
    userId: string
  ): Promise<LearnerDetailResult | null> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const [userRow] = await tx.execute<{
        user_id: string;
        email: string;
        name: string;
        courses_enrolled: string;
        courses_completed: string;
        avg_quiz_score: string;
        total_learning_hours: string;
      }>(sql`
        SELECT
          u.id::text AS user_id,
          u.email,
          COALESCE(u.first_name || ' ' || u.last_name, u.email) AS name,
          COUNT(DISTINCT uc.id)::text AS courses_enrolled,
          COUNT(DISTINCT CASE WHEN uc.completed_at IS NOT NULL THEN uc.id END)::text AS courses_completed,
          COALESCE(AVG(qr.score), 0)::text AS avg_quiz_score,
          COALESCE(SUM(up.time_spent) / 3600.0, 0)::text AS total_learning_hours
        FROM users u
        LEFT JOIN user_courses uc ON uc.user_id = u.id
        LEFT JOIN user_progress up ON up.user_id = u.id
        LEFT JOIN quiz_results qr ON qr.user_id = u.id
        WHERE u.id = ${userId}::uuid
          AND u.tenant_id = ${ctx.tenantId}::uuid
        GROUP BY u.id, u.email, u.first_name, u.last_name
      `).then((r) => r.rows);

      if (!userRow) return null;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activityRows = await tx.execute<{
        activity_date: Date;
        activity_type: string;
        description: string;
      }>(sql`
        SELECT
          up.last_accessed_at AS activity_date,
          'content_access' AS activity_type,
          'Accessed content item' AS description
        FROM user_progress up
        WHERE up.user_id = ${userId}::uuid
          AND up.last_accessed_at >= ${thirtyDaysAgo.toISOString()}::timestamptz
        ORDER BY up.last_accessed_at DESC
        LIMIT 50
      `).then((r) => r.rows);

      return {
        userId: userRow.user_id,
        email: userRow.email,
        name: userRow.name,
        coursesEnrolled: Number(userRow.courses_enrolled),
        coursesCompleted: Number(userRow.courses_completed),
        avgQuizScore: Math.round(Number(userRow.avg_quiz_score) * 100) / 100,
        totalLearningHours: Math.round(Number(userRow.total_learning_hours) * 100) / 100,
        activityTimeline: activityRows.map((r) => ({
          date: r.activity_date,
          type: r.activity_type,
          description: r.description,
        })),
      };
    });
  }

  private computeRiskLevel(
    criteriaMet: number,
    quizPassRate: number,
    completionRate: number,
    lastActive: Date | null
  ): RiskLevel {
    if (criteriaMet >= 2) return 'HIGH';
    if (criteriaMet === 1) return 'MEDIUM';

    // Check borderline: within 20% of thresholds
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const borderlineInactive = lastActive !== null
      && lastActive < new Date(fourteenDaysAgo.getTime() + 14 * 24 * 60 * 60 * 1000 * BORDERLINE_FACTOR);
    const borderlineQuiz = quizPassRate < QUIZ_PASS_RATE_THRESHOLD * (1 + BORDERLINE_FACTOR)
      && quizPassRate >= QUIZ_PASS_RATE_THRESHOLD;
    const borderlineCompletion = completionRate < COMPLETION_RATE_THRESHOLD * (1 + BORDERLINE_FACTOR)
      && completionRate >= COMPLETION_RATE_THRESHOLD;

    if (borderlineInactive || borderlineQuiz || borderlineCompletion) {
      return 'LOW';
    }

    return 'LOW';
  }
}
