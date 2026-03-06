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

  /**
   * Field resolver: returns available translated subtitle tracks.
   * Empty array when no translations have completed yet.
   */
  @ResolveField('subtitleTracks')
  async resolveSubtitleTracks(
    @Parent() parent: { id: string }
  ): Promise<{ language: string; label: string; src: string }[]> {
    try {
      return await this.mediaService.getSubtitleTracks(parent.id);
    } catch (err) {
      this.logger.warn(
        `resolveSubtitleTracks failed for assetId=${parent.id}`,
        err
      );
      return [];
    }
  }

  /**
   * Mutation: initiates a 3D model upload. Returns a presigned PUT URL valid
   * for 15 minutes along with the new asset ID and storage key.
   */
  @Mutation('uploadModel3D')
  async uploadModel3D(
    @Args('courseId') courseId: string,
    @Args('lessonId') lessonId: string,
    @Args('filename') filename: string,
    @Args('format') format: string,
    @Args('contentLength') contentLength: number,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth) throw new UnauthorizedException('Authentication required');
    const tenantId = auth.tenantId;
    const userId = auth.userId;
    if (!tenantId || !userId) {
      throw new UnauthorizedException('Tenant or user context missing');
    }
    this.logger.log(
      `uploadModel3D: tenant=${tenantId} course=${courseId} format=${format} file=${filename}`
    );
    return this.mediaService.createModel3DUpload(
      courseId,
      lessonId,
      filename,
      format,
      contentLength,
      tenantId,
      userId
    );
  }

  /**
   * Field resolver: maps 3D model DB fields to the Model3DInfo GraphQL type.
   * Returns null for non-MODEL_3D assets.
   */
  @ResolveField('model3d')
  resolveModel3d(
    @Parent()
    parent: {
      media_type?: string;
      model_format?: string | null;
      model_animations?: unknown;
      poly_count?: number | null;
    }
  ): {
    format: string;
    polyCount: number | null;
    animations: { name: string; duration: number }[];
  } | null {
    if (parent.media_type !== 'MODEL_3D' || !parent.model_format) {
      return null;
    }

    const rawAnimations = parent.model_animations;
    const animations: { name: string; duration: number }[] = Array.isArray(
      rawAnimations
    )
      ? (rawAnimations as { name: string; duration: number }[]).filter(
          (a) =>
            a &&
            typeof a.name === 'string' &&
            typeof a.duration === 'number'
        )
      : [];

    return {
      format: parent.model_format,
      polyCount: parent.poly_count ?? null,
      animations,
    };
  }
}
