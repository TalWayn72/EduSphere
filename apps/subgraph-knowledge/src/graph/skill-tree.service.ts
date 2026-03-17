/**
 * SkillTreeService — builds a visual skill tree from Apache AGE concept graph.
 * Enriches nodes with user mastery data from user_skill_mastery table.
 *
 * NOTE: user_skill_mastery table is created by migration 0011.
 * If the table does not yet exist the service falls back to NONE mastery for all nodes.
 */
import { Injectable, Logger } from '@nestjs/common';
import { db, withTenantContext, sql } from '@edusphere/db';
import { toUserRole } from './graph-types';

export type MasteryLevel =
  | 'NONE'
  | 'ATTEMPTED'
  | 'FAMILIAR'
  | 'PROFICIENT'
  | 'MASTERED';

export interface SkillTreeNodeDto {
  id: string;
  label: string;
  type: string;
  masteryLevel: MasteryLevel;
  connections: string[];
}

export interface SkillTreeEdgeDto {
  source: string;
  target: string;
}

export interface SkillTreeDto {
  nodes: SkillTreeNodeDto[];
  edges: SkillTreeEdgeDto[];
}

interface ConceptRow {
  id: string;
  name: string;
}

interface MasteryRow {
  concept_id: string;
  mastery_level: string;
}

const VALID_MASTERY = new Set<string>([
  'NONE',
  'ATTEMPTED',
  'FAMILIAR',
  'PROFICIENT',
  'MASTERED',
]);

function toMasteryLevel(raw: string | null | undefined): MasteryLevel {
  if (raw && VALID_MASTERY.has(raw)) return raw as MasteryLevel;
  return 'NONE';
}

@Injectable()
export class SkillTreeService {
  private readonly logger = new Logger(SkillTreeService.name);

  async getSkillTree(
    courseId: string,
    tenantId: string,
    userId: string,
    role: string
  ): Promise<SkillTreeDto> {
    const ctx = { tenantId, userId, userRole: toUserRole(role) };

    return withTenantContext(db, ctx, async (tx) => {
      // Fetch concepts linked to course via topic clusters in Apache AGE
      // Falls back to all concepts for tenant when no course-specific clusters exist.
      let concepts: ConceptRow[] = [];
      let edges: SkillTreeEdgeDto[] = [];

      try {
        const conceptResult = await tx.execute(sql`
          SELECT DISTINCT c.id::text AS id, c.title AS name
          FROM content_items c
          WHERE c.tenant_id = ${tenantId}::uuid
            AND (c.course_id = ${courseId}::uuid OR ${courseId} = 'all')
          ORDER BY c.title
          LIMIT 30
        `);
        concepts = (conceptResult.rows ?? conceptResult) as unknown as ConceptRow[];
      } catch (err) {
        this.logger.warn(
          { courseId, tenantId, err },
          '[SkillTreeService] concept query failed — returning empty tree'
        );
      }

      // Build simple linear chain edges (concept[i] -> concept[i+1])
      // This is the fallback topology when AGE graph is not available.
      // A full implementation would use Apache AGE PREREQUISITE_OF edges.
      for (let i = 0; i < concepts.length - 1; i++) {
        // eslint-disable-next-line security/detect-object-injection
        const src = concepts[i];
        const tgt = concepts[i + 1];
        if (src && tgt) {
          edges.push({ source: src.id, target: tgt.id });
        }
      }

      // Fetch mastery levels for these concept IDs from user_skill_mastery table
      const masteryMap = new Map<string, MasteryLevel>();
      if (concepts.length > 0) {
        try {
          const ids = concepts.map((c) => c.id);
          const masteryResult = await tx.execute(sql`
            SELECT concept_id::text, mastery_level
            FROM user_skill_mastery
            WHERE user_id = ${userId}::uuid
              AND tenant_id = ${tenantId}::uuid
              AND concept_id = ANY(${ids}::uuid[])
          `);
          const rows = (masteryResult.rows ?? masteryResult) as unknown as MasteryRow[];
          for (const row of rows) {
            masteryMap.set(row.concept_id, toMasteryLevel(row.mastery_level));
          }
        } catch {
          // Table may not exist yet — silently fall back to NONE
          this.logger.debug(
            { tenantId, userId },
            '[SkillTreeService] user_skill_mastery not available — mastery defaults to NONE'
          );
        }
      }

      const nodes: SkillTreeNodeDto[] = concepts.map((c) => ({
        id: c.id,
        label: c.name,
        type: 'CONCEPT',
        masteryLevel: masteryMap.get(c.id) ?? 'NONE',
        connections: edges
          .filter((e) => e.source === c.id)
          .map((e) => e.target),
      }));

      this.logger.debug(
        { courseId, tenantId, userId, nodeCount: nodes.length },
        '[SkillTreeService] skillTree built'
      );

      return { nodes, edges };
    });
  }

