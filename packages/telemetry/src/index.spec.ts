import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock the heavy OpenTelemetry SDK before it is imported ──────────────────
const mockShutdown = vi.fn().mockResolvedValue(undefined);
const mockStart = vi.fn();

vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: vi.fn().mockImplementation(() => ({
    start: mockStart,
    shutdown: mockShutdown,
  })),
}));

vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: vi.fn().mockReturnValue([]),
}));

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@opentelemetry/exporter-metrics-otlp-http', () => ({
  OTLPMetricExporter: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@opentelemetry/resources', () => ({
  Resource: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@opentelemetry/sdk-metrics', () => ({
  PeriodicExportingMetricReader: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@opentelemetry/semantic-conventions', () => ({
  SEMRESATTRS_SERVICE_NAME: 'service.name',
  SEMRESATTRS_SERVICE_VERSION: 'service.version',
}));

// ─── Import under test after mocks are set up ────────────────────────────────
import { initTelemetry } from './index';
import { NodeSDK } from '@opentelemetry/sdk-node';

describe('initTelemetry', () => {
  const originalEnv = process.env;
  let processOnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    processOnSpy = vi.spyOn(process, 'on').mockImplementation(() => process);
  });

  afterEach(() => {
    process.env = originalEnv;
    processOnSpy.mockRestore();
  });

  it('should return an SDK instance', () => {
    const sdk = initTelemetry('test-service');
    expect(sdk).toBeDefined();
  });

  it('should call NodeSDK constructor', () => {
    initTelemetry('test-service');
    expect(NodeSDK).toHaveBeenCalledTimes(1);
  });

  it('should call sdk.start()', () => {
    initTelemetry('test-service');
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('should use OTEL_EXPORTER_OTLP_ENDPOINT env var when set', () => {
    process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] = 'http://custom-jaeger:4318';
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    initTelemetry('test-service');
    expect(OTLPTraceExporter).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://custom-jaeger:4318/v1/traces',
      })
    );
  });

  it('should fall back to localhost:4318 when OTEL env var is not set', () => {
    delete process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
    initTelemetry('test-service');
    expect(OTLPTraceExporter).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:4318/v1/traces',
      })
    );
  });

  it('should register SIGTERM handler that calls sdk.shutdown()', async () => {
    initTelemetry('test-service');

    const sigTermCall = processOnSpy.mock.calls.find(
      ([event]) => event === 'SIGTERM'
    );
    expect(sigTermCall).toBeDefined();

    // Execute the registered handler
    const handler = sigTermCall![1] as () => void;
    handler();

    await vi.waitFor(() => expect(mockShutdown).toHaveBeenCalledTimes(1));
  });

  it('should register SIGINT handler that calls sdk.shutdown()', async () => {
    initTelemetry('test-service');

    const sigIntCall = processOnSpy.mock.calls.find(
      ([event]) => event === 'SIGINT'
    );
    expect(sigIntCall).toBeDefined();

    const handler = sigIntCall![1] as () => void;
    handler();

    await vi.waitFor(() => expect(mockShutdown).toHaveBeenCalledTimes(1));
  });

  it('should not throw even if sdk.shutdown() rejects', async () => {
    mockShutdown.mockRejectedValueOnce(new Error('flush failed'));
    initTelemetry('test-service');

    const sigTermCall = processOnSpy.mock.calls.find(
      ([event]) => event === 'SIGTERM'
    );
    const handler = sigTermCall![1] as () => void;

    await expect(async () => handler()).not.toThrow();
  });

  it('should pass the provided service name to Resource', () => {
    const { Resource } = require('@opentelemetry/resources');
    initTelemetry('subgraph-agent');
    expect(Resource).toHaveBeenCalledWith(
      expect.objectContaining({
        'service.name': 'subgraph-agent',
      })
    );
  });
});
