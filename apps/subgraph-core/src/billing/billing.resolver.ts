/**
 * billing.resolver.ts — GraphQL resolvers for billing/subscription/pilot queries.
 *
 * All auth-guarded queries delegate enforcement to the @authenticated /
 * @requiresRole directives in billing.graphql.  Resolver logic additionally
 * checks authContext presence as a defence-in-depth guard.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { YauCounterService } from './yau-counter.service.js';
import { SubscriptionService } from './subscription.service.js';
import { PilotService } from './pilot.service.js';
import { TenantUsageService } from './tenant-usage.service.js';
import { PlatformStatsService } from './platform-stats.service.js';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

function buildTenantCtx(
  auth: AuthContext,
  tenantId?: string
): TenantContext {
  return {
    tenantId: tenantId ?? auth.tenantId ?? '',
    userId: auth.userId ?? '',
    userRole:
      (auth.roles?.[0] as TenantContext['userRole']) ?? 'STUDENT',
  };
}

@Resolver('Query')
export class BillingQueryResolver {
  constructor(
    private readonly yauCounter: YauCounterService,
    private readonly subscriptions: SubscriptionService,
    private readonly pilots: PilotService,
    private readonly tenantUsageSvc: TenantUsageService,
    private readonly platformStats: PlatformStatsService
  ) {}

  @Query('mySubscription')
  async mySubscription(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth) throw new UnauthorizedException('Unauthenticated');
    const tenantCtx = buildTenantCtx(auth);
    return this.subscriptions.getTenantSubscription(
      auth.tenantId ?? '',
      tenantCtx
    );
  }

  @Query('myUsage')
  async myUsage(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth) throw new UnauthorizedException('Unauthenticated');
    return this.yauCounter.getMonthlyUsageSnapshot(auth.tenantId ?? '');
  }

  @Query('myTenantUsage')
  async myTenantUsage(
    @Args('year') year: number | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth) throw new UnauthorizedException('Unauthenticated');
    const tenantCtx = buildTenantCtx(auth);
    return this.tenantUsageSvc.getTenantUsage(tenantCtx, year ?? undefined);
  }

  @Query('platformLiveStats')
  async platformLiveStats(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth) throw new UnauthorizedException('Unauthenticated');
    const callerRole = auth.roles?.[0] as string | undefined;
    if (callerRole !== 'SUPER_ADMIN') {
      throw new UnauthorizedException('SUPER_ADMIN role required');
    }
    return this.platformStats.getPlatformStats();
  }

  @Query('allPilotRequests')
  async allPilotRequests(
    @Args('status') status: string | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth) throw new UnauthorizedException('Unauthenticated');
    const normalised = status?.toLowerCase();
    return this.pilots.listPilotRequests(normalised);
  }

  @Query('allTenantSubscriptions')
  async allTenantSubscriptions(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth) throw new UnauthorizedException('Unauthenticated');
    const tenantCtx = buildTenantCtx(auth);
    return this.subscriptions.listAllSubscriptions(tenantCtx);
  }

  @Query('tenantUsage')
  async tenantUsage(
    @Args('tenantId') tenantId: string,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth) throw new UnauthorizedException('Unauthenticated');
    // SC-03 (T-03): IDOR guard — ORG_ADMIN can only query their own tenant's usage.
    // SUPER_ADMIN may query any tenant. Never trust caller-supplied tenantId alone.
    const callerRole = auth.roles?.[0] as string | undefined;
    if (callerRole !== 'SUPER_ADMIN' && auth.tenantId !== tenantId) {
      throw new UnauthorizedException('Cannot access another tenant\'s usage data');
    }
    return this.yauCounter.getMonthlyUsageSnapshot(tenantId);
  }
}

@Resolver('Mutation')
export class BillingMutationResolver {
  constructor(
    private readonly pilots: PilotService
  ) {}

  @Mutation('submitPilotRequest')
  async submitPilotRequest(@Args('input') input: unknown) {
    return this.pilots.submitPilotRequest(input);
  }

  @Mutation('approvePilotRequest')
  async approvePilotRequest(
    @Args('requestId') requestId: string,
    @Context() ctx: GraphQLContext
  ): Promise<boolean> {
    const auth = ctx.authContext;
    if (!auth) throw new UnauthorizedException('Unauthenticated');
    const tenantCtx = buildTenantCtx(auth);
    await this.pilots.approvePilotRequest(
      requestId,
      auth.userId ?? '',
      tenantCtx
    );
    return true;
  }

  @Mutation('rejectPilotRequest')
  async rejectPilotRequest(
    @Args('requestId') requestId: string,
    @Args('reason') reason: string | undefined,
    @Context() ctx: GraphQLContext
  ): Promise<boolean> {
    const auth = ctx.authContext;
    if (!auth) throw new UnauthorizedException('Unauthenticated');
    const tenantCtx = buildTenantCtx(auth);
    await this.pilots.rejectPilotRequest(requestId, reason, tenantCtx);
    return true;
  }
}
