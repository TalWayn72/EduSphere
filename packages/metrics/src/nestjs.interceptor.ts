import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MetricsService } from './index.js';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const type = context.getType<'http' | 'graphql'>();
    const start = process.hrtime.bigint();

    if (type === 'http') {
      return this.handleHttp(context, next, start);
    }
    return this.handleGraphql(context, next, start);
  }

  private handleHttp(
    context: ExecutionContext,
    next: CallHandler,
    start: bigint
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
        const duration = Number(process.hrtime.bigint() - start) / 1e9;
        this.metricsService.recordHttpRequest(
          method,
          route,
          res.statusCode,
          duration
        );
      }),
      catchError((err: unknown) => {
        const duration = Number(process.hrtime.bigint() - start) / 1e9;
        this.metricsService.recordHttpRequest(method, route, 500, duration);
        return throwError(() => err);
      })
    );
  }

  private handleGraphql(
    context: ExecutionContext,
    next: CallHandler,
    _start: bigint
  ): Observable<unknown> {
    const info = context.getArgByIndex<{
      operation?: { operation?: string };
      fieldName?: string;
    }>(3);
    const operationType = info?.operation?.operation ?? 'query';
    const operationName = info?.fieldName ?? 'unknown';

    return next.handle().pipe(
      tap(() => {
        this.metricsService.recordGraphqlOperation(
          operationType,
          operationName,
          'success'
        );
      }),
      catchError((err: unknown) => {
        this.metricsService.recordGraphqlOperation(
          operationType,
          operationName,
          'error'
        );
        return throwError(() => err);
      })
    );
  }
}
