import { randomUUID } from 'node:crypto';
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

  await executeCypher(
    db,
    GRAPH_NAME,
    `
    CREATE (t:Term {
      id: gen_random_uuid()::text,
      tenant_id: 'default',
      name: 'Sample Term',
      definition: 'Test term for graph initialization',
      language: 'en',
      created_at: timestamp(),
      updated_at: timestamp()
    })
    RETURN t
  `
  );

  await executeCypher(
    db,
    GRAPH_NAME,
    `
    CREATE (s:Source {
      id: gen_random_uuid()::text,
      tenant_id: 'default',
      name: 'Sample Source',
      url: 'https://example.com/sample-source',
      source_type: 'document',
      created_at: timestamp(),
      updated_at: timestamp()
    })
    RETURN s
  `
  );

  await executeCypher(
    db,
    GRAPH_NAME,
    `
    CREATE (d:Domain {
      id: gen_random_uuid()::text,
      tenant_id: 'default',
      name: 'Sample Domain',
      description: 'Test subject area domain for graph initialization',
      language: 'he',
      created_at: timestamp(),
      updated_at: timestamp()
    })
    RETURN d
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
  const conceptId = props.id || randomUUID();
  const propsJson = JSON.stringify({
    ...props,
    id: conceptId,
    source_ids: JSON.stringify(props.source_ids || []),
    created_at: Date.now(),
    updated_at: Date.now(),
  });

  await executeCypher(
    db,
    GRAPH_NAME,
    `
    CREATE (c:Concept ${propsJson})
    RETURN c.id::text
  `
  );

  return conceptId;
}

/** Shape returned by findRelatedConcepts Cypher query. */
export interface RelatedConceptResult {
  name: string;
  definition: string;
  strength?: number;
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
): Promise<RelatedConceptResult[]> {
  // maxDepth and limit are internal integers, not user-facing strings — clamped for safety.
  const safeDepth = Math.max(1, Math.min(10, Math.trunc(maxDepth)));
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  return executeCypher<RelatedConceptResult>(
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

/** Shape returned by findContradictions Cypher query. */
export interface ContradictionResult {
  name: string;
  description?: string;
  source_id?: string;
}

/**
 * Find contradictions for a concept — conceptId parameterized.
 */
export async function findContradictions(
  db: DrizzleDB,
  conceptId: string
): Promise<ContradictionResult[]> {
  return executeCypher<ContradictionResult>(
    db,
    GRAPH_NAME,
    `
    MATCH (c:Concept {id: $conceptId})-[r:CONTRADICTS]-(contra:Concept)
    RETURN contra.name, r.description, r.source_id
  `,
    { conceptId }
  );
}

/** Shape returned by findLearningPath Cypher query. */
export interface LearningPathResult {
  path: Record<string, unknown>;
}

/**
 * Find learning path (prerequisite chain) — conceptId parameterized.
 */
export async function findLearningPath(
  db: DrizzleDB,
  conceptId: string
): Promise<LearningPathResult[]> {
  return executeCypher<LearningPathResult>(
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
 * Create Domain vertex in the knowledge graph.
 */
export interface DomainProperties {
  id?: string;
  tenant_id: string;
  name: string;
  description?: string;
  language?: string;
  parent_domain_id?: string;
}

export async function createDomain(
  db: DrizzleDB,
  props: DomainProperties
): Promise<string> {
  const domainId = props.id || randomUUID();
  const propsJson = JSON.stringify({
    ...props,
    id: domainId,
    language: props.language ?? 'he',
    parent_domain_id: props.parent_domain_id ?? '',
    created_at: Date.now(),
    updated_at: Date.now(),
  });

  await executeCypher(
    db,
    GRAPH_NAME,
    `
    CREATE (d:Domain ${propsJson})
    RETURN d.id::text
  `
  );

  return domainId;
}

/**
 * Allowed relationship types in the EduSphere knowledge graph.
 * Used as Cypher edge labels — must match the AGE graph schema.
 */
export type ConceptRelationshipType =
  | 'RELATED_TO'
  | 'RELATES_TO'
  | 'PREREQUISITE_OF'
  | 'CONTRADICTS'
  | 'DERIVED_FROM'
  | 'PART_OF'
  | 'AUTHORED_BY'
  | 'RELATED_DOMAIN'
  | 'BELONGS_TO_DOMAIN';

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
  relationshipType: ConceptRelationshipType,
  properties: RelationshipProperties = {}
): Promise<void> {
  const propsJson = JSON.stringify({
    ...properties,
    created_at: Date.now(),
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
export interface SourceNodeProperties {
  id: string;
  tenant_id: string;
  name: string;
  source_type: string;
  origin?: string;
  course_id?: string;
  chunk_count?: number;
}

/** Create or update a Source vertex in the knowledge graph (idempotent MERGE). */
export async function createSourceNode(
  db: DrizzleDB,
  props: SourceNodeProperties
): Promise<void> {
  const now = Date.now();
  const propsJson = JSON.stringify({
    id: props.id,
    tenant_id: props.tenant_id,
    name: props.name,
    source_type: props.source_type,
    origin: props.origin ?? '',
    course_id: props.course_id ?? '',
    chunk_count: props.chunk_count ?? 0,
    updated_at: now,
  });

  await executeCypher(
    db,
    GRAPH_NAME,
    `
    MERGE (s:Source {id: $id})
    ON CREATE SET s += ${propsJson}, s.created_at = ${now}
    ON MATCH SET s += ${propsJson}
    RETURN s.id::text
  `,
    { id: props.id }
  );
}
