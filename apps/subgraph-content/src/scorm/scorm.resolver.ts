import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import {
  UnauthorizedException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ScormSessionService } from './scorm-session.service';
import { ScormImportService } from './scorm-import.service';
import { ScormExportService } from './scorm-export.service';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import type { GraphQLContext } from '../auth/auth.middleware';
import type { TenantContext } from '@edusphere/db';

interface AuthRequired {
  userId: string;
  tenantId: string;
  roles: string[];
}

@Resolver()
export class ScormResolver {
  private readonly logger = new Logger(ScormResolver.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly sessionService: ScormSessionService,
    private readonly importService: ScormImportService,
    private readonly exportService: ScormExportService
  ) {
    const endpoint = process.env.MINIO_ENDPOINT ?? 'http://localhost:9000';
    this.bucket = process.env.MINIO_BUCKET ?? 'edusphere-media';
    this.s3 = new S3Client({
      endpoint,
      region: process.env.MINIO_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  private requireAuth(ctx: GraphQLContext): AuthRequired {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      userId: auth.userId,
      tenantId: auth.tenantId,
      roles: auth.roles ?? [],
    };
  }

  @Query('myScormSession')
  async myScormSession(
    @Args('contentItemId') contentItemId: string,
    @Context() ctx: GraphQLContext
  ) {
    const auth = this.requireAuth(ctx);
    return this.sessionService.findSession(auth.userId, contentItemId);
  }

  @Mutation('initScormSession')
  async initScormSession(
    @Args('contentItemId') contentItemId: string,
    @Context() ctx: GraphQLContext
  ) {
    const auth = this.requireAuth(ctx);
    this.logger.log(
      `initScormSession: contentItemId=${contentItemId} userId=${auth.userId}`
    );
    return this.sessionService.initSession(
      auth.userId,
      contentItemId,
      auth.tenantId
    );
  }

  @Mutation('updateScormSession')
  async updateScormSession(
    @Args('sessionId') sessionId: string,
    @Args('data') dataJson: string,
    @Context() ctx: GraphQLContext
  ): Promise<boolean> {
    const auth = this.requireAuth(ctx);
    let cmiData: Record<string, string>;
    try {
      cmiData = JSON.parse(dataJson) as Record<string, string>;
    } catch {
      throw new BadRequestException('data must be valid JSON');
    }
    await this.sessionService.updateSession(sessionId, auth.userId, cmiData);
    return true;
  }

  @Mutation('finishScormSession')
  async finishScormSession(
    @Args('sessionId') sessionId: string,
    @Args('data') dataJson: string,
    @Context() ctx: GraphQLContext
  ): Promise<boolean> {
    const auth = this.requireAuth(ctx);
    let cmiData: Record<string, string>;
    try {
      cmiData = JSON.parse(dataJson) as Record<string, string>;
    } catch {
      throw new BadRequestException('data must be valid JSON');
    }
    await this.sessionService.finishSession(sessionId, auth.userId, cmiData);
    return true;
  }

  @Mutation('importScormPackage')
  async importScormPackage(
    @Args('fileKey') fileKey: string,
    @Context() ctx: GraphQLContext
  ) {
    const auth = this.requireAuth(ctx);
    this.logger.log(
      `importScormPackage: fileKey=${fileKey} userId=${auth.userId}`
    );

    // Fetch ZIP buffer from MinIO
    const response = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: fileKey })
    );
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const zipBuffer = Buffer.concat(chunks);

    return this.importService.importScormPackage(
      zipBuffer,
      auth.tenantId,
      auth.userId
    );
  }

  @Mutation('exportCourseAsScorm')
  async exportCourseAsScorm(
    @Args('courseId') courseId: string,
    @Context() ctx: GraphQLContext
  ): Promise<string> {
    const auth = this.requireAuth(ctx);
    this.logger.log(
      `exportCourseAsScorm: courseId=${courseId} userId=${auth.userId}`
    );
    const tenantCtx: TenantContext = {
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: (auth.roles[0] ?? 'STUDENT') as TenantContext['userRole'],
    };
    return this.exportService.exportCourse(courseId, tenantCtx);
  }
}
