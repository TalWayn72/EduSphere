import { Injectable, Logger } from '@nestjs/common';
import type { AuditLogEntry } from './audit.types.js';

/**
 * Audit Service — writes to audit_log table asynchronously (fire-and-forget).
 * GDPR Art.32 + SOC2 CC7.2: All data access and mutations must be logged.
 * Never throws — audit failures must not block user operations.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  /**
   * Write an audit log entry. Fire-and-forget — never throws.
   * Call this after successful operations, not before.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Dynamic import to avoid circular dependency with @edusphere/db
      const { db } = await import('@edusphere/db');
      const { auditLog } = await import('@edusphere/db/schema');

      await db.insert(auditLog).values({
        tenantId: entry.tenantId,
        userId: entry.userId ?? null,
        action: entry.action,
        resourceType: entry.resourceType ?? null,
        resourceId: entry.resourceId ?? null,
        oldValues: entry.oldValues ?? null,
        newValues: entry.newValues ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        requestId: entry.requestId ?? null,
        status: entry.status ?? 'SUCCESS',
        metadata: entry.metadata ?? null,
      });
    } catch (error) {
      // Audit failures MUST NOT block user operations — log and continue
      this.logger.error({ error, entry }, 'Failed to write audit log entry');
    }
  }
}
