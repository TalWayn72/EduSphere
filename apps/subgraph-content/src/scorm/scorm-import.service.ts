import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import AdmZip from 'adm-zip';
import { randomUUID } from 'crypto';
import { createDatabaseConnection, schema, closeAllPools } from '@edusphere/db';
import { parseScormManifest } from './scorm-manifest.parser';

export interface ScormImportResult {
  courseId: string;
  itemCount: number;
}

const MIME_MAP: Record<string, string> = {
  html: 'text/html',
  htm: 'text/html',
  js: 'application/javascript',
  css: 'text/css',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  xml: 'application/xml',
  json: 'application/json',
  swf: 'application/x-shockwave-flash',
};

function getMime(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return (
    (Object.prototype.hasOwnProperty.call(MIME_MAP, ext)
      ? MIME_MAP[ext as keyof typeof MIME_MAP]
      : undefined) ?? 'application/octet-stream'
  );
}

@Injectable()
export class ScormImportService implements OnModuleDestroy {
  private readonly logger = new Logger(ScormImportService.name);
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

  async importScormPackage(
    zipBuffer: Buffer,
    tenantId: string,
    userId: string
  ): Promise<ScormImportResult> {
    // 1. Extract ZIP
    let zip: AdmZip;
    try {
      zip = new AdmZip(zipBuffer);
    } catch (e) {
      throw new BadRequestException(`Invalid ZIP file: ${String(e)}`);
    }

    // 2. Find and parse imsmanifest.xml
    const manifestEntry = zip.getEntry('imsmanifest.xml');
    if (!manifestEntry) {
      throw new BadRequestException(
        'ZIP does not contain imsmanifest.xml at root level'
      );
    }
    const manifestXml = manifestEntry.getData().toString('utf-8');
    const manifest = parseScormManifest(manifestXml);
    this.logger.log(
      `Parsed SCORM manifest: version=${manifest.version} title="${manifest.title}"`
    );

    // 3. Upload all files to MinIO
    const courseId = randomUUID();
    const minioPrefix = `scorm/${tenantId}/${courseId}`;
    await this.uploadZipContents(zip, minioPrefix);

    // 4. Create Course record (content.ts schema — snake_case fields)
    const slug = manifest.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 100);
    const [course] = await this.db
      .insert(schema.courses)
      .values({
        id: courseId,
        tenant_id: tenantId,
        title: manifest.title,
        slug,
        creator_id: userId,
        instructor_id: userId,
        is_published: false,
      })
      .returning();

    if (!course) throw new Error('Failed to create course from SCORM package');

    // 5. Create one Module for the SCORM package (content.ts schema — snake_case)
    const [module] = await this.db
      .insert(schema.modules)
      .values({
        course_id: courseId,
        title: manifest.title,
        description: `Imported from SCORM ${manifest.version} package`,
        order_index: 0,
      })
      .returning();

    if (!module) throw new Error('Failed to create module from SCORM package');

    // 6. Create ContentItems per SCORM item (contentItems.ts schema — camelCase)
    const itemValues = manifest.items.map((item, idx) => ({
      moduleId: module.id,
      title: item.title,
      type: 'SCORM' as const,
      content: JSON.stringify({ resourceHref: item.resourceHref, minioPrefix }),
      orderIndex: idx,
    }));

    const insertedItems = await this.db
      .insert(schema.contentItems)
      .values(itemValues)
      .returning();

    // 7. Create scorm_packages record
    const entryPoint = manifest.items[0]?.resourceHref ?? '';
    await this.db.insert(schema.scormPackages).values({
      course_id: courseId,
      tenant_id: tenantId,
      manifest_version: manifest.version,
      title: manifest.title,
      identifier: manifest.identifier,
      minio_prefix: minioPrefix,
      entry_point: entryPoint,
    });

    this.logger.log(
      `SCORM import complete: courseId=${courseId} items=${insertedItems.length}`
    );
    return { courseId, itemCount: insertedItems.length };
  }

  private async uploadZipContents(zip: AdmZip, prefix: string): Promise<void> {
    const entries = zip.getEntries().filter((e) => !e.isDirectory);
    this.logger.debug(
      `Uploading ${entries.length} SCORM files to MinIO prefix=${prefix}`
    );

    const uploads = entries.map(async (entry) => {
      const key = `${prefix}/${entry.entryName}`;
      const data = entry.getData();
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: data,
          ContentType: getMime(entry.name),
        })
      );
    });

    await Promise.all(uploads);
    this.logger.debug('Uploaded all SCORM files to MinIO');
  }
}
