import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';

// Singleton registry — shared across the module
const registry = new Registry();
registry.setDefaultLabels({ service: 'subgraph-core' });
collectDefaultMetrics({ register: registry, prefix: 'edusphere_' });

export const HTTP_REQUEST_DURATION = new Histogram({
  name: 'edusphere_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

export const HTTP_REQUESTS_TOTAL = new Counter({
  name: 'edusphere_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const GRAPHQL_QUERY_DURATION = new Histogram({
  name: 'edusphere_graphql_query_duration_seconds',
  help: 'Duration of GraphQL operations in seconds',
  labelNames: ['operation_type', 'operation_name', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

export const ACTIVE_SUBSCRIPTIONS = new Gauge({
  name: 'edusphere_active_subscriptions_total',
  help: 'Number of active GraphQL subscriptions',
  labelNames: ['operation_name'],
  registers: [registry],
});

export const DB_QUERY_DURATION = new Histogram({
  name: 'edusphere_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [registry],
});

export const NATS_MESSAGES_PUBLISHED = new Counter({
  name: 'edusphere_nats_messages_published_total',
  help: 'Total NATS messages published',
  labelNames: ['subject'],
  registers: [registry],
});

export const NATS_MESSAGES_CONSUMED = new Counter({
  name: 'edusphere_nats_messages_consumed_total',
  help: 'Total NATS messages consumed',
  labelNames: ['subject', 'status'],
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
