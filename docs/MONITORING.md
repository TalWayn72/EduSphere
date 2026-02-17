# Production Monitoring (Phase 13)

Complete observability stack for EduSphere with metrics, logs, alerts, and dashboards.

## Overview

The monitoring stack provides:
- ✅ **Prometheus**: Time-series metrics collection
- ✅ **Grafana**: Visualization dashboards
- ✅ **Loki**: Log aggregation and querying
- ✅ **AlertManager**: Alert routing and notification
- ✅ **Exporters**: PostgreSQL, Redis, Node, Container metrics
- ✅ **Health Checks**: Liveness and readiness probes

## Architecture

```
┌─────────────┐
│  Services   │───▶ Metrics ───▶ Prometheus ───▶ Grafana
│  (Gateway,  │                      │              │
│  Subgraphs) │                      │              │
└─────────────┘                      ▼              │
                               AlertManager ────────┘
                                     │
      ┌──────────────────────────────┼───────────────────┐
      ▼                              ▼                   ▼
   Slack                        PagerDuty             Email

┌─────────────┐
│  Services   │───▶ Logs ───▶ Promtail ───▶ Loki ───▶ Grafana
│  (Containers)│
└─────────────┘
```

## Quick Start

### 1. Start Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify all services are running
docker-compose -f docker-compose.monitoring.yml ps

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f
```

### 2. Access Dashboards

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3001 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **AlertManager** | http://localhost:9093 | - |
| **cAdvisor** | http://localhost:8081 | - |

### 3. Configure Alerts

Update environment variables in `docker-compose.monitoring.yml`:

```yaml
environment:
  - SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
  - PAGERDUTY_SERVICE_KEY=your-pagerduty-key
  - SMTP_PASSWORD=your-smtp-password
```

## Metrics Package (@edusphere/metrics)

### Installation

Add to your service's `package.json`:

```json
{
  "dependencies": {
    "@edusphere/metrics": "workspace:*"
  }
}
```

### Usage in NestJS Services

```typescript
import { MetricsService, createMetricsMiddleware } from '@edusphere/metrics';
import express from 'express';

// Create metrics service
const metrics = new MetricsService('subgraph-core');

// Add metrics endpoint
app.use(metrics.createMetricsEndpoint());

// Add metrics middleware
app.use(createMetricsMiddleware(metrics));

// Record custom metrics
metrics.recordDbQuery('select', 'users', 0.045);
metrics.recordGraphqlOperation('query', 'getUser', 'success');
metrics.recordCacheOperation('get', 'hit');
```

### Available Metrics

#### HTTP Metrics
- `edusphere_http_request_duration_seconds` - Request latency histogram
- `edusphere_http_requests_total` - Total request count
- `edusphere_active_connections` - Active connections gauge

#### Database Metrics
- `edusphere_db_query_duration_seconds` - Query latency histogram
- `edusphere_db_pool_active_connections` - Active connections
- `edusphere_db_pool_max_connections` - Max connections

#### GraphQL Metrics
- `edusphere_graphql_operations_total` - Operations count
- `edusphere_graphql_query_complexity` - Query complexity
- `edusphere_graphql_errors_total` - Error count

#### Cache Metrics
- `edusphere_cache_operations_total` - Cache operations
- `edusphere_cache_hit_rate` - Cache hit rate percentage

#### System Metrics (Default)
- `process_cpu_seconds_total` - CPU usage
- `process_resident_memory_bytes` - Memory usage
- `nodejs_eventloop_lag_seconds` - Event loop lag
- `nodejs_gc_duration_seconds` - GC duration

## Health Checks Package (@edusphere/health)

### Installation

```json
{
  "dependencies": {
    "@edusphere/health": "workspace:*"
  }
}
```

### Usage

```typescript
import { HealthService } from '@edusphere/health';

// Create health service
const health = new HealthService('1.0.0');

// Configure dependencies
health.configurePG(process.env.DATABASE_URL!);
health.configureRedis(process.env.REDIS_URL!);

