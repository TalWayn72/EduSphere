import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions, CircuitBreaker } from '@edusphere/nats-client';
import { createDatabaseConnection, schema, closeAllPools } from '@edusphere/db';
import { minioConfig } from '@edusphere/config';
import {
  PRESIGNED_URL_EXPIRY_SECONDS,
  VALID_MODEL_FORMATS,
  extractContentTypeFromKey,
  detectMediaType,
  contentTypeForModelFormat,
  UUID_RE,
  type ModelFormat,
  type PresignedUploadResult,
  type MediaAssetResult,
  type Model3DUploadResult,
} from './media-helpers';
import { MediaQueriesService } from './media-queries.service';

export type { PresignedUploadResult, MediaAssetResult, Model3DUploadResult };

@Injectable()
export class MediaService implements OnModuleDestroy {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private natsConn: NatsConnection | null = null;
  private readonly minioBreaker = new CircuitBreaker({
    name: 'MinIO',
    failureThreshold: 5,
    resetTimeout: 30_000,
    logger: {
      warn: (msg: string) => this.logger.warn(msg),
      error: (msg: string) => this.logger.error(msg),
      info: (msg: string) => this.logger.log(msg),
    },
  });

  constructor(private readonly queriesService: MediaQueriesService) {
    this.bucket = minioConfig.bucket;
    this.s3 = new S3Client({
      endpoint: `http://${minioConfig.endpoint}:${minioConfig.port}`,
      region: minioConfig.region,
      credentials: {
        accessKeyId: minioConfig.accessKey,
        secretAccessKey: minioConfig.secretKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
    this.logger.log(
      `MediaService initialized: bucket=${this.bucket} endpoint=${minioConfig.endpoint}`
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.natsConn) {
      await this.natsConn.drain().catch(() => undefined);
      this.natsConn = null;
    }
    await closeAllPools();
  }

  private async getNatsConnection(): Promise<NatsConnection> {
    if (!this.natsConn || this.natsConn.isClosed()) {
      this.natsConn = await connect(buildNatsOptions());
    }
    return this.natsConn;
  }

  async getPresignedUploadUrl(
    fileName: string,
    contentType: string,
    courseId: string,
    tenantId: string
  ): Promise<PresignedUploadResult> {
    const fileId = randomUUID();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `${tenantId}/${courseId}/${fileId}-${sanitizedName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: contentType,
    });

    try {
      const uploadUrl = await this.minioBreaker.execute(() =>
        getSignedUrl(this.s3, command, {
          expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
        })
      );
      const expiresAt = new Date(
        Date.now() + PRESIGNED_URL_EXPIRY_SECONDS * 1000
      ).toISOString();
      this.logger.debug(`Presigned upload URL generated: key=${fileKey}`);
      return { uploadUrl, fileKey, expiresAt };
    } catch (error) {
      this.logger.error(`Failed to generate presigned upload URL: ${error}`);
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
  }

  async getPresignedDownloadUrl(fileKey: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });
    try {
      return await this.minioBreaker.execute(() =>
        getSignedUrl(this.s3, command, {
          expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
        })
      );
    } catch (error) {
      this.logger.error(`Failed to generate presigned download URL: ${error}`);
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }

  async confirmUpload(
    fileKey: string,
    courseId: string,
    title: string,
    tenantId: string,
    uploadedById: string
  ): Promise<MediaAssetResult> {
    const contentType = extractContentTypeFromKey(fileKey);
    const resolvedCourseId = UUID_RE.test(courseId) ? courseId : null;

    const [asset] = await this.db
      .insert(schema.media_assets)
      .values({
        tenant_id: tenantId,
        course_id: resolvedCourseId,
        title,
        media_type: detectMediaType(contentType),
        file_url: fileKey,
        transcription_status: 'PENDING',
        metadata: { uploadedById, contentType },
      })
      .returning();

    this.logger.log(`Media asset confirmed: id=${asset?.id} course=${courseId}`);

    if (asset?.id) {
      await this.publishMediaUploaded({
        assetId: asset.id, fileKey, courseId, tenantId,
        fileName: title, contentType,
      });
    }

    let downloadUrl: string | null = null;
    try {
      downloadUrl = await this.getPresignedDownloadUrl(fileKey);
    } catch {
      this.logger.warn(`Could not generate download URL for asset ${asset?.id}`);
    }

    return {
      id: asset?.id ?? '', courseId: asset?.course_id ?? courseId,
      fileKey, title, contentType, status: 'READY', downloadUrl,
      hlsManifestUrl: null, captionsUrl: null, altText: null,
    };
  }

  async updateAltText(
    mediaId: string,
    altText: string,
    tenantId: string
  ): Promise<MediaAssetResult> {
    return this.queriesService.updateAltText(
      mediaId, altText, tenantId,
      (key) => this.getPresignedDownloadUrl(key)
    );
  }

  async getHlsManifestUrl(
    hlsManifestKey: string | null
  ): Promise<string | null> {
    if (!hlsManifestKey) return null;
    try {
      return await this.getPresignedDownloadUrl(hlsManifestKey);
    } catch (err) {
      this.logger.warn(
        `Could not generate HLS manifest URL for key=${hlsManifestKey}`, err
      );
      return null;
    }
  }

  async getSubtitleTracks(
    assetId: string
  ): Promise<{ language: string; label: string; src: string }[]> {
    return this.queriesService.getSubtitleTracks(
      assetId, (key) => this.getPresignedDownloadUrl(key)
    );
  }

  async createModel3DUpload(
    courseId: string,
    lessonId: string,
    filename: string,
    format: string,
    contentLength: number,
    tenantId: string,
    userId: string
  ): Promise<Model3DUploadResult> {
    const normalizedFormat = format.toLowerCase() as ModelFormat;
    if (!VALID_MODEL_FORMATS.includes(normalizedFormat)) {
      throw new BadRequestException(
        `Unsupported 3D model format "${format}". Allowed: ${VALID_MODEL_FORMATS.join(', ')}`
      );
    }

    const fileId = randomUUID();
    const sanitizedName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${tenantId}/${courseId}/${fileId}-${sanitizedName}`;
    const contentType = contentTypeForModelFormat(normalizedFormat);

    const command = new PutObjectCommand({
      Bucket: this.bucket, Key: key,
      ContentType: contentType, ContentLength: contentLength,
    });

    let uploadUrl: string;
    try {
      uploadUrl = await this.minioBreaker.execute(() =>
        getSignedUrl(this.s3, command, { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS })
      );
    } catch (err) {
      this.logger.error(
        `createModel3DUpload: failed to generate presigned URL for key=${key}`, err
      );
      throw new InternalServerErrorException('Failed to generate 3D model upload URL');
    }

    const resolvedCourseId = UUID_RE.test(courseId) ? courseId : null;
    const resolvedModuleId = UUID_RE.test(lessonId) ? lessonId : null;

    const [asset] = await this.db
      .insert(schema.media_assets)
      .values({
        tenant_id: tenantId, course_id: resolvedCourseId,
        module_id: resolvedModuleId, title: sanitizedName,
        media_type: 'MODEL_3D', file_url: key,
        transcription_status: 'PENDING', model_format: normalizedFormat,
        model_animations: [], metadata: { uploadedById: userId, contentType },
      })
      .returning();

    const assetId = asset?.id ?? '';
    this.logger.log(
      `createModel3DUpload: assetId=${assetId} format=${normalizedFormat} course=${courseId} tenant=${tenantId}`
    );
    return { assetId, uploadUrl, key };
  }

  private async publishMediaUploaded(payload: {
    assetId: string; fileKey: string; courseId: string;
    tenantId: string; fileName: string; contentType: string;
  }): Promise<void> {
    try {
      const nc = await this.getNatsConnection();
      nc.publish('EDUSPHERE.media.uploaded', this.sc.encode(JSON.stringify(payload)));
      await nc.flush();
      this.logger.debug(`Published EDUSPHERE.media.uploaded: assetId=${payload.assetId}`);
    } catch (err) {
      this.logger.error('Failed to publish EDUSPHERE.media.uploaded to NATS', err);
      this.natsConn = null;
    }
  }
}
