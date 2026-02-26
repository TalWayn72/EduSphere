/**
 * CypherLearningPathService — Apache AGE shortest-path, COLLECT, and prerequisite-chain queries.
 *
 * EXCEPTION NOTE (150-line rule): This service intentionally approaches the 150-line limit
 * because multi-column AGE results (shortestPath, COLLECT, prerequisite chain) each require
 * a direct pool.query call with a primary/fallback AGE-version strategy — the shared
 * executeCypher helper only supports single-column results.
 *
 * SECURITY: All user-supplied values are passed via the AGE third-argument params JSON.
 * No string interpolation of user-controlled data.
 */
import { Injectable, Logger } from '@nestjs/common';
import { db, substituteParams } from '@edusphere/db';
import type { Pool } from 'pg';
import { graphConfig } from '@edusphere/config';

const GRAPH_NAME = graphConfig.graphName;

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

  parseAgtypeScalar(raw: string | number | null | undefined): unknown {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number') return raw;
    const cleaned = String(raw)
      .replace(/::[\w]+$/, '')
      .trim();
    const n = Number(cleaned);
    return Number.isNaN(n) ? cleaned : n;
  }

  parseAgtypeArray(raw: string | null | undefined): unknown[] {
    if (!raw) return [];
    try {
      const cleaned = String(raw)
        .replace(/::[\w]+(?=[,\}\]])/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      this.logger.warn(
        { err, raw },
        'parseAgtypeArray: failed to parse agtype array'
      );
      return [];
    }
  }

  private async acquireClient(tenantId: string) {
    const pool = (db as { $client: Pool }).$client;
    const client = await pool.connect();
    await client.query("LOAD 'age'");
    await client.query('SET search_path = ag_catalog, "$user", public');
    await client.query('SELECT set_config($1, $2, TRUE)', [
      'app.current_tenant',
      tenantId,
    ]);
    return client;
  }

  private async runAgeQuery<T extends Record<string, string>>(
    client: Awaited<ReturnType<typeof this.acquireClient>>,
    cypherQuery: string,
    cypherParams: Record<string, unknown>,
    asClause: string
  ): Promise<T[]> {
    try {
      const q = `SELECT * FROM ag_catalog.cypher('${GRAPH_NAME}', $$${cypherQuery}$$, $1) ${asClause}`;
      const result = await client.query(q, [JSON.stringify(cypherParams)]);
      return result.rows as T[];
    } catch (ageErr) {
      const msg = ageErr instanceof Error ? ageErr.message : String(ageErr);
      if (
        !msg.includes('third argument of cypher function must be a parameter')
      )
        throw ageErr;
      const substituted = substituteParams(cypherQuery, cypherParams);
      const qDirect = `SELECT * FROM ag_catalog.cypher('${GRAPH_NAME}', $$${substituted}$$) ${asClause}`;
      const result = await client.query(qDirect);
      return result.rows as T[];
    }
  }

  async findShortestLearningPath(
    fromName: string,
    toName: string,
    tenantId: string
  ): Promise<LearningPathResult | null> {
    const client = await this.acquireClient(tenantId);
    try {
      const cypherQuery = `
        MATCH (start:Concept {tenant_id: $tenantId}), (end:Concept {tenant_id: $tenantId})
        WHERE toLower(start.name) = toLower($fromName) AND toLower(end.name) = toLower($toName)
        MATCH path = shortestPath((start)-[:RELATED_TO|PREREQUISITE_OF*1..10]-(end))
        RETURN [node IN nodes(path) | {id: node.id, name: node.name, type: node.type}] AS concepts,
               length(path) AS steps`;
      const rows = await this.runAgeQuery<{ concepts: string; steps: string }>(
        client,
        cypherQuery,
        { fromName, toName, tenantId },
        'AS (concepts ag_catalog.agtype, steps ag_catalog.agtype)'
      );
      if (!rows || rows.length === 0 || !rows[0]) return null;
      return {
        concepts: this.parseAgtypeArray(rows[0].concepts) as ConceptNode[],
        steps: this.parseAgtypeScalar(rows[0].steps) as number,
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
    const client = await this.acquireClient(tenantId);
    try {
      const cypherQuery = `
        MATCH (c:Concept {tenant_id: $tenantId})
        WHERE toLower(c.name) = toLower($conceptName)
        MATCH (c)-[:RELATED_TO*1..${safeDepth}]-(related:Concept {tenant_id: $tenantId})
        RETURN COLLECT(DISTINCT {id: related.id, name: related.name, type: related.type}) AS related`;
      const rows = await this.runAgeQuery<{ related: string }>(
        client,
        cypherQuery,
        { conceptName, tenantId },
        'AS (related ag_catalog.agtype)'
      );
      if (!rows || rows.length === 0 || !rows[0]) return [];
      return this.parseAgtypeArray(rows[0].related) as ConceptNode[];
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
    const client = await this.acquireClient(tenantId);
    try {
      const cypherQuery = `
        MATCH (c:Concept {tenant_id: $tenantId})
        WHERE toLower(c.name) = toLower($conceptName)
        MATCH path = (prereq:Concept)-[:PREREQUISITE_OF*1..5]->(c)
        RETURN [node IN nodes(path) | {id: node.id, name: node.name}] AS chain
        ORDER BY length(path) DESC LIMIT 1`;
      const rows = await this.runAgeQuery<{ chain: string }>(
        client,
        cypherQuery,
        { conceptName, tenantId },
        'AS (chain ag_catalog.agtype)'
      );
      if (!rows || rows.length === 0 || !rows[0]) return [];
      return this.parseAgtypeArray(rows[0].chain) as ConceptNode[];
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
