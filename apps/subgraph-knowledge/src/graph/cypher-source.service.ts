/**
 * CypherSourceService — Apache AGE Cypher queries for the Source vertex domain.
 * All user-supplied values are passed via AGE parameterized queries.
 */
import { Injectable } from '@nestjs/common';
import { db, executeCypher } from '@edusphere/db';
import { graphConfig } from '@edusphere/config';

const GRAPH_NAME = graphConfig.graphName;

@Injectable()
export class CypherSourceService {
  async findSourceById(id: string, tenantId: string): Promise<unknown> {
    const result = await executeCypher(
      db, GRAPH_NAME,
      `MATCH (s:Source {id: $id, tenant_id: $tenantId}) RETURN s`,
      { id, tenantId }, tenantId,
    );
    return result[0] || null;
  }

  async createSource(
    title: string, type: string, url: string | null, tenantId: string
  ): Promise<unknown> {
    const result = await executeCypher(
      db, GRAPH_NAME,
      `CREATE (s:Source {
        id: gen_random_uuid()::text,
        tenant_id: $tenantId,
        title: $title,
        type: $type,
        url: $url,
        created_at: timestamp(),
        updated_at: timestamp()
      }) RETURN s`,
      { tenantId, title, type, url: url ?? null }, tenantId,
    );
    return result[0];
  }
}
