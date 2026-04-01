/**
 * TopicClusterKMeansService — K-means++ topic clustering orchestrator.
 *
 * Coordinates data fetching, concept name resolution, k-means execution
 * (delegated to KMeansAlgorithmService), cluster persistence, and NATS events.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  closeAllPools,
  db,
  executeCypher,
} from '@edusphere/db';
import { CypherTopicClusterService } from './cypher-topic-cluster.service';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { graphConfig } from '@edusphere/config';
import {
  KMeansAlgorithmService,
  type ConceptWithEmbedding,
} from './kmeans-algorithm.service';

const GRAPH_NAME = graphConfig.graphName;

type ConceptEmbeddingRow = {
  concept_id: string;
  embedding: number[] | string;
};

@Injectable()
export class TopicClusterKMeansService implements OnModuleDestroy {
  private readonly logger = new Logger(TopicClusterKMeansService.name);
  private readonly localDb = createDatabaseConnection();
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;

  constructor(
    private readonly topicClusterService: CypherTopicClusterService,
    private readonly algorithm: KMeansAlgorithmService
  ) {}

  async onModuleDestroy(): Promise<void> {
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    await closeAllPools();
  }

  private async getNats(): Promise<NatsConnection> {
    if (!this.nc) this.nc = await connect(buildNatsOptions());
    return this.nc;
  }

  /** Delegated math helpers — preserved for backward compatibility with tests. */
  cosineSimilarity(a: number[], b: number[]): number {
    return this.algorithm.cosineSimilarity(a, b);
  }

  cosineDistance(a: number[], b: number[]): number {
    return this.algorithm.cosineDistance(a, b);
  }

  meanVector(vectors: number[][]): number[] {
    return this.algorithm.meanVector(vectors);
  }

  initCentroidsKMeansPlusPlus(points: number[][], k: number): number[][] {
    return this.algorithm.initCentroidsKMeansPlusPlus(points, k);
  }

  runKMeans(concepts: ConceptWithEmbedding[], k: number) {
    return this.algorithm.runKMeans(concepts, k);
  }

  // -- Data fetching ----------------------------------------------------------

  private async fetchEmbeddingRows(
    tenantId: string
  ): Promise<ConceptEmbeddingRow[]> {
    const rows = await this.localDb
      .select({
        concept_id: schema.concept_embeddings.concept_id,
        embedding: schema.concept_embeddings.embedding,
      })
      .from(schema.concept_embeddings)
      .catch((err: unknown) => {
        this.logger.error(
          `[TopicClusterKMeans] Failed to fetch embeddings: ${String(err)}`,
          { tenantId }
        );
        return [] as { concept_id: string; embedding: number[] }[];
      });

    return rows as ConceptEmbeddingRow[];
  }

  private async resolveConceptNames(
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
        `[TopicClusterKMeans] AGE concept name lookup failed: ${String(err)}`,
        { tenantId }
      );
    }
    return nameMap;
  }

  private async filterConceptsByCourse(
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

  // -- Public API -------------------------------------------------------------

  async clusterConceptsByCourse(
    courseId: string,
    k: number,
    tenantId: string
  ): Promise<unknown[]> {
    const embeddingRows = await this.fetchEmbeddingRows(tenantId);
    if (embeddingRows.length === 0) {
      this.logger.warn(
        `[TopicClusterKMeans] No concept embeddings for tenant ${tenantId}`
      );
      return [];
    }

    const allIds = embeddingRows.map((r) => r.concept_id);
    const courseConceptIds = await this.filterConceptsByCourse(
      allIds,
      courseId,
      tenantId
    );
    const courseSet = new Set(courseConceptIds);
    const filteredRows = embeddingRows.filter((r) =>
      courseSet.has(r.concept_id)
    );

    if (filteredRows.length === 0) {
      this.logger.warn(
        `[TopicClusterKMeans] No concepts for course ${courseId}, tenant ${tenantId}`
      );
      return [];
    }

    const nameMap = await this.resolveConceptNames(
      filteredRows.map((r) => r.concept_id),
      tenantId
    );

    const concepts: ConceptWithEmbedding[] = filteredRows
      .map((row) => ({
        id: row.concept_id,
        name: nameMap.get(row.concept_id) ?? row.concept_id,
        embedding: Array.isArray(row.embedding)
          ? (row.embedding as number[])
          : (JSON.parse(String(row.embedding ?? '[]')) as number[]),
      }))
      .filter((c) => c.embedding.length > 0);

    if (concepts.length === 0) {
      this.logger.warn(
        `[TopicClusterKMeans] All embeddings were empty for course ${courseId}`
      );
      return [];
    }

    const clusters = this.algorithm.runKMeans(concepts, k);

    const created: unknown[] = [];
    for (const cluster of clusters) {
      try {
        const topicCluster = await this.topicClusterService.createTopicCluster(
          cluster.label,
          `Auto-generated by k-means++ (${cluster.conceptIds.length} concepts)`,
          tenantId
        );
        created.push(topicCluster);
      } catch (err) {
        this.logger.error(
          `[TopicClusterKMeans] Failed to persist cluster "${cluster.label}": ${String(err)}`,
          { tenantId, courseId }
        );
      }
    }

    try {
      const nc = await this.getNats();
      nc.publish(
        'knowledge.topics.clustered',
        this.sc.encode(
          JSON.stringify({ courseId, clusterCount: clusters.length, tenantId })
        )
      );
    } catch (err) {
      this.logger.warn(
        `[TopicClusterKMeans] NATS publish failed: ${String(err)}`,
        { tenantId, courseId }
      );
    }

    this.logger.log(
      `[TopicClusterKMeans] Course ${courseId}: ${clusters.length} clusters from ${concepts.length} concepts`,
      { tenantId }
    );
    return created;
  }
}
