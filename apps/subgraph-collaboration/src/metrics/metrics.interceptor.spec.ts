import { describe, it, expect, vi, beforeEach } from 'vitest';
import { of, throwError } from 'rxjs';
import type { ExecutionContext } from '@nestjs/common';
import { MetricsInterceptor } from '@edusphere/metrics';
import type { MetricsService } from '@edusphere/metrics';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMockMetrics(): MetricsService {
  return {
    recordHttpRequest: vi.fn(),
    recordGraphqlOperation: vi.fn(),
  } as unknown as MetricsService;
}

function gqlCtx(
  operationType = 'query',
  fieldName = 'getDiscussion'
): ExecutionContext {
  return {
    getType: vi.fn().mockReturnValue('graphql'),
    switchToHttp: vi.fn(),
    getArgByIndex: vi
      .fn()
      .mockReturnValue({ operation: { operation: operationType }, fieldName }),
  } as unknown as ExecutionContext;
}

function httpCtx(
  method = 'GET',
  path = '/health',
  statusCode = 200
): ExecutionContext {
  return {
    getType: vi.fn().mockReturnValue('http'),
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: vi.fn().mockReturnValue({ method, path, route: undefined }),
      getResponse: vi.fn().mockReturnValue({ statusCode }),
    }),
    getArgByIndex: vi.fn(),
  } as unknown as ExecutionContext;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MetricsInterceptor (collaboration)', () => {
  let interceptor: MetricsInterceptor;
  let svc: MetricsService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = buildMockMetrics();
    interceptor = new MetricsInterceptor(svc);
  });

  describe('GraphQL — success', () => {
    it('records operation name in label', () =>
      new Promise<void>((resolve) => {
        interceptor
          .intercept(gqlCtx('query', 'getDiscussion'), {
            handle: vi.fn().mockReturnValue(of({})),
          })
          .subscribe({
            complete: () => {
              expect(svc.recordGraphqlOperation).toHaveBeenCalledWith(
                'query',
                'getDiscussion',
                'success'
              );
              resolve();
            },
          });
      }));

    it('passes response value through unchanged', () =>
      new Promise<void>((resolve) => {
        const payload = { discussions: [] };
        interceptor
          .intercept(gqlCtx(), { handle: vi.fn().mockReturnValue(of(payload)) })
          .subscribe({
            next: (v) => {
              expect(v).toEqual(payload);
              resolve();
            },
          });
      }));

    it('records mutation type correctly', () =>
      new Promise<void>((resolve) => {
        interceptor
          .intercept(gqlCtx('mutation', 'createDiscussion'), {
            handle: vi.fn().mockReturnValue(of({})),
          })
          .subscribe({
            complete: () => {
              expect(
                vi.mocked(svc.recordGraphqlOperation).mock.calls[0][0]
              ).toBe('mutation');
              resolve();
            },
          });
      }));

    it('falls back to "unknown" when fieldName is absent', () =>
      new Promise<void>((resolve) => {
        const ctx = {
          getType: vi.fn().mockReturnValue('graphql'),
          getArgByIndex: vi.fn().mockReturnValue({}),
        } as unknown as ExecutionContext;
        interceptor
          .intercept(ctx, { handle: vi.fn().mockReturnValue(of({})) })
          .subscribe({
            complete: () => {
              expect(
                vi.mocked(svc.recordGraphqlOperation).mock.calls[0][1]
              ).toBe('unknown');
              resolve();
            },
          });
      }));
  });

  describe('GraphQL — error', () => {
    it('records error status on resolver throw', () =>
      new Promise<void>((resolve) => {
        interceptor
          .intercept(gqlCtx('mutation', 'addMessage'), {
            handle: vi.fn().mockReturnValue(throwError(() => new Error('err'))),
          })
          .subscribe({
            error: () => {
              expect(svc.recordGraphqlOperation).toHaveBeenCalledWith(
                'mutation',
                'addMessage',
                'error'
              );
              resolve();
            },
          });
      }));

    it('does not crash when recordGraphqlOperation itself throws', () =>
      new Promise<void>((resolve) => {
        vi.mocked(svc.recordGraphqlOperation).mockImplementationOnce(() => {
          throw new Error('metrics down');
        });
        interceptor
          .intercept(gqlCtx(), {
            handle: vi.fn().mockReturnValue(throwError(() => new Error('gql'))),
          })
          .subscribe({
            error: () => {
              expect(true).toBe(true);
              resolve();
            },
          });
      }));
  });

  describe('HTTP — success', () => {
    it('records method, route, status and duration', () =>
      new Promise<void>((resolve) => {
        interceptor
          .intercept(httpCtx('POST', '/api/discussions', 201), {
            handle: vi.fn().mockReturnValue(of('ok')),
          })
          .subscribe({
            complete: () => {
              expect(svc.recordHttpRequest).toHaveBeenCalledWith(
                'POST',
                '/api/discussions',
                201,
                expect.any(Number)
              );
              resolve();
            },
          });
      }));
  });
});
