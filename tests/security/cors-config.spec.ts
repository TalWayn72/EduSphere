/**
 * SI-2 / G-06 Security Test: CORS Configuration
 *
 * Static source-analysis test — validates that the Gateway source code
 * enforces a strict CORS policy:
 *   - No wildcard origin ('*')
 *   - Origin derived from CORS_ORIGIN environment variable
 *   - Fail-closed fallback (empty array, not wildcard) when env var is absent
 *
 * No running server is required; this reads the committed source file.
 */

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const GATEWAY_INDEX = resolve(
  join(import.meta.dirname, '../../apps/gateway/src/index.ts')
);

function loadGatewaySource(): string {
  return readFileSync(GATEWAY_INDEX, 'utf-8');
}

describe('Gateway CORS configuration (SI-2, G-06)', () => {
  let source: string;

  beforeAll(() => {
    source = loadGatewaySource();
  });

  it('must NOT have wildcard origin string literal', () => {
    // The string '*' must never appear as the cors origin value.
    // Any of these forms would be a violation.
    expect(source).not.toMatch(/origin:\s*['"`]\*['"`]/);
  });

  it('must NOT fall back to wildcard via logical OR', () => {
    // Old bug: `CORS_ORIGIN?.split(',') || '*'`
    // The || fallback to '*' is forbidden.
    expect(source).not.toMatch(/\|\|\s*['"`]\*['"`]/);
  });

  it('must read origin from CORS_ORIGIN environment variable', () => {
    expect(source).toContain('CORS_ORIGIN');
  });

  it('must fail closed with an empty array when CORS_ORIGIN is not set', () => {
    // The safe fallback is [] which denies all cross-origin requests.
    // Matches the ternary pattern: `? ... : []`
    expect(source).toMatch(/:\s*\[\]/);
  });

  it('must restrict allowed HTTP methods to GET, POST, OPTIONS', () => {
    // Only the minimal method set required by GraphQL over HTTP.
    expect(source).toContain("'GET'");
    expect(source).toContain("'POST'");
    expect(source).toContain("'OPTIONS'");
  });

  it('must enable credentials flag for JWT cookie support', () => {
    expect(source).toContain('credentials: true');
  });
});
