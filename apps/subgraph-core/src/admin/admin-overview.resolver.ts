import { Resolver, Query, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { AdminOverviewService } from './admin-overview.service';
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
    return this.adminOverviewService.getOverview(
      context.authContext.tenantId || ''
    );
  }
}
