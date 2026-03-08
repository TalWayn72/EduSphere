/**
 * recommendation-scorer — pure function multi-signal course scoring.
 * Rule-based only — zero LLM calls (SI-10 ✓).
 *
 * Signals:
 *   1. Skill gap match  (weight 0.5): course tags overlap user's low-mastery concepts
 *   2. Freshness boost  (+0.1):       course added within last 30 days
 *   3. Collaborative    (weight 0.3): enrollment count normalized 0-1 in tenant
 *   4. Velocity align   (weight 0.1): faster learners get slight score lift
 */

export interface ScoringSignals {
  skillGaps: Array<{ conceptName: string; level: 'NONE' | 'ATTEMPTED' | 'FAMILIAR' }>;
  learningVelocity: { lessonsPerWeek: number };
  enrolledCourseIds: Set<string>;
  tenantTopCourses: Array<{ courseId: string; enrollmentCount: number; addedAt: Date }>;
}

export interface CourseCandidate {
  courseId: string;
  title: string;
  instructorName: string;
  tags: string[];
  enrollmentCount: number;
  addedAt: Date;
}

export interface ScoredCourse {
  courseId: string;
  title: string;
  instructorName: string;
  reason: string;
  score: number;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const GAP_WEIGHT = 0.5;
const COLLAB_WEIGHT = 0.3;
const FRESHNESS_BOOST = 0.1;
const MAX_VELOCITY_BOOST = 0.1;
const VELOCITY_DIVISOR = 10;

/**
 * Score course candidates for a user and return them sorted best-first.
 * This is a pure function — all inputs are pre-fetched by the caller.
 */
export function scoreCoursesForUser(
  candidates: CourseCandidate[],
  signals: ScoringSignals,
): ScoredCourse[] {
  if (candidates.length === 0) return [];

  const maxEnrollment = Math.max(...candidates.map((c) => c.enrollmentCount), 1);
  const now = new Date();
  const freshnessCutoff = new Date(now.getTime() - THIRTY_DAYS_MS);

  const gapConceptNames = new Set(
    signals.skillGaps.map((g) => g.conceptName.toLowerCase()),
  );

  const velocityBoost = Math.min(
    signals.learningVelocity.lessonsPerWeek / VELOCITY_DIVISOR,
    MAX_VELOCITY_BOOST,
  );

  return candidates
    .filter((c) => !signals.enrolledCourseIds.has(c.courseId))
    .map((c) => {
      // Signal 1: skill gap match
      const tagOverlap = c.tags.filter((t) =>
        gapConceptNames.has(t.toLowerCase()),
      ).length;
      const gapScore =
        Math.min(tagOverlap / Math.max(gapConceptNames.size, 1), 1.0) * GAP_WEIGHT;

      // Signal 2: freshness
      const freshnessScore = c.addedAt > freshnessCutoff ? FRESHNESS_BOOST : 0;

      // Signal 3: collaborative filtering (normalized enrollment)
      const collabScore = (c.enrollmentCount / maxEnrollment) * COLLAB_WEIGHT;

      // Signal 4: velocity alignment
      const score = gapScore + freshnessScore + collabScore + velocityBoost;

      // Human-readable reason (rule-based)
      // Gap reason takes priority over freshness so long as any tag matched a gap
      const hasGapMatch = tagOverlap > 0;
      let reason: string;
      if (hasGapMatch) {
        const topGap = signals.skillGaps.find((g) =>
          c.tags.some((t) => t.toLowerCase() === g.conceptName.toLowerCase()),
        );
        reason = topGap
          ? `Based on your gap in ${topGap.conceptName}`
          : 'Matches your learning gaps';
      } else if (freshnessScore > 0) {
        reason = 'New in your organization';
      } else {
        reason = 'Trending in your organization';
      }

      return {
        courseId: c.courseId,
        title: c.title,
        instructorName: c.instructorName,
        reason,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}
