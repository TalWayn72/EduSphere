/**
 * CrmResolver — thin GraphQL resolver for CRM settings.
 * Auth: ORG_ADMIN only (enforced by @requiresRole in SDL).
 * All business logic delegated to CrmService.
 */
import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { CrmService } from './crm.service.js';

interface GqlContext {
  req: { headers: Record<string, string | undefined> };
}

@Resolver()
export class CrmResolver {
  constructor(private readonly crmService: CrmService) {}

  @Query('crmConnection')
  async crmConnection(@Context() ctx: GqlContext): Promise<object | null> {
    const tenantId = ctx.req.headers['x-tenant-id'];
    if (!tenantId) return null;
    const conn = await this.crmService.getConnection(tenantId);
    if (!conn) return null;
    return {
      id: conn.id,
      provider: conn.provider,
      instanceUrl: conn.instanceUrl,
      isActive: conn.isActive,
      createdAt: conn.createdAt.toISOString(),
    };
  }

  @Query('crmSyncLog')
  async crmSyncLog(
    @Context() ctx: GqlContext,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<object[]> {
    const tenantId = ctx.req.headers['x-tenant-id'];
    if (!tenantId) return [];
    const entries = await this.crmService.getSyncLog(tenantId, limit ?? 20);
    return entries.map((e) => ({
      id: e.id,
      operation: e.operation,
      externalId: e.externalId ?? null,
      status: e.status,
      errorMessage: e.errorMessage ?? null,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  @Mutation('disconnectCrm')
  async disconnectCrm(@Context() ctx: GqlContext): Promise<boolean> {
    const tenantId = ctx.req.headers['x-tenant-id'];
    if (!tenantId) return false;
    await this.crmService.disconnectCrm(tenantId);
    return true;
  }
}