// Add health endpoints
app.use(health.createHealthEndpoint());
```

### Endpoints

#### GET /health/live
Liveness probe - returns 200 if service is alive.

```json
{
  "status": "alive",
  "timestamp": "2026-02-17T12:00:00.000Z"
}
```

#### GET /health/ready
Readiness probe - checks all dependencies.

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 120000,
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "message": "Connected",
      "latency": 12,
      "timestamp": "2026-02-17T12:00:00.000Z"
    },
    {
      "name": "redis",
      "status": "healthy",
      "message": "Connected",
      "latency": 3,
      "timestamp": "2026-02-17T12:00:00.000Z"
    },
    {
      "name": "memory",
      "status": "healthy",
      "message": "245.67MB / 512.00MB (47.9%)",
      "timestamp": "2026-02-17T12:00:00.000Z"
    }
  ],
  "timestamp": "2026-02-17T12:00:00.000Z"
}
```

#### GET /health
Full health report (same as `/health/ready`).

### Kubernetes Integration

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: subgraph-core
spec:
  containers:
    - name: app
      image: edusphere/subgraph-core:latest
      livenessProbe:
        httpGet:
          path: /health/live
          port: 4001
        initialDelaySeconds: 10
        periodSeconds: 30
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 4001
        initialDelaySeconds: 5
        periodSeconds: 10
```

## Alert Rules

### Critical Alerts

**ServiceDown**
- Trigger: Service unavailable for 1+ minute
- Notification: PagerDuty + Slack
- Action: Immediate investigation required

**HighErrorRate**
- Trigger: 5xx error rate > 5% for 5+ minutes
- Notification: PagerDuty + Slack
- Action: Check logs, investigate root cause

**DatabasePoolExhaustion**
- Trigger: Connection pool > 90% for 5+ minutes
- Notification: Slack
- Action: Scale database connections or investigate queries

### Warning Alerts

**HighResponseTime**
- Trigger: p95 latency > 2s for 10+ minutes
- Notification: Slack
- Action: Investigate slow queries/endpoints

**HighMemoryUsage**
- Trigger: Memory > 1.5GB for 5+ minutes
- Notification: Slack
- Action: Check for memory leaks

**DiskSpaceLow**
- Trigger: Disk space < 10% remaining
- Notification: Slack + Email
- Action: Clean up logs or scale storage

### Info Alerts

**LowCacheHitRate**
- Trigger: Cache hit rate < 50% for 15+ minutes
- Notification: Slack
- Action: Review caching strategy

## Grafana Dashboards

### EduSphere Overview Dashboard

**Panels:**
1. HTTP Request Rate (by service)
2. Error Rate (by service)
3. Response Time p95 (by service)
4. Active Connections
5. Database Query Duration p95
6. GraphQL Operations (by type)
7. Memory Usage (by service)
8. CPU Usage (by service)

**Filters:**
- Time range (last 5m, 15m, 1h, 6h, 24h, 7d)
- Service selector
- Tenant ID filter

### Database Dashboard

**Panels:**
1. Query Duration Heatmap
2. Connection Pool Usage
3. Slow Query Log
4. Transaction Rate
5. Deadlocks
6. Cache Hit Rate

### GraphQL Dashboard

**Panels:**
1. Operations by Type (Query/Mutation/Subscription)
2. Operation Duration by Name
3. Query Complexity Distribution
4. Error Rate by Operation
5. Resolver Performance
6. Cache Hit Rate

## Log Aggregation (Loki)

### Query Examples

**View all logs from gateway:**
```logql
{service="gateway"}
```

**Find errors in last 5 minutes:**
```logql
{level="error"} |= "error" | json
```

**Search for specific tenant:**
```logql
{service="subgraph-core"} | json | tenant_id="550e8400-e29b-41d4-a716-446655440000"
```

**Count errors by service:**
```logql
sum(rate({level="error"}[5m])) by (service)
```

**GraphQL operation logs:**
```logql
{service=~"subgraph-.*"} | json | operation_type=~"query|mutation"
```

### Structured Logging

Ensure all services use structured JSON logs:

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

logger.info({
  msg: 'User logged in',
  tenantId: '550e8400-e29b-41d4-a716-446655440000',
  userId: '123',
  operation: 'login',
});
```

