import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { ManagerDashboardService } from './manager-dashboard.service';
import type { AuthContext } from '@edusphere/auth';

const MANAGER_ROLES = new Set(['MANAGER', 'ORG_ADMIN', 'SUPER_ADMIN']);

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

function requireManagerRole(authContext: AuthContext | undefined): void {
  if (!authContext) {
    throw new UnauthorizedException('Unauthenticated');
  }
  const hasRole = authContext.roles.some((r) => MANAGER_ROLES.has(r));
  if (!hasRole) {
    throw new UnauthorizedException('Insufficient role for manager dashboard');
  }
}

@Resolver()
export class ManagerResolver {
  constructor(private readonly managerDashboardService: ManagerDashboardService) {}

  @Query('myTeamOverview')
  async myTeamOverview(@Context() context: GraphQLContext) {
    requireManagerRole(context.authContext);
    const { userId, tenantId } = context.authContext!;
    return this.managerDashboardService.getTeamOverview(userId, tenantId ?? '');
  }

  @Query('myTeamMemberProgress')
  async myTeamMemberProgress(@Context() context: GraphQLContext) {
    requireManagerRole(context.authContext);
    const { userId, tenantId } = context.authContext!;
    return this.managerDashboardService.getTeamMemberProgress(userId, tenantId ?? '');
  }

  @Mutation('addTeamMember')
  async addTeamMember(
    @Args('memberId') memberId: string,
    @Context() context: GraphQLContext,
  ): Promise<boolean> {
    requireManagerRole(context.authContext);
    const { userId, tenantId } = context.authContext!;
    return this.managerDashboardService.addTeamMember(userId, memberId, tenantId ?? '');
  }

  @Mutation('removeTeamMember')
  async removeTeamMember(
    @Args('memberId') memberId: string,
    @Context() context: GraphQLContext,
  ): Promise<boolean> {
    requireManagerRole(context.authContext);
    const { userId, tenantId } = context.authContext!;
    return this.managerDashboardService.removeTeamMember(userId, memberId, tenantId ?? '');
  }
}
