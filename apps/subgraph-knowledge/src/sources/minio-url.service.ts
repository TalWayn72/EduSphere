/**
 * MinioUrlService
 *
 * Generates presigned GET URLs for files stored in MinIO (S3-compatible).
 * Used by KnowledgeSourceResolver to expose fileUrl for PDF viewing.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { minioConfig } from '@edusphere/config';

const DEFAULT_EXPIRY_SECONDS = 900; // 15 minutes

@Injectable()
export class MinioUrlService implements OnModuleDestroy {
  private readonly logger = new Logger(MinioUrlService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
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
      `MinioUrlService: bucket=${this.bucket}`
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.s3.destroy();
  }

  /** Generate a presigned GET URL for the given file key. */
  async getPresignedUrl(
    fileKey: string,
    expiresIn = DEFAULT_EXPIRY_SECONDS
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  /** Upload a buffer to MinIO and return the storage key. */
  async uploadFile(
    fileKey: string,
    buffer: Buffer,
    contentType: string
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      Body: buffer,
      ContentType: contentType,
      ContentLength: buffer.length,
    });
    await this.s3.send(command);
    this.logger.log(`Uploaded file: ${fileKey} (${buffer.length} bytes)`);
  }
}
