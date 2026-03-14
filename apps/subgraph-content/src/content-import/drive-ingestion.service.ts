/**
 * DriveIngestionService — downloads Google Drive files, uploads to MinIO,
 * creates content records, and publishes NATS events.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { connect, StringCodec } from 'nats';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { minioConfig } from '@edusphere/config';
import { buildNatsOptions } from '@edusphere/nats-client';
import { GoogleDriveClient } from './google-drive.client';
import type { DriveFile } from './google-drive.client';

interface DriveImportInput {
  folderId: string;
  courseId: string;
  moduleId: string;
  accessToken: string;
}

@Injectable()
export class DriveIngestionService implements OnModuleDestroy {
  private readonly logger = new Logger(DriveIngestionService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private readonly s3: S3Client;
  private readonly bucket: string;
  readonly activeJobs = new Map<string, AbortController>();
  private readonly MAX_ACTIVE_JOBS = 50;

  constructor(private readonly driveClient: GoogleDriveClient) {
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

  async startImport(
    input: DriveImportInput, tenantId: string, userId: string,
  ): Promise<{ id: string; status: string; lessonCount: number; estimatedMinutes: number | null }> {
    const jobId = `drive-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const abort = new AbortController();
    this.logger.log({ jobId, folderId: input.folderId, tenantId, userId }, 'Starting Drive import');

    if (this.activeJobs.size >= this.MAX_ACTIVE_JOBS) {
      const oldest = this.activeJobs.keys().next().value;
      if (oldest !== undefined) this.activeJobs.delete(oldest);
    }
    this.activeJobs.set(jobId, abort);

    const task = this.processFiles(jobId, input, tenantId, userId, abort.signal);
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Drive import timeout')), 5 * 60 * 1000),
    );
    void Promise.race([task, timeout])
      .catch((err: unknown) => this.logger.error({ jobId, err }, 'Drive import failed'))
      .finally(() => this.activeJobs.delete(jobId));

    return { id: jobId, status: 'PENDING', lessonCount: 0, estimatedMinutes: 5 };
  }

  cancelJob(jobId: string): boolean {
    const ctrl = this.activeJobs.get(jobId);
    if (!ctrl) {
      this.logger.warn({ jobId }, 'cancelJob: not found or completed');
      return false;
    }
    ctrl.abort();
    this.activeJobs.delete(jobId);
    this.logger.log({ jobId }, 'cancelJob: aborted');
    return true;
  }

  private async processFiles(
    jobId: string, input: DriveImportInput, tenantId: string, userId: string, signal: AbortSignal,
  ): Promise<void> {
    const files = await this.driveClient.listFolderContents(input.folderId, input.accessToken);
    this.logger.log({ jobId, fileCount: files.length }, 'Drive files listed');
    for (const file of files) {
      if (signal.aborted) { this.logger.log({ jobId }, 'Drive import cancelled'); return; }
      await this.ingestFile(jobId, file, input, tenantId, userId);
    }
  }

  private async ingestFile(
    jobId: string, file: DriveFile, input: DriveImportInput, tenantId: string, userId: string,
  ): Promise<void> {
    const fileKey = `${tenantId}/${input.courseId}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const buffer = await this.driveClient.downloadFile(file.id, input.accessToken);

    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: fileKey, Body: buffer, ContentType: file.mimeType }));

    const ctx: TenantContext = { tenantId, userId, userRole: 'INSTRUCTOR' };
    await withTenantContext(this.db, ctx, (tx) =>
      tx.insert(schema.contentItems).values({
        moduleId: input.moduleId,
        title: file.name,
        type: this.mapMime(file.mimeType),
        content: fileKey,
      }),
    );
    await this.publishEvent(tenantId, jobId, file.name, fileKey);
    this.logger.log({ jobId, fileName: file.name, fileKey }, 'Drive file ingested');
  }

  private mapMime(mime: string): 'VIDEO' | 'AUDIO' | 'PDF' | 'LINK' {
    if (mime.startsWith('video/')) return 'VIDEO';
    if (mime.startsWith('audio/')) return 'AUDIO';
    if (mime === 'application/pdf') return 'PDF';
    return 'LINK';
  }

  private async publishEvent(tenantId: string, jobId: string, fileName: string, fileKey: string): Promise<void> {
    let nc;
    try {
      nc = await connect(buildNatsOptions());
      nc.publish('EDUSPHERE.content.import.completed', this.sc.encode(JSON.stringify({ tenantId, jobId, fileName, fileKey })));
      await nc.flush();
    } catch (err) {
      this.logger.error({ jobId, err }, 'Failed to publish import.completed');
    } finally {
      if (nc) await nc.close().catch(() => undefined);
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const [jobId, ctrl] of this.activeJobs) {
      ctrl.abort();
      this.logger.log({ jobId }, 'Aborting import on shutdown');
    }
    this.activeJobs.clear();
    await closeAllPools();
  }
}
