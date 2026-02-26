import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'crypto';
import { db, auditLog } from '@edusphere/db';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { minioConfig } from '@edusphere/config';
import { count, desc, gte, lte, and, eq, like, type SQL } from 'drizzle-orm';

export interface AuditLogEntryData {
  id: string;
  tenantId: string;
  userId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  status: string;
  ipAddress: string | null;
  requestId: string | null;
  createdAt: string;
  metadata: string | null;
}

export interface AuditLogOpts {
  limit: number;
  offset: number;
  action?: string;
  userId?: string;
  since?: string;
  until?: string;
}

const CSV_HEADERS = [
  'id',
  'tenantId',
  'userId',
  'action',
  'resourceType',
  'resourceId',
  'status',
  'ipAddress',
  'requestId',
  'createdAt',
  'metadata',
] as const;

const PRESIGNED_EXPIRY_SECONDS = 3_600; // 1 hour

@Injectable()
export class AuditLogService implements OnModuleDestroy {
  private readonly logger = new Logger(AuditLogService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor() {
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
  }

  onModuleDestroy(): void {
    this.s3.destroy();
  }

  async getAuditLog(
    tenantId: string,
    opts: AuditLogOpts
  ): Promise<{ entries: AuditLogEntryData[]; total: number }> {
    const filters: SQL[] = [eq(auditLog.tenantId, tenantId)];

    if (opts.action) {
      filters.push(like(auditLog.action, `%${opts.action}%`));
    }
    if (opts.userId) {
      filters.push(eq(auditLog.userId, opts.userId));
    }
    if (opts.since) {
      filters.push(gte(auditLog.createdAt, new Date(opts.since)));
    }
    if (opts.until) {
      filters.push(lte(auditLog.createdAt, new Date(opts.until)));
    }

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [rows, countRows] = await Promise.all([
      db
        .select()
        .from(auditLog)
        .where(where)
        .orderBy(desc(auditLog.createdAt))
        .limit(opts.limit)
        .offset(opts.offset),
      db.select({ total: count() }).from(auditLog).where(where),
    ]);

    const total = countRows[0]?.total ?? 0;

    const entries: AuditLogEntryData[] = rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      userId: row.userId ?? null,
      action: row.action,
      resourceType: row.resourceType ?? null,
      resourceId: row.resourceId ?? null,
      status: row.status,
      ipAddress: row.ipAddress ?? null,
      requestId: row.requestId ?? null,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
      metadata: row.metadata != null ? JSON.stringify(row.metadata) : null,
    }));

    this.logger.debug(
      { tenantId, total, returned: entries.length },
      'Audit log fetched'
    );
    return { entries, total };
  }

  // ── Export ───────────────────────────────────────────────────────────────

  private async fetchAllForExport(
    tenantId: string,
    fromDate: string,
    toDate: string
  ): Promise<AuditLogEntryData[]> {
    const { entries } = await this.getAuditLog(tenantId, {
      limit: 100_000,
      offset: 0,
      since: fromDate,
      until: toDate,
    });
    return entries;
  }

  private entriesToCsv(entries: AuditLogEntryData[]): string {
    const escape = (v: string | null): string => {
      if (v === null) return '';
      const str = v.replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str}"`
        : str;
    };
    const header = CSV_HEADERS.join(',');
    const rows = entries.map((e) =>
      CSV_HEADERS.map((k) => escape(e[k] ?? null)).join(',')
    );
    return [header, ...rows].join('\n');
  }

  async exportAuditLog(
    tenantId: string,
    fromDate: string,
    toDate: string,
    format: 'CSV' | 'JSON'
  ): Promise<{ presignedUrl: string; expiresAt: string; recordCount: number }> {
    const entries = await this.fetchAllForExport(tenantId, fromDate, toDate);
    const content =
      format === 'CSV'
        ? this.entriesToCsv(entries)
        : JSON.stringify(entries, null, 2);
    const ext = format === 'CSV' ? 'csv' : 'json';
    const hash = createHash('sha1')
      .update(`${tenantId}${fromDate}${toDate}`)
      .digest('hex')
      .slice(0, 8);
    const key = `audit-exports/${tenantId}/${hash}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: content,
        ContentType: format === 'CSV' ? 'text/csv' : 'application/json',
        Metadata: { tenantId, fromDate, toDate },
      })
    );

    const presignedUrl = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: PRESIGNED_EXPIRY_SECONDS }
    );
    const expiresAt = new Date(
      Date.now() + PRESIGNED_EXPIRY_SECONDS * 1000
    ).toISOString();

    this.logger.log(
      { tenantId, format, recordCount: entries.length, key },
      'Audit log exported'
    );
    return { presignedUrl, expiresAt, recordCount: entries.length };
  }

  async scheduleGdprErasure(userId: string, tenantId: string): Promise<void> {
    // Delete audit log entries for user (GDPR Art.17 right to erasure).
    // Entries older than 30 days are permanently deleted; newer entries are
    // anonymised (userId set to null, IP/userAgent cleared).
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Anonymise recent entries (keep audit trail but remove PII)
    await db
      .update(auditLog)
      .set({
        userId: null,
        ipAddress: null,
        userAgent: null,
        metadata: null,
      })
      .where(
        and(
          eq(auditLog.tenantId, tenantId),
          eq(auditLog.userId, userId),
          gte(auditLog.createdAt, thirtyDaysAgo)
        )
      );

    // Remove older entries entirely
    await db
      .delete(auditLog)
      .where(
        and(
          eq(auditLog.tenantId, tenantId),
          eq(auditLog.userId, userId),
          lte(auditLog.createdAt, thirtyDaysAgo)
        )
      );

    // Delete any S3 export files scoped to this tenant/user pattern
    await this.s3
      .send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: [{ Key: `audit-exports/${tenantId}/` }],
            Quiet: true,
          },
        })
      )
      .catch(() => {
        /* best-effort S3 cleanup */
      });

    this.logger.log(
      { userId, tenantId },
      'GDPR erasure scheduled for audit log'
    );
  }
}
