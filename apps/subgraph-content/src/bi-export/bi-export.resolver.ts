/**
 * BiExportResolver — thin GraphQL resolver delegating to BiTokenService.
 * Handles generateBIApiKey, revokeBIApiKey, biApiTokens queries.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { BiTokenService } from './bi-token.service.js';
import type { AuthContext } from '@edusphere/auth';

interface GqlCtx {
  req: unknown;
  authContext?: AuthContext;
}

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN']);

@Resolver()
export class BiExportResolver {
  constructor(private readonly tokenService: BiTokenService) {}

  private requireAdmin(ctx: GqlCtx): AuthContext & { tenantId: string } {
    if (!ctx.authContext?.userId || !ctx.authContext?.tenantId)
      throw new UnauthorizedException('Authentication required');
    if (!ADMIN_ROLES.has(ctx.authContext.roles[0] ?? ''))
      throw new ForbiddenException('Admin role required');
    return ctx.authContext as AuthContext & { tenantId: string };
  }

  @Query('biApiTokens')
  async getBiApiTokens(@Context() ctx: GqlCtx) {
    const auth = this.requireAdmin(ctx);
    const tokens = await this.tokenService.listTokens(auth.tenantId);
    return tokens.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    }));
  }

  @Mutation('generateBIApiKey')
  async generateBIApiKey(
    @Args('description') description: string,
    @Context() ctx: GqlCtx
  ): Promise<string> {
    const auth = this.requireAdmin(ctx);
    return this.tokenService.generateToken(auth.tenantId, description);
  }

  @Mutation('revokeBIApiKey')
  async revokeBIApiKey(
    @Args('tokenId') tokenId: string,
    @Context() ctx: GqlCtx
  ): Promise<boolean> {
    const auth = this.requireAdmin(ctx);
    await this.tokenService.revokeToken(tokenId, auth.tenantId);
    return true;
  }
}
