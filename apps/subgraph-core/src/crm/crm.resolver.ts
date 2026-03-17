/**
 * CrmResolver — thin GraphQL resolver for CRM settings.
 * Auth: ORG_ADMIN only (enforced by @requiresRole in SDL).
 * All business logic delegated to CrmService.
 */
import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { CrmService } from './crm.service.js';
import type { GraphQLContext } from '../auth/auth.middleware.js';

/** Extract tenant ID from authContext (preferred) or x-tenant-id header (gateway fallback). */
function extractTenantId(ctx: GraphQLContext): string | undefined {
  if (ctx.authContext?.tenantId) return ctx.authContext.tenantId;
  const header = ctx.req?.headers?.['x-tenant-id'];
  return (Array.isArray(header) ? header[0] : header) ?? undefined;
}

@Resolver()
export class CrmResolver {
  constructor(private readonly crmService: CrmService) {}

  @Query('crmConnection')
  async crmConnection(@Context() ctx: GraphQLContext): Promise<object | null> {
    const tenantId = extractTenantId(ctx);
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
    @Context() ctx: GraphQLContext,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number
  ): Promise<object[]> {
    const tenantId = extractTenantId(ctx);
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
  async disconnectCrm(@Context() ctx: GraphQLContext): Promise<boolean> {
    const tenantId = extractTenantId(ctx);
    if (!tenantId) return false;
    await this.crmService.disconnectCrm(tenantId);
    return true;
  }
}
