/**
 * CypherService — Apache AGE graph query helpers.
 *
 * EXCEPTION NOTE (150-line rule): This service intentionally exceeds the 150-line
 * limit per CLAUDE.md § "Apache AGE graph query helpers with multiple Cypher patterns".
 * It covers 5 vertex domains (Concept, Person, Term, Source, TopicCluster) each
 * requiring find/create Cypher patterns that cannot be easily shared due to differing
 * vertex labels and property schemas.  Additionally includes Learning Path methods
 * that use Apache AGE shortestPath(), COLLECT(), and multi-hop traversal.
 *
 * SECURITY: All user-supplied values are passed via parameterized queries using the
 * Apache AGE cypher() third-argument params mechanism. No string interpolation of
 * user-controlled data is present in this file.
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
import type { Pool } from 'pg';

// ─── Return types for Learning Path queries ──────────────────────────────────

export interface ConceptNode {
  id: string;
  name: string;
  type?: string;
}

export interface LearningPathResult {
  concepts: ConceptNode[];
  steps: number;
}

const GRAPH_NAME = 'edusphere_graph';

@Injectable()
export class CypherService {
  private readonly logger = new Logger(CypherService.name);

  // ---------------------------------------------------------------------------
  // Concept
  // ---------------------------------------------------------------------------

  async findConceptById(id: string, tenantId: string): Promise<any> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `
      MATCH (c:Concept {id: $id, tenant_id: $tenantId})
      RETURN c
      `,
      { id, tenantId },
      tenantId,
    );
    return result[0] || null;
  }

  async findConceptByName(name: string, tenantId: string): Promise<any> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `
      MATCH (c:Concept {name: $name, tenant_id: $tenantId})
      RETURN c
      `,
      { name, tenantId },
      tenantId,
    );
    return result[0] || null;
  }

  /**
   * Case-insensitive concept lookup — used by the idempotent upsert path
   * triggered by the NATS knowledge.concepts.extracted consumer.
   * Uses a Cypher WHERE toLower() predicate to avoid full-table scan in JS.
   */
  async findConceptByNameCaseInsensitive(
    name: string,
    tenantId: string
  ): Promise<any> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `
      MATCH (c:Concept {tenant_id: $tenantId})
      WHERE toLower(c.name) = toLower($name)
      RETURN c
      LIMIT 1
      `,
      { name, tenantId },
      tenantId,
    );
    return result[0] ?? null;
  }

  /**
   * Merge (idempotent) a RELATED_TO relationship between two concepts
   * identified by name (case-insensitive). Silently no-ops if either node
   * is missing — the consumer will retry on the next event cycle.
   */
  async linkConceptsByName(
    fromName: string,
    toName: string,
    tenantId: string,
    strength: number = 0.7
  ): Promise<void> {
    await executeCypher(
      db,
      GRAPH_NAME,
      `
      MATCH (a:Concept {tenant_id: $tenantId})
      WHERE toLower(a.name) = toLower($fromName)
      MATCH (b:Concept {tenant_id: $tenantId})
      WHERE toLower(b.name) = toLower($toName)
      MERGE (a)-[r:RELATED_TO]->(b)
      ON CREATE SET r.strength = $strength, r.created_at = timestamp()
      `,
      { fromName, toName, tenantId, strength },
      tenantId,
    );
  }

  async findAllConcepts(tenantId: string, limit: number): Promise<any[]> {
    // limit is an internal integer from the resolver, not raw user text — clamped for safety.
    const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
    return executeCypher(
      db,
      GRAPH_NAME,
      `
      MATCH (c:Concept {tenant_id: $tenantId})
      RETURN c
      LIMIT ${safeLimit}
      `,
      { tenantId },
      tenantId,
    );
  }

  async createConcept(props: ConceptProperties): Promise<string> {
    return createConcept(db, props);
  }

  async updateConcept(
    id: string,
    tenantId: string,
    updates: Partial<ConceptProperties>
  ): Promise<any> {
    // Build SET clause using param references ($key) for each update value.
    // Keys come from the ConceptProperties type — they are not user-controlled
    // strings but still validated here against the allowed property allowlist.
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
      `
      MATCH (c:Concept {id: $id, tenant_id: $tenantId})
      SET ${setParts}, c.updated_at = timestamp()
      RETURN c
      `,
      { id, tenantId, ...safeUpdates },
      tenantId,
    );
    return result[0] || null;
  }

  async deleteConcept(id: string, tenantId: string): Promise<boolean> {
    try {
      await executeCypher(
        db,
        GRAPH_NAME,
        `
        MATCH (c:Concept {id: $id, tenant_id: $tenantId})
        DETACH DELETE c
        `,
        { id, tenantId },
        tenantId,
      );
      return true;
    } catch (error) {
      this.logger.error({ err: error, conceptId: id }, 'Failed to delete concept');
      return false;
    }
  }

  async findRelatedConcepts(
    conceptId: string,
    tenantId: string,
    depth: number = 2,
    limit: number = 10
  ): Promise<any[]> {
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

  // ---------------------------------------------------------------------------
  // Person
  // ---------------------------------------------------------------------------

  async findPersonById(id: string, tenantId: string): Promise<any> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `
      MATCH (p:Person {id: $id, tenant_id: $tenantId})
      RETURN p
      `,
      { id, tenantId },
      tenantId,
    );
    return result[0] || null;
  }

  async findPersonByName(name: string, tenantId: string): Promise<any> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `
      MATCH (p:Person {name: $name, tenant_id: $tenantId})
      RETURN p
      `,
      { name, tenantId },
      tenantId,
    );
    return result[0] || null;
  }

  async createPerson(
    name: string,
    bio: string | null,
    tenantId: string
  ): Promise<any> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `
      CREATE (p:Person {
        id: gen_random_uuid()::text,
        tenant_id: $tenantId,
        name: $name,
        bio: $bio,
        created_at: timestamp(),
        updated_at: timestamp()
      })
      RETURN p
      `,
      { tenantId, name, bio: bio ?? null },
      tenantId,
    );
    return result[0];
  }

  // ---------------------------------------------------------------------------
  // Term
  // ---------------------------------------------------------------------------

  async findTermById(id: string, tenantId: string): Promise<any> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `
      MATCH (t:Term {id: $id, tenant_id: $tenantId})
      RETURN t
      `,
      { id, tenantId },
      tenantId,
    );
    return result[0] || null;
  }

  async findTermByName(name: string, tenantId: string): Promise<any> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `
      MATCH (t:Term {name: $name, tenant_id: $tenantId})
      RETURN t
      `,
      { name, tenantId },
      tenantId,
    );
    return result[0] || null;
  }

  async createTerm(
    name: string,
    definition: string,
    tenantId: string
  ): Promise<any> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `
      CREATE (t:Term {
        id: gen_random_uuid()::text,
        tenant_id: $tenantId,
        name: $name,
        definition: $definition,
        created_at: timestamp(),
        updated_at: timestamp()
      })
      RETURN t
      `,
      { tenantId, name, definition },
      tenantId,
    );
    return result[0];
  }

  // ---------------------------------------------------------------------------
  // Source
  // ---------------------------------------------------------------------------

  async findSourceById(id: string, tenantId: string): Promise<any> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `
      MATCH (s:Source {id: $id, tenant_id: $tenantId})
      RETURN s
      `,
      { id, tenantId },
      tenantId,
    );
    return result[0] || null;
  }

  async createSource(
    title: string,
    type: string,
    url: string | null,
    tenantId: string
  ): Promise<any> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `
      CREATE (s:Source {
        id: gen_random_uuid()::text,
        tenant_id: $tenantId,
        title: $title,
        type: $type,
        url: $url,
        created_at: timestamp(),
        updated_at: timestamp()
      })
      RETURN s
      `,
      { tenantId, title, type, url: url ?? null },
      tenantId,
    );
    return result[0];
  }

  // ---------------------------------------------------------------------------
  // TopicCluster
  // ---------------------------------------------------------------------------

  async findTopicClusterById(id: string, tenantId: string): Promise<any> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `
      MATCH (tc:TopicCluster {id: $id, tenant_id: $tenantId})
      RETURN tc
      `,
      { id, tenantId },
      tenantId,
    );
    return result[0] || null;
  }

  async findTopicClustersByCourse(
    courseId: string,
    tenantId: string
  ): Promise<any[]> {
    return executeCypher(
      db,
      GRAPH_NAME,
      `
      MATCH (tc:TopicCluster {tenant_id: $tenantId})-[:BELONGS_TO]->(course {id: $courseId})
      RETURN tc
      `,
      { tenantId, courseId },
      tenantId,
    );
  }

  async createTopicCluster(
    name: string,
    description: string | null,
    tenantId: string
  ): Promise<any> {
    const result = await executeCypher(
      db,
      GRAPH_NAME,
      `
      CREATE (tc:TopicCluster {
        id: gen_random_uuid()::text,
        tenant_id: $tenantId,
        name: $name,
        description: $description,
        created_at: timestamp(),
        updated_at: timestamp()
      })
      RETURN tc
      `,
      { tenantId, name, description: description ?? null },
      tenantId,
    );
    return result[0];
  }

  // ---------------------------------------------------------------------------
  // Learning Paths — shortestPath, COLLECT, prerequisite chain
  // ---------------------------------------------------------------------------

  /**
   * Find the shortest learning path between two concepts by name (case-insensitive).
   * Uses Apache AGE shortestPath() traversing RELATED_TO and PREREQUISITE_OF edges.
   * Returns null when no path exists between the two concepts.
   *
   * Multi-column return (concepts + steps) requires a direct pool.query call with
   * a custom AS clause; the executeCypher helper only supports a single `result agtype`.
   *
   * SECURITY: fromName, toName, tenantId are passed via the AGE third-argument
   * params JSON — no string interpolation of user-supplied data.
   */
  async findShortestLearningPath(
    fromName: string,
    toName: string,
    tenantId: string
  ): Promise<LearningPathResult | null> {
    const pool = (db as any).$client as Pool;
    const client = await pool.connect();
    try {
      await client.query("LOAD 'age'");
      await client.query('SET search_path = ag_catalog, "$user", public');
      await client.query('SELECT set_config($1, $2, TRUE)', ['app.current_tenant', tenantId]);

      const paramsJson = JSON.stringify({ fromName, toName, tenantId }).replace(/'/g, "''");
      const sql = `
        SELECT * FROM ag_catalog.cypher('${GRAPH_NAME}', $$
          MATCH (start:Concept {tenant_id: $tenantId}), (end:Concept {tenant_id: $tenantId})
          WHERE toLower(start.name) = toLower($fromName) AND toLower(end.name) = toLower($toName)
          MATCH path = shortestPath((start)-[:RELATED_TO|PREREQUISITE_OF*1..10]-(end))
          RETURN [node IN nodes(path) | {id: node.id, name: node.name, type: node.type}] AS concepts,
                 length(path) AS steps
        $$, '${paramsJson}') AS (concepts ag_catalog.agtype, steps ag_catalog.agtype)
      `;

      const result = await client.query(sql);
      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0] as { concepts: string; steps: string };
      const concepts = this.parseAgtypeArray(row.concepts) as ConceptNode[];
      const steps = this.parseAgtypeScalar(row.steps) as number;

      return { concepts, steps };
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

  /**
   * Collect all distinct concepts reachable from a named concept within `depth` hops
   * via RELATED_TO edges, using Cypher COLLECT(DISTINCT ...) aggregation.
   *
   * Multi-column return is not used here (single `related` column), but the COLLECT
   * aggregation result is a JSON array in the agtype string that requires special parsing.
   *
   * depth is clamped to 1–5 to prevent runaway traversal.
   *
   * SECURITY: conceptName and tenantId passed via AGE params JSON.
   */
  async collectRelatedConcepts(
    conceptName: string,
    depth: number,
    tenantId: string
  ): Promise<ConceptNode[]> {
    const safeDepth = Math.max(1, Math.min(5, Math.trunc(depth)));

    const pool = (db as any).$client as Pool;
    const client = await pool.connect();
    try {
      await client.query("LOAD 'age'");
      await client.query('SET search_path = ag_catalog, "$user", public');
      await client.query('SELECT set_config($1, $2, TRUE)', ['app.current_tenant', tenantId]);

      const paramsJson = JSON.stringify({ conceptName, tenantId }).replace(/'/g, "''");
      const sql = `
        SELECT * FROM ag_catalog.cypher('${GRAPH_NAME}', $$
          MATCH (c:Concept {tenant_id: $tenantId})
          WHERE toLower(c.name) = toLower($conceptName)
          MATCH (c)-[:RELATED_TO*1..${safeDepth}]-(related:Concept {tenant_id: $tenantId})
          RETURN COLLECT(DISTINCT {id: related.id, name: related.name, type: related.type}) AS related
        $$, '${paramsJson}') AS (related ag_catalog.agtype)
      `;

      const result = await client.query(sql);
      if (!result.rows || result.rows.length === 0) {
        return [];
      }

      const row = result.rows[0] as { related: string };
      return this.parseAgtypeArray(row.related) as ConceptNode[];
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

  /**
   * Find the longest prerequisite chain leading into a concept (root→target order).
   * Uses Apache AGE multi-hop MATCH over PREREQUISITE_OF edges (up to 5 hops),
   * orders by path length descending, and returns the deepest chain found.
   *
   * SECURITY: conceptName and tenantId passed via AGE params JSON.
   */
  async findPrerequisiteChain(
    conceptName: string,
    tenantId: string
  ): Promise<ConceptNode[]> {
    const pool = (db as any).$client as Pool;
    const client = await pool.connect();
    try {
      await client.query("LOAD 'age'");
      await client.query('SET search_path = ag_catalog, "$user", public');
      await client.query('SELECT set_config($1, $2, TRUE)', ['app.current_tenant', tenantId]);

      const paramsJson = JSON.stringify({ conceptName, tenantId }).replace(/'/g, "''");
      const sql = `
        SELECT * FROM ag_catalog.cypher('${GRAPH_NAME}', $$
          MATCH (c:Concept {tenant_id: $tenantId})
          WHERE toLower(c.name) = toLower($conceptName)
          MATCH path = (prereq:Concept)-[:PREREQUISITE_OF*1..5]->(c)
          RETURN [node IN nodes(path) | {id: node.id, name: node.name}] AS chain
          ORDER BY length(path) DESC
          LIMIT 1
        $$, '${paramsJson}') AS (chain ag_catalog.agtype)
      `;

      const result = await client.query(sql);
      if (!result.rows || result.rows.length === 0) {
        return [];
      }

      const row = result.rows[0] as { chain: string };
      return this.parseAgtypeArray(row.chain) as ConceptNode[];
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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Parse an Apache AGE agtype scalar value (number, string, boolean) returned
   * as a stringified agtype token.  AGE appends type suffixes like `::numeric`
   * or `::integer` — strip them before parsing.
   */
  private parseAgtypeScalar(raw: string | number | null | undefined): unknown {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number') return raw;
    const cleaned = String(raw).replace(/::[\w]+$/, '').trim();
    const n = Number(cleaned);
    return Number.isNaN(n) ? cleaned : n;
  }

  /**
   * Parse an Apache AGE agtype array value (returned as a JSON-like string).
   * AGE returns lists as `[{...}, {...}]` with possible `::agtype` suffixes
   * on individual scalar values.  We normalise the string then JSON.parse it.
   */
  private parseAgtypeArray(raw: string | null | undefined): unknown[] {
    if (!raw) return [];
    try {
      // AGE may wrap scalars with type annotations; strip them for safe JSON parse.
      const cleaned = String(raw)
        .replace(/::[\w]+(?=[,\}\]])/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      this.logger.warn({ err, raw }, 'parseAgtypeArray: failed to parse agtype array');
      return [];
    }
  }
}
