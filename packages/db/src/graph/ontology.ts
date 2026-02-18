import type { DrizzleDB } from './client';
import { executeCypher } from './client';

const GRAPH_NAME = 'edusphere_graph';

/**
 * Initialize Apache AGE graph ontology
 */
export async function initializeGraphOntology(db: DrizzleDB): Promise<void> {
  // Static seed data — no user input involved, no parameterization needed.
  await executeCypher(
    db,
    GRAPH_NAME,
    `
    CREATE (c:Concept {
      id: gen_random_uuid()::text,
      tenant_id: 'default',
      name: 'Sample Concept',
      definition: 'This is a test concept for graph initialization',
      source_ids: '[]',
      created_at: timestamp(),
      updated_at: timestamp()
    })
    RETURN c
  `
  );

  await executeCypher(
    db,
    GRAPH_NAME,
    `
    CREATE (p:Person {
      id: gen_random_uuid()::text,
      tenant_id: 'default',
      name: 'Sample Author',
      bio: 'Test author for graph initialization',
      created_at: timestamp(),
      updated_at: timestamp()
    })
    RETURN p
  `
  );

  await executeCypher(
    db,
    GRAPH_NAME,
    `
    CREATE (tc:TopicCluster {
      id: gen_random_uuid()::text,
      tenant_id: 'default',
      name: 'Sample Topic',
      description: 'Test topic cluster',
      created_at: timestamp(),
      updated_at: timestamp()
    })
    RETURN tc
  `
  );
}

/**
 * Create Concept vertex
 */
export interface ConceptProperties {
  id?: string;
  tenant_id: string;
  name: string;
  definition: string;
  source_ids?: string[];
}

export async function createConcept(
  db: DrizzleDB,
  props: ConceptProperties
): Promise<string> {
  const propsJson = JSON.stringify({
    ...props,
    id: props.id || 'gen_random_uuid()::text',
    source_ids: JSON.stringify(props.source_ids || []),
    created_at: 'timestamp()',
    updated_at: 'timestamp()',
  });

  const result = await executeCypher<{ id: string }>(
    db,
    GRAPH_NAME,
    `
    CREATE (c:Concept ${propsJson})
    RETURN c.id::text
  `
  );

  return result[0]?.id || '';
}

/**
 * Find related concepts (2-hop traversal) — all user-supplied values parameterized.
 */
export async function findRelatedConcepts(
  db: DrizzleDB,
  conceptId: string,
  tenantId: string,
  maxDepth: number = 2,
  limit: number = 10
): Promise<any[]> {
  // maxDepth and limit are internal integers, not user-facing strings — clamped for safety.
  const safeDepth = Math.max(1, Math.min(10, Math.trunc(maxDepth)));
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  return executeCypher(
    db,
    GRAPH_NAME,
    `
    MATCH (c:Concept {id: $conceptId})-[r:RELATED_TO*1..${safeDepth}]-(related:Concept)
    WHERE related.tenant_id = $tenantId
    RETURN related.name, related.definition, r[0].strength
    ORDER BY r[0].strength DESC
    LIMIT ${safeLimit}
  `,
    { conceptId, tenantId }
  );
}

/**
 * Find contradictions for a concept — conceptId parameterized.
 */
export async function findContradictions(
  db: DrizzleDB,
  conceptId: string
): Promise<any[]> {
  return executeCypher(
    db,
    GRAPH_NAME,
    `
    MATCH (c:Concept {id: $conceptId})-[r:CONTRADICTS]-(contra:Concept)
    RETURN contra.name, r.description, r.source_id
  `,
    { conceptId }
  );
}

/**
 * Find learning path (prerequisite chain) — conceptId parameterized.
 */
export async function findLearningPath(
  db: DrizzleDB,
  conceptId: string
): Promise<any[]> {
  return executeCypher(
    db,
    GRAPH_NAME,
    `
    MATCH path = (start:Concept {id: $conceptId})<-[:PREREQUISITE_OF*1..5]-(prereq:Concept)
    RETURN path
    ORDER BY length(path) ASC
  `,
    { conceptId }
  );
}

/**
 * Create relationship between concepts — all IDs parameterized.
 * relationshipType is an internal enum value, not user input.
 */
export interface RelationshipProperties {
  strength?: number;
  inferred?: boolean;
  description?: string;
}

export async function createRelationship(
  db: DrizzleDB,
  fromConceptId: string,
  toConceptId: string,
  relationshipType: string,
  properties: RelationshipProperties = {}
): Promise<void> {
  const propsJson = JSON.stringify({
    ...properties,
    created_at: 'timestamp()',
  });

  await executeCypher(
    db,
    GRAPH_NAME,
    `
    MATCH (a:Concept {id: $fromConceptId})
    MATCH (b:Concept {id: $toConceptId})
    CREATE (a)-[r:${relationshipType} ${propsJson}]->(b)
    RETURN r
  `,
    { fromConceptId, toConceptId }
  );
}
