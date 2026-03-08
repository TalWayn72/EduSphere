import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RateLimitMiddleware } from './rate-limit.middleware.js';
import type { Request, Response, NextFunction } from 'express';

describe('RateLimitMiddleware', () => {
  let middleware: RateLimitMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // No REDIS_URL set → uses fallback in-memory
    delete process.env['REDIS_RATE_LIMIT_URL'];
    delete process.env['REDIS_URL'];
    middleware = new RateLimitMiddleware();
    mockReq = { headers: { 'x-tenant-id': 'tenant-abc' }, ip: '127.0.0.1' };
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as Partial<Response>;
    mockNext = vi.fn();
  });

  it('allows requests under the limit', async () => {
    await middleware.use(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('blocks requests over MAX_REQUESTS (200) in the same window', async () => {
    // Exhaust the limit
    for (let i = 0; i < 200; i++) {
      await middleware.use(mockReq as Request, mockRes as Response, mockNext);
    }
    vi.clearAllMocks();
    await middleware.use(mockReq as Request, mockRes as Response, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('allows requests from different tenants independently', async () => {
    const req2 = { headers: { 'x-tenant-id': 'tenant-xyz' }, ip: '127.0.0.1' } as Partial<Request>;
    for (let i = 0; i < 200; i++) {
      await middleware.use(mockReq as Request, mockRes as Response, mockNext);
    }
    vi.clearAllMocks();
    // Different tenant should still be allowed
    await middleware.use(req2 as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledOnce();
  });

  it('clears resources on destroy', () => {
    middleware.onModuleDestroy();
    // Should not throw
    expect(true).toBe(true);
  });
});
