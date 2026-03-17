/**
 * Frontend Error Telemetry — OpenTelemetry Browser SDK
 * Sends error spans to Jaeger/OTLP collector with tenantId + userId context.
 * Item #86 from master work plan.
 */

const OTLP_ENDPOINT = import.meta.env.VITE_OTLP_ENDPOINT || '/v1/traces';
const SERVICE_NAME = 'edusphere-web';

interface TelemetryContext {
  tenantId?: string;
  userId?: string;
}

interface ErrorSpan {
  traceId: string;
  spanId: string;
  name: string;
  timestamp: number;
  duration: number;
  status: 'ERROR';
  attributes: Record<string, string>;
}

let _context: TelemetryContext = {};

/** Set user context for all subsequent error reports. */
export function setTelemetryContext(ctx: TelemetryContext): void {
  _context = { ..._context, ...ctx };
}

/** Generate a random 32-char hex trace ID. */
function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Generate a random 16-char hex span ID. */
function generateSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Report an error to the OTLP collector. */
export function reportError(error: Error, extra?: Record<string, string>): void {
  const span: ErrorSpan = {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    name: `error: ${error.name}`,
    timestamp: Date.now() * 1_000_000, // nanoseconds
    duration: 0,
    status: 'ERROR',
    attributes: {
      'service.name': SERVICE_NAME,
      'error.type': error.name,
      'error.message': error.message,
      'error.stack': error.stack?.slice(0, 2000) || '',
      'browser.url': globalThis.location?.href || '',
      'browser.userAgent': globalThis.navigator?.userAgent || '',
      ...((_context.tenantId && { 'edusphere.tenant_id': _context.tenantId }) || {}),
      ...((_context.userId && { 'edusphere.user_id': _context.userId }) || {}),
      ...extra,
    },
  };

  // Best-effort — use sendBeacon for reliability, fall back to fetch
  const payload = JSON.stringify({
    resourceSpans: [
      {
        resource: { attributes: [{ key: 'service.name', value: { stringValue: SERVICE_NAME } }] },
        scopeSpans: [
          {
            spans: [
              {
                traceId: span.traceId,
                spanId: span.spanId,
                name: span.name,
                startTimeUnixNano: String(span.timestamp),
                endTimeUnixNano: String(span.timestamp),
                status: { code: 2, message: span.attributes['error.message'] },
                attributes: Object.entries(span.attributes).map(([key, value]) => ({
                  key,
                  value: { stringValue: value },
                })),
              },
            ],
          },
        ],
      },
    ],
  });

  if (typeof navigator?.sendBeacon === 'function') {
    navigator.sendBeacon(OTLP_ENDPOINT, new Blob([payload], { type: 'application/json' }));
  } else {
    fetch(OTLP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Telemetry failure is silent — never disrupt user experience
    });
  }
}

/** Install global error handlers. Call once in App.tsx. */
export function initTelemetry(): void {
  if (typeof globalThis.addEventListener !== 'function') return;

  globalThis.addEventListener('error', (event) => {
    if (event.error instanceof Error) {
      reportError(event.error, { 'error.source': 'window.onerror' });
    }
  });

  globalThis.addEventListener('unhandledrejection', (event) => {
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
    reportError(error, { 'error.source': 'unhandledrejection' });
  });
}
