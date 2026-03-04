import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import { SavedSearchService } from './saved-search.service.js';

interface GqlContext {
  authContext?: AuthContext;
}

function requireAuth(ctx: GqlContext) {
  const auth = ctx.authContext;
  if (!auth || !auth.tenantId || !auth.userId) {
    throw new UnauthorizedException('Authentication required');
  }
  return auth;
}

@Resolver('SavedSearch')
export class SavedSearchResolver {
  constructor(private readonly savedSearchService: SavedSearchService) {}

  @Query('savedSearches')
  async getSavedSearches(@Context() ctx: GqlContext) {
    const auth = requireAuth(ctx);
    return this.savedSearchService.listSavedSearches(auth.userId, auth.tenantId);
  }

  @Mutation('createSavedSearch')
  async createSavedSearch(
    @Args('input') input: { name: string; query: string; filters?: string },
    @Context() ctx: GqlContext
  ) {
    const auth = requireAuth(ctx);
    return this.savedSearchService.createSavedSearch({
      userId: auth.userId,
      tenantId: auth.tenantId,
      name: input.name,
      query: input.query,
      filters: input.filters
        ? (JSON.parse(input.filters) as Record<string, unknown>)
        : undefined,
    });
  }

  @Mutation('deleteSavedSearch')
  async deleteSavedSearch(@Args('id') id: string, @Context() ctx: GqlContext) {
    const auth = requireAuth(ctx);
    return this.savedSearchService.deleteSavedSearch(
      id,
      auth.userId,
      auth.tenantId
    );
  }
}
