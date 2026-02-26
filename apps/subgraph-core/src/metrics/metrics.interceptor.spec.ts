import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import { MetricsInterceptor, MetricsService } from '@edusphere/metrics';

function buildHttpContext(
  override: Partial<{
    method: string;
    path: string;
    route?: { path: string };
    statusCode: number;
  }> = {}
) {
  const req = {
    method: override.method ?? 'GET',
    path: override.path ?? '/test',
    route: override.route,
  };
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

function buildGraphqlContext(
  override: Partial<{ operationType: string; fieldName: string }> = {}
) {
  const info = {
    operation: { operation: override.operationType ?? 'query' },
    fieldName: override.fieldName ?? 'getUser',
  };
  return {
    getType: vi.fn().mockReturnValue('graphql'),
    switchToHttp: vi.fn(),
    getArgByIndex: vi.fn().mockReturnValue(info),
  } as any;
}

describe('MetricsInterceptor (via @edusphere/metrics)', () => {
  let interceptor: MetricsInterceptor;
  let mockService: MetricsService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = {
      recordHttpRequest: vi.fn(),
      recordGraphqlOperation: vi.fn(),
      resolverDuration: { observe: vi.fn() },
      rlsDuration: { observe: vi.fn() },
      agentDuration: { observe: vi.fn() },
      ragDuration: { observe: vi.fn() },
    } as unknown as MetricsService;
    interceptor = new MetricsInterceptor(mockService);
  });

  // ─── HTTP context — success ─────────────────────────────────────────────

  describe('intercept() — HTTP success', () => {
    it('records HTTP request on success', () =>
      new Promise<void>((resolve) => {
        const ctx = buildHttpContext({
          method: 'POST',
          path: '/api/test',
          statusCode: 201,
        });
        const next = { handle: vi.fn().mockReturnValue(of({ data: 'ok' })) };
        interceptor.intercept(ctx, next).subscribe({
          complete: () => {
            expect(mockService.recordHttpRequest).toHaveBeenCalled();
            resolve();
          },
        });
      }));

    it('uses route.path when available', () =>
      new Promise<void>((resolve) => {
        const ctx = buildHttpContext({
          route: { path: '/users/:id' },
          path: '/users/1',
        });
        const next = { handle: vi.fn().mockReturnValue(of({})) };
        interceptor.intercept(ctx, next).subscribe({
          complete: () => {
            const [, route] = (mockService.recordHttpRequest as any).mock
              .calls[0];
            expect(route).toBe('/users/:id');
            resolve();
          },
        });
      }));
  });

  // ─── HTTP context — error ───────────────────────────────────────────────

  describe('intercept() — HTTP error', () => {
    it('records HTTP request with status 500 on error', () =>
      new Promise<void>((resolve) => {
        const ctx = buildHttpContext({ method: 'GET', path: '/fail' });
        const next = {
          handle: vi.fn().mockReturnValue(throwError(() => new Error('boom'))),
        };
        interceptor.intercept(ctx, next).subscribe({
          error: () => {
            expect(mockService.recordHttpRequest).toHaveBeenCalledWith(
              'GET',
              '/fail',
              500,
              expect.any(Number)
            );
            resolve();
          },
        });
      }));

    it('re-throws the error to the subscriber', () =>
      new Promise<void>((resolve) => {
        const ctx = buildHttpContext();
        const next = {
          handle: vi
            .fn()
            .mockReturnValue(throwError(() => new Error('upstream error'))),
        };
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
    it('records GraphQL operation on success', () =>
      new Promise<void>((resolve) => {
        const ctx = buildGraphqlContext({
          operationType: 'query',
          fieldName: 'getCourse',
        });
        const next = { handle: vi.fn().mockReturnValue(of({ course: {} })) };
        interceptor.intercept(ctx, next).subscribe({
          complete: () => {
            expect(mockService.recordGraphqlOperation).toHaveBeenCalledWith(
              'query',
              'getCourse',
              'success'
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
            const [, opName] = (mockService.recordGraphqlOperation as any).mock
              .calls[0];
            expect(opName).toBe('unknown');
            resolve();
          },
        });
      }));
  });

  // ─── GraphQL context — error ────────────────────────────────────────────

  describe('intercept() — GraphQL error', () => {
    it('records GraphQL operation with status error', () =>
      new Promise<void>((resolve) => {
        const ctx = buildGraphqlContext({
          operationType: 'mutation',
          fieldName: 'createUser',
        });
        const next = {
          handle: vi
            .fn()
            .mockReturnValue(throwError(() => new Error('gql error'))),
        };
        interceptor.intercept(ctx, next).subscribe({
          error: () => {
            expect(mockService.recordGraphqlOperation).toHaveBeenCalledWith(
              'mutation',
              'createUser',
              'error'
            );
            resolve();
          },
        });
      }));
  });
});
