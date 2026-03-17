/**
 * AtRiskThresholdsResolver — F-18: query + mutation for at-risk thresholds.
 * Auth: @requiresRole(roles: [ORG_ADMIN, SUPER_ADMIN]) on SDL fields.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AtRiskThresholdsService } from './at-risk-thresholds.service.js';
import { AtRiskThresholdsInputSchema } from './at-risk-thresholds.schemas.js';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

function buildTenantCtx(auth: AuthContext): TenantContext {
  return {
    tenantId: auth.tenantId ?? '',
    userId: auth.userId ?? '',
    userRole:
      (auth.roles?.[0] as TenantContext['userRole']) ?? 'STUDENT',
  };
}

@Resolver()
export class AtRiskThresholdsResolver {
  constructor(
    private readonly thresholdsSvc: AtRiskThresholdsService
  ) {}

  @Query('atRiskThresholds')
  async atRiskThresholds(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth) throw new UnauthorizedException('Unauthenticated');
    const tenantCtx = buildTenantCtx(auth);
    return this.thresholdsSvc.getThresholds(
      auth.tenantId ?? '',
      tenantCtx
    );
  }

  @Mutation('saveAtRiskThresholds')
  async saveAtRiskThresholds(
    @Args('input') input: unknown,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth) throw new UnauthorizedException('Unauthenticated');

    const parsed = AtRiskThresholdsInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }

    const tenantCtx = buildTenantCtx(auth);
    return this.thresholdsSvc.saveThresholds(
      auth.tenantId ?? '',
      parsed.data,
      tenantCtx
    );
  }
}
