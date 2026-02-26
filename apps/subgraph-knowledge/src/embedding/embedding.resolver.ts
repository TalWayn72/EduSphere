import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveReference,
} from '@nestjs/graphql';
import { EmbeddingService } from './embedding.service';

@Resolver('Embedding')
export class EmbeddingResolver {
  constructor(private readonly embeddingService: EmbeddingService) {}

  @Query('embedding')
  async getEmbedding(@Args('id') id: string) {
    return this.embeddingService.findById(id);
  }

  @Query('embeddingsByContentItem')
  async getEmbeddingsByContentItem(
    @Args('contentItemId') contentItemId: string
  ) {
    return this.embeddingService.findByContentItem(contentItemId);
  }

  @Query('semanticSearch')
  async semanticSearch(
    @Args('query') query: number[],
    @Args('limit') limit: number = 10,
    @Args('minSimilarity') minSimilarity: number = 0.7
  ) {
    return this.embeddingService.semanticSearchByVector(
      query,
      limit,
      minSimilarity
    );
  }

  @Query('semanticSearchByContentItem')
  async semanticSearchByContentItem(
    @Args('contentItemId') contentItemId: string,
    @Args('query') query: number[],
    @Args('limit') limit: number = 5
  ) {
    // Legacy — delegates to vector search ignoring contentItemId filter
    return this.embeddingService.semanticSearchByVector(query, limit, 0.7);
  }

  @Mutation('createEmbedding')
  async createEmbedding(@Args('input') _input: unknown) {
    throw new Error('Use generateEmbedding or generateBatchEmbeddings instead');
  }

  @Mutation('deleteEmbedding')
  async deleteEmbedding(@Args('id') id: string) {
    return this.embeddingService.delete(id);
  }

  @Mutation('deleteEmbeddingsByContentItem')
  async deleteEmbeddingsByContentItem(
    @Args('contentItemId') contentItemId: string
  ) {
    return this.embeddingService.deleteByContentItem(contentItemId);
  }

  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.embeddingService.findById(reference.id);
  }
}
