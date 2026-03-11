import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveReference,
  Context,
} from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { TenantContext } from '@edusphere/db';
import { EmbeddingService } from './embedding.service';

type GqlContext = {
  tenantId?: string | null;
  userId?: string | null;
  role?: string | null;
};

/** Extract a typed TenantContext from the GraphQL request context or throw. */
function requireTenantCtx(ctx: GqlContext): TenantContext {
  if (!ctx.tenantId || !ctx.userId || !ctx.role) {
    throw new UnauthorizedException('Missing tenant context for embedding query');
  }
  return {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    userRole: ctx.role as TenantContext['userRole'],
  };
}

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

  /** SI-9 / OWASP LLM06: tenantCtx required — enforces RLS on pgvector queries. */
  @Query('semanticSearch')
  async semanticSearch(
    @Args('query') query: number[],
    @Args('limit') limit: number = 10,
    @Args('minSimilarity') minSimilarity: number = 0.7,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireTenantCtx(ctx);
    return this.embeddingService.semanticSearchByVector(
      query,
      tenantCtx,
      limit,
      minSimilarity
    );
  }

  @Query('semanticSearchByContentItem')
  async semanticSearchByContentItem(
    @Args('contentItemId') _contentItemId: string,
    @Args('query') query: number[],
    @Args('limit') limit: number = 5,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireTenantCtx(ctx);
    // Legacy — delegates to vector search ignoring contentItemId filter
    return this.embeddingService.semanticSearchByVector(query, tenantCtx, limit, 0.7);
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
