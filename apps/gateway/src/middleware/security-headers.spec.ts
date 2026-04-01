import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  applySecurityHeaders,
  getSecurityHeadersMap,
} from './security-headers';
import type { ServerResponse } from 'node:http';

function createMockResponse(): ServerResponse {
  const headers = new Map<string, string>();
  return {
    getHeader: vi.fn((name: string) => headers.get(name.toLowerCase())),
    setHeader: vi.fn((name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
    }),
    _headers: headers,
  } as unknown as ServerResponse;
}

describe('security-headers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('applySecurityHeaders', () => {
    it('sets Content-Security-Policy header', () => {
      const res = createMockResponse();
      applySecurityHeaders(res);
      const calls = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls;
      const cspCall = calls.find(
        ([name]: [string]) => name === 'Content-Security-Policy'
      );
      expect(cspCall).toBeDefined();
      expect(cspCall![1]).toContain("default-src 'self'");
    });

    it('sets Strict-Transport-Security header', () => {
      const res = createMockResponse();
      applySecurityHeaders(res);
      const calls = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls;
      const hsts = calls.find(
        ([name]: [string]) => name === 'Strict-Transport-Security'
      );
      expect(hsts).toBeDefined();
      expect(hsts![1]).toContain('max-age=31536000');
    });

    it('sets X-Frame-Options to DENY', () => {
      const res = createMockResponse();
      applySecurityHeaders(res);
      const calls = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls;
      const xfo = calls.find(([name]: [string]) => name === 'X-Frame-Options');
      expect(xfo).toBeDefined();
      expect(xfo![1]).toBe('DENY');
    });

    it('sets X-Content-Type-Options to nosniff', () => {
      const res = createMockResponse();
      applySecurityHeaders(res);
      const calls = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls;
      const xcto = calls.find(
        ([name]: [string]) => name === 'X-Content-Type-Options'
      );
      expect(xcto).toBeDefined();
      expect(xcto![1]).toBe('nosniff');
    });

    it('sets Referrer-Policy header', () => {
      const res = createMockResponse();
      applySecurityHeaders(res);
      const calls = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls;
      const rp = calls.find(([name]: [string]) => name === 'Referrer-Policy');
      expect(rp).toBeDefined();
      expect(rp![1]).toBe('strict-origin-when-cross-origin');
    });

    it('sets Permissions-Policy header', () => {
      const res = createMockResponse();
      applySecurityHeaders(res);
      const calls = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls;
      const pp = calls.find(
        ([name]: [string]) => name === 'Permissions-Policy'
      );
      expect(pp).toBeDefined();
      expect(pp![1]).toContain('camera=()');
    });

    it('sets X-DNS-Prefetch-Control to off', () => {
      const res = createMockResponse();
      applySecurityHeaders(res);
      const calls = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls;
      const dns = calls.find(
        ([name]: [string]) => name === 'X-DNS-Prefetch-Control'
      );
      expect(dns).toBeDefined();
      expect(dns![1]).toBe('off');
    });

    it('does not overwrite headers already set on response', () => {
      const res = createMockResponse();
      // Simulate a pre-existing header
      (res.getHeader as ReturnType<typeof vi.fn>).mockImplementation(
        (name: string) =>
          name === 'X-Frame-Options' ? 'SAMEORIGIN' : undefined
      );
      applySecurityHeaders(res);
      const calls = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls;
      const xfoCalls = calls.filter(
        ([name]: [string]) => name === 'X-Frame-Options'
      );
      expect(xfoCalls).toHaveLength(0);
    });

    it('sets all 7 security headers on a fresh response', () => {
      const res = createMockResponse();
      applySecurityHeaders(res);
      expect(res.setHeader).toHaveBeenCalledTimes(7);
    });
  });

  describe('getSecurityHeadersMap', () => {
    it('returns a plain object with all header keys', () => {
      const map = getSecurityHeadersMap();
      expect(map).toHaveProperty('Content-Security-Policy');
      expect(map).toHaveProperty('Strict-Transport-Security');
      expect(map).toHaveProperty('X-Frame-Options');
      expect(map).toHaveProperty('X-Content-Type-Options');
      expect(map).toHaveProperty('Referrer-Policy');
      expect(map).toHaveProperty('Permissions-Policy');
      expect(map).toHaveProperty('X-DNS-Prefetch-Control');
    });

    it('returns 7 header entries', () => {
      const map = getSecurityHeadersMap();
      expect(Object.keys(map)).toHaveLength(7);
    });

    it('CSP contains frame-ancestors none', () => {
      const map = getSecurityHeadersMap();
      expect(map['Content-Security-Policy']).toContain(
        "frame-ancestors 'none'"
      );
    });

    it('CSP contains object-src none', () => {
      const map = getSecurityHeadersMap();
      expect(map['Content-Security-Policy']).toContain("object-src 'none'");
    });
  });
});
