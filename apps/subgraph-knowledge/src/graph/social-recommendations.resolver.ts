/**
 * SocialRecommendationsResolver — thin resolver for F-036 social recommendations.
 * Delegates all business logic to SocialRecommendationsService.
 */
import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { SocialRecommendationsService } from './social-recommendations.service';
import type { GraphQLContext } from '../auth/auth.middleware';

const DEFAULT_RECS_LIMIT = 10;
const DEFAULT_FEED_LIMIT = 20;

@Resolver()
export class SocialRecommendationsResolver {
  constructor(private readonly socialService: SocialRecommendationsService) {}

  private getAuthContext(context: GraphQLContext) {
    if (!context.authContext?.userId || !context.authContext?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      userId: context.authContext.userId,
      tenantId: context.authContext.tenantId,
    };
  }

  @Query('socialRecommendations')
  async socialRecommendations(
    @Args('limit') limit: number | undefined,
    @Context() context: GraphQLContext
  ) {
    const { userId, tenantId } = this.getAuthContext(context);
    const recs = await this.socialService.getRecommendations(
      userId,
      tenantId,
      limit ?? DEFAULT_RECS_LIMIT
    );
    return recs.map((r) => ({
      ...r,
      lastActivity: r.lastActivity.toISOString(),
    }));
  }

  @Query('socialFeed')
  async socialFeed(
    @Args('limit') limit: number | undefined,
    @Context() context: GraphQLContext
  ) {
    const { userId, tenantId } = this.getAuthContext(context);
    const items = await this.socialService.getSocialFeed(
      userId,
      tenantId,
      limit ?? DEFAULT_FEED_LIMIT
    );
    return items.map((item) => ({
      ...item,
      timestamp: item.timestamp.toISOString(),
    }));
  }
}
