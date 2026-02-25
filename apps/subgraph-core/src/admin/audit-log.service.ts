import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { db, auditLog } from '@edusphere/db';
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

@Injectable()
export class AuditLogService implements OnModuleDestroy {
  private readonly logger = new Logger(AuditLogService.name);

  onModuleDestroy(): void {
    // No owned resources to clean up
  }

  async getAuditLog(
    tenantId: string,
    opts: AuditLogOpts,
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
      createdAt: row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
      metadata: row.metadata != null ? JSON.stringify(row.metadata) : null,
    }));

    this.logger.debug({ tenantId, total, returned: entries.length }, 'Audit log fetched');
    return { entries, total };
  }
}
