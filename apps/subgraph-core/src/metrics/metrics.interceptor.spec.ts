import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';

// ─── Mock the metrics module constants before importing the interceptor ───────
vi.mock('./metrics.module', () => ({
  HTTP_REQUEST_DURATION: { observe: vi.fn() },
  HTTP_REQUESTS_TOTAL: { inc: vi.fn() },
  GRAPHQL_QUERY_DURATION: { observe: vi.fn() },
}));

import { MetricsInterceptor } from './metrics.interceptor';
import { HTTP_REQUEST_DURATION, HTTP_REQUESTS_TOTAL, GRAPHQL_QUERY_DURATION } from './metrics.module';

function buildHttpContext(override: Partial<{ method: string; path: string; route?: { path: string }; statusCode: number }> = {}) {
  const req = { method: override.method ?? 'GET', path: override.path ?? '/test', route: override.route };
  const res = { statusCode: override.statusCode ?? 200 };
  return {
    getType: vi.fn().mockReturnValue('http'),
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: vi.fn().mockReturnValue(req),
      getResponse: vi.fn().mockReturnValue(res),
    }),
    getArgByIndex: vi.fn(),
  } as any;
}

function buildGraphqlContext(override: Partial<{ operationType: string; fieldName: string }> = {}) {
  const info = { operation: { operation: override.operationType ?? 'query' }, fieldName: override.fieldName ?? 'getUser' };
  return {
    getType: vi.fn().mockReturnValue('graphql'),
    switchToHttp: vi.fn(),
    getArgByIndex: vi.fn().mockReturnValue(info),
  } as any;
}

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;

  beforeEach(() => {
    vi.clearAllMocks();
    interceptor = new MetricsInterceptor();
  });

  // ─── HTTP context — success ─────────────────────────────────────────────

  describe('intercept() — HTTP success', () => {
    it('records HTTP request duration on success', () =>
      new Promise<void>((resolve) => {
        const ctx = buildHttpContext({ method: 'POST', path: '/api/test', statusCode: 201 });
        const next = { handle: vi.fn().mockReturnValue(of({ data: 'ok' })) };
        interceptor.intercept(ctx, next).subscribe({
          complete: () => {
            expect(HTTP_REQUEST_DURATION.observe).toHaveBeenCalled();
            resolve();
          },
        });
      }));

    it('increments HTTP request total counter on success', () =>
      new Promise<void>((resolve) => {
        const ctx = buildHttpContext();
        const next = { handle: vi.fn().mockReturnValue(of({})) };
        interceptor.intercept(ctx, next).subscribe({
          complete: () => {
            expect(HTTP_REQUESTS_TOTAL.inc).toHaveBeenCalled();
            resolve();
          },
        });
      }));

    it('uses route.path when available', () =>
      new Promise<void>((resolve) => {
        const ctx = buildHttpContext({ route: { path: '/users/:id' }, path: '/users/1' });
        const next = { handle: vi.fn().mockReturnValue(of({})) };
        interceptor.intercept(ctx, next).subscribe({
          complete: () => {
            const call = (HTTP_REQUEST_DURATION.observe as any).mock.calls[0];
            expect(call[0].route).toBe('/users/:id');
            resolve();
          },
        });
      }));
  });

  // ─── HTTP context — error ───────────────────────────────────────────────

  describe('intercept() — HTTP error', () => {
    it('records HTTP request duration on error with status 500', () =>
      new Promise<void>((resolve) => {
        const ctx = buildHttpContext({ method: 'GET', path: '/fail' });
        const next = { handle: vi.fn().mockReturnValue(throwError(() => new Error('boom'))) };
        interceptor.intercept(ctx, next).subscribe({
          error: () => {
            expect(HTTP_REQUEST_DURATION.observe).toHaveBeenCalledWith(
              expect.objectContaining({ status_code: '500' }),
              expect.any(Number),
            );
            resolve();
          },
        });
      }));

    it('re-throws the error to the subscriber', () =>
      new Promise<void>((resolve) => {
        const ctx = buildHttpContext();
        const next = { handle: vi.fn().mockReturnValue(throwError(() => new Error('upstream error'))) };
        interceptor.intercept(ctx, next).subscribe({
          error: (err: Error) => {
            expect(err.message).toBe('upstream error');
            resolve();
          },
        });
      }));
  });

  // ─── GraphQL context — success ──────────────────────────────────────────

  describe('intercept() — GraphQL success', () => {
    it('records GraphQL query duration on success', () =>
      new Promise<void>((resolve) => {
        const ctx = buildGraphqlContext({ operationType: 'query', fieldName: 'getCourse' });
        const next = { handle: vi.fn().mockReturnValue(of({ course: {} })) };
        interceptor.intercept(ctx, next).subscribe({
          complete: () => {
            expect(GRAPHQL_QUERY_DURATION.observe).toHaveBeenCalledWith(
              expect.objectContaining({ operation_type: 'query', operation_name: 'getCourse', status: 'success' }),
              expect.any(Number),
            );
            resolve();
          },
        });
      }));

    it('uses unknown as default operationName when fieldName is missing', () =>
      new Promise<void>((resolve) => {
        const ctx = {
          getType: vi.fn().mockReturnValue('graphql'),
          getArgByIndex: vi.fn().mockReturnValue({}),
        } as any;
        const next = { handle: vi.fn().mockReturnValue(of({})) };
        interceptor.intercept(ctx, next).subscribe({
          complete: () => {
            const call = (GRAPHQL_QUERY_DURATION.observe as any).mock.calls[0];
            expect(call[0].operation_name).toBe('unknown');
            resolve();
          },
        });
      }));
  });

  // ─── GraphQL context — error ────────────────────────────────────────────

  describe('intercept() — GraphQL error', () => {
    it('records GraphQL query duration with status error', () =>
      new Promise<void>((resolve) => {
        const ctx = buildGraphqlContext({ operationType: 'mutation', fieldName: 'createUser' });
        const next = { handle: vi.fn().mockReturnValue(throwError(() => new Error('gql error'))) };
        interceptor.intercept(ctx, next).subscribe({
          error: () => {
            expect(GRAPHQL_QUERY_DURATION.observe).toHaveBeenCalledWith(
              expect.objectContaining({ status: 'error' }),
              expect.any(Number),
            );
            resolve();
          },
        });
      }));
  });
});
