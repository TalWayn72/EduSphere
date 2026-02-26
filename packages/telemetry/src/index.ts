// IMPORTANT: This module MUST be imported and initTelemetry() called
// before any other imports in application entry points.
// OpenTelemetry patches Node.js built-ins (http, pg, net) at startup.

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

export {
  trace,
  SpanStatusCode,
  context,
  propagation,
} from '@opentelemetry/api';
export type { Span, Tracer } from '@opentelemetry/api';

/**
 * Initialise OpenTelemetry SDK for the given service.
 *
 * Call this at the very top of every application entry point, before
 * any other imports, so that Node.js module patches are applied first.
 *
 * @param serviceName  Logical service name shown in Jaeger / Grafana Tempo.
 *                     Use kebab-case matching the Docker service name.
 * @returns            The running NodeSDK instance (rarely needed directly).
 */
export function initTelemetry(serviceName: string): NodeSDK {
  const otlpEndpoint =
    process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? 'http://localhost:4318';

  const serviceVersion = process.env['npm_package_version'] ?? '1.0.0';

  const sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    }),

    traceExporter: new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
    }),

    // @ts-expect-error version skew between @opentelemetry/sdk-metrics and @opentelemetry/sdk-node
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${otlpEndpoint}/v1/metrics`,
      }),
      // Export every 30 seconds — safe default for production.
      exportIntervalMillis: 30_000,
    }),

    instrumentations: [
      getNodeAutoInstrumentations({
        // fs instrumentation is extremely noisy and rarely useful.
        '@opentelemetry/instrumentation-fs': { enabled: false },
        // net is low-level and produces redundant spans alongside http/pg.
        '@opentelemetry/instrumentation-net': { enabled: false },
        // HTTP instrumentation captures all inbound/outbound HTTP calls.
        '@opentelemetry/instrumentation-http': { enabled: true },
        // Postgres instrumentation traces every query, includes params.
        '@opentelemetry/instrumentation-pg': { enabled: true },
      }),
    ],
  });

  sdk.start();

  // Graceful shutdown — flush pending spans/metrics before the process exits.
  process.on('SIGTERM', () => {
    sdk.shutdown().catch(() => undefined);
  });
  process.on('SIGINT', () => {
    sdk.shutdown().catch(() => undefined);
  });

  return sdk;
}
