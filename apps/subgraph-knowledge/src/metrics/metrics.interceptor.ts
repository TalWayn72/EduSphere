import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import {
  HTTP_REQUEST_DURATION,
  HTTP_REQUESTS_TOTAL,
  GRAPHQL_QUERY_DURATION,
} from './metrics.module';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const type = context.getType<'http' | 'graphql'>();
    const startTime = process.hrtime.bigint();

    if (type === 'http') {
      return this.handleHttp(context, next, startTime);
    }

    return this.handleGraphql(context, next, startTime);
  }

  private handleHttp(
    context: ExecutionContext,
    next: CallHandler,
    startTime: bigint,
  ): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      route?: { path: string };
      path: string;
    }>();
    const res = context.switchToHttp().getResponse<{ statusCode: number }>();
    const method = req.method;
    const route = req.route?.path ?? req.path;

    return next.handle().pipe(
      tap(() => {
        const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
        const statusCode = String(res.statusCode);
        HTTP_REQUEST_DURATION.observe({ method, route, status_code: statusCode }, duration);
        HTTP_REQUESTS_TOTAL.inc({ method, route, status_code: statusCode });
      }),
      catchError((err: unknown) => {
        const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
        HTTP_REQUEST_DURATION.observe({ method, route, status_code: '500' }, duration);
        HTTP_REQUESTS_TOTAL.inc({ method, route, status_code: '500' });
        return throwError(() => err);
      }),
    );
  }

  private handleGraphql(
    context: ExecutionContext,
    next: CallHandler,
    startTime: bigint,
  ): Observable<unknown> {
    const info = context.getArgByIndex<{
      operation?: { operation?: string };
      fieldName?: string;
    }>(3);
    const operationType = info?.operation?.operation ?? 'query';
    const operationName = info?.fieldName ?? 'unknown';

    return next.handle().pipe(
      tap(() => {
        const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
        GRAPHQL_QUERY_DURATION.observe(
          { operation_type: operationType, operation_name: operationName, status: 'success' },
          duration,
        );
      }),
      catchError((err: unknown) => {
        const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
        GRAPHQL_QUERY_DURATION.observe(
          { operation_type: operationType, operation_name: operationName, status: 'error' },
          duration,
        );
        return throwError(() => err);
      }),
    );
  }
}
