/**
 * MarketplaceOrgResolver — GraphQL resolvers for org marketplace listings.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { MarketplaceOrgService } from './marketplace-org.service.js';

interface GqlContext {
  authContext?: AuthContext;
}

function requireAuth(ctx: GqlContext): TenantContext {
  const auth = ctx.authContext;
  if (!auth?.tenantId || !auth?.userId) {
    throw new UnauthorizedException('Authentication required');
  }
  return {
    tenantId: auth.tenantId,
    userId: auth.userId,
    userRole: (auth.roles?.[0] ?? 'STUDENT') as TenantContext['userRole'],
  };
}

@Resolver('MarketplaceListing')
export class MarketplaceOrgResolver {
  constructor(
    private readonly marketplaceOrgService: MarketplaceOrgService
  ) {}

  @Query('marketplaceListings')
  async getMarketplaceListings(
    @Args('category') category: string | undefined,
    @Args('pricingModel') pricingModel: string | undefined,
    @Args('search') search: string | undefined,
    @Args('limit') limit: number | undefined,
    @Args('offset') offset: number | undefined
  ) {
    return this.marketplaceOrgService.getMarketplaceListings(
      category,
      pricingModel,
      search,
      limit,
      offset
    );
  }

  @Query('marketplaceListing')
  async getMarketplaceListing(@Args('id') id: string) {
    return this.marketplaceOrgService.getMarketplaceListing(id);
  }

  @Mutation('publishToMarketplace')
  async publishToMarketplace(
    @Args('input') input: {
      courseId: string;
      title: string;
      description?: string;
      pricingModel: string;
      pricePerSeat?: number;
      flatRatePrice?: number;
      currency?: string;
      categories?: string[];
      previewUrl?: string;
    },
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.marketplaceOrgService.publishToMarketplace(input, tenantCtx);
  }

  @Mutation('unpublishFromMarketplace')
  async unpublishFromMarketplace(
    @Args('listingId') listingId: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.marketplaceOrgService.unpublishFromMarketplace(
      listingId,
      tenantCtx
    );
  }
}
