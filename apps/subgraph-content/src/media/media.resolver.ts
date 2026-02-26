import {
  Resolver,
  Query,
  Mutation,
  ResolveField,
  Parent,
  Args,
  Context,
} from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { MediaService } from './media.service';
import type { GraphQLContext } from '../auth/auth.middleware';

@Resolver('MediaAsset')
export class MediaResolver {
  private readonly logger = new Logger(MediaResolver.name);

  constructor(private readonly mediaService: MediaService) {}

  @Query('getPresignedUploadUrl')
  async getPresignedUploadUrl(
    @Args('fileName') fileName: string,
    @Args('contentType') contentType: string,
    @Args('courseId') courseId: string,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth) {
      throw new UnauthorizedException('Authentication required');
    }

    const tenantId = auth.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context missing');
    }

    this.logger.debug(
      `getPresignedUploadUrl: tenant=${tenantId} course=${courseId} file=${fileName}`
    );

    return this.mediaService.getPresignedUploadUrl(
      fileName,
      contentType,
      courseId,
      tenantId
    );
  }

  @Mutation('confirmMediaUpload')
  async confirmMediaUpload(
    @Args('fileKey') fileKey: string,
    @Args('courseId') courseId: string,
    @Args('title') title: string,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth) {
      throw new UnauthorizedException('Authentication required');
    }

    const tenantId = auth.tenantId;
    const userId = auth.userId;

    if (!tenantId || !userId) {
      throw new UnauthorizedException('Tenant or user context missing');
    }

    this.logger.log(
      `confirmMediaUpload: tenant=${tenantId} course=${courseId} key=${fileKey}`
    );

    return this.mediaService.confirmUpload(
      fileKey,
      courseId,
      title,
      tenantId,
      userId
    );
  }

  @Mutation('updateMediaAltText')
  async updateMediaAltText(
    @Args('mediaId') mediaId: string,
    @Args('altText') altText: string,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth) throw new UnauthorizedException('Authentication required');
    const tenantId = auth.tenantId;
    if (!tenantId) throw new UnauthorizedException('Tenant context missing');
    this.logger.log(
      'updateMediaAltText: mediaId=' + mediaId + ' tenant=' + tenantId
    );
    return this.mediaService.updateAltText(mediaId, altText, tenantId);
  }

  /**
   * Field resolver: generates a presigned URL for the HLS master manifest.
   * The parent object must expose a `hlsManifestKey` (internal DB key).
   * Returns null when HLS transcoding has not yet completed.
   */
  @ResolveField('hlsManifestUrl')
  async resolveHlsManifestUrl(
    @Parent()
    parent: {
      hlsManifestUrl: string | null;
      hlsManifestKey?: string | null;
    }
  ): Promise<string | null> {
    // If already resolved (e.g. from confirmUpload) return directly
    if (parent.hlsManifestUrl !== undefined) return parent.hlsManifestUrl;
    return this.mediaService.getHlsManifestUrl(parent.hlsManifestKey ?? null);
  }
}