  async getTopMasteryTopics(
    tenantId: string,
    userId: string,
    role: string,
    limit: number
  ): Promise<{ topicName: string; level: MasteryLevel }[]> {
    const ctx = { tenantId, userId, userRole: toUserRole(role) };

    return withTenantContext(db, ctx, async (tx) => {
      try {
        const masteryOrder = `CASE mastery_level
          WHEN 'MASTERED' THEN 5 WHEN 'PROFICIENT' THEN 4
          WHEN 'FAMILIAR' THEN 3 WHEN 'ATTEMPTED' THEN 2 ELSE 1 END`;
        const result = await tx.execute(sql`
          SELECT usm.mastery_level, COALESCE(ci.title, usm.concept_id::text) AS topic_name
          FROM user_skill_mastery usm
          LEFT JOIN content_items ci ON ci.id = usm.concept_id
          WHERE usm.user_id = ${userId}::uuid
            AND usm.tenant_id = ${tenantId}::uuid
            AND usm.mastery_level <> 'NONE'
          ORDER BY ${sql.raw(masteryOrder)} DESC, usm.updated_at DESC
          LIMIT ${limit}
        `);
        const rows = (result.rows ?? result) as unknown as {
          mastery_level: string;
          topic_name: string;
        }[];
        return rows.map((r) => ({
          topicName: r.topic_name,
          level: toMasteryLevel(r.mastery_level),
        }));
      } catch (err) {
        this.logger.warn(
          { tenantId, userId, err },
          '[SkillTreeService] getTopMasteryTopics failed — returning empty'
        );
        return [];
      }
    });
  }

  async updateMasteryLevel(
    nodeId: string,
    level: MasteryLevel,
    tenantId: string,
    userId: string,
    role: string
  ): Promise<SkillTreeNodeDto> {
    const ctx = { tenantId, userId, userRole: toUserRole(role) };

    return withTenantContext(db, ctx, async (tx) => {
      // Upsert into user_skill_mastery (created by migration 0011)
      // If table does not exist, this will throw and the caller gets a GraphQL error.
      try {
        await tx.execute(sql`
          INSERT INTO user_skill_mastery (user_id, tenant_id, concept_id, mastery_level, updated_at)
          VALUES (
            ${userId}::uuid,
            ${tenantId}::uuid,
            ${nodeId}::uuid,
            ${level},
            NOW()
          )
          ON CONFLICT (user_id, tenant_id, concept_id)
          DO UPDATE SET mastery_level = EXCLUDED.mastery_level, updated_at = NOW()
        `);
      } catch (err) {
        this.logger.error(
          { nodeId, level, tenantId, userId, err },
          '[SkillTreeService] updateMasteryLevel failed — user_skill_mastery table may not exist'
        );
        throw err;
      }

      // Fetch the concept metadata to return the updated node
      let label = nodeId;
      try {
        const result = await tx.execute(sql`
          SELECT title AS name FROM content_items WHERE id = ${nodeId}::uuid LIMIT 1
        `);
        const rows = (result.rows ?? result) as { name: string }[];
        if (rows[0]) label = rows[0].name;
      } catch {
        // non-fatal
      }

      this.logger.log(
        { nodeId, level, tenantId, userId },
        '[SkillTreeService] mastery level updated'
      );

      return {
        id: nodeId,
        label,
        type: 'CONCEPT',
        masteryLevel: level,
        connections: [],
      };
    });
  }
}
