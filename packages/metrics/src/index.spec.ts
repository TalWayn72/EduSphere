import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// vi.hoisted() ensures these variables are initialized before the vi.mock()
// factories are hoisted to the top of the file.
// ---------------------------------------------------------------------------

const {
  mockObserve,
  mockInc,
  mockDec,
  mockMetrics,
  mockSetDefaultLabels,
  mockContentType,
  mockCollectDefaultMetrics,
  MockHistogram,
  MockCounter,
  MockGauge,
  MockRegistry,
} = vi.hoisted(() => {
  const mockObserve = vi.fn();
  const mockInc = vi.fn();
  const mockDec = vi.fn();
  const mockMetrics = vi.fn().mockResolvedValue('# HELP edusphere_test\nmetric 1');
  const mockSetDefaultLabels = vi.fn();
  const mockContentType = 'text/plain; version=0.0.4; charset=utf-8';
  const mockCollectDefaultMetrics = vi.fn();

  const MockHistogram = vi.fn().mockImplementation(() => ({ observe: mockObserve }));
  const MockCounter = vi.fn().mockImplementation(() => ({ inc: mockInc }));
  const MockGauge = vi.fn().mockImplementation(() => ({ inc: mockInc, dec: mockDec }));
  const MockRegistry = vi.fn().mockImplementation(() => ({
    setDefaultLabels: mockSetDefaultLabels,
    metrics: mockMetrics,
    contentType: mockContentType,
  }));

  return {
    mockObserve,
    mockInc,
    mockDec,
    mockMetrics,
    mockSetDefaultLabels,
    mockContentType,
    mockCollectDefaultMetrics,
    MockHistogram,
    MockCounter,
    MockGauge,
    MockRegistry,
  };
});

vi.mock('prom-client', () => ({
  Registry: MockRegistry,
  Counter: MockCounter,
  Histogram: MockHistogram,
  Gauge: MockGauge,
  collectDefaultMetrics: mockCollectDefaultMetrics,
}));

vi.mock('express', () => {
  const routerGet = vi.fn();
  const mockRouter = { get: routerGet };
  return {
    default: Object.assign(vi.fn(), {
      Router: vi.fn().mockReturnValue(mockRouter),
    }),
    Router: vi.fn().mockReturnValue(mockRouter),
  };
});

