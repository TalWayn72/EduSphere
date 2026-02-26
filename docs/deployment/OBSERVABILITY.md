# Observability Stack

**Phase 7.2 — Production Monitoring & Alerting**
**Version:** 1.0
**Last Updated:** 2026-02-22
**SOC2:** CC7.1 (System Monitoring), CC7.2 (Security Event Evaluation)

---

## Overview

EduSphere's observability stack provides three pillars:

1. **Traces** — OpenTelemetry → Jaeger (distributed request tracing)
2. **Metrics** — Prometheus scrape → Grafana dashboards
3. **Logs** — Pino JSON → Loki → Grafana

All three integrate via the OpenTelemetry SDK in `packages/telemetry`.

---

## Architecture

```
[NestJS Subgraphs / Gateway]
    | OTLP gRPC (traces + metrics)
[OpenTelemetry Collector]
    |-> Jaeger (traces)  :16686
    |-> Prometheus (metrics)  :9090
    |-> Loki (logs)  :3100

[Prometheus]
    |-> Grafana  :3000

[Alertmanager]  :9093
    |-> PagerDuty / Slack / Email
```

---

## OpenTelemetry SDK (`packages/telemetry`)

Every application entry point initializes the SDK **as the first import**:

```typescript
// CRITICAL: Must be first import in apps/gateway/src/index.ts etc.
import { initTelemetry } from '@edusphere/telemetry';
initTelemetry('gateway'); // service name = Kubernetes pod label
```

### Auto-instrumented libraries

- `@opentelemetry/instrumentation-http` — HTTP request spans
- `@opentelemetry/instrumentation-graphql` — GraphQL operation spans
- `@opentelemetry/instrumentation-pg` — PostgreSQL query spans
- `@opentelemetry/instrumentation-nestjs-core` — NestJS DI spans

### Exporters

| Exporter             | Destination           | Protocol  | Port |
| -------------------- | --------------------- | --------- | ---- |
| `OTLPTraceExporter`  | Jaeger / Tempo        | OTLP HTTP | 4318 |
| `OTLPMetricExporter` | Prometheus (via OTLP) | OTLP HTTP | 4318 |

---

## Prometheus Scrape Configuration

`infrastructure/monitoring/prometheus.yml` scrapes `/metrics` from:

- Gateway (:4000/metrics)
- All 6 subgraphs (:4001-4006/metrics)
- PostgreSQL (via postgres-exporter)
- Redis (via redis-exporter)
- Node.js system (via node-exporter)
- Containers (via cadvisor)

Scrape interval: **15 seconds**

---

## Alert Rules

`infrastructure/monitoring/rules/alerts.yml` defines:

| Alert                    | Condition                     | Severity | SOC2          |
| ------------------------ | ----------------------------- | -------- | ------------- |
| `HighErrorRate`          | >5% 5xx responses for 5min    | critical | CC7.1         |
| `ServiceDown`            | `up == 0` for 1min            | critical | A1.1          |
| `HighResponseTime`       | p95 >2s for 10min             | warning  | —             |
| `DatabasePoolExhaustion` | Pool >90% full for 5min       | warning  | CC6.1         |
| `HighMemoryUsage`        | RSS >1.5GB for 5min           | warning  | Memory Safety |
| `DiskSpaceLow`           | <10% disk remaining for 5min  | warning  | A1.2          |
| `HighGraphQLComplexity`  | p95 complexity >800 for 10min | warning  | CC6.6         |
| `LowCacheHitRate`        | Hit rate <50% for 15min       | info     | —             |

---

## Security: No PII in Telemetry

**Critical requirement:** Traces, metrics, and logs must never contain PII.

This is enforced at code review and is a required checklist item before any
observability code is merged.

| Allowed                                      | Prohibited                           |
| -------------------------------------------- | ------------------------------------ |
| Span attribute: `tenant.id` (UUID)           | Span attribute: `user.email`         |
| Metric label: `service`, `status_code`       | Metric label: `user_name`            |
| Log field: `requestId`, `tenantId`           | Log field: `email`, `annotationText` |
| Trace tag: `http.method`, `http.status_code` | Trace tag: `http.request.body`       |

**Enforcement:**

- Code review checklist item for all observability changes
- `pino-pretty` transport in dev (structured JSON in prod) — neither includes PII fields
- Span attribute allowlist reviewed quarterly against GDPR Article 25 (privacy by design)

---

## Grafana Dashboards

Pre-built dashboards in `infrastructure/monitoring/grafana/dashboards/`:

- **EduSphere Overview** — request rate, error rate, latency by service
- **Database** — connection pool usage, query duration, slow queries
- **NATS** — stream consumer lag, message rate
- **Agent AI** — LLM call rate, token usage, consent rate
- **Memory Safety** — heap usage per service, GC pause times

Access: http://localhost:3000 (dev) — admin/admin (change in production via `GF_SECURITY_ADMIN_PASSWORD`)

Dashboards are provisioned automatically from `infrastructure/monitoring/grafana/provisioning/`.

---

## Alertmanager Routes

`infrastructure/monitoring/alertmanager/` routes alerts:

- `critical` severity — PagerDuty (immediate oncall)
- `warning` severity — Slack `#platform-alerts`
- Security alerts (Wazuh rules 100001-100008) — `#security-oncall`

---

## Local Development

```bash
# Start full observability stack
docker-compose up -d jaeger prometheus grafana alertmanager loki promtail

# Jaeger UI
open http://localhost:16686

# Prometheus
open http://localhost:9090

# Grafana
open http://localhost:3000  # admin/admin
```

---

## Health Verification

```bash
# Prometheus self-health
curl http://localhost:9090/-/healthy

# Alertmanager health
curl http://localhost:9093/-/healthy

# Jaeger health
curl http://localhost:14269/

# Verify traces flowing (after sending a request to gateway)
# Navigate to http://localhost:16686 -> Search -> Service: "gateway"
```

---

## References

- [SOC2 CC7.1 — System Monitoring](https://www.aicpa.org/resources/article/soc-2-trust-services-criteria)
- [OpenTelemetry Node.js SDK](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
- [Prometheus Alert Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- `packages/telemetry/src/index.ts` — SDK initialization
- `infrastructure/monitoring/prometheus.yml` — Scrape config
- `infrastructure/monitoring/rules/alerts.yml` — Alert definitions
