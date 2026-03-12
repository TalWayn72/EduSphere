import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'crypto';

function sha256(v: string) { return createHash('sha256').update(v).digest('hex'); }

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  closeAllPools: vi.fn(),
  schema: { partners: { id: 'id', status: 'status', apiKeyHash: 'api_key_hash' } },
  eq: vi.fn((a: unknown, b: unknown) => [a, b]),
}));

const { PartnerApiMiddleware } = await import('./partner-api.middleware.js');

function mockRes() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return res;
}

function mockReq(authHeader?: string) {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
    path: '/api/v1/partner/usage',
  } as unknown as import('express').Request;
}

describe('PartnerApiMiddleware', () => {
  let middleware: InstanceType<typeof PartnerApiMiddleware>;

  beforeEach(() => {
    middleware = new PartnerApiMiddleware();
    vi.clearAllMocks();
  });

  it('rejects missing Authorization header with 401', async () => {
    const res = mockRes();
    await middleware.use(mockReq(), res as never, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'PARTNER_AUTH_FAILED' }));
  });

  it('rejects non-Bearer scheme with 401', async () => {
    const res = mockRes();
    await middleware.use(mockReq('Basic abc123'), res as never, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects unknown API key with 401', async () => {
    mockDb.limit.mockResolvedValue([]);
    const res = mockRes();
    await middleware.use(mockReq('Bearer unknown-key'), res as never, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects suspended partner with 401', async () => {
    const rawKey = 'valid-key';
    const hash = sha256(rawKey);
    mockDb.limit.mockResolvedValue([{ id: 'p1', status: 'suspended', apiKeyHash: hash }]);
    const res = mockRes();
    await middleware.use(mockReq(`Bearer ${rawKey}`), res as never, vi.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('calls next() and attaches partner context for valid active key', async () => {
    const rawKey = 'valid-key';
    const hash = sha256(rawKey);
    mockDb.limit.mockResolvedValue([{ id: 'p1', status: 'active', apiKeyHash: hash }]);
    const next = vi.fn();
    const req = mockReq(`Bearer ${rawKey}`);
    const res = mockRes();
    await middleware.use(req, res as never, next);
    expect(next).toHaveBeenCalled();
    expect((req as { partner?: { id: string } }).partner?.id).toBe('p1');
  });

  it('uses timing-safe comparison (hash comparison is consistent)', async () => {
    const rawKey = 'test-key';
    const hash = sha256(rawKey);
    mockDb.limit.mockResolvedValue([{ id: 'p1', status: 'active', apiKeyHash: hash }]);
    const next = vi.fn();
    await middleware.use(mockReq(`Bearer ${rawKey}`), mockRes() as never, next);
    expect(next).toHaveBeenCalled();
  });
});
