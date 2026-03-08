import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { AtRiskService } from './at-risk.service.js';
import type { AuthContext } from '@edusphere/auth';

interface GqlContext {
  authContext?: AuthContext;
}

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

function requireAdmin(ctx: GqlContext): { tenantId: string; userId: string } {
  const auth = ctx.authContext;
  if (!auth || !auth.tenantId || !auth.userId) {
    throw new UnauthorizedException('Authentication required');
  }
  const role = auth.roles[0] ?? 'STUDENT';
  if (!ADMIN_ROLES.has(role)) {
    throw new UnauthorizedException('OrgAdmin or SuperAdmin role required');
  }
  return { tenantId: auth.tenantId, userId: auth.userId };
}

@Resolver()
export class AtRiskResolver {
  constructor(private readonly atRiskService: AtRiskService) {}

  @Query('listAtRiskLearners')
  async listAtRiskLearners(
    @Args('threshold') threshold: number | undefined,
    @Context() ctx: GqlContext
  ) {
    const { tenantId, userId } = requireAdmin(ctx);
    return this.atRiskService.getAtRiskLearners(tenantId, userId, threshold ?? 30);
  }
}
