/**
 * TracingInterceptor — auto-spans every GraphQL resolver.
 * Emits OpenTelemetry-compatible spans to Jaeger via @opentelemetry/api.
 *
 * Register globally in each subgraph's AppModule:
 *   providers: [{ provide: APP_INTERCEPTOR, useClass: TracingInterceptor }]
 *
 * Item #87 from master work plan.
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable, tap } from 'rxjs';

// Optional OTel API — if not installed, falls back to Pino logging
let api: typeof import('@opentelemetry/api') | null = null;
try {
  // Dynamic import so the package is optional
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  api = require('@opentelemetry/api');
} catch {
  // OTel not available — use log-based tracing
}

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TracingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const gqlCtx = GqlExecutionContext.create(context);
    const info = gqlCtx.getInfo();

    if (!info) {
      return next.handle();
    }

    const operationType = info.parentType?.name || 'Unknown';
    const fieldName = info.fieldName || 'unknown';
    const spanName = `${operationType}.${fieldName}`;

    const start = performance.now();

    // Extract user context from GraphQL context
    const ctx = gqlCtx.getContext();
    const tenantId =
      ctx?.tenantId || ctx?.req?.headers?.['x-tenant-id'] || 'unknown';
    const userId = ctx?.userId || 'unknown';

    if (api) {
      const tracer = api.trace.getTracer('edusphere-subgraph');
      const span = tracer.startSpan(spanName, {
        attributes: {
          'graphql.operation.type': operationType,
          'graphql.field.name': fieldName,
          'edusphere.tenant_id': tenantId,
          'edusphere.user_id': userId,
        },
      });

      return next.handle().pipe(
        tap({
          next: () => {
            span.setStatus({ code: api!.SpanStatusCode.OK });
            span.setAttribute('graphql.duration_ms', performance.now() - start);
            span.end();
          },
          error: (err: Error) => {
            span.setStatus({
              code: api!.SpanStatusCode.ERROR,
              message: err.message,
            });
            span.recordException(err);
            span.setAttribute('graphql.duration_ms', performance.now() - start);
            span.end();
          },
        })
      );
    }

    // Fallback: Pino-based tracing (no OTel SDK)
    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = (performance.now() - start).toFixed(1);
          this.logger.debug(
            `[Trace] ${spanName} OK ${durationMs}ms tenant=${tenantId} user=${userId}`
          );
        },
        error: (err: Error) => {
          const durationMs = (performance.now() - start).toFixed(1);
          this.logger.warn(
            `[Trace] ${spanName} ERROR ${durationMs}ms tenant=${tenantId} user=${userId} err=${err.message}`
          );
        },
      })
    );
  }
}
