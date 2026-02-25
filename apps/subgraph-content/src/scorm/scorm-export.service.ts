import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import AdmZip from 'adm-zip';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext, ContentItem } from '@edusphere/db';
import { sql } from 'drizzle-orm';
import {
  generateManifest2004,
  injectScormApiShim,
  buildVideoHtml,
  buildQuizHtml,
  SCORM_2004_API_SHIM,
} from './scorm-manifest.generator';
import type { CourseData } from './scorm-manifest.generator';

const EXPORT_URL_EXPIRY_SECONDS = 86_400; // 24 hours

@Injectable()
export class ScormExportService implements OnModuleDestroy {
  private readonly logger = new Logger(ScormExportService.name);
  private readonly db = createDatabaseConnection();
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
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

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async exportCourse(courseId: string, tenantCtx: TenantContext): Promise<string> {
    // 1. Fetch course and content items under RLS
    const { course, items } = await withTenantContext(this.db, tenantCtx, async (tx) => {
      const [courseRow] = await tx
        .select()
        .from(schema.courses)
        .where(
          and(
            eq(schema.courses.id, courseId),
            eq(schema.courses.tenant_id, tenantCtx.tenantId),
            sql`${schema.courses.deleted_at} IS NULL`,
          ),
        )
        .limit(1);

      if (!courseRow) throw new NotFoundException(`Course ${courseId} not found`);

      const moduleRows = await tx
        .select()
        .from(schema.modules)
        .where(
          and(
            eq(schema.modules.course_id, courseId),
            sql`${schema.modules.deleted_at} IS NULL`,
          ),
        );

      const moduleIds = moduleRows.map((m) => m.id);
      const contentRows: ContentItem[] =
        moduleIds.length > 0
          ? await tx
              .select()
              .from(schema.contentItems)
              .where(sql`${schema.contentItems.moduleId} = ANY(${moduleIds})`)
              .orderBy(schema.contentItems.orderIndex)
          : [];

      return {
        course: {
          id: courseRow.id,
          title: courseRow.title,
          description: courseRow.description ?? null,
        } satisfies CourseData,
        items: contentRows,
      };
    });

    // 2. Build ZIP
    const zip = new AdmZip();

    // 3. Add imsmanifest.xml
    const manifest = generateManifest2004(course, items);
    zip.addFile('imsmanifest.xml', Buffer.from(manifest, 'utf-8'));

    // 4. Add SCORM API shim
    zip.addFile('scorm-api.js', Buffer.from(SCORM_2004_API_SHIM, 'utf-8'));

    // 5. Add content files per item type
    for (const item of items) {
      await this.addContentItemToZip(zip, item);
    }

    // 6. Upload to MinIO
    const timestamp = Date.now();
    const key = `scorm-exports/${tenantCtx.tenantId}/${courseId}-${timestamp}.zip`;
    const zipBuffer = zip.toBuffer();

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: zipBuffer,
        ContentType: 'application/zip',
      }),
    );

    this.logger.log(`SCORM export uploaded: key=${key} size=${zipBuffer.length} bytes`);

    // 7. Return presigned download URL (24h)
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: EXPORT_URL_EXPIRY_SECONDS });
  }

  private async addContentItemToZip(zip: AdmZip, item: ContentItem): Promise<void> {
    const dir = `content/${item.id}`;

    if (item.type === 'VIDEO') {
      const html = injectScormApiShim(buildVideoHtml(item));
      zip.addFile(`${dir}/video.html`, Buffer.from(html, 'utf-8'));
      return;
    }

    if (item.type === 'QUIZ') {
      const html = injectScormApiShim(buildQuizHtml(item));
      zip.addFile(`${dir}/quiz.html`, Buffer.from(html, 'utf-8'));
      return;
    }

    if (item.type === 'PDF' && item.content) {
      try {
        const parsed = JSON.parse(item.content) as { minioKey?: string };
        if (parsed.minioKey) {
          const docBuffer = await this.downloadFromMinio(parsed.minioKey);
          zip.addFile(`${dir}/document.pdf`, docBuffer);
          return;
        }
      } catch {
        this.logger.warn(`Could not parse content JSON for item ${item.id}`);
      }
    }

    if (item.type === 'MARKDOWN' && item.content) {
      const parsed = JSON.parse(item.content ?? '{}') as { text?: string };
      const mdHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${item.title}</title></head><body><pre>${parsed.text ?? ''}</pre></body></html>`;
      zip.addFile(`${dir}/document.html`, Buffer.from(injectScormApiShim(mdHtml), 'utf-8'));
      return;
    }

    if (item.type === 'SCORM') return; // Already packaged — skip

    // Fallback placeholder
    const placeholder = injectScormApiShim(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${item.title}</title></head><body><p>Content: ${item.title}</p></body></html>`,
    );
    zip.addFile(`${dir}/index.html`, Buffer.from(placeholder, 'utf-8'));
  }

  private async downloadFromMinio(key: string): Promise<Buffer> {
    const response = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}
