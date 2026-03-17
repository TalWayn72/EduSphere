/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initTelemetry, reportError, setTelemetryContext } from './telemetry';

describe('telemetry', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn>;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendBeaconSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeaconSpy,
      writable: true,
      configurable: true,
    });
    fetchSpy = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reportError sends error via sendBeacon', () => {
    const error = new Error('Test error');
    reportError(error);

    expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeaconSpy.mock.calls[0];
    expect(url).toBe('/v1/traces');
    expect(blob).toBeInstanceOf(Blob);
  });

  it('reportError includes tenant and user context', async () => {
    setTelemetryContext({ tenantId: 'tenant-1', userId: 'user-1' });
    const error = new Error('Context test');
    reportError(error);

    const blob = sendBeaconSpy.mock.calls[0][1] as Blob;
    const text = await blob.text();
    const payload = JSON.parse(text);
    const attributes = payload.resourceSpans[0].scopeSpans[0].spans[0].attributes;
    const attrMap = Object.fromEntries(
      attributes.map((a: { key: string; value: { stringValue: string } }) => [
        a.key,
        a.value.stringValue,
      ]),
    );

    expect(attrMap['edusphere.tenant_id']).toBe('tenant-1');
    expect(attrMap['edusphere.user_id']).toBe('user-1');
    expect(attrMap['error.message']).toBe('Context test');
  });

  it('reportError falls back to fetch when sendBeacon unavailable', () => {
    Object.defineProperty(navigator, 'sendBeacon', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const error = new Error('Fallback test');
    reportError(error);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe('/v1/traces');
  });

  it('reportError includes extra attributes', async () => {
    const error = new Error('Extra attrs');
    reportError(error, { 'custom.key': 'custom-value' });

    const blob = sendBeaconSpy.mock.calls[0][1] as Blob;
    const text = await blob.text();
    const payload = JSON.parse(text);
    const attributes = payload.resourceSpans[0].scopeSpans[0].spans[0].attributes;
    const attrMap = Object.fromEntries(
      attributes.map((a: { key: string; value: { stringValue: string } }) => [
        a.key,
        a.value.stringValue,
      ]),
    );

    expect(attrMap['custom.key']).toBe('custom-value');
  });

  it('initTelemetry registers global error handlers', () => {
    const addSpy = vi.spyOn(globalThis, 'addEventListener');
    initTelemetry();

    const eventTypes = addSpy.mock.calls.map((c) => c[0]);
    expect(eventTypes).toContain('error');
    expect(eventTypes).toContain('unhandledrejection');
  });

  it('reportError generates valid trace and span IDs', async () => {
    reportError(new Error('ID test'));
    const blob = sendBeaconSpy.mock.calls[0][1] as Blob;
    const text = await blob.text();
    const payload = JSON.parse(text);
    const span = payload.resourceSpans[0].scopeSpans[0].spans[0];

    expect(span.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(span.spanId).toMatch(/^[0-9a-f]{16}$/);
  });
});
