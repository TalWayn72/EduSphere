import {
  Injectable,
  Logger,
  InternalServerErrorException,
  OnModuleDestroy,
  NotFoundException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { connect, StringCodec } from 'nats';
import { and, eq, isNotNull } from 'drizzle-orm';
import { createDatabaseConnection, schema, closeAllPools } from '@edusphere/db';
import { minioConfig } from '@edusphere/config';

const PRESIGNED_URL_EXPIRY_SECONDS = 900; // 15 minutes

interface PresignedUploadResult {
  uploadUrl: string;
  fileKey: string;
  expiresAt: string;
}

interface MediaAssetResult {
  id: string;
  courseId: string;
  fileKey: string;
  title: string;
  contentType: string;
  status: string;
  downloadUrl: string | null;
  hlsManifestUrl: string | null;
  captionsUrl: string | null;
  altText: string | null;
}

@Injectable()
export class MediaService implements OnModuleDestroy {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();

  constructor() {
    this.bucket = minioConfig.bucket;

    this.s3 = new S3Client({
      endpoint: `http://${minioConfig.endpoint}:${minioConfig.port}`,
      region: minioConfig.region,
      credentials: {
        accessKeyId: minioConfig.accessKey,
        secretAccessKey: minioConfig.secretKey,
      },
      forcePathStyle: true, // Required for MinIO
      // Disable automatic CRC32 checksum in presigned URLs — MinIO does not
      // require it and browsers cannot compute/send the correct value.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });

    this.logger.log(
      `MediaService initialized: bucket=${this.bucket} endpoint=${minioConfig.endpoint}`
    );
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
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
      const uploadUrl = await getSignedUrl(this.s3, command, {
        expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
      });

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
      return await getSignedUrl(this.s3, command, {
        expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
      });
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
    const contentType = this.extractContentTypeFromKey(fileKey);

    // UUID regex — 'draft' or any non-UUID courseId is stored as null
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const resolvedCourseId = uuidRe.test(courseId) ? courseId : null;

    const [asset] = await this.db
      .insert(schema.media_assets)
      .values({
        tenant_id: tenantId,
        course_id: resolvedCourseId,
        title,
        media_type: this.detectMediaType(contentType),
        file_url: fileKey,
        transcription_status: 'PENDING',
        metadata: { uploadedById, contentType },
      })
      .returning();

    this.logger.log(
      `Media asset confirmed: id=${asset?.id} course=${courseId}`
    );

    // Publish media.uploaded so the transcription worker can process the file
    if (asset?.id) {
      await this.publishMediaUploaded({
        assetId: asset.id,
        fileKey,
        courseId,
        tenantId,
        fileName: title,
        contentType,
      });
    }

    let downloadUrl: string | null = null;
    try {
      downloadUrl = await this.getPresignedDownloadUrl(fileKey);
    } catch {
      this.logger.warn(
        `Could not generate download URL for asset ${asset?.id}`
      );
    }

    return {
      id: asset?.id ?? '',
      courseId: asset?.course_id ?? courseId,
      fileKey,
      title,
      contentType,
      status: 'READY',
      downloadUrl,
      // HLS manifest key is null at upload time; set later by the transcoding worker
      hlsManifestUrl: null,
      captionsUrl: null,
      altText: null,
    };
  }

  /**
   * Generates a short-lived presigned URL for the HLS master manifest stored
   * at `hlsManifestKey` in MinIO.  Returns null if the key is absent.
   */

  async updateAltText(
    mediaId: string,
    altText: string,
    tenantId: string
  ): Promise<MediaAssetResult> {
    const [updated] = await this.db
      .update(schema.media_assets)
      .set({ alt_text: altText })
      .where(eq(schema.media_assets.id, mediaId))
      .returning();
    if (!updated) {
      throw new NotFoundException('Media asset ' + mediaId + ' not found');
    }
    this.logger.log(
      'Alt-text updated: mediaId=' + mediaId + ' tenant=' + tenantId
    );
    let downloadUrl: string | null = null;
    try {
      downloadUrl = await this.getPresignedDownloadUrl(updated.file_url);
    } catch {
      this.logger.warn('Could not generate download URL for asset ' + mediaId);
    }
    const contentType = this.extractContentTypeFromKey(updated.file_url);
    return {
      id: updated.id,
      courseId: updated.course_id ?? '',
      fileKey: updated.file_url,
      title: updated.title,
      contentType,
      status: 'READY',
      downloadUrl,
      hlsManifestUrl: null,
      captionsUrl: null,
      altText: updated.alt_text ?? null,
    };
  }

  async getHlsManifestUrl(
    hlsManifestKey: string | null
  ): Promise<string | null> {
    if (!hlsManifestKey) return null;
    try {
      return await this.getPresignedDownloadUrl(hlsManifestKey);
    } catch (err) {
      this.logger.warn(
        `Could not generate HLS manifest URL for key=${hlsManifestKey}`,
        err
      );
      return null;
    }
  }

  /**
   * Returns available translated subtitle tracks for a media asset.
   * Only returns tracks where vtt_key is set (VTT file has been generated).
   */
  async getSubtitleTracks(
    assetId: string
  ): Promise<{ language: string; label: string; src: string }[]> {
    const LANG_LABELS: Record<string, string> = {
      en: 'English',
      he: 'Hebrew',
      ar: 'Arabic',
      fr: 'French',
      de: 'German',
      es: 'Spanish',
      ru: 'Russian',
    };

    const transcripts = await this.db
      .select({
        language: schema.transcripts.language,
        vttKey: schema.transcripts.vtt_key,
      })
      .from(schema.transcripts)
      .where(
        and(
          eq(schema.transcripts.asset_id, assetId),
          isNotNull(schema.transcripts.vtt_key)
        )
      );

    const tracks: { language: string; label: string; src: string }[] = [];
    for (const t of transcripts) {
      if (!t.vttKey) continue;
      try {
        const src = await this.getPresignedDownloadUrl(t.vttKey);
        tracks.push({
          language: t.language,
          label: LANG_LABELS[t.language] ?? t.language.toUpperCase(),
          src,
        });
      } catch {
        this.logger.warn(
          `Could not generate VTT URL for assetId=${assetId} lang=${t.language}`
        );
      }
    }
    return tracks;
  }

  private async publishMediaUploaded(payload: {
    assetId: string;
    fileKey: string;
    courseId: string;
    tenantId: string;
    fileName: string;
    contentType: string;
  }): Promise<void> {
    const natsUrl = process.env.NATS_URL ?? 'nats://localhost:4222';
    let nc;
    try {
      nc = await connect({ servers: natsUrl });
      nc.publish(
        'EDUSPHERE.media.uploaded',
        this.sc.encode(JSON.stringify(payload))
      );
      await nc.flush();
      this.logger.debug(
        `Published EDUSPHERE.media.uploaded: assetId=${payload.assetId}`
      );
    } catch (err) {
      // Non-fatal: transcription failure does not block upload confirmation
      this.logger.error(
        'Failed to publish EDUSPHERE.media.uploaded to NATS',
        err
      );
    } finally {
      if (nc) await nc.close().catch(() => undefined);
    }
  }

  private extractContentTypeFromKey(fileKey: string): string {
    const ext = fileKey.split('.').pop()?.toLowerCase() ?? '';
    const mimeMap: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
    };
    return mimeMap[ext as keyof typeof mimeMap] ?? 'application/octet-stream';
  }

  private detectMediaType(contentType: string): 'VIDEO' | 'AUDIO' | 'DOCUMENT' {
    if (contentType.startsWith('video/')) return 'VIDEO';
    if (contentType.startsWith('audio/')) return 'AUDIO';
    return 'DOCUMENT';
  }
}
