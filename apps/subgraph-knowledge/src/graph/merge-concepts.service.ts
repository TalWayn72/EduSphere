/**
 * MergeConceptsService — Merges two concept nodes in the Apache AGE graph.
 *
 * Strategy: move all edges from source to target, delete source, return target.
 * Uses executeCypher() with parameterized queries (no SQL injection).
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { db, executeCypher } from '@edusphere/db';
import { graphConfig } from '@edusphere/config';

const GRAPH_NAME = graphConfig.graphName;

interface MergeConceptsInput {
  sourceConceptId: string;
  targetConceptId: string;
  keepTarget: boolean;
}

@Injectable()
export class MergeConceptsService {
  private readonly logger = new Logger(MergeConceptsService.name);

  /**
   * Merge two concept nodes: move edges from source to target, delete source.
   */
  async mergeNodes(
    input: MergeConceptsInput,
    tenantId: string
  ): Promise<unknown> {
    const { sourceConceptId, targetConceptId } = input;

    if (sourceConceptId === targetConceptId) {
      throw new BadRequestException(
        'Source and target concept IDs must be different'
      );
    }

    this.logger.log(
      { sourceConceptId, targetConceptId, tenantId },
      '[MergeConceptsService] mergeNodes'
    );

    // 1. Verify both concepts exist
    const [source] = await executeCypher(
      db,
      GRAPH_NAME,
      `MATCH (c:Concept {id: $id, tenant_id: $tenantId}) RETURN c`,
      { id: sourceConceptId, tenantId },
      tenantId
    );
    if (!source) {
      throw new NotFoundException(
        `Source concept ${sourceConceptId} not found`
      );
    }

    const [target] = await executeCypher(
      db,
      GRAPH_NAME,
      `MATCH (c:Concept {id: $id, tenant_id: $tenantId}) RETURN c`,
      { id: targetConceptId, tenantId },
      tenantId
    );
    if (!target) {
      throw new NotFoundException(
        `Target concept ${targetConceptId} not found`
      );
    }

    // 2. Move outgoing edges from source to target
    await executeCypher(
      db,
      GRAPH_NAME,
      `MATCH (s:Concept {id: $sourceId, tenant_id: $tenantId})-[r]->(n)
       WHERE NOT n.id = $targetId
       CREATE (t:Concept {id: $targetId, tenant_id: $tenantId})-[r2:RELATED_TO]->(n)
       DELETE r`,
      { sourceId: sourceConceptId, targetId: targetConceptId, tenantId },
      tenantId
    ).catch((err: unknown) => {
      this.logger.warn(
        { err },
        '[MergeConceptsService] No outgoing edges to move (or AGE skip)'
      );
    });

    // 3. Move incoming edges from source to target
    await executeCypher(
      db,
      GRAPH_NAME,
      `MATCH (n)-[r]->(s:Concept {id: $sourceId, tenant_id: $tenantId})
       WHERE NOT n.id = $targetId
       CREATE (n)-[r2:RELATED_TO]->(t:Concept {id: $targetId, tenant_id: $tenantId})
       DELETE r`,
      { sourceId: sourceConceptId, targetId: targetConceptId, tenantId },
      tenantId
    ).catch((err: unknown) => {
      this.logger.warn(
        { err },
        '[MergeConceptsService] No incoming edges to move (or AGE skip)'
      );
    });

    // 4. Delete source concept
    await executeCypher(
      db,
      GRAPH_NAME,
      `MATCH (c:Concept {id: $id, tenant_id: $tenantId}) DETACH DELETE c`,
      { id: sourceConceptId, tenantId },
      tenantId
    );

    // 5. Return the target concept (refreshed)
    const [merged] = await executeCypher(
      db,
      GRAPH_NAME,
      `MATCH (c:Concept {id: $id, tenant_id: $tenantId}) RETURN c`,
      { id: targetConceptId, tenantId },
      tenantId
    );

    return merged;
  }
}
