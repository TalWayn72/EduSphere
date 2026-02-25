import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';
import express, { Request, Response } from 'express';

export class MetricsService {
  private registry: Registry;
  private httpRequestDuration: Histogram;
  private httpRequestTotal: Counter;
  private activeConnections: Gauge;
  private dbQueryDuration: Histogram;
  private graphqlOperations: Counter;
  private cacheHitRate: Counter;

  constructor(serviceName: string) {
    this.registry = new Registry();
    this.registry.setDefaultLabels({ service: serviceName });

    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.registry, prefix: 'edusphere_' });

    // HTTP metrics
    this.httpRequestDuration = new Histogram({
      name: 'edusphere_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpRequestTotal = new Counter({
      name: 'edusphere_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: 'edusphere_active_connections',
      help: 'Number of active connections',
      registers: [this.registry],
    });

    // Database metrics
    this.dbQueryDuration = new Histogram({
      name: 'edusphere_db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2],
      registers: [this.registry],
    });

    // GraphQL metrics
    this.graphqlOperations = new Counter({
      name: 'edusphere_graphql_operations_total',
      help: 'Total number of GraphQL operations',
      labelNames: ['operation_type', 'operation_name', 'status'],
      registers: [this.registry],
    });

    // Cache metrics
    this.cacheHitRate = new Counter({
      name: 'edusphere_cache_operations_total',
      help: 'Total number of cache operations',
      labelNames: ['operation', 'result'],
      registers: [this.registry],
    });
  }

  /** Returns the underlying Prometheus Registry for this service. */
  getRegistry(): Registry {
    return this.registry;
  }

  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number
  ) {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration
    );
    this.httpRequestTotal.inc({ method, route, status_code: statusCode });
  }

  recordDbQuery(operation: string, table: string, duration: number) {
    this.dbQueryDuration.observe({ operation, table }, duration);
  }

  recordGraphqlOperation(
    type: string,
    name: string,
    status: 'success' | 'error'
  ) {
    this.graphqlOperations.inc({
      operation_type: type,
      operation_name: name,
      status,
    });
  }

  recordCacheOperation(operation: 'get' | 'set', result: 'hit' | 'miss') {
    this.cacheHitRate.inc({ operation, result });
  }

  incrementActiveConnections() {
    this.activeConnections.inc();
  }

  decrementActiveConnections() {
    this.activeConnections.dec();
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  createMetricsEndpoint(): express.Router {
    const router = express.Router();
    router.get('/metrics', async (req: Request, res: Response) => {
      res.set('Content-Type', this.registry.contentType);
      res.end(await this.getMetrics());
    });
    return router;
  }
}

export function createMetricsMiddleware(metricsService: MetricsService) {
  return (req: Request, res: Response, next: () => void) => {
    const start = Date.now();

    metricsService.incrementActiveConnections();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      metricsService.recordHttpRequest(
        req.method,
        req.route?.path || req.path,
        res.statusCode,
        duration
      );
      metricsService.decrementActiveConnections();
    });

    next();
  };
}

// NestJS-specific exports (module factory, controller, interceptor)
export { createMetricsModule } from './nestjs.module-factory.js';
export { MetricsController } from './nestjs.controller.js';
export { MetricsInterceptor } from './nestjs.interceptor.js';

export { Registry, Counter, Histogram, Gauge };
