/**
 * CypherConceptRelationService — Apache AGE Cypher queries for Concept edge/relation operations.
 * Handles linkConcepts, linkConceptsByName, findRelatedConcepts, and linkConceptsAndFetch.
 *
 * SECURITY: No user-supplied values are interpolated; all params pass via AGE third-argument JSON.
 */
import { Injectable } from '@nestjs/common';
import {
  db,
  executeCypher,
  findRelatedConcepts,
  createRelationship,
} from '@edusphere/db';
import type { RelationshipProperties } from '@edusphere/db';
import { graphConfig } from '@edusphere/config';

const GRAPH_NAME = graphConfig.graphName;

@Injectable()
export class CypherConceptRelationService {
  /** Merge a RELATED_TO relationship between two concepts (case-insensitive names). */
  async linkConceptsByName(
    fromName: string,
    toName: string,
    tenantId: string,
    strength: number = 0.7
  ): Promise<void> {
    await executeCypher(
      db,
      GRAPH_NAME,
      `MATCH (a:Concept {tenant_id: $tenantId}) WHERE toLower(a.name) = toLower($fromName)
       MATCH (b:Concept {tenant_id: $tenantId}) WHERE toLower(b.name) = toLower($toName)
       MERGE (a)-[r:RELATED_TO]->(b)
       ON CREATE SET r.strength = $strength, r.created_at = timestamp()`,
      { fromName, toName, tenantId, strength },
      tenantId
    );
  }

  async findRelatedConcepts(
    conceptId: string,
    tenantId: string,
    depth: number = 2,
    limit: number = 10
  ): Promise<unknown[]> {
    return findRelatedConcepts(db, conceptId, tenantId, depth, limit);
  }

  async linkConcepts(
    fromId: string,
    toId: string,
    relationshipType: string,
    properties: RelationshipProperties = {}
  ): Promise<void> {
    return createRelationship(db, fromId, toId, relationshipType, properties);
  }

  /**
   * linkConceptsAndFetch — creates the relationship AND returns both endpoint
   * nodes in a single Cypher round-trip, eliminating the N+1 pattern.
   */
  async linkConceptsAndFetch(
    fromId: string,
    toId: string,
    relationshipType: string,
    properties: RelationshipProperties,
    tenantId: string
  ): Promise<{ from: unknown; to: unknown }> {
    const safeStrength = properties.strength ?? 1.0;
    const safeDescription = properties.description ?? '';
    const rows = await executeCypher(
      db,
      GRAPH_NAME,
      `MATCH (a:Concept {id: $fromId, tenant_id: $tenantId})
       MATCH (b:Concept {id: $toId, tenant_id: $tenantId})
       MERGE (a)-[r:\`${relationshipType}\`]->(b)
       ON CREATE SET r.strength = $strength,
                     r.description = $description,
                     r.created_at = timestamp()
       ON MATCH  SET r.strength = $strength,
                     r.description = $description,
                     r.updated_at = timestamp()
       RETURN a, b`,
      {
        fromId,
        toId,
        tenantId,
        strength: safeStrength,
        description: safeDescription,
      },
      tenantId
    );
    return {
      from: (rows[0] as Record<string, unknown>)?.a ?? null,
      to: (rows[0] as Record<string, unknown>)?.b ?? null,
    };
  }
}
