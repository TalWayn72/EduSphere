import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { TenantAnalyticsService } from './tenant-analytics.service.js';
import { TenantAnalyticsExportService } from './tenant-analytics-export.service.js';
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
export class TenantAnalyticsResolver {
  constructor(
    private readonly tenantAnalyticsService: TenantAnalyticsService,
    private readonly exportService: TenantAnalyticsExportService
  ) {}

  @Query('tenantAnalytics')
  async getTenantAnalytics(
    @Args('period') period: string,
    @Context() ctx: GqlContext
  ) {
    const { tenantId, userId } = requireAdmin(ctx);
    return this.tenantAnalyticsService.getTenantAnalytics(
      tenantId,
      userId,
      period as 'SEVEN_DAYS' | 'THIRTY_DAYS' | 'NINETY_DAYS'
    );
  }

  @Query('learnerVelocity')
  async getLearnerVelocity(
    @Args('period') period: string,
    @Args('limit') limit: number,
    @Context() ctx: GqlContext
  ) {
    const { tenantId, userId } = requireAdmin(ctx);
    return this.tenantAnalyticsService.getLearnerVelocity(
      tenantId,
      userId,
      period,
      limit
    );
  }

  @Query('cohortRetention')
  async getCohortRetention(
    @Args('weeksBack') weeksBack: number,
    @Context() ctx: GqlContext
  ) {
    const { tenantId, userId } = requireAdmin(ctx);
    return this.tenantAnalyticsService.getCohortRetention(
      tenantId,
      userId,
      weeksBack
    );
  }

  @Query('exportTenantAnalytics')
  async exportTenantAnalytics(
    @Args('period') period: string,
    @Args('format') _format: string,
    @Context() ctx: GqlContext
  ): Promise<string> {
    const { tenantId, userId } = requireAdmin(ctx);
    return this.exportService.exportToCSV(tenantId, userId, period);
  }
}
