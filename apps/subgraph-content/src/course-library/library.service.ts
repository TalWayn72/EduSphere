import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { S3Client, CopyObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import {
  createDatabaseConnection,
  schema,
  closeAllPools,
  withTenantContext,
} from '@edusphere/db';
import type {
  LibraryCourse,
  TenantLibraryActivation,
  TenantContext,
} from '@edusphere/db';

export type LibraryTopic =
  | 'GDPR'
  | 'SOC2'
  | 'HIPAA'
  | 'AML'
  | 'DEI'
  | 'CYBERSECURITY'
  | 'HARASSMENT_PREVENTION';

export type LibraryLicense = 'FREE' | 'PAID';

export interface LibraryCourseFilter {
  topic?: LibraryTopic;
  licenseType?: LibraryLicense;
}

@Injectable()
export class LibraryService implements OnModuleDestroy {
  private readonly logger = new Logger(LibraryService.name);
  private readonly db = createDatabaseConnection();
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
    const endpoint = process.env['MINIO_ENDPOINT'] ?? 'http://localhost:9000';
    this.bucket = process.env['MINIO_BUCKET'] ?? 'edusphere-media';
    this.s3 = new S3Client({
      endpoint,
      region: process.env['MINIO_REGION'] ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env['MINIO_ACCESS_KEY'] ?? 'minioadmin',
        secretAccessKey: process.env['MINIO_SECRET_KEY'] ?? 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  // Global catalog — no tenant context required
  async listLibraryCourses(
    filter?: LibraryCourseFilter
  ): Promise<LibraryCourse[]> {
    const rows = await this.db
      .select()
      .from(schema.libraryCourses)
      .where(eq(schema.libraryCourses.isActive, true));

    return rows.filter((r) => {
      if (filter?.topic && r.topic !== filter.topic) return false;
      if (filter?.licenseType && r.licenseType !== filter.licenseType)
        return false;
      return true;
    });
  }

  async getLibraryCourse(id: string): Promise<LibraryCourse | null> {
    const [row] = await this.db
      .select()
      .from(schema.libraryCourses)
      .where(
        and(
          eq(schema.libraryCourses.id, id),
          eq(schema.libraryCourses.isActive, true)
        )
      );
    return row ?? null;
  }

  async getTenantActivations(
    tenantId: string
  ): Promise<TenantLibraryActivation[]> {
    const ctx: TenantContext = {
      tenantId,
      userId: tenantId,
      userRole: 'ORG_ADMIN',
    };
    return withTenantContext(this.db, ctx, (tx) =>
      tx
        .select()
        .from(schema.tenantLibraryActivations)
        .where(eq(schema.tenantLibraryActivations.tenantId, tenantId))
    );
  }

  async activateCourse(
    tenantId: string,
    libraryCourseId: string,
    activatedBy: string
  ): Promise<TenantLibraryActivation> {
    // 1. Idempotency — return existing activation if already activated
    const ctx: TenantContext = {
      tenantId,
      userId: activatedBy,
      userRole: 'ORG_ADMIN',
    };
    const existing = await withTenantContext(this.db, ctx, (tx) =>
      tx
        .select()
        .from(schema.tenantLibraryActivations)
        .where(
          and(
            eq(schema.tenantLibraryActivations.tenantId, tenantId),
            eq(schema.tenantLibraryActivations.libraryCourseId, libraryCourseId)
          )
        )
    );

    if (existing.length > 0 && existing[0]) {
      this.logger.log(
        `Library course already activated: tenantId=${tenantId} libraryCourseId=${libraryCourseId}`
      );
      return existing[0];
    }

    // 2. Fetch library course
    const libraryCourse = await this.getLibraryCourse(libraryCourseId);
    if (!libraryCourse) {
      throw new NotFoundException(
        `Library course not found: ${libraryCourseId}`
      );
    }

    // 3. Copy SCORM package to tenant's MinIO folder
    const destKey = `scorm-content/${tenantId}/${libraryCourseId}-${randomUUID()}.zip`;
    await this.s3.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${libraryCourse.scormPackageUrl}`,
        Key: destKey,
      })
    );
    this.logger.log(
      `Copied SCORM package: src=${libraryCourse.scormPackageUrl} dest=${destKey}`
    );

    // 4. Create a course in tenant's catalog
    const courseId = randomUUID();
    const slug = libraryCourse.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 100);

    await withTenantContext(this.db, ctx, (tx) =>
      tx.insert(schema.courses).values({
        id: courseId,
        tenant_id: tenantId,
        title: libraryCourse.title,
        slug,
        creator_id: activatedBy,
        instructor_id: activatedBy,
        is_published: false,
        is_compliance: true,
      })
    );

    // 5. Store activation record
    const [activation] = await withTenantContext(this.db, ctx, (tx) =>
      tx
        .insert(schema.tenantLibraryActivations)
        .values({ tenantId, libraryCourseId, activatedBy, courseId })
        .returning()
    );

    if (!activation)
      throw new Error('Failed to create library activation record');

    this.logger.log(
      `Library course activated: tenantId=${tenantId} libraryCourseId=${libraryCourseId} courseId=${courseId}`
    );
    return activation;
  }

  async deactivateCourse(
    tenantId: string,
    libraryCourseId: string
  ): Promise<void> {
    const deactivateCtx: TenantContext = {
      tenantId,
      userId: tenantId,
      userRole: 'ORG_ADMIN',
    };
    await withTenantContext(this.db, deactivateCtx, (tx) =>
      tx
        .delete(schema.tenantLibraryActivations)
        .where(
          and(
            eq(schema.tenantLibraryActivations.tenantId, tenantId),
            eq(schema.tenantLibraryActivations.libraryCourseId, libraryCourseId)
          )
        )
    );
    this.logger.log(
      `Library course deactivated: tenantId=${tenantId} libraryCourseId=${libraryCourseId}`
    );
  }
}
