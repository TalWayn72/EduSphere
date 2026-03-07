import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { DocumentVersionService } from './document-version.service';

interface GqlContext {
  authContext?: AuthContext;
}

function requireAuth(ctx: GqlContext): TenantContext {
  const auth = ctx.authContext;
  if (!auth?.tenantId || !auth?.userId) {
    throw new UnauthorizedException('Authentication required');
  }
  return {
    tenantId: auth.tenantId,
    userId: auth.userId,
    userRole: (auth.roles?.[0] ?? 'STUDENT') as TenantContext['userRole'],
  };
}

@Resolver('DocumentVersion')
export class DocumentVersionResolver {
  constructor(private readonly service: DocumentVersionService) {}

  @Query('getDocumentVersions')
  async getDocumentVersions(
    @Args('mediaAssetId') mediaAssetId: string,
    @Context() ctx: GqlContext
  ) {
    const authCtx = requireAuth(ctx);
    return this.service.getVersionHistory(mediaAssetId, authCtx);
  }

  @Mutation('createDocumentVersion')
  async createDocumentVersion(
    @Args('mediaAssetId') mediaAssetId: string,
    @Args('summary') summary: string | null,
    @Context() ctx: GqlContext
  ) {
    const authCtx = requireAuth(ctx);
    return this.service.createVersion(mediaAssetId, summary ?? null, authCtx);
  }

  @Mutation('rollbackToVersion')
  async rollbackToVersion(
    @Args('versionId') versionId: string,
    @Context() ctx: GqlContext
  ) {
    const authCtx = requireAuth(ctx);
    return this.service.rollbackToVersion(versionId, authCtx);
  }
}
