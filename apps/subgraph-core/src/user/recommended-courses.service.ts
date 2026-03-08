import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  sql,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface RecommendedCourseDto {
  courseId: string;
  title: string;
  instructorName: string | null;
  reason: string;
}

interface RawCandidateRow {
  course_id: string;
  course_title: string | null;
  instructor_name: string | null;
  tags: string | null; // comma-separated tag names from JSON
  enrollment_count: string | number;
  added_at: string | null;
}

interface RawMasteryRow {
  concept_id: string;
  concept_name: string | null;
  mastery_level: string;
}

interface RawVelocityRow {
  lessons_completed: string | number;
}

interface CourseCandidate {
  courseId: string;
  title: string;
  instructorName: string;
  tags: string[];
  enrollmentCount: number;
  addedAt: Date;
}

// ---------------------------------------------------------------------------
// Pure scoring logic (inlined to avoid cross-package import complexity)
// ---------------------------------------------------------------------------

const GAP_WEIGHT = 0.5;
const COLLAB_WEIGHT = 0.3;
const FRESHNESS_BOOST = 0.1;
const MAX_VELOCITY_BOOST = 0.1;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function buildReason(
  hasGapMatch: boolean,
  freshnessScore: number,
  tags: string[],
  skillGaps: Array<{ conceptName: string; level: string }>,
): string {
  // Gap match takes priority — any tag overlap with user gaps triggers gap reason
  if (hasGapMatch) {
    const topGap = skillGaps.find((g) =>
      tags.some((t) => t.toLowerCase() === g.conceptName.toLowerCase()),
    );
    return topGap
      ? `Based on your gap in ${topGap.conceptName}`
      : 'Matches your learning gaps';
  }
  if (freshnessScore > 0) return 'New in your organization';
  return 'Trending in your organization';
}

function scoreCandidates(
  candidates: CourseCandidate[],
  skillGaps: Array<{ conceptName: string; level: string }>,
  lessonsPerWeek: number,
  enrolledIds: Set<string>,
): RecommendedCourseDto[] {
  if (candidates.length === 0) return [];

  const maxEnrollment = Math.max(...candidates.map((c) => c.enrollmentCount), 1);
  const freshnessCutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  const gapConceptNames = new Set(skillGaps.map((g) => g.conceptName.toLowerCase()));
  const velocityBoost = Math.min(lessonsPerWeek / 10, MAX_VELOCITY_BOOST);

  return candidates
    .filter((c) => !enrolledIds.has(c.courseId))
    .map((c) => {
      const tagOverlap = c.tags.filter((t) => gapConceptNames.has(t.toLowerCase())).length;
      const gapScore =
        Math.min(tagOverlap / Math.max(gapConceptNames.size, 1), 1.0) * GAP_WEIGHT;
      const freshnessScore = c.addedAt > freshnessCutoff ? FRESHNESS_BOOST : 0;
      const collabScore = (c.enrollmentCount / maxEnrollment) * COLLAB_WEIGHT;
      const score = gapScore + freshnessScore + collabScore + velocityBoost;
      return {
        courseId: c.courseId,
        title: c.title,
        instructorName: c.instructorName || null,
        reason: buildReason(tagOverlap > 0, freshnessScore, c.tags, skillGaps),
        _score: score,
      };
    })
    .sort((a, b) => b._score - a._score)
    .map(({ _score: _s, ...dto }) => dto);
}

// ---------------------------------------------------------------------------

