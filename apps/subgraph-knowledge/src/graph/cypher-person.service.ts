/**
 * CypherPersonService — Apache AGE Cypher queries for the Person vertex domain.
 * All user-supplied values are passed via AGE parameterized queries.
 */
import { Injectable } from '@nestjs/common';
import { db, executeCypher } from '@edusphere/db';
import { graphConfig } from '@edusphere/config';

const GRAPH_NAME = graphConfig.graphName;

@Injectable()
export class CypherPersonService {
  async findPersonById(id: string, tenantId: string): Promise<unknown> {
    const result = await executeCypher(
      db, GRAPH_NAME,
      `MATCH (p:Person {id: $id, tenant_id: $tenantId}) RETURN p`,
      { id, tenantId }, tenantId,
    );
    return result[0] || null;
  }

  async findPersonByName(name: string, tenantId: string): Promise<unknown> {
    const result = await executeCypher(
      db, GRAPH_NAME,
      `MATCH (p:Person {name: $name, tenant_id: $tenantId}) RETURN p`,
      { name, tenantId }, tenantId,
    );
    return result[0] || null;
  }

  async createPerson(name: string, bio: string | null, tenantId: string): Promise<unknown> {
    const result = await executeCypher(
      db, GRAPH_NAME,
      `CREATE (p:Person {
        id: gen_random_uuid()::text,
        tenant_id: $tenantId,
        name: $name,
        bio: $bio,
        created_at: timestamp(),
        updated_at: timestamp()
      }) RETURN p`,
      { tenantId, name, bio: bio ?? null }, tenantId,
    );
    return result[0];
  }
}
