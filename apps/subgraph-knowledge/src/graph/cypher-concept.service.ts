/**
 * CypherConceptService — Apache AGE Cypher queries for Concept vertex CRUD.
 * Handles findById/findByName/findAll/create/update/delete.
 *
 * Relation queries (linkConcepts, findRelated, linkConceptsAndFetch) live in
 * CypherConceptRelationService.
 *
 * SECURITY: No user-supplied values are interpolated; all params pass via AGE third-argument JSON.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  db,
  executeCypher,
  createConcept,
} from '@edusphere/db';
import type { ConceptProperties } from '@edusphere/db';
import { graphConfig } from '@edusphere/config';
import { MAX_CONCEPT_LIMIT } from '../constants';

const GRAPH_NAME = graphConfig.graphName;

@Injectable()
export class CypherConceptService {
  private readonly logger = new Logger(CypherConceptService.name);

  async findConceptById(id: string, tenantId: string): Promise<unknown> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `MATCH (c:Concept {id: $id, tenant_id: $tenantId}) RETURN c`,
      { id, tenantId },
      tenantId
    );
    return result[0] || null;
  }

  async findConceptByName(name: string, tenantId: string): Promise<unknown> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `MATCH (c:Concept {name: $name, tenant_id: $tenantId}) RETURN c`,
      { name, tenantId },
      tenantId
    );
    return result[0] || null;
  }

  /** Case-insensitive concept lookup for idempotent upsert path. */
  async findConceptByNameCaseInsensitive(
    name: string,
    tenantId: string
  ): Promise<unknown> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `MATCH (c:Concept {tenant_id: $tenantId})
       WHERE toLower(c.name) = toLower($name)
       RETURN c LIMIT 1`,
      { name, tenantId },
      tenantId
    );
    return result[0] ?? null;
  }

  async findAllConcepts(tenantId: string, limit: number): Promise<unknown[]> {
    const safeLimit = Math.max(
      1,
      Math.min(MAX_CONCEPT_LIMIT, Math.trunc(limit))
    );
    return executeCypher(
      db,
      GRAPH_NAME,
      `MATCH (c:Concept {tenant_id: $tenantId}) RETURN c LIMIT ${safeLimit}`,
      { tenantId },
      tenantId
    );
  }

  async createConcept(props: ConceptProperties): Promise<string> {
    return createConcept(db, props);
  }

  async updateConcept(
    id: string,
    tenantId: string,
    updates: Partial<ConceptProperties>
  ): Promise<unknown> {
    const allowedKeys = new Set<string>(['name', 'definition', 'source_ids']);
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedKeys.has(key))
    );
    const setParts = Object.keys(safeUpdates)
      .map((key) => `c.${key} = $${key}`)
      .join(', ');
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `MATCH (c:Concept {id: $id, tenant_id: $tenantId})
       SET ${setParts}, c.updated_at = timestamp() RETURN c`,
      { id, tenantId, ...safeUpdates },
      tenantId
    );
    return result[0] || null;
  }

  async deleteConcept(id: string, tenantId: string): Promise<boolean> {
    try {
      await executeCypher(
        db,
        GRAPH_NAME,
        `MATCH (c:Concept {id: $id, tenant_id: $tenantId}) DETACH DELETE c`,
        { id, tenantId },
        tenantId
      );
      return true;
    } catch (error) {
      this.logger.error(
        { err: error, conceptId: id },
        'Failed to delete concept'
      );
      return false;
    }
  }
}