@Injectable()
export class RecommendedCoursesService implements OnModuleDestroy {
  private readonly logger = new Logger(RecommendedCoursesService.name);
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getRecommendedCourses(
    userId: string,
    tenantId: string,
    limit = 5,
  ): Promise<RecommendedCourseDto[]> {
    const safeLimit = Math.min(limit, 20);
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    return withTenantContext(this.db, ctx, async (tx) => {
      // Fetch 3 signals + candidate courses in parallel
      const [masteryRows, velocityRows, enrolledRows, candidateRows] =
        await Promise.all([
          // Signal 1: skill gaps (below PROFICIENT)
          tx.execute(sql`
            SELECT
              usm.concept_id::text AS concept_id,
              usm.mastery_level,
              usm.concept_id::text AS concept_name
            FROM user_skill_mastery usm
            WHERE usm.user_id = ${userId}::uuid
              AND usm.tenant_id = ${tenantId}::uuid
              AND usm.mastery_level IN ('NONE', 'ATTEMPTED', 'FAMILIAR')
            LIMIT 50
          `),

          // Signal 2: learning velocity (last 4 weeks average)
          tx.execute(sql`
            SELECT COALESCE(SUM(lessons_completed), 0) / GREATEST(COUNT(*), 1) AS lessons_completed
            FROM user_learning_velocity
            WHERE user_id = ${userId}::uuid
              AND tenant_id = ${tenantId}::uuid
              AND week_start >= (CURRENT_DATE - INTERVAL '4 weeks')
          `),

          // Signal 3: already-enrolled course IDs
          tx.execute(sql`
            SELECT course_id::text AS course_id
            FROM user_courses
            WHERE user_id = ${userId}::uuid
              AND tenant_id = ${tenantId}::uuid
          `),

          // Candidates: all published courses in tenant
          tx.execute(sql`
            SELECT
              c.id::text AS course_id,
              c.title AS course_title,
              COALESCE(u.display_name, u.first_name || ' ' || u.last_name) AS instructor_name,
              (
                SELECT STRING_AGG(t.name, ',')
                FROM course_tags ct
                JOIN tags t ON t.id = ct.tag_id
                WHERE ct.course_id = c.id
              ) AS tags,
              (
                SELECT COUNT(*)::int FROM user_courses uc2
                WHERE uc2.course_id = c.id AND uc2.status = 'ACTIVE'
              ) AS enrollment_count,
              c.created_at AS added_at
            FROM courses c
            LEFT JOIN users u ON u.id = c.instructor_id
            WHERE c.tenant_id = ${tenantId}::uuid
              AND c.is_published = TRUE
              AND c.deleted_at IS NULL
            ORDER BY c.created_at DESC
            LIMIT ${safeLimit * 4}
          `),
        ]);

      const skillGaps = (masteryRows.rows as unknown as RawMasteryRow[]).map(
        (r) => ({
          conceptName: r.concept_name ?? r.concept_id,
          level: r.mastery_level as 'NONE' | 'ATTEMPTED' | 'FAMILIAR',
        }),
      );

      const velocityResult = velocityRows.rows as unknown as RawVelocityRow[];
      const lessonsPerWeek = velocityResult[0]
        ? Number(velocityResult[0].lessons_completed)
        : 0;

      const enrolledIds = new Set<string>(
        (enrolledRows.rows as unknown as Array<{ course_id: string }>).map(
          (r) => r.course_id,
        ),
      );

      const candidates: CourseCandidate[] = (
        candidateRows.rows as unknown as RawCandidateRow[]
      ).map((r) => ({
        courseId: r.course_id,
        title: r.course_title ?? 'Untitled Course',
        instructorName: r.instructor_name ?? '',
        tags: r.tags ? r.tags.split(',').map((t) => t.trim()) : [],
        enrollmentCount: Number(r.enrollment_count ?? 0),
        addedAt: r.added_at ? new Date(r.added_at) : new Date(0),
      }));

      const scored = scoreCandidates(candidates, skillGaps, lessonsPerWeek, enrolledIds);
      const results = scored.slice(0, safeLimit);

      this.logger.debug(
        {
          userId,
          tenantId,
          count: results.length,
          gapCount: skillGaps.length,
          lessonsPerWeek,
          source: skillGaps.length > 0 ? 'multi-signal-scorer' : 'trending-fallback',
        },
        'recommendedCourses fetched',
      );

      return results;
    });
  }
}