## Prometheus Queries

### Service Health

**Request rate:**
```promql
sum(rate(edusphere_http_requests_total[5m])) by (service)
```

**Error percentage:**
```promql
100 * (
  sum(rate(edusphere_http_requests_total{status_code=~"5.."}[5m]))
  /
  sum(rate(edusphere_http_requests_total[5m]))
)
```

**p95 latency:**
```promql
histogram_quantile(0.95,
  sum(rate(edusphere_http_request_duration_seconds_bucket[5m])) by (le, service)
)
```

### Database Health

**Query duration p99:**
```promql
histogram_quantile(0.99,
  sum(rate(edusphere_db_query_duration_seconds_bucket[5m])) by (le, operation)
)
```

**Connection pool usage:**
```promql
edusphere_db_pool_active_connections / edusphere_db_pool_max_connections * 100
```

### System Health

**Memory usage:**
```promql
process_resident_memory_bytes / (1024 * 1024)
```

**CPU usage:**
```promql
rate(process_cpu_seconds_total[5m]) * 100
```

**Event loop lag:**
```promql
nodejs_eventloop_lag_seconds
```

## Troubleshooting

### Prometheus not scraping targets

**Check target status:**
```bash
curl http://localhost:9090/api/v1/targets
```

**Common issues:**
- Service not exposing `/metrics` endpoint
- Network connectivity issues
- Wrong port in `prometheus.yml`

**Solution:**
```bash
# Verify metrics endpoint
curl http://localhost:4001/metrics

# Check Prometheus logs
docker logs edusphere-prometheus
```

### Grafana dashboard not showing data

**Check data source:**
1. Go to Configuration → Data Sources
2. Click "Test" on Prometheus data source
3. Verify connection is successful

**Check queries:**
1. Open dashboard panel
2. Click "Edit"
3. Verify metric name exists in Prometheus

### Alerts not firing

**Check alert rules:**
```bash
curl http://localhost:9090/api/v1/rules
```

**Check AlertManager:**
```bash
curl http://localhost:9093/api/v2/alerts
```

**Verify notification channels:**
- Slack webhook URL is correct
- PagerDuty service key is valid
- SMTP credentials are correct

### High cardinality metrics

**Problem:** Too many unique label combinations.

**Solution:**
- Limit dynamic labels (avoid user IDs, request IDs)
- Use aggregation (count by service, not by individual user)
- Set label limits in Prometheus config

## Best Practices

### 1. Metric Naming
- Use `edusphere_` prefix for all custom metrics
- Use snake_case for metric names
- Include unit suffix (`_seconds`, `_bytes`, `_total`)

### 2. Label Usage
- Keep labels low cardinality (< 100 unique values)
- Use labels for aggregation dimensions
- Avoid high-cardinality labels (user_id, request_id)

### 3. Alert Design
- Set appropriate thresholds based on SLOs
- Use `for` duration to avoid flapping
- Group related alerts
- Include actionable annotations

### 4. Dashboard Design
- Start with high-level overview
- Drill down to service-specific views
- Use consistent time ranges
- Add descriptions to panels

### 5. Log Volume
- Use appropriate log levels
- Avoid logging sensitive data
- Set retention policies
- Archive old logs to cheap storage

## Production Checklist

- [ ] Prometheus retention set to 30 days
- [ ] Grafana admin password changed
- [ ] AlertManager notification channels configured
- [ ] SSL/TLS enabled for Grafana
- [ ] Backup strategy for Prometheus data
- [ ] Log retention policy set
- [ ] SLOs defined and monitored
- [ ] Runbooks linked to alerts
- [ ] On-call rotation configured
- [ ] Escalation policies defined

## Next Steps

### Phase 14: AI/ML Pipeline
- RAG implementation
- LangGraph workflows
- Knowledge graph integration

### Phase 15: Mobile App Polish
- Push notifications
- Biometric auth
- Offline course downloads

---

**Monitoring Stack Version:** 1.0.0
**Last Updated:** February 2026
**Maintained by:** EduSphere Platform Team
