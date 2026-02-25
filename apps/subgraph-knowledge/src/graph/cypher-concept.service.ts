/**
 * CypherConceptService — Apache AGE Cypher queries for the Concept vertex domain.
 * All user-supplied values are passed via AGE parameterized queries (third-argument params).
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  db,
  executeCypher,
  createConcept,
  findRelatedConcepts,
  createRelationship,
} from '@edusphere/db';
import type { ConceptProperties, RelationshipProperties } from '@edusphere/db';
import { graphConfig } from '@edusphere/config';
import { MAX_CONCEPT_LIMIT } from '../constants';

const GRAPH_NAME = graphConfig.graphName;

@Injectable()
export class CypherConceptService {
  private readonly logger = new Logger(CypherConceptService.name);

  async findConceptById(id: string, tenantId: string): Promise<unknown> {
    const result = await executeCypher(
      db, GRAPH_NAME,
      `MATCH (c:Concept {id: $id, tenant_id: $tenantId}) RETURN c`,
      { id, tenantId }, tenantId,
    );
    return result[0] || null;
  }

  async findConceptByName(name: string, tenantId: string): Promise<unknown> {
    const result = await executeCypher(
      db, GRAPH_NAME,
      `MATCH (c:Concept {name: $name, tenant_id: $tenantId}) RETURN c`,
      { name, tenantId }, tenantId,
    );
    return result[0] || null;
  }

  /** Case-insensitive concept lookup for idempotent upsert path. */
  async findConceptByNameCaseInsensitive(name: string, tenantId: string): Promise<unknown> {
    const result = await executeCypher(
      db, GRAPH_NAME,
      `MATCH (c:Concept {tenant_id: $tenantId})
       WHERE toLower(c.name) = toLower($name)
       RETURN c LIMIT 1`,
      { name, tenantId }, tenantId,
    );
    return result[0] ?? null;
  }

  /** Merge a RELATED_TO relationship between two concepts (case-insensitive names). */
  async linkConceptsByName(
    fromName: string, toName: string, tenantId: string, strength: number = 0.7
  ): Promise<void> {
    await executeCypher(
      db, GRAPH_NAME,
      `MATCH (a:Concept {tenant_id: $tenantId}) WHERE toLower(a.name) = toLower($fromName)
       MATCH (b:Concept {tenant_id: $tenantId}) WHERE toLower(b.name) = toLower($toName)
       MERGE (a)-[r:RELATED_TO]->(b)
       ON CREATE SET r.strength = $strength, r.created_at = timestamp()`,
      { fromName, toName, tenantId, strength }, tenantId,
    );
  }

  async findAllConcepts(tenantId: string, limit: number): Promise<unknown[]> {
    const safeLimit = Math.max(1, Math.min(MAX_CONCEPT_LIMIT, Math.trunc(limit)));
    return executeCypher(
      db, GRAPH_NAME,
      `MATCH (c:Concept {tenant_id: $tenantId}) RETURN c LIMIT ${safeLimit}`,
      { tenantId }, tenantId,
    );
  }

  async createConcept(props: ConceptProperties): Promise<string> {
    return createConcept(db, props);
  }

  async updateConcept(
    id: string, tenantId: string, updates: Partial<ConceptProperties>
  ): Promise<unknown> {
    const allowedKeys = new Set<string>(['name', 'definition', 'source_ids']);
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedKeys.has(key))
    );
    const setParts = Object.keys(safeUpdates).map((key) => `c.${key} = $${key}`).join(', ');
    const result = await executeCypher(
      db, GRAPH_NAME,
      `MATCH (c:Concept {id: $id, tenant_id: $tenantId})
       SET ${setParts}, c.updated_at = timestamp() RETURN c`,
      { id, tenantId, ...safeUpdates }, tenantId,
    );
    return result[0] || null;
  }

  async deleteConcept(id: string, tenantId: string): Promise<boolean> {
    try {
      await executeCypher(
        db, GRAPH_NAME,
        `MATCH (c:Concept {id: $id, tenant_id: $tenantId}) DETACH DELETE c`,
        { id, tenantId }, tenantId,
      );
      return true;
    } catch (error) {
      this.logger.error({ err: error, conceptId: id }, 'Failed to delete concept');
      return false;
    }
  }

  async findRelatedConcepts(
    conceptId: string, tenantId: string, depth: number = 2, limit: number = 10
  ): Promise<unknown[]> {
    return findRelatedConcepts(db, conceptId, tenantId, depth, limit);
  }

  async linkConcepts(
    fromId: string, toId: string, relationshipType: string,
    properties: RelationshipProperties = {}
  ): Promise<void> {
    return createRelationship(db, fromId, toId, relationshipType, properties);
  }

  /**
   * linkConceptsAndFetch — creates the relationship AND returns both endpoint
   * nodes in a single Cypher round-trip, eliminating the N+1 pattern in
   * GraphConceptService.linkConcepts (was: MERGE + 2x MATCH).
   */
  async linkConceptsAndFetch(
    fromId: string, toId: string,
    relationshipType: string,
    properties: RelationshipProperties,
    tenantId: string,
  ): Promise<{ from: unknown; to: unknown }> {
    const safeStrength = properties.strength ?? 1.0;
    const safeDescription = properties.description ?? '';
    // Single Cypher query: create the relationship, return both nodes.
    const rows = await executeCypher(
      db, GRAPH_NAME,
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
      { fromId, toId, tenantId, strength: safeStrength, description: safeDescription },
      tenantId,
    );
    return {
      from: (rows[0] as Record<string, unknown>)?.a ?? null,
      to:   (rows[0] as Record<string, unknown>)?.b ?? null,
    };
  }
}
