import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPgQuery, MockPool, mockPing, MockRedis, routeHandlers, mockRouterGet, MockExpressRouter } = vi.hoisted(() => {
  const mockPgQuery = vi.fn();
  const MockPool = vi.fn().mockImplementation(() => ({ query: mockPgQuery }));
  const mockPing = vi.fn();
  const MockRedis = vi.fn().mockImplementation(() => ({ ping: mockPing }));
  const routeHandlers: Record<string, (...args: unknown[]) => unknown> = {};
  const MockExpressRouter = vi.fn();
  const mockRouterGet = vi.fn().mockImplementation((path: string, handler: (...args: unknown[]) => unknown) => {
    routeHandlers[path] = handler;
  });
  return { mockPgQuery, MockPool, mockPing, MockRedis, routeHandlers, mockRouterGet, MockExpressRouter };
});

vi.mock('pg', () => ({ Pool: MockPool }));
vi.mock('ioredis', () => ({ default: MockRedis }));
vi.mock('express', () => ({
  default: Object.assign(vi.fn(), { Router: MockExpressRouter }),
  Router: MockExpressRouter,
}));

import { HealthService, createHealthService } from './index';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRouterGet.mockImplementation((path: string, handler: (...args: unknown[]) => unknown) => {
      routeHandlers[path] = handler;
    });
    MockExpressRouter.mockReturnValue({ get: mockRouterGet });
    MockPool.mockImplementation(() => ({ query: mockPgQuery }));
    MockRedis.mockImplementation(() => ({ ping: mockPing }));
    service = new HealthService('2.0.0');
  });

  describe('constructor', () => {
    it('reflects the provided version in the health report', async () => {
      const s = new HealthService('3.0.0');
      const report = await s.getHealthReport();
      expect(report.version).toBe('3.0.0');
    });
    it('defaults to version 1.0.0 when none is supplied', async () => {
      const s = new HealthService();
      const report = await s.getHealthReport();
      expect(report.version).toBe('1.0.0');
    });
    it('records a start time so uptime is non-negative', async () => {
      const report = await service.getHealthReport();
      expect(report.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('configurePG()', () => {
    it('creates a pg Pool with the given connection string', () => {
      service.configurePG('postgresql://localhost/edusphere');
      expect(MockPool).toHaveBeenCalledWith({ connectionString: 'postgresql://localhost/edusphere' });
    });
  });

  describe('configureRedis()', () => {
    it('creates a Redis instance with the given URL', () => {
      service.configureRedis('redis://localhost:6379');
      expect(MockRedis).toHaveBeenCalledWith('redis://localhost:6379');
    });
  });

  describe('checkDatabase()', () => {
    it('returns degraded when no pool is configured', async () => {
      const check = await service.checkDatabase();
      expect(check.name).toBe('database');
      expect(check.status).toBe('degraded');
      expect(check.message).toContain('not configured');
    });
    it('returns healthy when query succeeds within latency threshold', async () => {
      mockPgQuery.mockResolvedValue({ rows: [{ health: 1 }] });
      service.configurePG('postgresql://localhost/test');
      const check = await service.checkDatabase();
      expect(check.name).toBe('database');
      expect(check.status).toBe('healthy');
      expect(check.message).toBe('Connected');
    });
    it('returns unhealthy when the query throws an Error', async () => {
      mockPgQuery.mockRejectedValue(new Error('Connection refused'));
      service.configurePG('postgresql://localhost/test');
      const check = await service.checkDatabase();
      expect(check.status).toBe('unhealthy');
      expect(check.message).toBe('Connection refused');
    });
    it('returns unhealthy with Unknown error for non-Error throws', async () => {
      mockPgQuery.mockRejectedValue('string error');
      service.configurePG('postgresql://localhost/test');
      const check = await service.checkDatabase();
      expect(check.status).toBe('unhealthy');
      expect(check.message).toBe('Unknown error');
    });
    it('includes a non-negative latency field', async () => {
      mockPgQuery.mockResolvedValue({ rows: [{ health: 1 }] });
      service.configurePG('postgresql://localhost/test');
      const check = await service.checkDatabase();
      expect(typeof check.latency).toBe('number');
      expect(check.latency).toBeGreaterThanOrEqual(0);
    });
    it('includes a timestamp in ISO 8601 format', async () => {
      mockPgQuery.mockResolvedValue({ rows: [{ health: 1 }] });
      service.configurePG('postgresql://localhost/test');
      const check = await service.checkDatabase();
      expect(check.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('checkRedis()', () => {
    it('returns degraded when redis is not configured', async () => {
      const check = await service.checkRedis();
      expect(check.name).toBe('redis');
      expect(check.status).toBe('degraded');
      expect(check.message).toContain('not configured');
    });
    it('returns healthy when ping succeeds within latency threshold', async () => {
      mockPing.mockResolvedValue('PONG');
      service.configureRedis('redis://localhost:6379');
      const check = await service.checkRedis();
      expect(check.status).toBe('healthy');
      expect(check.message).toBe('Connected');
    });
    it('returns unhealthy when ping throws an Error', async () => {
      mockPing.mockRejectedValue(new Error('ECONNREFUSED'));
      service.configureRedis('redis://localhost:6379');
      const check = await service.checkRedis();
      expect(check.status).toBe('unhealthy');
      expect(check.message).toBe('ECONNREFUSED');
    });
    it('includes a non-negative latency field', async () => {
      mockPing.mockResolvedValue('PONG');
      service.configureRedis('redis://localhost:6379');
      const check = await service.checkRedis();
      expect(typeof check.latency).toBe('number');
      expect(check.latency).toBeGreaterThanOrEqual(0);
    });
    it('includes a timestamp in ISO 8601 format', async () => {
      mockPing.mockResolvedValue('PONG');
      service.configureRedis('redis://localhost:6379');
      const check = await service.checkRedis();
      expect(check.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('checkMemory()', () => {
    it('returns a check named memory', async () => {
      const check = await service.checkMemory();
      expect(check.name).toBe('memory');
    });
    it('returns a valid status', async () => {
      const check = await service.checkMemory();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(check.status);
    });
    it('includes MB usage information in the message', async () => {
      const check = await service.checkMemory();
      expect(check.message).toMatch(/MB/);
    });
    it('reports unhealthy when heap usage exceeds 90%', async () => {
      const spy = vi.spyOn(process, 'memoryUsage').mockReturnValue({ heapUsed: 950*1024*1024, heapTotal: 1000*1024*1024, rss: 1024*1024*1024, external: 0, arrayBuffers: 0 });
      const check = await service.checkMemory();
      expect(check.status).toBe('unhealthy');
      spy.mockRestore();
    });
    it('reports degraded when heap usage is between 80% and 90%', async () => {
      const spy = vi.spyOn(process, 'memoryUsage').mockReturnValue({ heapUsed: 850*1024*1024, heapTotal: 1000*1024*1024, rss: 1024*1024*1024, external: 0, arrayBuffers: 0 });
      const check = await service.checkMemory();
      expect(check.status).toBe('degraded');
      spy.mockRestore();
    });
    it('reports healthy when heap usage is below 80%', async () => {
      const spy = vi.spyOn(process, 'memoryUsage').mockReturnValue({ heapUsed: 500*1024*1024, heapTotal: 1000*1024*1024, rss: 1024*1024*1024, external: 0, arrayBuffers: 0 });
      const check = await service.checkMemory();
      expect(check.status).toBe('healthy');
      spy.mockRestore();
    });
  });

  describe('getHealthReport()', () => {
    it('returns a report with required fields', async () => {
      const report = await service.getHealthReport();
      expect(report).toHaveProperty('status');
      expect(report).toHaveProperty('version');
      expect(report).toHaveProperty('uptime');
      expect(report).toHaveProperty('checks');
      expect(report).toHaveProperty('timestamp');
    });
    it('includes exactly 3 checks', async () => {
      const report = await service.getHealthReport();
      expect(report.checks).toHaveLength(3);
    });
    it('includes database, redis, and memory checks by name', async () => {
      const report = await service.getHealthReport();
      const names = report.checks.map((c) => c.name);
      expect(names).toContain('database');
      expect(names).toContain('redis');
      expect(names).toContain('memory');
    });
    it('returns unhealthy overall when database is down', async () => {
      mockPgQuery.mockRejectedValue(new Error('DB down'));
      service.configurePG('postgresql://localhost/test');
      const report = await service.getHealthReport();
      expect(report.status).toBe('unhealthy');
    });
    it('returns unhealthy overall when redis is down', async () => {
      mockPgQuery.mockResolvedValue({ rows: [{ health: 1 }] });
      service.configurePG('postgresql://localhost/test');
      mockPing.mockRejectedValue(new Error('Redis down'));
      service.configureRedis('redis://localhost:6379');
      const report = await service.getHealthReport();
      expect(report.status).toBe('unhealthy');
    });
    it('returns degraded or healthy when DB and Redis not configured', async () => {
      const report = await service.getHealthReport();
      expect(['degraded', 'healthy']).toContain(report.status);
    });
    it('returns healthy when all checks pass with low memory', async () => {
      mockPgQuery.mockResolvedValue({ rows: [{ health: 1 }] });
      service.configurePG('postgresql://localhost/test');
      mockPing.mockResolvedValue('PONG');
      service.configureRedis('redis://localhost:6379');
      const spy = vi.spyOn(process, 'memoryUsage').mockReturnValue({ heapUsed: 400*1024*1024, heapTotal: 1000*1024*1024, rss: 500*1024*1024, external: 0, arrayBuffers: 0 });
      const report = await service.getHealthReport();
      expect(report.status).toBe('healthy');
      spy.mockRestore();
    });
    it('timestamp is a valid ISO 8601 date string', async () => {
      const report = await service.getHealthReport();
      expect(new Date(report.timestamp).toISOString()).toBe(report.timestamp);
    });
  });

  describe('createHealthEndpoint()', () => {
    it('returns a router object', () => {
      const router = service.createHealthEndpoint();
      expect(router).toBeDefined();
    });
    it('registers GET /health/live route', () => {
      service.createHealthEndpoint();
      expect(mockRouterGet).toHaveBeenCalledWith('/health/live', expect.any(Function));
    });
    it('registers GET /health/ready route', () => {
      service.createHealthEndpoint();
      expect(mockRouterGet).toHaveBeenCalledWith('/health/ready', expect.any(Function));
    });
    it('registers GET /health route', () => {
      service.createHealthEndpoint();
      expect(mockRouterGet).toHaveBeenCalledWith('/health', expect.any(Function));
    });
    it('/health/live handler responds with alive status', () => {
      service.createHealthEndpoint();
      const handler = routeHandlers['/health/live'] as (req: unknown, res: { json: ReturnType<typeof vi.fn> }) => void;
      const mockRes = { json: vi.fn() };
      handler({}, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'alive' }));
    });
    it('/health/ready handler returns 200 for healthy status', async () => {
      mockPgQuery.mockResolvedValue({ rows: [{ health: 1 }] });
      service.configurePG('postgresql://localhost/test');
      mockPing.mockResolvedValue('PONG');
      service.configureRedis('redis://localhost:6379');
      vi.spyOn(process, 'memoryUsage').mockReturnValue({ heapUsed: 400*1024*1024, heapTotal: 1000*1024*1024, rss: 500*1024*1024, external: 0, arrayBuffers: 0 });
      service.createHealthEndpoint();
      type ResType = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
      const handler = routeHandlers['/health/ready'] as (req: unknown, res: ResType) => Promise<void>;
      const mockResJson = vi.fn();
      const mockResStatus = vi.fn().mockReturnValue({ json: mockResJson });
      await handler({}, { status: mockResStatus, json: mockResJson });
      expect(mockResStatus).toHaveBeenCalledWith(200);
      vi.restoreAllMocks();
    });
    it('/health/ready handler returns 503 for unhealthy status', async () => {
      mockPgQuery.mockRejectedValue(new Error('DB down'));
      service.configurePG('postgresql://localhost/test');
      mockPing.mockRejectedValue(new Error('Redis down'));
      service.configureRedis('redis://localhost:6379');
      service.createHealthEndpoint();
      type ResType = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
      const handler = routeHandlers['/health/ready'] as (req: unknown, res: ResType) => Promise<void>;
      const mockResJson = vi.fn();
      const mockResStatus = vi.fn().mockReturnValue({ json: mockResJson });
      await handler({}, { status: mockResStatus, json: mockResJson });
      expect(mockResStatus).toHaveBeenCalledWith(503);
    });
    it('/health/ready handler returns 200 for degraded status', async () => {
      service.createHealthEndpoint();
      type ResType = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
      const handler = routeHandlers['/health/ready'] as (req: unknown, res: ResType) => Promise<void>;
      const mockResJson = vi.fn();
      const mockResStatus = vi.fn().mockReturnValue({ json: mockResJson });
      await handler({}, { status: mockResStatus, json: mockResJson });
      expect(mockResStatus).toHaveBeenCalledWith(200);
    });
    it('/health handler returns 200 for healthy status', async () => {
      mockPgQuery.mockResolvedValue({ rows: [{ health: 1 }] });
      service.configurePG('postgresql://localhost/test');
      mockPing.mockResolvedValue('PONG');
      service.configureRedis('redis://localhost:6379');
      vi.spyOn(process, 'memoryUsage').mockReturnValue({ heapUsed: 400*1024*1024, heapTotal: 1000*1024*1024, rss: 500*1024*1024, external: 0, arrayBuffers: 0 });
      service.createHealthEndpoint();
      type ResType = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
      const handler = routeHandlers['/health'] as (req: unknown, res: ResType) => Promise<void>;
      const mockResJson = vi.fn();
      const mockResStatus = vi.fn().mockReturnValue({ json: mockResJson });
      await handler({}, { status: mockResStatus, json: mockResJson });
      expect(mockResStatus).toHaveBeenCalledWith(200);
      vi.restoreAllMocks();
    });
    it('/health handler returns 503 for unhealthy status', async () => {
      mockPgQuery.mockRejectedValue(new Error('DB down'));
      service.configurePG('postgresql://localhost/test');
      mockPing.mockRejectedValue(new Error('Redis down'));
      service.configureRedis('redis://localhost:6379');
      service.createHealthEndpoint();
      type ResType = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
      const handler = routeHandlers['/health'] as (req: unknown, res: ResType) => Promise<void>;
      const mockResJson = vi.fn();
      const mockResStatus = vi.fn().mockReturnValue({ json: mockResJson });
      await handler({}, { status: mockResStatus, json: mockResJson });
      expect(mockResStatus).toHaveBeenCalledWith(503);
    });
    it('/health handler returns 200 for degraded status', async () => {
      service.createHealthEndpoint();
      type ResType = { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
      const handler = routeHandlers['/health'] as (req: unknown, res: ResType) => Promise<void>;
      const mockResJson = vi.fn();
      const mockResStatus = vi.fn().mockReturnValue({ json: mockResJson });
      await handler({}, { status: mockResStatus, json: mockResJson });
      expect(mockResStatus).toHaveBeenCalledWith(200);
    });
  });
});

describe('createHealthService()', () => {
  it('returns a HealthService instance', () => {
    const s = createHealthService('5.0.0');
    expect(s).toBeInstanceOf(HealthService);
  });
  it('passes the version through to the HealthService', async () => {
    const s = createHealthService('5.0.0');
    const report = await s.getHealthReport();
    expect(report.version).toBe('5.0.0');
  });
  it('creates a service with default version when none is provided', async () => {
    const s = createHealthService();
    const report = await s.getHealthReport();
    expect(report.version).toBe('1.0.0');
  });
});
