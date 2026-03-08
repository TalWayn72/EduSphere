import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { closeAllPools } from '@edusphere/db';
import { minioConfig } from '@edusphere/config';
import { TenantAnalyticsService } from './tenant-analytics.service.js';
import type { AnalyticsPeriod } from './tenant-analytics.types.js';

const PRESIGNED_URL_EXPIRY_SECONDS = 900; // 15 minutes

@Injectable()
export class TenantAnalyticsExportService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantAnalyticsExportService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly analyticsService: TenantAnalyticsService) {
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
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async exportToCSV(
    tenantId: string,
    userId: string,
    period: string
  ): Promise<string> {
    this.logger.log(
      `[TenantAnalyticsExportService] exportToCSV tenantId=${tenantId} period=${period}`
    );

    const analytics = await this.analyticsService.getTenantAnalytics(
      tenantId,
      userId,
      period as AnalyticsPeriod
    );

    // Build CSV — header + data rows from activeLearnersTrend
    // GDPR: no raw user_id UUIDs in CSV — only aggregate date-level data
    const lines: string[] = ['Date,ActiveLearners,Completions'];
    const completionMap = new Map(
      analytics.completionRateTrend.map((c) => [c.date, c.value])
    );
    for (const metric of analytics.activeLearnersTrend) {
      const completionRate = completionMap.get(metric.date) ?? 0;
      lines.push(`${metric.date},${metric.value},${completionRate}`);
    }
    const csvContent = lines.join('\n');

    // Upload to MinIO
    const key = `${tenantId}/analytics-exports/${Date.now()}-analytics.csv`;
    const putCommand = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: csvContent,
      ContentType: 'text/csv',
    });

    try {
      await this.s3.send(putCommand);
      this.logger.debug(
        `[TenantAnalyticsExportService] Uploaded analytics CSV: key=${key}`
      );
    } catch (err) {
      this.logger.error(
        `[TenantAnalyticsExportService] Failed to upload CSV to MinIO: ${String(err)}`
      );
      throw err;
    }

    // Generate pre-signed download URL (15 min TTL)
    const getCommand = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(this.s3, getCommand, {
      expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
    });

    this.logger.log(
      `[TenantAnalyticsExportService] Pre-signed URL generated for key=${key}`
    );
    return presignedUrl;
  }
}
