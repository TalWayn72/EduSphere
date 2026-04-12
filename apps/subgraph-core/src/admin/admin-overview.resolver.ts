import { Resolver, Query, Context } from '@nestjs/graphql';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AdminOverviewService } from './admin-overview.service';
import { requireAnyRole } from '@edusphere/auth';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver('Query')
export class AdminOverviewResolver {
  constructor(private readonly adminOverviewService: AdminOverviewService) {}

  @Query('adminOverview')
  async adminOverview(@Context() context: GraphQLContext) {
    if (!context.authContext) {
      throw new UnauthorizedException('Unauthenticated');
    }
    try {
      requireAnyRole(context.authContext, ['ORG_ADMIN', 'SUPER_ADMIN']);
    } catch {
      throw new ForbiddenException(
        'Insufficient role: ORG_ADMIN or SUPER_ADMIN required'
      );
    }
    return this.adminOverviewService.getOverview(
      context.authContext.tenantId || ''
    );
  }

  @Query('adminDashboardStats')
  async adminDashboardStats(@Context() context: GraphQLContext) {
    if (!context.authContext) {
      throw new UnauthorizedException('Unauthenticated');
    }
    try {
      requireAnyRole(context.authContext, ['ORG_ADMIN', 'SUPER_ADMIN']);
    } catch {
      throw new ForbiddenException(
        'Insufficient role: ORG_ADMIN or SUPER_ADMIN required'
      );
    }
    return this.adminOverviewService.getDashboardStats(
      context.authContext.tenantId || ''
    );
  }
}
