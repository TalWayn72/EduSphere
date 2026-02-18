import { Pool } from 'pg';
import { CachedEmbeddings } from './embeddings';
import { SearchResult } from './vectorStore';

export interface HybridSearchOptions {
  topK?: number;
  semanticWeight?: number; // 0-1, weight for vector similarity
  keywordWeight?: number; // 0-1, weight for text search
  rerankTopK?: number; // Number of results to rerank
}

export interface HybridSearchResult extends SearchResult {
  semanticScore: number;
  keywordScore: number;
  combinedScore: number;
  rank: number;
}

/**
 * Hybrid search combining:
 * - Semantic search (vector similarity with pgvector)
 * - Keyword search (full-text search with PostgreSQL)
 * - Graph traversal (Apache AGE for related concepts)
 */
export class HybridSearchEngine {
  private pool: Pool;
  private embeddings: CachedEmbeddings;
  private tableName: string;

  constructor(
    pool: Pool,
    embeddings: CachedEmbeddings,
    tableName: string = 'vector_documents'
  ) {
    this.pool = pool;
    this.embeddings = embeddings;
    this.tableName = tableName;
  }

  async search(
    query: string,
    tenantId: string,
    options: HybridSearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    const {
      topK = 10,
      semanticWeight = 0.7,
      keywordWeight = 0.3,
      rerankTopK = 20,
    } = options;

    // 1. Semantic search with vector similarity
    const queryEmbedding = await this.embeddings.embedQuery(query);
    const semanticResults = await this.semanticSearch(
      queryEmbedding,
      tenantId,
      rerankTopK
    );

    // 2. Keyword search with full-text search
    const keywordResults = await this.keywordSearch(
      query,
      tenantId,
      rerankTopK
    );

    // 3. Combine and rerank results
    const combined = this.combineResults(
      semanticResults,
      keywordResults,
      semanticWeight,
      keywordWeight
    );

    // 4. Return top K results
    return combined
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, topK)
      .map((result, index) => ({
        ...result,
        rank: index + 1,
      }));
  }

  private async semanticSearch(
    embedding: number[],
    tenantId: string,
    limit: number
  ): Promise<Array<SearchResult & { semanticScore: number }>> {
    const result = await this.pool.query(
      `SELECT
         id,
         content,
         metadata,
         1 - (embedding <=> $1::vector) AS semantic_score
       FROM ${this.tableName}
       WHERE tenant_id = $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [JSON.stringify(embedding), tenantId, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      similarity: parseFloat(row.semantic_score),
      semanticScore: parseFloat(row.semantic_score),
    }));
  }

  private async keywordSearch(
    query: string,
    tenantId: string,
    limit: number
  ): Promise<Array<SearchResult & { keywordScore: number }>> {
    // Create full-text search vector
    const result = await this.pool.query(
      `SELECT
         id,
         content,
         metadata,
         ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) AS keyword_score
       FROM ${this.tableName}
       WHERE tenant_id = $2
         AND to_tsvector('english', content) @@ plainto_tsquery('english', $1)
       ORDER BY keyword_score DESC
       LIMIT $3`,
      [query, tenantId, limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      similarity: parseFloat(row.keyword_score),
      keywordScore: parseFloat(row.keyword_score),
    }));
  }

  private combineResults(
    semanticResults: Array<SearchResult & { semanticScore: number }>,
    keywordResults: Array<SearchResult & { keywordScore: number }>,
    semanticWeight: number,
    keywordWeight: number
  ): HybridSearchResult[] {
    const resultsMap = new Map<string, HybridSearchResult>();

    // Add semantic results
    for (const result of semanticResults) {
      resultsMap.set(result.id, {
        id: result.id,
        content: result.content,
        metadata: result.metadata,
        similarity: result.similarity,
        semanticScore: result.semanticScore,
        keywordScore: 0,
        combinedScore: result.semanticScore * semanticWeight,
        rank: 0,
      });
    }

    // Add/update with keyword results
    for (const result of keywordResults) {
      const existing = resultsMap.get(result.id);
      if (existing) {
        existing.keywordScore = result.keywordScore;
        existing.combinedScore += result.keywordScore * keywordWeight;
      } else {
        resultsMap.set(result.id, {
          id: result.id,
          content: result.content,
          metadata: result.metadata,
          similarity: result.similarity,
          semanticScore: 0,
          keywordScore: result.keywordScore,
          combinedScore: result.keywordScore * keywordWeight,
          rank: 0,
        });
      }
    }

    return Array.from(resultsMap.values());
  }

  async searchWithGraphTraversal(
    query: string,
    tenantId: string,
    options: HybridSearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    // First, perform hybrid search
    const hybridResults = await this.search(query, tenantId, options);

    // Then, traverse knowledge graph to find related concepts
    // This would use Apache AGE Cypher queries
    const relatedConcepts = await this.findRelatedConcepts(
      hybridResults,
      tenantId
    );

    // Combine and rerank
    return this.mergeWithGraphResults(hybridResults, relatedConcepts);
  }

  private async findRelatedConcepts(
    _results: HybridSearchResult[],
    _tenantId: string
  ): Promise<HybridSearchResult[]> {
    // Placeholder for Apache AGE graph traversal
    // In actual implementation, this would:
    // 1. Extract concepts from top results
    // 2. Traverse knowledge graph to find related concepts
    // 3. Return documents associated with related concepts
    return [];
  }

  private mergeWithGraphResults(
    hybridResults: HybridSearchResult[],
    graphResults: HybridSearchResult[]
  ): HybridSearchResult[] {
    // Merge and deduplicate results
    const resultsMap = new Map<string, HybridSearchResult>();

    for (const result of hybridResults) {
      resultsMap.set(result.id, result);
    }

    for (const result of graphResults) {
      if (!resultsMap.has(result.id)) {
        resultsMap.set(result.id, {
          ...result,
          combinedScore: result.combinedScore * 0.5,
        });
      }
    }

    return Array.from(resultsMap.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .map((result, index) => ({ ...result, rank: index + 1 }));
  }
}

export function createHybridSearch(
  pool: Pool,
  embeddings: CachedEmbeddings,
  tableName?: string
): HybridSearchEngine {
  return new HybridSearchEngine(pool, embeddings, tableName);
}
