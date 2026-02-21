import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db, withTenantContext, transcript_segments, sql } from '@edusphere/db';
import { CypherService } from './cypher.service';
import { EmbeddingService } from '../embedding/embedding.service';

interface SemanticResult {
  id: string;
  text: string;
  similarity: number;
  entityType: string;
  entityId: string;
}

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);

  constructor(
    private readonly cypherService: CypherService,
    private readonly embeddingService: EmbeddingService
  ) {}

  async findConceptById(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        const concept = await this.cypherService.findConceptById(id, tenantId);
        if (!concept) {
          throw new NotFoundException(`Concept with ID ${id} not found`);
        }
        return this.mapConceptFromGraph(concept);
      }
    );
  }

  async findConceptByName(
    name: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        const concept = await this.cypherService.findConceptByName(
          name,
          tenantId
        );
        if (!concept) {
          throw new NotFoundException(`Concept with name "${name}" not found`);
        }
        return this.mapConceptFromGraph(concept);
      }
    );
  }

  async findAllConcepts(
    tenantId: string,
    userId: string,
    role: string,
    limit: number = 20
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        const concepts = await this.cypherService.findAllConcepts(
          tenantId,
          limit
        );
        return concepts.map((c) => this.mapConceptFromGraph(c));
      }
    );
  }

  async createConcept(
    name: string,
    definition: string,
    sourceIds: string[] = [],
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        const conceptId = await this.cypherService.createConcept({
          tenant_id: tenantId,
          name,
          definition,
          source_ids: sourceIds,
        });
        const concept = await this.cypherService.findConceptById(
          conceptId,
          tenantId
        );
        if (!concept) {
          throw new NotFoundException(`Failed to create concept`);
        }
        return this.mapConceptFromGraph(concept);
      }
    );
  }

  async updateConcept(
    id: string,
    updates: { name?: string; definition?: string; sourceIds?: string[] },
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        const mappedUpdates: any = {};
        if (updates.name) mappedUpdates.name = updates.name;
        if (updates.definition) mappedUpdates.definition = updates.definition;
        if (updates.sourceIds)
          mappedUpdates.source_ids = JSON.stringify(updates.sourceIds);

        const concept = await this.cypherService.updateConcept(
          id,
          tenantId,
          mappedUpdates
        );
        if (!concept) {
          throw new NotFoundException(`Concept with ID ${id} not found`);
        }
        return this.mapConceptFromGraph(concept);
      }
    );
  }

  async deleteConcept(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ): Promise<boolean> {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        return this.cypherService.deleteConcept(id, tenantId);
      }
    );
  }

  async findRelatedConcepts(
    conceptId: string,
    depth: number,
    limit: number,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        const related = await this.cypherService.findRelatedConcepts(
          conceptId,
          tenantId,
          depth,
          limit
        );
        return related.map((r: any) => ({
          concept: this.mapConceptFromGraph(r),
          strength: r.strength || 1.0,
        }));
      }
    );
  }

  async linkConcepts(
    fromId: string,
    toId: string,
    relationshipType: string,
    strength: number | null,
    description: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        await this.cypherService.linkConcepts(fromId, toId, relationshipType, {
          strength: strength ?? undefined,
          description: description ?? undefined,
        });

        const fromConcept = await this.cypherService.findConceptById(
          fromId,
          tenantId
        );
        const toConcept = await this.cypherService.findConceptById(
          toId,
          tenantId
        );

        return {
          fromConcept: fromConcept
            ? this.mapConceptFromGraph(fromConcept)
            : null,
          toConcept: toConcept ? this.mapConceptFromGraph(toConcept) : null,
          relationshipType,
          strength,
          inferred: false,
          description,
        };
      }
    );
  }

  async semanticSearch(
    query: string,
    limit: number,
    tenantId: string,
    userId: string,
    role: string
  ): Promise<SemanticResult[]> {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        this.logger.debug({ query, limit, tenantId }, 'Running semantic search');

        // Attempt pgvector cosine similarity search
        let vectorResults: SemanticResult[] = [];
        try {
          const vector = await this.embeddingService.callEmbeddingProvider(query);
          const vectorString = `[${vector.join(',')}]`;

          type GraphVectorRow = { id: string; segment_id: string; transcript_id: string; text: string; similarity: string };
          const rows = (await db.execute<GraphVectorRow>(sql`
            SELECT ce.id, ce.segment_id, ts.transcript_id, ts.text,
              1 - (ce.embedding <=> ${vectorString}::vector) AS similarity
            FROM content_embeddings ce
            JOIN transcript_segments ts ON ts.id = ce.segment_id
            ORDER BY ce.embedding <=> ${vectorString}::vector ASC
            LIMIT ${limit}
          `)) as unknown as GraphVectorRow[];

          vectorResults = rows.map((r) => ({
            id: r.segment_id,
            text: r.text,
            similarity: parseFloat(r.similarity),
            entityType: 'transcript_segment',
            entityId: r.transcript_id,
          }));

          this.logger.debug(
            { hits: vectorResults.length },
            'pgvector search complete'
          );
        } catch (err) {
          this.logger.warn(
            `pgvector search unavailable (${String(err)}) — using ILIKE fallback`
          );
        }

        // Fill remaining slots with text-match results
        const remaining = limit - vectorResults.length;
        let textResults: SemanticResult[] = [];
        if (remaining > 0) {
          const searchTerm = `%${query.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
          const segments = await db
            .select({
              id: transcript_segments.id,
              text: transcript_segments.text,
              transcript_id: transcript_segments.transcript_id,
            })
            .from(transcript_segments)
            .where(sql`${transcript_segments.text} ILIKE ${searchTerm}`)
            .limit(remaining);

          const vectorIds = new Set(vectorResults.map((r) => r.id));
          textResults = segments
            .filter((s) => !vectorIds.has(s.id))
            .map((seg) => ({
              id: seg.id,
              text: seg.text,
              similarity: this.computeTextSimilarity(seg.text, query),
              entityType: 'transcript_segment',
              entityId: seg.transcript_id,
            }));
        }

        const conceptResults = await this.searchConceptsByText(
          query,
          tenantId,
          Math.max(1, Math.floor(limit / 4))
        );

        return [...vectorResults, ...textResults, ...conceptResults]
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit);
      }
    );
  }

  private computeTextSimilarity(text: string, query: string): number {
    const haystack = text.toLowerCase();
    const needle = query.toLowerCase();
    if (haystack === needle) return 1.0;
    if (haystack.includes(needle)) return 0.85;
    const queryWords = needle.split(/\s+/).filter(Boolean);
    if (queryWords.length === 0) return 0.5;
    const matchCount = queryWords.filter((w) => haystack.includes(w)).length;
    return 0.5 + 0.35 * (matchCount / queryWords.length);
  }

  private async searchConceptsByText(
    query: string,
    tenantId: string,
    limit: number
  ): Promise<SemanticResult[]> {
    try {
      const concepts = await this.cypherService.findAllConcepts(tenantId, limit * 3);
      const q = query.toLowerCase();
      return concepts
        .filter(
          (c: any) =>
            c.name?.toLowerCase().includes(q) ||
            c.definition?.toLowerCase().includes(q)
        )
        .slice(0, limit)
        .map((c: any) => ({
          id: c.id,
          text: c.definition ?? c.name,
          similarity: this.computeTextSimilarity(
            `${c.name} ${c.definition ?? ''}`,
            query
          ),
          entityType: 'concept',
          entityId: c.id,
        }));
    } catch (err) {
      this.logger.warn({ err }, 'Concept search failed during semanticSearch');
      return [];
    }
  }

  async generateEmbedding(
    text: string,
    entityType: string,
    entityId: string,
    tenantId: string,
    userId: string,
    role: string
  ): Promise<boolean> {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        if (entityType !== 'transcript_segment') {
          this.logger.warn(
            `generateEmbedding: unsupported entityType=${entityType}`
          );
          return false;
        }
        try {
          await this.embeddingService.generateEmbedding(text, entityId);
          return true;
        } catch (err) {
          this.logger.error(
            `generateEmbedding failed for ${entityId}: ${String(err)}`
          );
          return false;
        }
      }
    );
  }

  private mapConceptFromGraph(graphNode: any): any {
    return {
      id: graphNode.id,
      tenantId: graphNode.tenant_id,
      name: graphNode.name,
      definition: graphNode.definition,
      sourceIds: JSON.parse(graphNode.source_ids || '[]'),
      createdAt: new Date(graphNode.created_at).toISOString(),
      updatedAt: new Date(graphNode.updated_at).toISOString(),
    };
  }

  async findPersonById(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        return this.cypherService.findPersonById(id, tenantId);
      }
    );
  }

  async findPersonByName(
    name: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        return this.cypherService.findPersonByName(name, tenantId);
      }
    );
  }

  async createPerson(
    name: string,
    bio: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        return this.cypherService.createPerson(name, bio, tenantId);
      }
    );
  }

  async findTermById(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        return this.cypherService.findTermById(id, tenantId);
      }
    );
  }

  async findTermByName(
    name: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        return this.cypherService.findTermByName(name, tenantId);
      }
    );
  }

  async createTerm(
    name: string,
    definition: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        return this.cypherService.createTerm(name, definition, tenantId);
      }
    );
  }

  async findSourceById(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        return this.cypherService.findSourceById(id, tenantId);
      }
    );
  }

  async createSource(
    title: string,
    type: string,
    url: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        return this.cypherService.createSource(title, type, url, tenantId);
      }
    );
  }

  async findTopicClusterById(
    id: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        return this.cypherService.findTopicClusterById(id, tenantId);
      }
    );
  }

  async findTopicClustersByCourse(
    courseId: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        return this.cypherService.findTopicClustersByCourse(courseId, tenantId);
      }
    );
  }

  async createTopicCluster(
    name: string,
    description: string | null,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        return this.cypherService.createTopicCluster(
          name,
          description,
          tenantId
        );
      }
    );
  }

  // ─── Learning Paths ──────────────────────────────────────────────────────

  /**
   * Find the shortest learning path between two concepts identified by name.
   * Delegates to CypherService.findShortestLearningPath (Apache AGE shortestPath).
   * Returns null when no path exists.
   */
  async getLearningPath(
    from: string,
    to: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        this.logger.debug({ from, to, tenantId }, 'getLearningPath called');
        return this.cypherService.findShortestLearningPath(from, to, tenantId);
      }
    );
  }

  /**
   * Collect all distinct concepts reachable from a named concept within `depth` hops.
   * Delegates to CypherService.collectRelatedConcepts (Apache AGE COLLECT aggregation).
   */
  async getRelatedConceptsByName(
    conceptName: string,
    depth: number,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        this.logger.debug(
          { conceptName, depth, tenantId },
          'getRelatedConceptsByName called'
        );
        return this.cypherService.collectRelatedConcepts(
          conceptName,
          depth,
          tenantId
        );
      }
    );
  }

  /**
   * Find the deepest prerequisite chain leading into a named concept.
   * Delegates to CypherService.findPrerequisiteChain (Apache AGE multi-hop MATCH).
   */
  async getPrerequisiteChain(
    conceptName: string,
    tenantId: string,
    userId: string,
    role: string
  ) {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: role as any },
      async () => {
        this.logger.debug(
          { conceptName, tenantId },
          'getPrerequisiteChain called'
        );
        return this.cypherService.findPrerequisiteChain(conceptName, tenantId);
      }
    );
  }
}
