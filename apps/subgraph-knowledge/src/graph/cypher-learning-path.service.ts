/**
 * CypherLearningPathService — Apache AGE shortest-path, COLLECT, and prerequisite-chain queries.
 *
 * Low-level AGE helpers (acquireAgeClient, runAgeQuery, parseAgtypeScalar/Array)
 * are imported from cypher-age-helpers.ts.
 *
 * SECURITY: All user-supplied values are passed via AGE third-argument params JSON.
 * No string interpolation of user-controlled data.
 */
import { Injectable, Logger } from '@nestjs/common';
import { db } from '@edusphere/db';
import {
  acquireAgeClient,
  runAgeQuery,
  parseAgtypeScalar,
  parseAgtypeArray,
} from './cypher-age-helpers';

export interface ConceptNode {
  id: string;
  name: string;
  type?: string;
}

export interface LearningPathResult {
  concepts: ConceptNode[];
  steps: number;
}

@Injectable()
export class CypherLearningPathService {
  private readonly logger = new Logger(CypherLearningPathService.name);

  async findShortestLearningPath(
    fromName: string,
    toName: string,
    tenantId: string
  ): Promise<LearningPathResult | null> {
    const client = await acquireAgeClient(db, tenantId);
    try {
      const cypherQuery = `
        MATCH (start:Concept {tenant_id: $tenantId}), (end:Concept {tenant_id: $tenantId})
        WHERE toLower(start.name) = toLower($fromName) AND toLower(end.name) = toLower($toName)
        MATCH path = shortestPath((start)-[:RELATED_TO|PREREQUISITE_OF*1..10]-(end))
        RETURN [node IN nodes(path) | {id: node.id, name: node.name, type: node.type}] AS concepts,
               length(path) AS steps`;
      const rows = await runAgeQuery<{ concepts: string; steps: string }>(
        client,
        cypherQuery,
        { fromName, toName, tenantId },
        'AS (concepts ag_catalog.agtype, steps ag_catalog.agtype)'
      );
      if (!rows || rows.length === 0 || !rows[0]) return null;
      return {
        concepts: parseAgtypeArray(rows[0].concepts) as ConceptNode[],
        steps: parseAgtypeScalar(rows[0].steps) as number,
      };
    } catch (err) {
      this.logger.error(
        { err, fromName, toName, tenantId },
        'findShortestLearningPath failed'
      );
      return null;
    } finally {
      client.release();
    }
  }

  async collectRelatedConcepts(
    conceptName: string,
    depth: number,
    tenantId: string
  ): Promise<ConceptNode[]> {
    const safeDepth = Math.max(1, Math.min(5, Math.trunc(depth)));
    const client = await acquireAgeClient(db, tenantId);
    try {
      const cypherQuery = `
        MATCH (c:Concept {tenant_id: $tenantId})
        WHERE toLower(c.name) = toLower($conceptName)
        MATCH (c)-[:RELATED_TO*1..${safeDepth}]-(related:Concept {tenant_id: $tenantId})
        RETURN COLLECT(DISTINCT {id: related.id, name: related.name, type: related.type}) AS related`;
      const rows = await runAgeQuery<{ related: string }>(
        client,
        cypherQuery,
        { conceptName, tenantId },
        'AS (related ag_catalog.agtype)'
      );
      if (!rows || rows.length === 0 || !rows[0]) return [];
      return parseAgtypeArray(rows[0].related) as ConceptNode[];
    } catch (err) {
      this.logger.error(
        { err, conceptName, tenantId },
        'collectRelatedConcepts failed'
      );
      return [];
    } finally {
      client.release();
    }
  }

  async findPrerequisiteChain(
    conceptName: string,
    tenantId: string
  ): Promise<ConceptNode[]> {
    const client = await acquireAgeClient(db, tenantId);
    try {
      const cypherQuery = `
        MATCH (c:Concept {tenant_id: $tenantId})
        WHERE toLower(c.name) = toLower($conceptName)
        MATCH path = (prereq:Concept)-[:PREREQUISITE_OF*1..5]->(c)
        RETURN [node IN nodes(path) | {id: node.id, name: node.name}] AS chain
        ORDER BY length(path) DESC LIMIT 1`;
      const rows = await runAgeQuery<{ chain: string }>(
        client,
        cypherQuery,
        { conceptName, tenantId },
        'AS (chain ag_catalog.agtype)'
      );
      if (!rows || rows.length === 0 || !rows[0]) return [];
      return parseAgtypeArray(rows[0].chain) as ConceptNode[];
    } catch (err) {
      this.logger.error(
        { err, conceptName, tenantId },
        'findPrerequisiteChain failed'
      );
      return [];
    } finally {
      client.release();
    }
  }
}
