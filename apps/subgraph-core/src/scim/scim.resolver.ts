import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ScimTokenService } from './scim-token.service.js';
import type { AuthContext } from '@edusphere/auth';
import {
  withTenantContext,
  createDatabaseConnection,
  schema,
  eq,
  desc,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';

interface GqlCtx {
  req: unknown;
  authContext?: AuthContext;
}

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

@Resolver()
export class ScimResolver {
  private readonly db = createDatabaseConnection();
  constructor(private readonly tokenService: ScimTokenService) {}

  private requireAdmin(ctx: GqlCtx): AuthContext {
    if (!ctx.authContext?.userId)
      throw new UnauthorizedException('Authentication required');
    if (!ADMIN_ROLES.has(ctx.authContext.roles[0] ?? ''))
      throw new ForbiddenException('Admin role required');
    return ctx.authContext;
  }

  @Query('scimTokens')
  async getScimTokens(@Context() ctx: GqlCtx) {
    const auth = this.requireAdmin(ctx);
    return this.tokenService.listTokens(auth.tenantId);
  }

  @Query('scimSyncLog')
  async getScimSyncLog(
    @Args('limit') limit: number | undefined,
    @Context() ctx: GqlCtx
  ) {
    const auth = this.requireAdmin(ctx);
    const tenantCtx: TenantContext = {
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: 'ORG_ADMIN',
    };
    const rows = await withTenantContext(this.db, tenantCtx, async (tx) =>
      tx
        .select()
        .from(schema.scimSyncLog)
        .where(eq(schema.scimSyncLog.tenantId, auth.tenantId))
        .orderBy(desc(schema.scimSyncLog.createdAt))
        .limit(limit ?? 50)
    );
    return rows.map((r) => ({
      id: r.id,
      operation: r.operation,
      externalId: r.externalId ?? null,
      status: r.status,
      errorMessage: r.errorMessage ?? null,
      createdAt: r.createdAt,
    }));
  }

  @Mutation('generateScimToken')
  async generateScimToken(
    @Args('input') input: { description: string; expiresInDays?: number },
    @Context() ctx: GqlCtx
  ) {
    const auth = this.requireAdmin(ctx);
    return this.tokenService.generateToken(
      auth.tenantId,
      auth.userId,
      input.description,
      input.expiresInDays
    );
  }

  @Mutation('revokeScimToken')
  async revokeScimToken(@Args('id') id: string, @Context() ctx: GqlCtx) {
    const auth = this.requireAdmin(ctx);
    return this.tokenService.revokeToken(auth.tenantId, id);
  }
}
