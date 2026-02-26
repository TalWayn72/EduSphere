import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { AuditLogService } from './audit-log.service.js';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver()
export class AuditLogResolver {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Query('adminAuditLog')
  async getAdminAuditLog(
    @Args('limit') limit: number,
    @Args('offset') offset: number,
    @Args('action') action: string | undefined,
    @Args('userId') userId: string | undefined,
    @Args('since') since: string | undefined,
    @Args('until') until: string | undefined,
    @Context() ctx: GraphQLContext
  ) {
    if (!ctx.authContext) throw new UnauthorizedException('Unauthenticated');
    return this.auditLogService.getAuditLog(ctx.authContext.tenantId ?? '', {
      limit: limit ?? 50,
      offset: offset ?? 0,
      action,
      userId,
      since,
      until,
    });
  }
}
