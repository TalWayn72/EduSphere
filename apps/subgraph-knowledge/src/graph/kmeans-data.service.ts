/**
 * KMeansDataService — data access layer for K-means++ topic clustering.
 * Handles: concept embedding fetch, concept name resolution, and course filtering.
 * Pure I/O service — no clustering math (see kmeans-math.ts).
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  closeAllPools,
  db,
  executeCypher,
} from '@edusphere/db';
import { graphConfig } from '@edusphere/config';
import type { ConceptWithEmbedding } from './kmeans-math';

const GRAPH_NAME = graphConfig.graphName;

type ConceptEmbeddingRow = {
  concept_id: string;
  embedding: number[] | string;
};

@Injectable()
export class KMeansDataService implements OnModuleDestroy {
  private readonly logger = new Logger(KMeansDataService.name);
  private readonly localDb = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /**
   * Fetch all concept embeddings for the tenant from PostgreSQL.
   */
  async fetchEmbeddingRows(tenantId: string): Promise<ConceptEmbeddingRow[]> {
    const rows = await this.localDb
      .select({
        concept_id: schema.concept_embeddings.concept_id,
        embedding: schema.concept_embeddings.embedding,
      })
      .from(schema.concept_embeddings)
      .catch((err: unknown) => {
        this.logger.error(
          `[KMeansData] Failed to fetch embeddings: ${String(err)}`,
          { tenantId }
        );
        return [] as { concept_id: string; embedding: number[] }[];
      });
    return rows as ConceptEmbeddingRow[];
  }

  /**
   * Resolve concept names from Apache AGE for a list of concept_ids.
   * Returns a Map<conceptId, name>.
   */
  async resolveConceptNames(
    conceptIds: string[],
    tenantId: string
  ): Promise<Map<string, string>> {
    if (conceptIds.length === 0) return new Map();
    const nameMap = new Map<string, string>();
    try {
      const idList = conceptIds.map((id) => `'${id}'`).join(', ');
      const results = (await executeCypher(
        db,
        GRAPH_NAME,
        `UNWIND [$idList] AS cid
         MATCH (c:Concept {id: cid, tenant_id: $tenantId})
         RETURN c.id AS id, c.name AS name`,
        { idList, tenantId },
        tenantId
      )) as Array<{ id?: string; name?: string }>;
      for (const row of results) {
        if (row.id && row.name) {
          nameMap.set(String(row.id), String(row.name));
        }
      }
    } catch (err) {
      this.logger.warn(
        `[KMeansData] AGE concept name lookup failed: ${String(err)}`,
        { tenantId }
      );
    }
    return nameMap;
  }

  /**
   * Filter concept IDs to those belonging to a specific course via AGE graph.
   * Falls back to all IDs if no graph edges exist yet.
   */
  async filterConceptsByCourse(
    conceptIds: string[],
    courseId: string,
    tenantId: string
  ): Promise<string[]> {
    if (conceptIds.length === 0) return [];
    try {
      const results = (await executeCypher(
        db,
        GRAPH_NAME,
        `MATCH (c:Concept {tenant_id: $tenantId})-[:BELONGS_TO]->(course {id: $courseId})
         WHERE c.id IN [$conceptIds]
         RETURN c.id AS id`,
        { tenantId, courseId, conceptIds: conceptIds.join(',') },
        tenantId
      )) as Array<{ id?: string }>;
      const filtered = results
        .map((r) => r.id)
        .filter((id): id is string => typeof id === 'string');
      return filtered.length > 0 ? filtered : conceptIds;
    } catch {
      return conceptIds;
    }
  }

  /**
   * Build ConceptWithEmbedding array from raw DB rows and resolved names.
   */
  buildConceptsWithEmbeddings(
    rows: ConceptEmbeddingRow[],
    nameMap: Map<string, string>
  ): ConceptWithEmbedding[] {
    return rows
      .map((row) => ({
        id: row.concept_id,
        name: nameMap.get(row.concept_id) ?? row.concept_id,
        embedding: Array.isArray(row.embedding)
          ? (row.embedding as number[])
          : (JSON.parse(String(row.embedding ?? '[]')) as number[]),
      }))
      .filter((c) => c.embedding.length > 0);
  }
}