import { MetricsService, createMetricsMiddleware } from './index';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    vi.clearAllMocks();

    MockRegistry.mockImplementation(() => ({
      setDefaultLabels: mockSetDefaultLabels,
      metrics: mockMetrics,
      contentType: mockContentType,
    }));
    MockHistogram.mockImplementation(() => ({ observe: mockObserve }));
    MockCounter.mockImplementation(() => ({ inc: mockInc }));
    MockGauge.mockImplementation(() => ({ inc: mockInc, dec: mockDec }));

    service = new MetricsService('test-service');
  });

  // ── Constructor ────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('creates a new Registry on construction', () => {
      expect(MockRegistry).toHaveBeenCalledOnce();
    });

    it('sets default labels with the provided service name', () => {
      expect(mockSetDefaultLabels).toHaveBeenCalledWith({ service: 'test-service' });
    });

    it('calls collectDefaultMetrics with the registry and edusphere_ prefix', () => {
      expect(mockCollectDefaultMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ prefix: 'edusphere_' }),
      );
    });

    it('registers httpRequestDuration Histogram with correct name', () => {
      const httpDurationCall = MockHistogram.mock.calls.find(
        ([cfg]) => cfg.name === 'edusphere_http_request_duration_seconds',
      );
      expect(httpDurationCall).toBeDefined();
    });

    it('registers httpRequestTotal Counter with method/route/status_code labels', () => {
      const httpTotalCall = MockCounter.mock.calls.find(
        ([cfg]) => cfg.name === 'edusphere_http_requests_total',
      );
      expect(httpTotalCall).toBeDefined();
      expect(httpTotalCall?.[0].labelNames).toContain('method');
      expect(httpTotalCall?.[0].labelNames).toContain('route');
      expect(httpTotalCall?.[0].labelNames).toContain('status_code');
    });

    it('registers activeConnections Gauge', () => {
      const connGaugeCall = MockGauge.mock.calls.find(
        ([cfg]) => cfg.name === 'edusphere_active_connections',
      );
      expect(connGaugeCall).toBeDefined();
    });

    it('registers dbQueryDuration Histogram with operation/table labels', () => {
      const dbDurationCall = MockHistogram.mock.calls.find(
        ([cfg]) => cfg.name === 'edusphere_db_query_duration_seconds',
      );
      expect(dbDurationCall).toBeDefined();
      expect(dbDurationCall?.[0].labelNames).toContain('operation');
      expect(dbDurationCall?.[0].labelNames).toContain('table');
    });

    it('registers graphqlOperations Counter', () => {
      const gqlCall = MockCounter.mock.calls.find(
        ([cfg]) => cfg.name === 'edusphere_graphql_operations_total',
      );
      expect(gqlCall).toBeDefined();
    });

    it('registers cacheHitRate Counter', () => {
      const cacheCall = MockCounter.mock.calls.find(
        ([cfg]) => cfg.name === 'edusphere_cache_operations_total',
      );
      expect(cacheCall).toBeDefined();
    });
  });

  // ── recordHttpRequest ──────────────────────────────────────────────────────

  describe('recordHttpRequest()', () => {
    it('calls observe on httpRequestDuration histogram with correct labels', () => {
      service.recordHttpRequest('GET', '/api/courses', 200, 0.123);
      expect(mockObserve).toHaveBeenCalledWith(
        { method: 'GET', route: '/api/courses', status_code: 200 },
        0.123,
      );
    });

    it('calls inc on httpRequestTotal counter with correct labels', () => {
      service.recordHttpRequest('POST', '/graphql', 201, 0.05);
      expect(mockInc).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST', route: '/graphql', status_code: 201 }),
      );
    });

    it('records multiple requests independently', () => {
      service.recordHttpRequest('GET', '/health', 200, 0.001);
      service.recordHttpRequest('GET', '/health', 200, 0.002);
      expect(mockObserve).toHaveBeenCalledTimes(2);
    });
  });

  // ── recordDbQuery ──────────────────────────────────────────────────────────

  describe('recordDbQuery()', () => {
    it('calls observe on dbQueryDuration histogram', () => {
      service.recordDbQuery('SELECT', 'users', 0.042);
      expect(mockObserve).toHaveBeenCalledWith({ operation: 'SELECT', table: 'users' }, 0.042);
    });

    it('handles different operation types correctly', () => {
      service.recordDbQuery('INSERT', 'courses', 0.01);
      expect(mockObserve).toHaveBeenCalledWith({ operation: 'INSERT', table: 'courses' }, 0.01);
    });
  });

  // ── recordGraphqlOperation ─────────────────────────────────────────────────

  describe('recordGraphqlOperation()', () => {
    it('increments graphqlOperations counter with success status', () => {
      service.recordGraphqlOperation('query', 'GetCourses', 'success');
      expect(mockInc).toHaveBeenCalledWith(
        expect.objectContaining({
          operation_type: 'query',
          operation_name: 'GetCourses',
          status: 'success',
        }),
      );
    });

    it('increments graphqlOperations counter with error status', () => {
      service.recordGraphqlOperation('mutation', 'CreateUser', 'error');
      expect(mockInc).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error' }),
      );
    });
  });

  // ── recordCacheOperation ───────────────────────────────────────────────────

  describe('recordCacheOperation()', () => {
    it('records a cache hit', () => {
      service.recordCacheOperation('get', 'hit');
      expect(mockInc).toHaveBeenCalledWith({ operation: 'get', result: 'hit' });
    });

    it('records a cache miss', () => {
      service.recordCacheOperation('get', 'miss');
      expect(mockInc).toHaveBeenCalledWith({ operation: 'get', result: 'miss' });
    });

    it('records a cache set operation', () => {
      service.recordCacheOperation('set', 'hit');
      expect(mockInc).toHaveBeenCalledWith({ operation: 'set', result: 'hit' });
    });
  });

  // ── Active connections gauge ───────────────────────────────────────────────

  describe('incrementActiveConnections() / decrementActiveConnections()', () => {
    it('calls inc on the activeConnections gauge when incrementing', () => {
      service.incrementActiveConnections();
      expect(mockInc).toHaveBeenCalled();
    });

    it('calls dec on the activeConnections gauge when decrementing', () => {
      service.decrementActiveConnections();
      expect(mockDec).toHaveBeenCalled();
    });
  });

  // ── getMetrics ─────────────────────────────────────────────────────────────

  describe('getMetrics()', () => {
    it('returns a string from the registry', async () => {
      const result = await service.getMetrics();
      expect(typeof result).toBe('string');
    });

    it('delegates to registry.metrics()', async () => {
      await service.getMetrics();
      expect(mockMetrics).toHaveBeenCalledOnce();
    });

    it('returns prometheus text exposition content', async () => {
      const result = await service.getMetrics();
      expect(result).toContain('edusphere_test');
    });
  });

  // ── createMetricsEndpoint ──────────────────────────────────────────────────

  describe('createMetricsEndpoint()', () => {
    it('returns an express Router', () => {
      const router = service.createMetricsEndpoint();
      expect(router).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// createMetricsMiddleware
// ---------------------------------------------------------------------------

describe('createMetricsMiddleware()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockRegistry.mockImplementation(() => ({
      setDefaultLabels: vi.fn(),
      metrics: vi.fn().mockResolvedValue(''),
      contentType: '',
    }));
    MockHistogram.mockImplementation(() => ({ observe: mockObserve }));
    MockCounter.mockImplementation(() => ({ inc: mockInc }));
    MockGauge.mockImplementation(() => ({ inc: mockInc, dec: mockDec }));
  });

  it('calls incrementActiveConnections when a request arrives and decrements on finish', () => {
    const service = new MetricsService('middleware-test');
    const incSpy = vi.spyOn(service, 'incrementActiveConnections');
    const decSpy = vi.spyOn(service, 'decrementActiveConnections');
    const recordSpy = vi.spyOn(service, 'recordHttpRequest');

    const onHandlers: Record<string, () => void> = {};
    const mockRes = {
      on: (event: string, handler: () => void) => {
        onHandlers[event] = handler;
      },
      statusCode: 200,
    };
    const mockReq = { method: 'GET', path: '/test', route: undefined };
    const next = vi.fn();

    const middleware = createMetricsMiddleware(service);
    middleware(mockReq as never, mockRes as never, next);

    expect(incSpy).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();

    onHandlers['finish']();
    expect(decSpy).toHaveBeenCalledOnce();
    expect(recordSpy).toHaveBeenCalledWith('GET', '/test', 200, expect.any(Number));
  });

  it('uses req.route.path when route is available', () => {
    const service = new MetricsService('middleware-test');
    const recordSpy = vi.spyOn(service, 'recordHttpRequest');

    const onHandlers: Record<string, () => void> = {};
    const mockRes = {
      on: (event: string, handler: () => void) => {
        onHandlers[event] = handler;
      },
      statusCode: 201,
    };
    const mockReq = { method: 'POST', path: '/actual', route: { path: '/route-pattern' } };
    const next = vi.fn();

    const middleware = createMetricsMiddleware(service);
    middleware(mockReq as never, mockRes as never, next);
    onHandlers['finish']();

    expect(recordSpy).toHaveBeenCalledWith('POST', '/route-pattern', 201, expect.any(Number));
  });

  it('records a non-negative duration in seconds', () => {
    const service = new MetricsService('middleware-test');
    const recordSpy = vi.spyOn(service, 'recordHttpRequest');

    const onHandlers: Record<string, () => void> = {};
    const mockRes = {
      on: (event: string, handler: () => void) => {
        onHandlers[event] = handler;
      },
      statusCode: 200,
    };
    const mockReq = { method: 'GET', path: '/', route: undefined };
    const next = vi.fn();

    const middleware = createMetricsMiddleware(service);
    middleware(mockReq as never, mockRes as never, next);
    onHandlers['finish']();

    const duration = recordSpy.mock.calls[0][3];
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('calls next() to pass control to the next middleware', () => {
    const service = new MetricsService('middleware-test');

    const onHandlers: Record<string, () => void> = {};
    const mockRes = {
      on: (event: string, handler: () => void) => {
        onHandlers[event] = handler;
      },
      statusCode: 200,
    };
    const mockReq = { method: 'GET', path: '/', route: undefined };
    const next = vi.fn();

    const middleware = createMetricsMiddleware(service);
    middleware(mockReq as never, mockRes as never, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
