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
import { AuditService } from './audit.service.js';

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
 * GraphQL Audit Interceptor — logs all mutations to audit_log.
 * Apply at module level with APP_INTERCEPTOR or per-resolver with @UseInterceptors.
 * Only logs mutations (queries are too high-volume; use pgAudit for SELECT logging).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const gqlContext = GqlExecutionContext.create(context);
    const ctx = gqlContext.getContext<GqlContextShape>();

    const operationName = ctx.req?.body?.operationName ?? 'unknown';
    const userId = ctx.auth?.userId;
    const tenantId = ctx.auth?.tenantId;
    const ipAddress = ctx.req?.ip;
    const userAgent = ctx.req?.headers?.['user-agent'];

    // Only log mutations, not queries (too high volume for audit_log)
    const isMutation = this.detectMutation(context);
    if (!isMutation || !tenantId) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        // Log success asynchronously — do not await
        void this.auditService.log({
          tenantId,
          userId,
          action: operationName,
          ipAddress,
          userAgent,
          status: 'SUCCESS',
          metadata: { operationType: 'GRAPHQL_MUTATION' },
        });
      }),
      catchError((error: unknown) => {
        // Log failure asynchronously
        void this.auditService.log({
          tenantId: tenantId ?? 'unknown',
          userId,
          action: operationName,
          ipAddress,
          userAgent,
          status: 'FAILED',
          metadata: {
            operationType: 'GRAPHQL_MUTATION',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        return throwError(() => error);
      }),
    );
  }

  private detectMutation(context: ExecutionContext): boolean {
    try {
      const info = GqlExecutionContext.create(context).getInfo<GqlInfoShape>();
      return info?.operation?.operation === 'mutation';
    } catch {
      return false;
    }
  }
}
