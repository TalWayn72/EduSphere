/**
 * CypherService — Apache AGE graph query helpers.
 *
 * EXCEPTION NOTE (150-line rule): This service intentionally exceeds the 150-line
 * limit per CLAUDE.md § "Apache AGE graph query helpers with multiple Cypher patterns".
 * It covers 5 vertex domains (Concept, Person, Term, Source, TopicCluster) each
 * requiring find/create Cypher patterns that cannot be easily shared due to differing
 * vertex labels and property schemas.
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
      { id, tenantId }
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
      { name, tenantId }
    );
    return result[0] || null;
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
      { tenantId }
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
      { id, tenantId, ...safeUpdates }
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
        { id, tenantId }
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
      { id, tenantId }
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
      { name, tenantId }
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
      { tenantId, name, bio: bio ?? null }
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
      { id, tenantId }
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
      { name, tenantId }
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
      { tenantId, name, definition }
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
      { id, tenantId }
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
      { tenantId, title, type, url: url ?? null }
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
      { id, tenantId }
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
      { tenantId, courseId }
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
      { tenantId, name, description: description ?? null }
    );
    return result[0];
  }
}
