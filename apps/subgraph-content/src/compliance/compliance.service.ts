import {
  Injectable,
  Logger,
  ForbiddenException,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  inArray,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { sql } from 'drizzle-orm';
import { generateCsvReport } from './csv-generator.js';
import type { ComplianceReportRow, ComplianceStatus } from './csv-generator.js';
import { CompliancePdfService } from './compliance-pdf.service.js';

const REPORT_URL_EXPIRY_SECONDS = 3600; // 1 hour — reports contain PII

export interface ComplianceSummary {
  totalUsers: number;
  totalEnrollments: number;
  completedCount: number;
  completionRate: number;
  overdueCount: number;
  generatedAt: Date;
}

export interface ComplianceReportResult {
  csvUrl: string;
  pdfUrl: string;
  summary: ComplianceSummary;
}

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ORG_ADMIN']);

@Injectable()
export class ComplianceService implements OnModuleDestroy {
  private readonly logger = new Logger(ComplianceService.name);
  private readonly db = createDatabaseConnection();
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly pdfService: CompliancePdfService) {
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

  async listComplianceCourses(
    ctx: TenantContext
  ): Promise<(typeof schema.courses.$inferSelect)[]> {
    this.requireAdmin(ctx);
    return withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.courses)
        .where(
          and(
            eq(schema.courses.tenant_id, ctx.tenantId),
            eq(schema.courses.is_published, true),
            sql`${schema.courses.deleted_at} IS NULL`
          )
        )
    );
  }

  async updateCourseComplianceSettings(
    courseId: string,
    isCompliance: boolean,
    complianceDueDate: Date | null,
    ctx: TenantContext
  ): Promise<typeof schema.courses.$inferSelect> {
    this.requireAdmin(ctx);
    const [updated] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .update(schema.courses)
        .set({
          is_compliance: isCompliance,
          compliance_due_date: complianceDueDate,
        })
        .where(
          and(
            eq(schema.courses.id, courseId),
            eq(schema.courses.tenant_id, ctx.tenantId)
          )
        )
        .returning()
    );
    if (!updated)
      throw new ForbiddenException('Course not found or access denied');
    this.logger.log(
      `Compliance settings updated: courseId=${courseId} isCompliance=${isCompliance}`
    );
    return updated;
  }

  async generateComplianceReport(
    courseIds: string[],
    ctx: TenantContext,
    asOf?: Date
  ): Promise<ComplianceReportResult> {
    this.requireAdmin(ctx);
    const reportDate = asOf ?? new Date();

    const rows = await this.fetchReportRows(courseIds, ctx, reportDate);
    const summary = this.computeSummary(rows, reportDate);
    const title = `Compliance Report — ${reportDate.toISOString().split('T')[0]}`;

    const [csvBuffer, pdfBuffer] = await Promise.all([
      Promise.resolve(Buffer.from(generateCsvReport(rows, title), 'utf-8')),
      this.pdfService.generatePdf({
        title,
        tenantName: ctx.tenantId,
        asOf: reportDate,
        rows,
        summary,
      }),
    ]);

    const reportId = randomUUID();
    const csvKey = `reports/${ctx.tenantId}/${reportId}.csv`;
    const pdfKey = `reports/${ctx.tenantId}/${reportId}.pdf`;

    await Promise.all([
      this.uploadToMinio(csvKey, csvBuffer, 'text/csv'),
      this.uploadToMinio(pdfKey, pdfBuffer, 'application/pdf'),
    ]);

    const [csvUrl, pdfUrl] = await Promise.all([
      this.getPresignedUrl(csvKey),
      this.getPresignedUrl(pdfKey),
    ]);

    this.logger.log(
      `Compliance report generated: reportId=${reportId} tenant=${ctx.tenantId} rows=${rows.length}`
    );
    return { csvUrl, pdfUrl, summary };
  }

  private async fetchReportRows(
    courseIds: string[],
    ctx: TenantContext,
    asOf: Date
  ): Promise<ComplianceReportRow[]> {
    if (courseIds.length === 0) return [];

    return withTenantContext(this.db, ctx, async (tx) => {
      const enrollments = await tx
        .select({
          userId: schema.userCourses.userId,
          courseId: schema.userCourses.courseId,
          enrolledAt: schema.userCourses.enrolledAt,
          completedAt: schema.userCourses.completedAt,
          courseTitle: schema.courses.title,
          courseDueDate: schema.courses.compliance_due_date,
          userEmail: schema.users.email,
          userFirstName: schema.users.first_name,
          userLastName: schema.users.last_name,
        })
        .from(schema.userCourses)
        .innerJoin(
          schema.courses,
          eq(schema.userCourses.courseId, schema.courses.id)
        )
        .innerJoin(schema.users, eq(schema.userCourses.userId, schema.users.id))
        .where(
          and(
            inArray(schema.userCourses.courseId, courseIds),
            eq(schema.courses.tenant_id, ctx.tenantId),
            sql`${schema.courses.deleted_at} IS NULL`
          )
        );

      return enrollments.map(
        (row): ComplianceReportRow => ({
          userName: `${row.userFirstName} ${row.userLastName}`.trim(),
          userEmail: row.userEmail,
          courseName: row.courseTitle,
          enrolledAt: row.enrolledAt.toISOString(),
          completedAt: row.completedAt?.toISOString() ?? null,
          score: null,
          status: this.computeStatus(row.completedAt, row.courseDueDate, asOf),
          complianceDueDate: row.courseDueDate?.toISOString() ?? null,
        })
      );
    });
  }

  private computeStatus(
    completedAt: Date | null | undefined,
    dueDate: Date | null | undefined,
    asOf: Date
  ): ComplianceStatus {
    if (completedAt) return 'completed';
    if (dueDate && dueDate < asOf) return 'overdue';
    return 'in_progress';
  }

  private computeSummary(
    rows: ComplianceReportRow[],
    generatedAt: Date
  ): ComplianceSummary {
    const uniqueUsers = new Set(rows.map((r) => r.userEmail)).size;
    const completedCount = rows.filter((r) => r.status === 'completed').length;
    const overdueCount = rows.filter((r) => r.status === 'overdue').length;
    const completionRate =
      rows.length > 0 ? (completedCount / rows.length) * 100 : 0;
    return {
      totalUsers: uniqueUsers,
      totalEnrollments: rows.length,
      completedCount,
      completionRate: Math.round(completionRate * 10) / 10,
      overdueCount,
      generatedAt,
    };
  }

  private async uploadToMinio(
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  }

  private async getPresignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, {
      expiresIn: REPORT_URL_EXPIRY_SECONDS,
    });
  }

  private requireAdmin(ctx: TenantContext): void {
    if (!ADMIN_ROLES.has(ctx.userRole)) {
      throw new ForbiddenException(
        'Only ORG_ADMIN or SUPER_ADMIN can access compliance reports'
      );
    }
  }
}
