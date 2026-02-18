import { OpenAIEmbeddings } from '@langchain/openai';
import Redis from 'ioredis';
import crypto from 'crypto';

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export class CachedEmbeddings {
  private embeddings: OpenAIEmbeddings;
  private redis?: Redis;
  private cacheEnabled: boolean;
  private cacheTTL: number;

  constructor(apiKey: string, options: EmbeddingOptions = {}) {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: options.model || 'text-embedding-3-small',
      dimensions: options.dimensions || 768,
    });

    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cacheTTL = options.cacheTTL || 86400; // 24 hours
  }

  configureCache(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  private getCacheKey(text: string): string {
    return `embedding:${crypto.createHash('sha256').update(text).digest('hex')}`;
  }

  async embedQuery(query: string): Promise<number[]> {
    if (!this.cacheEnabled || !this.redis) {
      return this.embeddings.embedQuery(query);
    }

    const cacheKey = this.getCacheKey(query);
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const embedding = await this.embeddings.embedQuery(query);
    await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(embedding));

    return embedding;
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    if (!this.cacheEnabled || !this.redis) {
      return this.embeddings.embedDocuments(documents);
    }

    const results: number[][] = [];
    const toEmbed: { index: number; text: string }[] = [];

    // Check cache for each document
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i]!;
      const cacheKey = this.getCacheKey(doc);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        results[i] = JSON.parse(cached);
      } else {
        toEmbed.push({ index: i, text: doc });
      }
    }

    // Embed uncached documents
    if (toEmbed.length > 0) {
      const texts = toEmbed.map((item) => item.text);
      const embeddings = await this.embeddings.embedDocuments(texts);

      for (let i = 0; i < toEmbed.length; i++) {
        const { index, text } = toEmbed[i]!;
        const embedding = embeddings[i]!;
        results[index] = embedding;

        // Cache the result
        const cacheKey = this.getCacheKey(text);
        await this.redis.setex(
          cacheKey,
          this.cacheTTL,
          JSON.stringify(embedding)
        );
      }
    }

    return results;
  }

  async clearCache(): Promise<void> {
    if (this.redis) {
      const keys = await this.redis.keys('embedding:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
}

export function createEmbeddings(
  apiKey: string,
  options?: EmbeddingOptions
): CachedEmbeddings {
  return new CachedEmbeddings(apiKey, options);
}
