/**
 * GraphConceptLinkService — business-logic for Concept relationship operations.
 * Wraps CypherConceptRelationService calls inside withTenantContext (RLS enforcement).
 *
 * Concept CRUD operations live in GraphConceptService.
 */
import { Injectable, Logger } from '@nestjs/common';
import { db, withTenantContext } from '@edusphere/db';
import { CypherConceptRelationService } from './cypher-concept-relation.service';
import {
  toUserRole,
  type GraphConceptNode,
  type RelatedConceptRow,
} from './graph-types';

/** Shared mapper — keeps in sync with GraphConceptService.mapConcept. */
export function mapConceptNode(node: GraphConceptNode) {
  return {
    id: node.id,
    tenantId: node.tenant_id,
    name: node.name,
    definition: node.definition,
    sourceIds: JSON.parse(node.source_ids || '[]') as string[],
    createdAt: new Date(node.created_at).toISOString(),
    updatedAt: new Date(node.updated_at).toISOString(),
  };
}

@Injectable()
export class GraphConceptLinkService {
  private readonly logger = new Logger(GraphConceptLinkService.name);

  constructor(private readonly cypherRelation: CypherConceptRelationService) {}

  async findRelatedConcepts(
    conceptId: string,
    depth: number,
    limit: number,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => {
        const related = await this.cypherRelation.findRelatedConcepts(
          conceptId,
          tenantId,
          depth,
          limit
        );
        return (related as RelatedConceptRow[]).map((r) => ({
          concept: mapConceptNode(r),
          strength: r.strength ?? 1.0,
        }));
      }
    );
  }

  /**
   * linkConcepts — creates a typed relationship between two Concept nodes.
   *
   * N+1 fix: previously called linkConcepts (MERGE) then two separate
   * findConceptById (MATCH) queries — 3 round-trips total.
   * Now calls linkConceptsAndFetch which performs the MERGE and
   * returns both nodes in a single Cypher query — 1 round-trip.
   */
  async linkConcepts(
    fromId: string,
    toId: string,
    relationshipType: string,
    strength: number | null,
    description: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => {
        const { from, to } = await this.cypherRelation.linkConceptsAndFetch(
          fromId,
          toId,
          relationshipType,
          {
            strength: strength ?? undefined,
            description: description ?? undefined,
          },
          tenantId
        );
        this.logger.debug(
          { fromId, toId, relationshipType, tenantId },
          'linkConcepts: relationship created/updated in single round-trip'
        );
        return {
          fromConcept: from ? mapConceptNode(from as GraphConceptNode) : null,
          toConcept: to ? mapConceptNode(to as GraphConceptNode) : null,
          relationshipType,
          strength,
          inferred: false,
          description,
        };
      }
    );
  }
}
