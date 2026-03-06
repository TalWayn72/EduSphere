/**
 * TopicClusterKMeansService — K-means++ topic clustering using pgvector concept embeddings.
 *
 * Algorithm:
 *  1. Fetch all concept embeddings for a tenant from concept_embeddings table.
 *  2. Resolve concept names from Apache AGE via a batch Cypher query.
 *  3. Run k-means++ (cosine distance) with up to 100 iterations.
 *  4. Persist each cluster as a TopicCluster vertex in the knowledge graph.
 *  5. Publish a NATS event: knowledge.topics.clustered
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  closeAllPools,
  db,
  executeCypher,
} from '@edusphere/db';
import type { CypherTopicClusterService } from './cypher-topic-cluster.service';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { graphConfig } from '@edusphere/config';

const GRAPH_NAME = graphConfig.graphName;
const MAX_ITERATIONS = 100;

interface ConceptWithEmbedding {
  id: string;
  name: string;
  embedding: number[];
}

interface KMeansCluster {
  centroid: number[];
  conceptIds: string[];
  label: string;
}

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
    private readonly topicClusterService: CypherTopicClusterService
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

  // ── Math helpers ─────────────────────────────────────────────────────────────

  cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      // eslint-disable-next-line security/detect-object-injection -- safe numeric index
      dot += (a[i] ?? 0) * (b[i] ?? 0);
      // eslint-disable-next-line security/detect-object-injection -- safe numeric index
      normA += (a[i] ?? 0) ** 2;
      // eslint-disable-next-line security/detect-object-injection -- safe numeric index
      normB += (b[i] ?? 0) ** 2;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  cosineDistance(a: number[], b: number[]): number {
    return 1 - this.cosineSimilarity(a, b);
  }

  meanVector(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    const dim = vectors[0]?.length ?? 0;
    const sum = new Array<number>(dim).fill(0);
    for (const v of vectors) {
      for (let i = 0; i < dim; i++) {
        // eslint-disable-next-line security/detect-object-injection -- safe numeric index
        sum[i] = (sum[i] ?? 0) + (v[i] ?? 0);
      }
    }
    return sum.map((s) => s / vectors.length);
  }

  // ── k-means++ initialization ─────────────────────────────────────────────────

  initCentroidsKMeansPlusPlus(points: number[][], k: number): number[][] {
    if (points.length === 0) return [];
    const centroids: number[][] = [];
    const firstIdx = Math.floor(Math.random() * points.length);
    // eslint-disable-next-line security/detect-object-injection -- safe numeric index
    centroids.push(points[firstIdx] as number[]);

    while (centroids.length < k) {
      const distances = points.map((p) =>
        Math.min(...centroids.map((c) => this.cosineDistance(p, c) ** 2))
      );
      const total = distances.reduce((a, b) => a + b, 0);
      let rand = Math.random() * total;
      let pushed = false;
      for (let i = 0; i < distances.length; i++) {
        // eslint-disable-next-line security/detect-object-injection -- safe numeric index
        rand -= distances[i] ?? 0;
        if (rand <= 0) {
          // eslint-disable-next-line security/detect-object-injection -- safe numeric index
          centroids.push(points[i] as number[]);
          pushed = true;
          break;
        }
      }
      if (!pushed) {
        centroids.push(points[points.length - 1] as number[]);
      }
    }
    return centroids;
  }

  // ── K-means core ─────────────────────────────────────────────────────────────

  runKMeans(concepts: ConceptWithEmbedding[], k: number): KMeansCluster[] {
    const clampedK = Math.min(k, concepts.length);
    if (clampedK === 0) return [];

    const points = concepts.map((c) => c.embedding);
    let centroids = this.initCentroidsKMeansPlusPlus(points, clampedK);
    let assignments = new Array<number>(concepts.length).fill(-1);

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const newAssignments = points.map((p) => {
        let minDist = Infinity;
        let bestCluster = 0;
        for (let ci = 0; ci < centroids.length; ci++) {
          // eslint-disable-next-line security/detect-object-injection -- safe numeric index
          const d = this.cosineDistance(p, centroids[ci] as number[]);
          if (d < minDist) {
            minDist = d;
            bestCluster = ci;
          }
        }
        return bestCluster;
      });

      // eslint-disable-next-line security/detect-object-injection -- safe numeric index
      const changed = newAssignments.some((a, i) => a !== assignments[i]);
      assignments = newAssignments;
      if (!changed && iter > 0) break;

      for (let ci = 0; ci < clampedK; ci++) {
        // eslint-disable-next-line security/detect-object-injection -- safe numeric index into assignments array
        const clusterPoints = concepts.filter((_, i) => assignments[i] === ci).map((c) => c.embedding);
        if (clusterPoints.length > 0) {
          // eslint-disable-next-line security/detect-object-injection -- safe numeric index into centroids array
          centroids[ci] = this.meanVector(clusterPoints);
        }
      }
    }

    return centroids.map((centroid, ci) => {
      // eslint-disable-next-line security/detect-object-injection -- safe numeric index
      const members = concepts.filter((_, i) => assignments[i] === ci);
      const label = members
        .slice(0, 3)
        .map((c) => c.name)
        .join(', ');
      return {
        centroid,
        conceptIds: members.map((c) => c.id),
        label: label || `Cluster ${ci + 1}`,
      };
    });
  }

  // ── Data fetching ─────────────────────────────────────────────────────────────

  /**
   * Fetch all concept embeddings for the tenant from PostgreSQL.
   * concept_embeddings has no course_id; we fetch all for the tenant and
   * let the caller filter downstream (or pass all for tenant-wide clustering).
   */
  private async fetchEmbeddingRows(
    tenantId: string
  ): Promise<ConceptEmbeddingRow[]> {
    // concept_embeddings has no tenant_id column — RLS is applied via session var
    // We pull all rows; callers may narrow by courseId via AGE concept lookup.
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

  /**
   * Resolve concept names from Apache AGE for a list of concept_ids.
   * Returns a Map<conceptId, name>.
   */
  private async resolveConceptNames(
    conceptIds: string[],
    tenantId: string
  ): Promise<Map<string, string>> {
    if (conceptIds.length === 0) return new Map();
    const nameMap = new Map<string, string>();
    try {
      // AGE supports UNWIND for batch lookups
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

  /**
   * Optionally filter concept IDs to those belonging to a specific course
   * by querying the AGE graph.
   */
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
      // Fall back to all concept IDs if AGE returns nothing (no graph edges yet)
      return filtered.length > 0 ? filtered : conceptIds;
    } catch {
      return conceptIds;
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────────

  async clusterConceptsByCourse(
    courseId: string,
    k: number,
    tenantId: string
  ): Promise<unknown[]> {
    // 1. Fetch all embeddings for tenant
    const embeddingRows = await this.fetchEmbeddingRows(tenantId);
    if (embeddingRows.length === 0) {
      this.logger.warn(
        `[TopicClusterKMeans] No concept embeddings for tenant ${tenantId}`
      );
      return [];
    }

    // 2. Filter to concepts belonging to the course via AGE
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

    // 3. Resolve concept names from AGE
    const nameMap = await this.resolveConceptNames(
      filteredRows.map((r) => r.concept_id),
      tenantId
    );

    // 4. Build ConceptWithEmbedding array
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

    // 5. Run k-means++
    const clusters = this.runKMeans(concepts, k);

    // 6. Persist each cluster as TopicCluster in AGE graph
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

    // 7. Publish NATS event
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
