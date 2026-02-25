import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { MarketplaceService } from './marketplace.service.js';

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
    userRole: (auth.roles[0] ?? 'STUDENT') as TenantContext['userRole'],
  };
}

function formatListing(l: { id: string; courseId: string; priceCents: number; currency: string; isPublished: boolean; revenueSplitPercent: number }) {
  return {
    id: l.id,
    courseId: l.courseId,
    priceCents: l.priceCents,
    currency: l.currency,
    isPublished: l.isPublished,
    revenueSplitPercent: l.revenueSplitPercent,
  };
}

@Resolver()
export class MarketplaceResolver {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Query('courseListings')
  async getCourseListings(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    const listings = await this.marketplaceService.getListings(tenantCtx.tenantId);
    return listings.map(formatListing);
  }

  @Query('myPurchases')
  async getMyPurchases(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    const purchases = await this.marketplaceService.getUserPurchases(tenantCtx.userId, tenantCtx.tenantId);
    return purchases.map((p) => ({
      id: p.id,
      courseId: p.courseId,
      amountCents: p.amountCents,
      status: p.status,
      purchasedAt: p.purchasedAt.toISOString(),
    }));
  }

  @Query('instructorEarnings')
  async getInstructorEarnings(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    const earnings = await this.marketplaceService.getInstructorEarnings(tenantCtx.userId, tenantCtx.tenantId);
    return {
      totalEarnedCents: earnings.totalEarnedCents,
      pendingPayoutCents: earnings.pendingPayoutCents,
      paidOutCents: earnings.paidOutCents,
      purchases: earnings.purchases.map((p) => ({
        id: p.id,
        courseId: p.courseId,
        amountCents: p.amountCents,
        status: p.status,
        purchasedAt: p.purchasedAt.toISOString(),
      })),
    };
  }

  @Mutation('createCourseListing')
  async createCourseListing(
    @Args('courseId') courseId: string,
    @Args('priceCents') priceCents: number,
    @Args('currency') currency: string,
    @Args('revenueSplitPercent') revenueSplitPercent: number | undefined,
    @Context() ctx: GqlContext,
  ) {
    const tenantCtx = requireAuth(ctx);
    const listing = await this.marketplaceService.createListing(
      courseId,
      priceCents,
      currency,
      revenueSplitPercent ?? 70,
      tenantCtx.tenantId,
    );
    return formatListing(listing);
  }

  @Mutation('publishListing')
  async publishListing(
    @Args('courseId') courseId: string,
    @Context() ctx: GqlContext,
  ): Promise<boolean> {
    const tenantCtx = requireAuth(ctx);
    await this.marketplaceService.publishListing(courseId, tenantCtx.tenantId);
    return true;
  }

  @Mutation('purchaseCourse')
  async purchaseCourse(
    @Args('courseId') courseId: string,
    @Context() ctx: GqlContext,
  ) {
    const tenantCtx = requireAuth(ctx);
    const auth = ctx.authContext!;
    const name = [auth.firstName, auth.lastName].filter(Boolean).join(' ') || auth.username;
    return this.marketplaceService.purchaseCourse(
      courseId,
      tenantCtx.userId,
      tenantCtx.tenantId,
      auth.email,
      name,
    );
  }

  @Mutation('requestPayout')
  async requestPayout(@Context() ctx: GqlContext): Promise<boolean> {
    const tenantCtx = requireAuth(ctx);
    await this.marketplaceService.requestPayout(tenantCtx.userId, tenantCtx.tenantId);
    return true;
  }
}
