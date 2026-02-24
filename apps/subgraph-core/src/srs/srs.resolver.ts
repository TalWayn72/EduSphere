import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SrsService } from './srs.service';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver('SRSCard')
export class SrsResolver {
  constructor(private readonly srsService: SrsService) {}

  private requireAuth(context: GraphQLContext) {
    if (!context.authContext?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      userId: context.authContext.userId,
      tenantId: context.authContext.tenantId || '',
    };
  }

  @Query('dueReviews')
  async getDueReviews(
    @Args('limit') limit: number | undefined,
    @Context() context: GraphQLContext,
  ) {
    const { userId, tenantId } = this.requireAuth(context);
    return this.srsService.getDueReviews(userId, tenantId, limit ?? 20);
  }

  @Query('srsQueueCount')
  async getSrsQueueCount(@Context() context: GraphQLContext) {
    const { userId, tenantId } = this.requireAuth(context);
    return this.srsService.getQueueCount(userId, tenantId);
  }

  @Mutation('submitReview')
  async submitReview(
    @Args('cardId') cardId: string,
    @Args('quality') quality: number,
    @Context() context: GraphQLContext,
  ) {
    const { userId, tenantId } = this.requireAuth(context);
    if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
      throw new BadRequestException('quality must be an integer between 0 and 5');
    }
    return this.srsService.submitReview(cardId, userId, tenantId, quality);
  }

  @Mutation('createReviewCard')
  async createReviewCard(
    @Args('conceptName') conceptName: string,
    @Context() context: GraphQLContext,
  ) {
    const { userId, tenantId } = this.requireAuth(context);
    if (!conceptName || conceptName.trim().length === 0) {
      throw new BadRequestException('conceptName must not be empty');
    }
    return this.srsService.createCard(userId, tenantId, conceptName.trim());
  }
}
