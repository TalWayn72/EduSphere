import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import {
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { createWriteStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

/**
 * Downloads objects from MinIO (S3-compatible) to a local temp file.
 * Env vars: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET, MINIO_REGION
 */
@Injectable()
export class MinioClient {
  private readonly logger = new Logger(MinioClient.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT ?? 'http://localhost:9000';
    const accessKeyId = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
    const secretAccessKey = process.env.MINIO_SECRET_KEY ?? 'minioadmin';
    this.bucket = process.env.MINIO_BUCKET ?? 'edusphere-media';

    this.s3 = new S3Client({
      endpoint,
      region: process.env.MINIO_REGION ?? 'us-east-1',
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });

    this.logger.log(`MinioClient: bucket=${this.bucket} endpoint=${endpoint}`);
  }

  /**
   * Downloads `fileKey` from MinIO and returns the local temp file path.
   * The caller is responsible for deleting the temp file after use.
   */
  async downloadToTemp(fileKey: string): Promise<string> {
    const ext = fileKey.split('.').pop() ?? 'bin';
    const tempPath = join(tmpdir(), `transcription-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);

    this.logger.debug(`Downloading s3://${this.bucket}/${fileKey} → ${tempPath}`);

    try {
      const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: fileKey });
      const { Body } = await this.s3.send(cmd);

      if (!Body) {
        throw new Error(`Empty body for key: ${fileKey}`);
      }

      await pipeline(Body as Readable, createWriteStream(tempPath));
      this.logger.debug(`Download complete: ${tempPath}`);
      return tempPath;
    } catch (err) {
      this.logger.error(`Failed to download ${fileKey} from MinIO`, err);
      throw new InternalServerErrorException(`MinIO download failed for key: ${fileKey}`);
    }
  }
}
