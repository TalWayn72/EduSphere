import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TracingInterceptor } from './tracing.interceptor';
import { of, throwError, lastValueFrom } from 'rxjs';

// Mock GqlExecutionContext
vi.mock('@nestjs/graphql', () => ({
  GqlExecutionContext: {
    create: vi.fn(),
  },
}));

import { GqlExecutionContext } from '@nestjs/graphql';

describe('TracingInterceptor', () => {
  let interceptor: TracingInterceptor;
  let mockContext: ReturnType<typeof createMockContext>;
  let mockHandler: { handle: ReturnType<typeof vi.fn> };

  function createMockContext(fieldName = 'users', parentType = 'Query') {
    const ctx = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      getType: vi.fn().mockReturnValue('graphql'),
      getArgs: vi.fn(),
      switchToHttp: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
      getArgByIndex: vi.fn(),
    };
    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getInfo: () => ({ fieldName, parentType: { name: parentType } }),
      getContext: () => ({
        tenantId: 'tenant-123',
        userId: 'user-456',
      }),
      getArgs: vi.fn(),
      getRoot: vi.fn(),
    } as unknown as ReturnType<typeof GqlExecutionContext.create>);
    return ctx;
  }

  beforeEach(() => {
    interceptor = new TracingInterceptor();
    mockContext = createMockContext();
    mockHandler = { handle: vi.fn() };
  });

  it('creates an interceptor instance', () => {
    expect(interceptor).toBeDefined();
  });

  it('passes through to next handler for successful resolvers', async () => {
    mockHandler.handle.mockReturnValue(of({ data: 'test' }));
    const result$ = interceptor.intercept(
      mockContext as never,
      mockHandler as never
    );
    const result = await lastValueFrom(result$);
    expect(result).toEqual({ data: 'test' });
  });

  it('passes through errors from handler', async () => {
    const error = new Error('resolver failed');
    mockHandler.handle.mockReturnValue(throwError(() => error));
    const result$ = interceptor.intercept(
      mockContext as never,
      mockHandler as never
    );
    await expect(lastValueFrom(result$)).rejects.toThrow('resolver failed');
  });

  it('handles missing info gracefully', async () => {
    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getInfo: () => null,
      getContext: vi.fn(),
      getArgs: vi.fn(),
      getRoot: vi.fn(),
    } as unknown as ReturnType<typeof GqlExecutionContext.create>);
    mockHandler.handle.mockReturnValue(of('passthrough'));
    const result$ = interceptor.intercept(
      mockContext as never,
      mockHandler as never
    );
    const result = await lastValueFrom(result$);
    expect(result).toBe('passthrough');
  });

  it('handles Mutation type operations', async () => {
    createMockContext('createUser', 'Mutation');
    mockHandler.handle.mockReturnValue(of({ id: '1' }));
    const result$ = interceptor.intercept(
      mockContext as never,
      mockHandler as never
    );
    const result = await lastValueFrom(result$);
    expect(result).toEqual({ id: '1' });
  });
});
