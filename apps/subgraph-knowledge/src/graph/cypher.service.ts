import { Injectable, Logger } from '@nestjs/common';
import { db, executeCypher, createConcept, findRelatedConcepts, createRelationship } from '@edusphere/db';
import type { ConceptProperties, RelationshipProperties } from '@edusphere/db';

const GRAPH_NAME = 'edusphere_graph';

@Injectable()
export class CypherService {
  private readonly logger = new Logger(CypherService.name);

  async findConceptById(id: string, tenantId: string): Promise<any> {
    const result = await executeCypher(db, GRAPH_NAME, `
      MATCH (c:Concept {id: '${id}', tenant_id: '${tenantId}'})
      RETURN c
    `);
    return result[0] || null;
  }

  async findConceptByName(name: string, tenantId: string): Promise<any> {
    const result = await executeCypher(db, GRAPH_NAME, `
      MATCH (c:Concept {name: '${name}', tenant_id: '${tenantId}'})
      RETURN c
    `);
    return result[0] || null;
  }

  async findAllConcepts(tenantId: string, limit: number): Promise<any[]> {
    return executeCypher(db, GRAPH_NAME, `
      MATCH (c:Concept {tenant_id: '${tenantId}'})
      RETURN c
      LIMIT ${limit}
    `);
  }

  async createConcept(props: ConceptProperties): Promise<string> {
    return createConcept(db, props);
  }

  async updateConcept(id: string, tenantId: string, updates: Partial<ConceptProperties>): Promise<any> {
    const setParts = Object.entries(updates)
      .map(([key, value]) => `c.${key} = '${value}'`)
      .join(', ');
    
    const result = await executeCypher(db, GRAPH_NAME, `
      MATCH (c:Concept {id: '${id}', tenant_id: '${tenantId}'})
      SET ${setParts}, c.updated_at = timestamp()
      RETURN c
    `);
    return result[0] || null;
  }

  async deleteConcept(id: string, tenantId: string): Promise<boolean> {
    try {
      await executeCypher(db, GRAPH_NAME, `
        MATCH (c:Concept {id: '${id}', tenant_id: '${tenantId}'})
        DETACH DELETE c
      `);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete concept ${id}:`, error);
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

  async findPersonById(id: string, tenantId: string): Promise<any> {
    const result = await executeCypher(db, GRAPH_NAME, `
      MATCH (p:Person {id: '${id}', tenant_id: '${tenantId}'})
      RETURN p
    `);
    return result[0] || null;
  }

  async findPersonByName(name: string, tenantId: string): Promise<any> {
    const result = await executeCypher(db, GRAPH_NAME, `
      MATCH (p:Person {name: '${name}', tenant_id: '${tenantId}'})
      RETURN p
    `);
    return result[0] || null;
  }

  async createPerson(name: string, bio: string | null, tenantId: string): Promise<any> {
    const result = await executeCypher(db, GRAPH_NAME, `
      CREATE (p:Person {
        id: gen_random_uuid()::text,
        tenant_id: '${tenantId}',
        name: '${name}',
        bio: ${bio ? `'${bio}'` : 'null'},
        created_at: timestamp(),
        updated_at: timestamp()
      })
      RETURN p
    `);
    return result[0];
  }

  async findTermById(id: string, tenantId: string): Promise<any> {
    const result = await executeCypher(db, GRAPH_NAME, `
      MATCH (t:Term {id: '${id}', tenant_id: '${tenantId}'})
      RETURN t
    `);
    return result[0] || null;
  }

  async findTermByName(name: string, tenantId: string): Promise<any> {
    const result = await executeCypher(db, GRAPH_NAME, `
      MATCH (t:Term {name: '${name}', tenant_id: '${tenantId}'})
      RETURN t
    `);
    return result[0] || null;
  }

  async createTerm(name: string, definition: string, tenantId: string): Promise<any> {
    const result = await executeCypher(db, GRAPH_NAME, `
      CREATE (t:Term {
        id: gen_random_uuid()::text,
        tenant_id: '${tenantId}',
        name: '${name}',
        definition: '${definition}',
        created_at: timestamp(),
        updated_at: timestamp()
      })
      RETURN t
    `);
    return result[0];
  }

  async findSourceById(id: string, tenantId: string): Promise<any> {
    const result = await executeCypher(db, GRAPH_NAME, `
      MATCH (s:Source {id: '${id}', tenant_id: '${tenantId}'})
      RETURN s
    `);
    return result[0] || null;
  }

  async createSource(title: string, type: string, url: string | null, tenantId: string): Promise<any> {
    const result = await executeCypher(db, GRAPH_NAME, `
      CREATE (s:Source {
        id: gen_random_uuid()::text,
        tenant_id: '${tenantId}',
        title: '${title}',
        type: '${type}',
        url: ${url ? `'${url}'` : 'null'},
        created_at: timestamp(),
        updated_at: timestamp()
      })
      RETURN s
    `);
    return result[0];
  }

  async findTopicClusterById(id: string, tenantId: string): Promise<any> {
    const result = await executeCypher(db, GRAPH_NAME, `
      MATCH (tc:TopicCluster {id: '${id}', tenant_id: '${tenantId}'})
      RETURN tc
    `);
    return result[0] || null;
  }

  async findTopicClustersByCourse(courseId: string, tenantId: string): Promise<any[]> {
    return executeCypher(db, GRAPH_NAME, `
      MATCH (tc:TopicCluster {tenant_id: '${tenantId}'})-[:BELONGS_TO]->(course {id: '${courseId}'})
      RETURN tc
    `);
  }

  async createTopicCluster(name: string, description: string | null, tenantId: string): Promise<any> {
    const result = await executeCypher(db, GRAPH_NAME, `
      CREATE (tc:TopicCluster {
        id: gen_random_uuid()::text,
        tenant_id: '${tenantId}',
        name: '${name}',
        description: ${description ? `'${description}'` : 'null'},
        created_at: timestamp(),
        updated_at: timestamp()
      })
      RETURN tc
    `);
    return result[0];
  }
}
