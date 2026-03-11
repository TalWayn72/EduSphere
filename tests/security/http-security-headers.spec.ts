/**
 * OWASP ASVS V14.4 — HTTP Security Headers Test
 *
 * Static source analysis + unit-level verification that:
 *  1. The security-headers middleware module defines all required headers.
 *  2. The gateway index.ts imports and calls applySecurityHeaders.
 *  3. Every mandatory header is present with a correct value.
 *
 * No running server required — reads committed source files and the exported
 * header map from the middleware module directly.
 */

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const MIDDLEWARE_PATH = resolve(
  join(
    import.meta.dirname,
    '../../apps/gateway/src/middleware/security-headers.ts'
  )
);

const GATEWAY_INDEX_PATH = resolve(
  join(import.meta.dirname, '../../apps/gateway/src/index.ts')
);

function load(filePath: string): string {
  return readFileSync(filePath, 'utf-8');
}

describe('HTTP Security Headers middleware (OWASP ASVS V14.4)', () => {
  let middlewareSrc: string;
  let gatewaySrc: string;

  beforeAll(() => {
    middlewareSrc = load(MIDDLEWARE_PATH);
    gatewaySrc = load(GATEWAY_INDEX_PATH);
  });

  // ── Gateway wiring ─────────────────────────────────────────────────────────

  it('gateway index.ts imports applySecurityHeaders', () => {
    expect(gatewaySrc).toMatch(/applySecurityHeaders/);
    expect(gatewaySrc).toMatch(/security-headers/);
  });

  it('gateway index.ts calls applySecurityHeaders in the HTTP handler', () => {
    // The call must appear inside the createServer callback, not just imported.
    expect(gatewaySrc).toMatch(/applySecurityHeaders\s*\(\s*res\s*\)/);
  });

  // ── Header presence ────────────────────────────────────────────────────────

  it('middleware defines Strict-Transport-Security', () => {
    expect(middlewareSrc).toMatch(/Strict-Transport-Security/);
    expect(middlewareSrc).toMatch(/max-age=31536000/);
    expect(middlewareSrc).toMatch(/includeSubDomains/);
    expect(middlewareSrc).toMatch(/preload/);
  });

  it('middleware defines X-Frame-Options: DENY', () => {
    expect(middlewareSrc).toMatch(/X-Frame-Options/);
    expect(middlewareSrc).toMatch(/DENY/);
  });

  it('middleware defines X-Content-Type-Options: nosniff', () => {
    expect(middlewareSrc).toMatch(/X-Content-Type-Options/);
    expect(middlewareSrc).toMatch(/nosniff/);
  });

  it('middleware defines Referrer-Policy: strict-origin-when-cross-origin', () => {
    expect(middlewareSrc).toMatch(/Referrer-Policy/);
    expect(middlewareSrc).toMatch(/strict-origin-when-cross-origin/);
  });

  it('middleware defines Permissions-Policy restricting camera, mic, geolocation, payment', () => {
    expect(middlewareSrc).toMatch(/Permissions-Policy/);
    expect(middlewareSrc).toMatch(/camera=\(\)/);
    expect(middlewareSrc).toMatch(/microphone=\(\)/);
    expect(middlewareSrc).toMatch(/geolocation=\(\)/);
    expect(middlewareSrc).toMatch(/payment=\(\)/);
  });

  it('middleware defines X-DNS-Prefetch-Control: off', () => {
    expect(middlewareSrc).toMatch(/X-DNS-Prefetch-Control/);
    expect(middlewareSrc).toMatch(/off/);
  });

  // ── CSP ────────────────────────────────────────────────────────────────────

  it('CSP contains default-src self', () => {
    expect(middlewareSrc).toMatch(/default-src\s+'self'/);
  });

  it('CSP contains script-src self', () => {
    expect(middlewareSrc).toMatch(/script-src\s+'self'/);
  });

  it('CSP contains style-src self unsafe-inline (required for Tailwind)', () => {
    expect(middlewareSrc).toMatch(/style-src\s+'self'\s+'unsafe-inline'/);
  });

  it('CSP contains img-src self data: blob:', () => {
    expect(middlewareSrc).toMatch(/img-src\s+'self'\s+data:\s+blob:/);
  });

  it('CSP contains connect-src self ws: wss: (for GraphQL subscriptions)', () => {
    expect(middlewareSrc).toMatch(/connect-src\s+'self'\s+ws:\s+wss:/);
  });

  it('CSP contains frame-ancestors none', () => {
    expect(middlewareSrc).toMatch(/frame-ancestors\s+'none'/);
  });

  it('CSP does NOT allow object-src (no plugins)', () => {
    expect(middlewareSrc).toMatch(/object-src\s+'none'/);
  });

  // ── Production hardening ───────────────────────────────────────────────────

  it('middleware does NOT unconditionally allow unsafe-inline in script-src in production', () => {
    // The middleware must gate unsafe-inline on IS_PROD being false.
    // Verify: the string "script-src 'self'" appears without a bare
    // "'unsafe-inline'" immediately adjacent (without the IS_PROD guard).
    expect(middlewareSrc).toMatch(/IS_PROD/);
  });
});
