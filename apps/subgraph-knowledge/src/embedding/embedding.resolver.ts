import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveReference,
} from '@nestjs/graphql';
import { EmbeddingService, type SegmentInput } from './embedding.service';

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

  @Query('embeddingsBySegment')
  async getEmbeddingsBySegment(@Args('segmentId') segmentId: string) {
    return this.embeddingService.findBySegment(segmentId);
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

  @Query('semanticSearchByText')
  async semanticSearchByText(
    @Args('query') query: string,
    @Args('tenantId') tenantId: string,
    @Args('limit') limit: number = 10
  ) {
    return this.embeddingService.semanticSearch(query, tenantId, limit);
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

  @Mutation('generateEmbedding')
  async generateEmbedding(
    @Args('text') text: string,
    @Args('segmentId') segmentId: string
  ) {
    return this.embeddingService.generateEmbedding(text, segmentId);
  }

  @Mutation('generateBatchEmbeddings')
  async generateBatchEmbeddings(
    @Args('segments') segments: SegmentInput[]
  ): Promise<number> {
    return this.embeddingService.generateBatchEmbeddings(segments);
  }

  @Mutation('createEmbedding')
  async createEmbedding(@Args('input') _input: unknown) {
    throw new Error(
      'Use generateEmbedding or generateBatchEmbeddings instead'
    );
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
