/**
 * CypherTermService — Apache AGE Cypher queries for the Term vertex domain.
 * All user-supplied values are passed via AGE parameterized queries.
 */
import { Injectable } from '@nestjs/common';
import { db, executeCypher } from '@edusphere/db';
import { graphConfig } from '@edusphere/config';

const GRAPH_NAME = graphConfig.graphName;

@Injectable()
export class CypherTermService {
  async findTermById(id: string, tenantId: string): Promise<unknown> {
    const result = await executeCypher(
      db, GRAPH_NAME,
      `MATCH (t:Term {id: $id, tenant_id: $tenantId}) RETURN t`,
      { id, tenantId }, tenantId,
    );
    return result[0] || null;
  }

  async findTermByName(name: string, tenantId: string): Promise<unknown> {
    const result = await executeCypher(
      db, GRAPH_NAME,
      `MATCH (t:Term {name: $name, tenant_id: $tenantId}) RETURN t`,
      { name, tenantId }, tenantId,
    );
    return result[0] || null;
  }

  async createTerm(name: string, definition: string, tenantId: string): Promise<unknown> {
    const result = await executeCypher(
      db, GRAPH_NAME,
      `CREATE (t:Term {
        id: gen_random_uuid()::text,
        tenant_id: $tenantId,
        name: $name,
        definition: $definition,
        created_at: timestamp(),
        updated_at: timestamp()
      }) RETURN t`,
      { tenantId, name, definition }, tenantId,
    );
    return result[0];
  }
}
