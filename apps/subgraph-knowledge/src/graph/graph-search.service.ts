/**
 * GraphSearchService — semanticSearch (HybridRAG) and generateEmbedding operations.
 * Wraps pgvector cosine search + ILIKE fallback + concept text search.
 */
import { Injectable, Logger } from '@nestjs/common';
import { db, withTenantContext, transcript_segments, sql } from '@edusphere/db';
import { CypherConceptService } from './cypher-concept.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { toUserRole, type GraphConceptNode } from './graph-types';

interface SemanticResult {
  id: string;
  text: string;
  similarity: number;
  entityType: string;
  entityId: string;
}

@Injectable()
export class GraphSearchService {
  private readonly logger = new Logger(GraphSearchService.name);

  constructor(
    private readonly cypher: CypherConceptService,
    private readonly embeddingService: EmbeddingService
  ) {}

  async semanticSearch(
    query: string,
    limit: number,
    tenantId: string,
    userId: string,
    role: string
  ): Promise<SemanticResult[]> {
    return withTenantContext(
      db,
      { tenantId, userId, userRole: toUserRole(role) },
      async () => {
        this.logger.debug(
          { query, limit, tenantId },
          'Running semantic search'
        );

        let vectorResults: SemanticResult[] = [];
        try {
          const vector =
            await this.embeddingService.callEmbeddingProvider(query);
          const vectorString = `[${vector.join(',')}]`;
          type Row = {
            id: string;
            segment_id: string;
            transcript_id: string;
            text: string;
            similarity: string;
          };
          const rows = (await db.execute<Row>(sql`
          SELECT ce.id, ce.segment_id, ts.transcript_id, ts.text,
            1 - (ce.embedding <=> ${vectorString}::vector) AS similarity
          FROM content_embeddings ce
          JOIN transcript_segments ts ON ts.id = ce.segment_id
          ORDER BY ce.embedding <=> ${vectorString}::vector ASC
          LIMIT ${limit}
        `)) as unknown as Row[];
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

        const remaining = limit - vectorResults.length;
        let textResults: SemanticResult[] = [];
        if (remaining > 0) {
          const searchTerm = `%${query.replace(/%/g, '\%').replace(/_/g, '\_')}%`;
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
      { tenantId, userId, userRole: toUserRole(role) },
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
      const concepts = await this.cypher.findAllConcepts(tenantId, limit * 3);
      const q = query.toLowerCase();
      return (concepts as GraphConceptNode[])
        .filter(
          (c) =>
            c.name?.toLowerCase().includes(q) ||
            c.definition?.toLowerCase().includes(q)
        )
        .slice(0, limit)
        .map((c) => ({
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
}
