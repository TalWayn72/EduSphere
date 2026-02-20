import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';

const registry = new Registry();
registry.setDefaultLabels({ service: 'subgraph-collaboration' });
collectDefaultMetrics({ register: registry, prefix: 'edusphere_' });

export const HTTP_REQUEST_DURATION = new Histogram({
  name: 'edusphere_collaboration_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

export const HTTP_REQUESTS_TOTAL = new Counter({
  name: 'edusphere_collaboration_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const GRAPHQL_QUERY_DURATION = new Histogram({
  name: 'edusphere_collaboration_graphql_query_duration_seconds',
  help: 'Duration of GraphQL operations in seconds',
  labelNames: ['operation_type', 'operation_name', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

export const METRICS_REGISTRY = registry;

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    {
      provide: 'METRICS_REGISTRY',
      useValue: registry,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: ['METRICS_REGISTRY'],
})
export class MetricsModule {}
