import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID, randomBytes } from 'crypto';
import { minioConfig } from '@edusphere/config';
import { HlsManifestService } from './hls-manifest.service';

export interface HlsResult {
  /** MinIO key for the .m3u8 master manifest */
  manifestKey: string;
  /** MinIO keys for all variant playlists + .ts segments */
  segmentKeys: string[];
  /** Total video duration in seconds (parsed from FFmpeg stderr) */
  duration: number;
}

const VIDEO_MIME_PREFIXES = ['video/'];
const PRESIGNED_EXPIRY_SECONDS = 3600;

@Injectable()
export class HlsService {
  private readonly logger = new Logger(HlsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly manifest: HlsManifestService) {
    this.s3 = new S3Client({
      endpoint: minioConfig.endpoint,
      region: minioConfig.region,
      credentials: {
        accessKeyId: minioConfig.accessKey,
        secretAccessKey: minioConfig.secretKey,
      },
      forcePathStyle: true,
    });
    this.bucket = minioConfig.bucket;
    this.logger.log(`HlsService initialized: bucket=${this.bucket}`);
  }

  /**
   * Transcodes a source video from MinIO into adaptive HLS (3 renditions)
   * and uploads all segments + manifests back to MinIO.
   *
   * Returns the master manifest key and list of all segment keys.
   * Skips silently (returns null) if the source file is not a video.
   */
  async transcodeToHls(
    sourceKey: string,
    outputPrefix: string
  ): Promise<HlsResult | null> {
    const contentType = this.manifest.inferContentType(sourceKey);
    if (!VIDEO_MIME_PREFIXES.some((p) => contentType.startsWith(p))) {
      this.logger.debug(
        `Skipping HLS transcode for non-video asset: key=${sourceKey} type=${contentType}`
      );
      return null;
    }

    const workDir = join(tmpdir(), `hls-${randomUUID()}`);
    let sourcePath: string | null = null;

    try {
      await mkdir(workDir, { recursive: true });
      sourcePath = join(
        workDir,
        `source-${randomBytes(8).toString('hex')}.mp4`
      );

      // Step 1 -- Download source from MinIO
      this.logger.log(`HLS: downloading source key=${sourceKey}`);
      await this.downloadFromMinIO(sourceKey, sourcePath);

      // Step 2 -- Run FFmpeg (multi-rendition HLS)
      const outputDir = join(workDir, 'output');
      await mkdir(outputDir, { recursive: true });
      const duration = await this.manifest.runFFmpeg(sourcePath, outputDir);
      this.logger.log(
        `HLS: FFmpeg complete duration=${duration}s key=${sourceKey}`
      );

      // Step 3 -- Write master manifest
      const masterManifest = this.manifest.buildMasterManifest();
      const masterPath = join(outputDir, 'master.m3u8');
      const { writeFile } = await import('fs/promises');
      await writeFile(masterPath, masterManifest, 'utf-8');

      // Step 4 -- Upload everything to MinIO
      const segmentKeys = await this.manifest.uploadDirectory(
        outputDir,
        outputPrefix
      );
      const manifestKey = `${outputPrefix}/master.m3u8`;

      this.logger.log(
        `HLS: uploaded ${segmentKeys.length} files; manifest=${manifestKey}`
      );

      return { manifestKey, segmentKeys, duration };
    } finally {
      await this.manifest
        .cleanupDir(workDir)
        .catch((e) =>
          this.logger.warn(`HLS: failed to clean up workDir=${workDir}`, e)
        );
    }
  }

  /**
   * Returns a short-lived presigned URL for accessing the HLS master manifest.
   */
  async getManifestPresignedUrl(manifestKey: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: manifestKey,
    });
    return getSignedUrl(this.s3, command, {
      expiresIn: PRESIGNED_EXPIRY_SECONDS,
    });
  }

  private async downloadFromMinIO(
    key: string,
    destPath: string
  ): Promise<void> {
    const { Body } = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );
    if (!Body) {
      throw new Error(`Empty response body for MinIO key: ${key}`);
    }
    const { pipeline } = await import('stream/promises');
    const { createWriteStream } = await import('fs');
    await pipeline(Body as NodeJS.ReadableStream, createWriteStream(destPath));
  }
}
