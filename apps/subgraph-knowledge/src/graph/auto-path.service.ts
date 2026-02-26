/**
 * AutoPathService — resolves personalized learning paths (F-002).
 * Uses CypherLearningPathService shortestPath + Drizzle user_progress to mark completion.
 */
import { Injectable, Logger } from '@nestjs/common';
import { db, sql, withTenantContext } from '@edusphere/db';
import { CypherLearningPathService } from './cypher-learning-path.service';
import { toUserRole } from './graph-types';

export interface AutoPathNode {
  conceptName: string;
  isCompleted: boolean;
  contentItems: string[];
}

export interface AutoPath {
  targetConceptName: string;
  nodes: AutoPathNode[];
  totalSteps: number;
  completedSteps: number;
}

@Injectable()
export class AutoPathService {
  private readonly logger = new Logger(AutoPathService.name);

  constructor(private readonly learningPath: CypherLearningPathService) {}

  async getMyLearningPath(
    targetConceptName: string,
    userId: string,
    tenantId: string,
    role: string
  ): Promise<AutoPath | null> {
    const ctx = { tenantId, userId, userRole: toUserRole(role) };

    // 1. Fetch mastered concept names from user_progress (completed content items
    //    whose linked concept_name is stored in the embeddings table)
    const masteredNames = await withTenantContext(db, ctx, async (tx) => {
      const rows = await tx.execute(sql`
        SELECT DISTINCT e.entity_id AS concept_name
        FROM user_progress up
        JOIN embeddings e ON e.entity_id = up.content_item_id::text
          AND e.entity_type = 'concept'
        WHERE up.user_id = ${userId}::uuid
          AND up.is_completed = TRUE
      `);
      return (rows.rows as { concept_name: string }[]).map(
        (r) => r.concept_name
      );
    });

    this.logger.debug(
      {
        userId,
        tenantId,
        targetConceptName,
        masteredCount: masteredNames.length,
      },
      'resolving autoPath'
    );

    // 2. Find shortest path from any mastered concept to the target.
    //    Fall back to prerequisiteChain if no mastered concepts exist.
    let bestPath = await this.learningPath.findShortestLearningPath(
      masteredNames[0] ?? targetConceptName,
      targetConceptName,
      tenantId
    );

    for (const name of masteredNames.slice(1)) {
      const candidate = await this.learningPath.findShortestLearningPath(
        name,
        targetConceptName,
        tenantId
      );
      if (candidate && (!bestPath || candidate.steps < bestPath.steps)) {
        bestPath = candidate;
      }
    }

    // 3. Fall back to prerequisite chain when no mastered concepts
    if (!bestPath) {
      const chain = await this.learningPath.findPrerequisiteChain(
        targetConceptName,
        tenantId
      );
      if (!chain || chain.length === 0) return null;
      bestPath = { concepts: chain, steps: chain.length - 1 };
    }

    const masteredSet = new Set(masteredNames.map((n) => n.toLowerCase()));

    const nodes: AutoPathNode[] = bestPath.concepts.map((c) => ({
      conceptName: c.name,
      isCompleted: masteredSet.has(c.name.toLowerCase()),
      contentItems: [],
    }));

    const completedSteps = nodes.filter((n) => n.isCompleted).length;

    return {
      targetConceptName,
      nodes,
      totalSteps: nodes.length,
      completedSteps,
    };
  }
}
