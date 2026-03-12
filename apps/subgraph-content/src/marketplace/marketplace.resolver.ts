import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { MarketplaceService } from './marketplace.service.js';
import { InstructorPayoutService } from './instructor-payout.service.js';
import type { CourseListingFiltersInput } from './marketplace.types.js';

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

@Resolver()
export class MarketplaceResolver {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly payoutService: InstructorPayoutService,
  ) {}

  @Query('courseListings')
  async getCourseListings(
    @Args('limit') limit: number | undefined,
    @Args('offset') offset: number | undefined,
    @Args('filters') filters: CourseListingFiltersInput | undefined,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    // tenantId sourced from JWT context (SI-9) — NOT from GraphQL args
    const listings = await this.marketplaceService.getListings(
      tenantCtx.tenantId,
      tenantCtx.userId,
      tenantCtx.userRole,
      limit,
      offset,
      filters
    );
    return {
      nodes: listings,
      edges: listings.map((node, i) => ({
        node,
        cursor: Buffer.from(String(i)).toString('base64'),
      })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
      totalCount: listings.length,
    };
  }

  @Query('myPurchases')
  async getMyPurchases(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    const purchases = await this.marketplaceService.getUserPurchases(
      tenantCtx.userId,
      tenantCtx.tenantId
    );
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
    const earnings = await this.marketplaceService.getInstructorEarnings(
      tenantCtx.userId,
      tenantCtx.tenantId
    );
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
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    const listing = await this.marketplaceService.createListing(
      courseId,
      priceCents,
      currency,
      revenueSplitPercent ?? 70,
      tenantCtx.tenantId
    );
    return {
      id: listing.id,
      courseId: listing.courseId,
      priceCents: listing.priceCents,
      currency: listing.currency,
      isPublished: listing.isPublished,
      revenueSplitPercent: listing.revenueSplitPercent,
      title: '',
      description: null,
      instructorName: '',
      thumbnailUrl: null,
      price: listing.priceCents / 100,
      tags: [],
      enrollmentCount: 0,
      rating: null,
      totalLessons: 0,
    };
  }

  @Mutation('publishListing')
  async publishListing(
    @Args('courseId') courseId: string,
    @Context() ctx: GqlContext
  ): Promise<boolean> {
    const tenantCtx = requireAuth(ctx);
    await this.marketplaceService.publishListing(courseId, tenantCtx.tenantId);
    return true;
  }

  @Mutation('purchaseCourse')
  async purchaseCourse(
    @Args('courseId') courseId: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    const auth = ctx.authContext!;
    const name =
      [auth.firstName, auth.lastName].filter(Boolean).join(' ') ||
      auth.username;
    return this.marketplaceService.purchaseCourse(
      courseId,
      tenantCtx.userId,
      tenantCtx.tenantId,
      auth.email,
      name
    );
  }

  @Query('myPayouts')
  async getMyPayouts(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    const rows = await this.payoutService.getPayoutHistory(tenantCtx.userId, tenantCtx);
    return rows.map((r) => ({
      id: r.id,
      periodMonth: r.periodMonth,
      grossRevenue: r.grossRevenue,
      platformCut: r.platformCut,
      instructorPayout: r.instructorPayout,
      status: r.status,
      paidAt: r.paidAt?.toISOString() ?? null,
    }));
  }

  @Query('allPayouts')
  async getAllPayouts(
    @Args('month') month: string | undefined,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    const rows = await this.payoutService.getAllPayouts(month, tenantCtx);
    return rows.map((r) => ({
      id: r.id,
      periodMonth: r.periodMonth,
      grossRevenue: r.grossRevenue,
      platformCut: r.platformCut,
      instructorPayout: r.instructorPayout,
      status: r.status,
      paidAt: r.paidAt?.toISOString() ?? null,
    }));
  }

  @Mutation('requestPayout')
  async requestPayout(@Context() ctx: GqlContext): Promise<boolean> {
    const tenantCtx = requireAuth(ctx);
    await this.marketplaceService.requestPayout(
      tenantCtx.userId,
      tenantCtx.tenantId
    );
    return true;
  }
}
