/**
 * AdaptivePathService — generates a time-budget-aware, priority-ranked learning path.
 * Scores content items by mastery gap: unmastered items rank highest, mastered lowest.
 * Items within the time budget receive a bonus score.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { db, sql, withTenantContext, closeAllPools } from '@edusphere/db';
import { toUserRole } from './graph-types';

export interface AdaptivePathItem {
  contentItemId: string;
  title: string;
  estimatedMinutes: number;
  reason: string;
  priorityScore: number;
}

export interface AdaptiveLearningPath {
  courseId: string;
  timeBudgetMinutes: number;
  items: AdaptivePathItem[];
  masteryGapCount: number;
}

const MASTERED_BASE = 0.1;
const GAP_BASE = 1.0;
const TIME_BONUS = 0.2;

type ContentRow = {
  id: string;
  title: string;
  estimated_minutes: number | null;
  order_index: number | null;
};

@Injectable()
export class AdaptivePathService implements OnModuleDestroy {
  private readonly logger = new Logger(AdaptivePathService.name);

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getAdaptivePath(
    userId: string,
    tenantId: string,
    courseId: string,
    timeBudgetMinutes: number
  ): Promise<AdaptiveLearningPath> {
    const ctx = { tenantId, userId, userRole: toUserRole('STUDENT') };

    // 1. Fetch mastered node IDs for this user from user_skill_mastery
    const masteredIds = await withTenantContext(db, ctx, async (tx) => {
      const rows = await tx.execute(sql`
        SELECT node_id
        FROM user_skill_mastery
        WHERE user_id = ${userId}::uuid
          AND mastery_level IN ('PROFICIENT', 'MASTERED')
      `);
      const r = (rows.rows ?? rows) as { node_id: string }[];
      return new Set(r.map((x) => x.node_id));
    });

    // 2. Fetch content items for the course ordered by order_index
    const contentRows = await withTenantContext(db, ctx, async (tx) => {
      const rows = await tx.execute(sql`
        SELECT id, title,
          COALESCE(duration_seconds / 60, 10) AS estimated_minutes,
          order_index
        FROM content_items
        WHERE course_id = ${courseId}::uuid
        ORDER BY order_index ASC NULLS LAST
        LIMIT 50
      `);
      return (rows.rows ?? rows) as ContentRow[];
    });

    // 3. Score each item
    const masteredSet = masteredIds;
    let gapCount = 0;

    const scored = contentRows.map((item) => {
      const isMastered = masteredSet.has(item.id);
      if (!isMastered) gapCount++;

      const base = isMastered ? MASTERED_BASE : GAP_BASE;
      const mins = item.estimated_minutes ?? 10;
      const fitsInBudget = mins <= timeBudgetMinutes;
      const priorityScore = base + (fitsInBudget ? TIME_BONUS : 0);

      const reason = isMastered
        ? 'Already mastered — review optional'
        : fitsInBudget
          ? 'Gap topic that fits your time budget'
          : 'Gap topic (exceeds current time budget)';

      return {
        contentItemId: item.id,
        title: item.title,
        estimatedMinutes: mins,
        reason,
        priorityScore,
      } satisfies AdaptivePathItem;
    });

    // 4. Sort descending by priorityScore
    scored.sort((a, b) => b.priorityScore - a.priorityScore);

    this.logger.debug(
      { userId, courseId, timeBudgetMinutes, gapCount, total: scored.length },
      'adaptivePath resolved'
    );

    return {
      courseId,
      timeBudgetMinutes,
      items: scored,
      masteryGapCount: gapCount,
    };
  }
}
