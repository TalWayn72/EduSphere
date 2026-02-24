/**
 * CypherTopicClusterService — Apache AGE Cypher queries for the TopicCluster vertex domain.
 * All user-supplied values are passed via AGE parameterized queries.
 */
import { Injectable } from '@nestjs/common';
import { db, executeCypher } from '@edusphere/db';
import { graphConfig } from '@edusphere/config';

const GRAPH_NAME = graphConfig.graphName;

@Injectable()
export class CypherTopicClusterService {
  async findTopicClusterById(id: string, tenantId: string): Promise<unknown> {
    const result = await executeCypher(
      db, GRAPH_NAME,
      `MATCH (tc:TopicCluster {id: $id, tenant_id: $tenantId}) RETURN tc`,
      { id, tenantId }, tenantId,
    );
    return result[0] || null;
  }

  async findTopicClustersByCourse(courseId: string, tenantId: string): Promise<unknown[]> {
    return executeCypher(
      db, GRAPH_NAME,
      `MATCH (tc:TopicCluster {tenant_id: $tenantId})-[:BELONGS_TO]->(course {id: $courseId})
       RETURN tc`,
      { tenantId, courseId }, tenantId,
    );
  }

  async createTopicCluster(
    name: string, description: string | null, tenantId: string
  ): Promise<unknown> {
    const result = await executeCypher(
      db, GRAPH_NAME,
      `CREATE (tc:TopicCluster {
        id: gen_random_uuid()::text,
        tenant_id: $tenantId,
        name: $name,
        description: $description,
        created_at: timestamp(),
        updated_at: timestamp()
      }) RETURN tc`,
      { tenantId, name, description: description ?? null }, tenantId,
    );
    return result[0];
  }
}
