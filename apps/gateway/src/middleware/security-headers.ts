/**
 * HTTP Security Headers Middleware — OWASP ASVS V14.4
 *
 * Applies hardened response headers to every HTTP response from the gateway.
 * Call `applySecurityHeaders(res)` before writing any response body.
 */
import type { ServerResponse } from 'node:http';

const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Content-Security-Policy directive map.
 * script-src keeps 'unsafe-inline' only in dev so GraphQL Playground works.
 * In production, no inline scripts are permitted.
 */
const CSP_DIRECTIVES: readonly string[] = [
  "default-src 'self'",
  IS_PROD ? "script-src 'self'" : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'", // Tailwind injects inline styles
  "img-src 'self' data: blob:",
  "connect-src 'self' ws: wss:", // GraphQL subscriptions via WebSocket
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
];

const SECURITY_HEADERS: ReadonlyMap<string, string> = new Map([
  [
    'Content-Security-Policy',
    CSP_DIRECTIVES.join('; '),
  ],
  // HSTS — 1 year, include subdomains, eligible for browser preload list
  [
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload',
  ],
  // Deny embedding in iframes (also covered by CSP frame-ancestors, belt+braces)
  ['X-Frame-Options', 'DENY'],
  // Prevent MIME-type sniffing
  ['X-Content-Type-Options', 'nosniff'],
  // Leak only origin on cross-origin, full URL on same-origin
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  // Opt out of browser features not needed by the API gateway
  [
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  ],
  // Disable DNS prefetching to avoid information leakage
  ['X-DNS-Prefetch-Control', 'off'],
]);

/**
 * Apply all OWASP ASVS V14.4 security headers to a Node.js ServerResponse.
 * Safe to call even after headers have been partially set — does not overwrite
 * headers the caller already defined explicitly.
 */
export function applySecurityHeaders(res: ServerResponse): void {
  for (const [name, value] of SECURITY_HEADERS) {
    // setHeader silently replaces duplicates; use getHeader to avoid clobbering
    // an explicitly-set value from a downstream handler.
    if (!res.getHeader(name)) {
      res.setHeader(name, value);
    }
  }
}

/**
 * Returns the full set of security headers as a plain object.
 * Used by tests to verify header values without needing a live server.
 */
export function getSecurityHeadersMap(): Record<string, string> {
  return Object.fromEntries(SECURITY_HEADERS);
}
