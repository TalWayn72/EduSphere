import type { DrizzleDB } from './client';
import { executeCypher } from './client';

const GRAPH_NAME = 'edusphere_graph';

/**
 * Initialize Apache AGE graph ontology
 */
export async function initializeGraphOntology(db: DrizzleDB): Promise<void> {
  console.log('Initializing Apache AGE graph ontology...');

  // Create sample Concept vertex
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

  // Create sample Person vertex
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

  // Create sample TopicCluster vertex
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

  console.log('Graph ontology initialized successfully');
  console.log('Vertex labels: Concept, Person, Term, Source, TopicCluster');
  console.log(
    'Edge labels: RELATED_TO, CONTRADICTS, PREREQUISITE_OF, MENTIONS, CITES, AUTHORED_BY, INFERRED_RELATED, REFERS_TO, DERIVED_FROM, BELONGS_TO'
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
 * Find related concepts (2-hop traversal)
 */
export async function findRelatedConcepts(
  db: DrizzleDB,
  conceptId: string,
  tenantId: string,
  maxDepth: number = 2,
  limit: number = 10
): Promise<any[]> {
  return executeCypher(
    db,
    GRAPH_NAME,
    `
    MATCH (c:Concept {id: '${conceptId}'})-[r:RELATED_TO*1..${maxDepth}]-(related:Concept)
    WHERE related.tenant_id = '${tenantId}'
    RETURN related.name, related.definition, r[0].strength
    ORDER BY r[0].strength DESC
    LIMIT ${limit}
  `
  );
}

/**
 * Find contradictions
 */
export async function findContradictions(
  db: DrizzleDB,
  conceptId: string
): Promise<any[]> {
  return executeCypher(
    db,
    GRAPH_NAME,
    `
    MATCH (c:Concept {id: '${conceptId}'})-[r:CONTRADICTS]-(contra:Concept)
    RETURN contra.name, r.description, r.source_id
  `
  );
}

/**
 * Find learning path (prerequisite chain)
 */
export async function findLearningPath(
  db: DrizzleDB,
  conceptId: string
): Promise<any[]> {
  return executeCypher(
    db,
    GRAPH_NAME,
    `
    MATCH path = (start:Concept {id: '${conceptId}'})<-[:PREREQUISITE_OF*1..5]-(prereq:Concept)
    RETURN path
    ORDER BY length(path) ASC
  `
  );
}

/**
 * Create relationship between concepts
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
    MATCH (a:Concept {id: '${fromConceptId}'})
    MATCH (b:Concept {id: '${toConceptId}'})
    CREATE (a)-[r:${relationshipType} ${propsJson}]->(b)
    RETURN r
  `
  );
}
