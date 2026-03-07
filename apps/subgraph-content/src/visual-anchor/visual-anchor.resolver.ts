import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  Subscription,
} from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { VisualAnchorService } from './visual-anchor.service';
import { PubSub } from 'graphql-subscriptions';

const pubSub = new PubSub();

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

@Resolver('VisualAnchor')
export class VisualAnchorResolver {
  constructor(private readonly service: VisualAnchorService) {}

  // ── Queries ────────────────────────────────────────────────────────────────

  @Query('getVisualAssets')
  async getVisualAssets(
    @Args('courseId') courseId: string,
    @Context() ctx: GqlContext
  ) {
    const authCtx = requireAuth(ctx);
    return this.service.findAllAssetsByCourse(courseId, authCtx);
  }

  @Query('getVisualAnchors')
  async getVisualAnchors(
    @Args('mediaAssetId') mediaAssetId: string,
    @Context() ctx: GqlContext
  ) {
    const authCtx = requireAuth(ctx);
    return this.service.findAllByMediaAsset(mediaAssetId, authCtx);
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  @Mutation('confirmVisualAssetUpload')
  async confirmVisualAssetUpload(
    @Args('fileKey') fileKey: string,
    @Args('courseId') courseId: string,
    @Args('originalName') originalName: string,
    @Args('declaredMimeType') declaredMimeType: string,
    @Args('declaredSize') declaredSize: number,
    @Context() ctx: GqlContext
  ) {
    const authCtx = requireAuth(ctx);
    return this.service.confirmVisualAssetUpload(
      fileKey,
      courseId,
      originalName,
      declaredMimeType,
      declaredSize,
      authCtx
    );
  }

  @Mutation('createVisualAnchor')
  async createVisualAnchor(
    @Args('input') input: Record<string, unknown>,
    @Context() ctx: GqlContext
  ) {
    const authCtx = requireAuth(ctx);
    const anchor = await this.service.createAnchor(input, authCtx);
    await pubSub.publish('anchorCreated', { anchorCreated: anchor, mediaAssetId: anchor.mediaAssetId });
    return anchor;
  }

  @Mutation('updateVisualAnchor')
  async updateVisualAnchor(
    @Args('id') id: string,
    @Args('input') input: Record<string, unknown>,
    @Context() ctx: GqlContext
  ) {
    const authCtx = requireAuth(ctx);
    return this.service.updateAnchor(id, input, authCtx);
  }

  @Mutation('deleteVisualAnchor')
  async deleteVisualAnchor(
    @Args('id') id: string,
    @Context() ctx: GqlContext
  ) {
    const authCtx = requireAuth(ctx);
    const result = await this.service.deleteAnchor(id, authCtx);
    await pubSub.publish('anchorDeleted', { anchorDeleted: id });
    return result;
  }

  @Mutation('assignAssetToAnchor')
  async assignAssetToAnchor(
    @Args('anchorId') anchorId: string,
    @Args('visualAssetId') visualAssetId: string,
    @Context() ctx: GqlContext
  ) {
    const authCtx = requireAuth(ctx);
    return this.service.assignAsset(anchorId, visualAssetId, authCtx);
  }

  @Mutation('syncAnchors')
  async syncAnchors(
    @Args('mediaAssetId') mediaAssetId: string,
    @Context() ctx: GqlContext
  ) {
    const authCtx = requireAuth(ctx);
    return this.service.syncAnchors(mediaAssetId, authCtx);
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  @Subscription('anchorDeleted', {
    filter: (payload: { anchorDeleted: string; mediaAssetId: string }, vars: { mediaAssetId: string }) =>
      payload.mediaAssetId === vars.mediaAssetId,
    resolve: (payload: { anchorDeleted: string }) => payload.anchorDeleted,
  })
  anchorDeleted(@Args('mediaAssetId') _mediaAssetId: string) {
    return pubSub.asyncIterableIterator('anchorDeleted');
  }

  @Subscription('anchorCreated', {
    filter: (
      payload: { anchorCreated: unknown; mediaAssetId: string },
      vars: { mediaAssetId: string }
    ) => payload.mediaAssetId === vars.mediaAssetId,
    resolve: (payload: { anchorCreated: unknown }) => payload.anchorCreated,
  })
  anchorCreated(@Args('mediaAssetId') _mediaAssetId: string) {
    return pubSub.asyncIterableIterator('anchorCreated');
  }
}
