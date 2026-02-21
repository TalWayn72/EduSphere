import { CachedEmbeddings } from './embeddings';
import { PgVectorStore, SearchResult } from './vectorStore';

export interface RetrievalOptions {
  topK?: number;
  similarityThreshold?: number;
  filter?: Record<string, unknown>;
}

export interface RetrievalResult extends SearchResult {
  rank: number;
}

export class SemanticRetriever {
  private embeddings: CachedEmbeddings;
  private vectorStore: PgVectorStore;

  constructor(embeddings: CachedEmbeddings, vectorStore: PgVectorStore) {
    this.embeddings = embeddings;
    this.vectorStore = vectorStore;
  }

  async retrieve(
    query: string,
    tenantId: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievalResult[]> {
    const { topK = 5, similarityThreshold = 0.5 } = options;

    // Embed the query
    const queryEmbedding = await this.embeddings.embedQuery(query);

    // Search vector store
    const results = await this.vectorStore.similaritySearch(
      queryEmbedding,
      tenantId,
      topK,
      similarityThreshold
    );

    // Add rank information
    return results.map((result, index) => ({
      ...result,
      rank: index + 1,
    }));
  }

  async retrieveWithContext(
    query: string,
    tenantId: string,
    options: RetrievalOptions = {}
  ): Promise<{ results: RetrievalResult[]; context: string }> {
    const results = await this.retrieve(query, tenantId, options);

    // Concatenate results into context
    const context = results
      .map((result, index) => {
        return `[${index + 1}] ${result.content}\nSource: ${result.metadata['source'] ?? 'Unknown'}\n`;
      })
      .join('\n');

    return { results, context };
  }
}

export function createRetriever(
  embeddings: CachedEmbeddings,
  vectorStore: PgVectorStore
): SemanticRetriever {
  return new SemanticRetriever(embeddings, vectorStore);
}
