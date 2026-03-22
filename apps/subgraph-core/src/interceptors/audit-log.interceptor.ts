import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

type GqlContextShape = {
  auth?: { userId?: string; tenantId?: string; role?: string };
  req?: {
    ip?: string;
    headers?: Record<string, string>;
    body?: { operationName?: string };
  };
};

type GqlInfoShape = {
  operation?: { operation?: string };
};

/**
 * Audit Log Interceptor for subgraph-core — logs all GraphQL mutations
 * to tenant_audit_log via Drizzle ORM.
 *
 * Non-blocking: fire-and-forget with 5s timeout (SI-8 compliant).
 * GDPR Art.32 + SOC2 CC7.2 compliance.
 *
 * Apply at module level with APP_INTERCEPTOR:
 *   { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor }
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const gqlContext = GqlExecutionContext.create(context);
    const ctx = gqlContext.getContext<GqlContextShape>();

    const operationName = ctx.req?.body?.operationName ?? 'unknown';
    const tenantId = ctx.auth?.tenantId;
    const actorId = ctx.auth?.userId;

    // Only log mutations — queries are too high-volume
    if (!this.isMutation(context) || !tenantId) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        // Fire-and-forget with timeout — never blocks the response
        void this.logAuditEntry({
          tenantId,
          actorId,
          action: operationName,
          metadata: { status: 'SUCCESS', operationType: 'GRAPHQL_MUTATION' },
        });
      }),
      catchError((error: unknown) => {
        void this.logAuditEntry({
          tenantId,
          actorId,
          action: operationName,
          metadata: {
            status: 'FAILED',
            operationType: 'GRAPHQL_MUTATION',
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
          },
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Insert audit entry into tenant_audit_log.
   * Uses Promise.race with 5s timeout per memory safety rules.
   * Never throws — audit failures must not block user operations.
   */
  private async logAuditEntry(entry: {
    tenantId: string;
    actorId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const TIMEOUT_MS = 5_000;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Audit log insert timed out')),
        TIMEOUT_MS
      )
    );

    try {
      const insertPromise = (async () => {
        const { db, schema } = await import('@edusphere/db');
        const tenantAuditLog = schema.tenantAuditLog;

        await db.insert(tenantAuditLog).values({
          tenantId: entry.tenantId,
          actorId: entry.actorId ?? null,
          action: entry.action,
          resourceType: entry.resourceType ?? null,
          resourceId: entry.resourceId ?? null,
          metadata: entry.metadata ?? null,
        });
      })();

      await Promise.race([insertPromise, timeoutPromise]);
    } catch (error) {
      // Audit failures MUST NOT block user operations — log and continue
      this.logger.error(
        { error, entry },
        '[AuditLogInterceptor] Failed to write tenant_audit_log entry'
      );
    }
  }

  private isMutation(context: ExecutionContext): boolean {
    try {
      const info = GqlExecutionContext.create(context).getInfo<GqlInfoShape>();
      return info?.operation?.operation === 'mutation';
    } catch {
      return false;
    }
  }
}
