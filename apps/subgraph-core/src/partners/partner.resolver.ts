/**
 * partner.resolver.ts — GraphQL resolvers for B2B2C Partner Dashboard.
 * F-07: myPartnerDashboard query + regeneratePartnerApiKey mutation.
 *
 * Partners are cross-tenant entities — no withTenantContext used.
 * Auth enforced by @authenticated / @requiresRole directives in SDL.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PartnerDashboardService } from './partner-dashboard.service.js';
import { RegeneratePartnerApiKeySchema } from './partner.schemas.js';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver('Query')
export class PartnerQueryResolver {
  constructor(
    private readonly dashboard: PartnerDashboardService
  ) {}

  @Query('myPartnerDashboard')
  async myPartnerDashboard(
    @Args('partnerId') partnerId: string,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth) throw new UnauthorizedException('Unauthenticated');
    return this.dashboard.getDashboard(partnerId);
  }
}

@Resolver('Mutation')
export class PartnerMutationResolver {
  constructor(
    private readonly dashboard: PartnerDashboardService
  ) {}

  @Mutation('regeneratePartnerApiKey')
  async regeneratePartnerApiKey(
    @Args('partnerId') partnerId: string,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth) throw new UnauthorizedException('Unauthenticated');

    const callerRole = auth.roles?.[0] as string | undefined;
    if (callerRole !== 'SUPER_ADMIN') {
      throw new UnauthorizedException('SUPER_ADMIN role required');
    }

    const parsed = RegeneratePartnerApiKeySchema.safeParse({ partnerId });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }

    return this.dashboard.regenerateApiKey(parsed.data.partnerId);
  }
}
