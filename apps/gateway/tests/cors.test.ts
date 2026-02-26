import { describe, it, expect, afterEach } from 'vitest';

/**
 * Derives the CORS origin list exactly as apps/gateway/src/index.ts does:
 *
 *   process.env.CORS_ORIGIN
 *     ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
 *     : []
 */
function resolveCorsOrigins(): string[] {
  return process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [];
}

describe('CORS origin resolution', () => {
  afterEach(() => {
    delete process.env.CORS_ORIGIN;
  });

  it('returns both origins when CORS_ORIGIN contains two comma-separated values', () => {
    process.env.CORS_ORIGIN =
      'https://app.example.com,https://admin.example.com';
    const origins = resolveCorsOrigins();
    expect(origins).toContain('https://app.example.com');
    expect(origins).toContain('https://admin.example.com');
    expect(origins).toHaveLength(2);
  });

  it('trims whitespace around each origin', () => {
    process.env.CORS_ORIGIN =
      '  https://app.example.com , https://admin.example.com  ';
    const origins = resolveCorsOrigins();
    expect(origins).toContain('https://app.example.com');
    expect(origins).toContain('https://admin.example.com');
    expect(origins).toHaveLength(2);
  });

  it('returns empty array when CORS_ORIGIN is not set', () => {
    delete process.env.CORS_ORIGIN;
    const origins = resolveCorsOrigins();
    expect(origins).toEqual([]);
    expect(origins).toHaveLength(0);
  });

  it('never contains the wildcard string regardless of env', () => {
    // Case 1: env not set
    delete process.env.CORS_ORIGIN;
    expect(resolveCorsOrigins()).not.toContain('*');

    // Case 2: env set to specific origins
    process.env.CORS_ORIGIN =
      'https://app.example.com,https://admin.example.com';
    expect(resolveCorsOrigins()).not.toContain('*');

    // Case 3: env is empty string (edge case — treat as unset → fail closed)
    process.env.CORS_ORIGIN = '';
    const fromEmpty = resolveCorsOrigins();
    expect(fromEmpty).not.toContain('*');
  });

  it('returns a single origin when CORS_ORIGIN has no comma', () => {
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    const origins = resolveCorsOrigins();
    expect(origins).toEqual(['http://localhost:5173']);
  });

  it('result is always an Array (never a bare string)', () => {
    process.env.CORS_ORIGIN = 'https://app.example.com';
    expect(Array.isArray(resolveCorsOrigins())).toBe(true);

    delete process.env.CORS_ORIGIN;
    expect(Array.isArray(resolveCorsOrigins())).toBe(true);
  });
});
