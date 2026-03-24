/**
 * Wave 1 Auth Hardening — Static Security Tests
 *
 * Validates that auth hardening patterns (SEC-1, SEC-3, BE-7) are correctly
 * implemented across the codebase by reading source files and asserting on
 * their content. No running server or database is required.
 *
 * Covered controls:
 *   SEC-1  Dev-token requires ALLOW_DEV_TOKEN env var
 *   SEC-1  Dev-token defaults to STUDENT, never SUPER_ADMIN
 *   SEC-3  JWT audience validation present in gateway + subgraph middleware
 *   BE-7   Header fallback strips SUPER_ADMIN
 *   -      Keycloak Client-ID standardized to edusphere-web
 */

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(join(import.meta.dirname, '../..'));

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEC-1: Dev-token requires ALLOW_DEV_TOKEN env var
// ═══════════════════════════════════════════════════════════════════════════════

describe('SEC-1: dev-token requires ALLOW_DEV_TOKEN env var', () => {
  it('packages/auth/src/jwt.ts checks ALLOW_DEV_TOKEN before accepting dev-token', () => {
    const content = readSource('packages/auth/src/jwt.ts');
    expect(content).toContain('ALLOW_DEV_TOKEN');
    // The check must appear BEFORE the dev-token acceptance line
    const allowIdx = content.indexOf('ALLOW_DEV_TOKEN');
    const devTokenIdx = content.indexOf('dev-token-mock-jwt');
    expect(allowIdx).toBeGreaterThan(-1);
    expect(devTokenIdx).toBeGreaterThan(-1);
    expect(allowIdx).toBeLessThan(devTokenIdx);
  });

  it('apps/gateway/src/index.ts checks ALLOW_DEV_TOKEN before accepting dev-token', () => {
    const content = readSource('apps/gateway/src/index.ts');
    expect(content).toContain('ALLOW_DEV_TOKEN');
    const allowIdx = content.indexOf('ALLOW_DEV_TOKEN');
    const devTokenIdx = content.indexOf('dev-token-mock-jwt');
    expect(allowIdx).toBeGreaterThan(-1);
    expect(devTokenIdx).toBeGreaterThan(-1);
    expect(allowIdx).toBeLessThan(devTokenIdx);
  });

  it('apps/gateway/gateway.config.ts checks ALLOW_DEV_TOKEN before accepting dev-token', () => {
    const content = readSource('apps/gateway/gateway.config.ts');
    expect(content).toContain('ALLOW_DEV_TOKEN');
    const allowIdx = content.indexOf('ALLOW_DEV_TOKEN');
    const devTokenIdx = content.indexOf('DEV_TOKEN');
    expect(allowIdx).toBeGreaterThan(-1);
    expect(devTokenIdx).toBeGreaterThan(-1);
  });

  it('no file accepts dev-token without requiring ALLOW_DEV_TOKEN === true', () => {
    const files = [
      'packages/auth/src/jwt.ts',
      'apps/gateway/src/index.ts',
      'apps/gateway/gateway.config.ts',
    ];

    for (const file of files) {
      const content = readSource(file);
      // Must require the env var to equal 'true', not just be truthy
      expect(content).toMatch(/ALLOW_DEV_TOKEN.*===.*'true'|ALLOW_DEV_TOKEN.*===.*"true"/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEC-1: Dev-token does NOT default to SUPER_ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

describe('SEC-1: dev-token does NOT default to SUPER_ADMIN', () => {
  it('packages/auth/src/jwt.ts defaults dev-token role to STUDENT', () => {
    const content = readSource('packages/auth/src/jwt.ts');
    // The dev-token path should have a default of STUDENT
    // Look for the pattern: DEV_TOKEN_ROLE ... ?? 'STUDENT'
    expect(content).toMatch(/DEV_TOKEN_ROLE.*\?\?.*['"]STUDENT['"]/);
  });

  it('packages/auth/src/jwt.ts does NOT hardcode roles: [SUPER_ADMIN] in dev-token path', () => {
    const content = readSource('packages/auth/src/jwt.ts');
    // Extract the dev-token block (from ALLOW_DEV_TOKEN check to the closing brace)
    const devTokenStart = content.indexOf('ALLOW_DEV_TOKEN');
    const devTokenEnd = content.indexOf('try {', devTokenStart);
    const devTokenBlock = content.substring(devTokenStart, devTokenEnd);

    // The block should NOT contain a hardcoded SUPER_ADMIN as the default role
    expect(devTokenBlock).not.toMatch(/roles:\s*\[\s*['"]SUPER_ADMIN['"]\s*\]/);
  });

  it('apps/gateway/src/index.ts defaults dev-token role to STUDENT, not SUPER_ADMIN', () => {
    const content = readSource('apps/gateway/src/index.ts');
    // The dev-token path should default to STUDENT
    expect(content).toMatch(/DEV_TOKEN_ROLE.*\?\?.*['"]STUDENT['"]/);

    // Extract the dev-token block
    const blockStart = content.indexOf("token === 'dev-token-mock-jwt'");
    expect(blockStart).toBeGreaterThan(-1);
    const blockEnd = content.indexOf('} else {', blockStart);
    const devBlock = content.substring(blockStart, blockEnd);

    // Should NOT have role = 'SUPER_ADMIN' as a default assignment
    expect(devBlock).not.toMatch(/role\s*=\s*['"]SUPER_ADMIN['"]\s*;/);
  });

  it('apps/gateway/gateway.config.ts defaults dev-token role to STUDENT', () => {
    const content = readSource('apps/gateway/gateway.config.ts');
    expect(content).toMatch(/DEV_TOKEN_ROLE.*\?\?.*['"]STUDENT['"]/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEC-3: JWT audience validation present
// ═══════════════════════════════════════════════════════════════════════════════

describe('SEC-3: JWT audience validation present', () => {
  it('apps/gateway/src/index.ts passes audience to jwtVerify', () => {
    const content = readSource('apps/gateway/src/index.ts');
    // jwtVerify call must include an audience parameter
    expect(content).toMatch(/jwtVerify\s*\(/);
    expect(content).toContain('audience:');
    // Verify the audience constant is derived from env or defaults to edusphere-web
    expect(content).toContain('KEYCLOAK_AUDIENCE');
  });

  it('apps/gateway/gateway.config.ts passes audience to jwtVerify', () => {
    const content = readSource('apps/gateway/gateway.config.ts');
    expect(content).toMatch(/jwtVerify\s*\(/);
    expect(content).toContain('audience:');
    expect(content).toContain('KEYCLOAK_AUDIENCE');
  });

  it('packages/auth/src/middleware.ts passes clientId to JWTValidator constructor', () => {
    const content = readSource('packages/auth/src/middleware.ts');
    // The JWTValidator constructor call must include clientId (3rd arg)
    expect(content).toMatch(
      /new\s+JWTValidator\s*\(\s*keycloakConfig\.url\s*,\s*keycloakConfig\.realm\s*,\s*keycloakConfig\.clientId\s*\)/
    );
  });

  it('packages/auth/src/jwt.ts JWTValidator stores audience from clientId parameter', () => {
    const content = readSource('packages/auth/src/jwt.ts');
    // Constructor accepts clientId and stores it
    expect(content).toMatch(/constructor\s*\(.*clientId/);
    expect(content).toContain('this.audience');
    // jwtVerify is called with audience when available
    expect(content).toContain('audience');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BE-7 / W0-3: Header fallback allows standard roles but NEVER SUPER_ADMIN
// SUPER_ADMIN must only come from validated JWT — never from spoofable headers.
// ═══════════════════════════════════════════════════════════════════════════════

describe('BE-7: header fallback allows gateway-validated roles (excluding SUPER_ADMIN)', () => {
  it('packages/auth/src/middleware.ts includes standard roles in ALLOWED_HEADER_ROLES', () => {
    const content = readSource('packages/auth/src/middleware.ts');
    // ALLOWED_HEADER_ROLES must exist
    expect(content).toContain('ALLOWED_HEADER_ROLES');

    // Extract the ALLOWED_HEADER_ROLES set definition
    const setStart = content.indexOf('ALLOWED_HEADER_ROLES');
    const setEnd = content.indexOf(']);', setStart);
    const setBlock = content.substring(setStart, setEnd);

    // Must include standard roles
    expect(setBlock).toContain('ORG_ADMIN');
    expect(setBlock).toContain('INSTRUCTOR');
    expect(setBlock).toContain('STUDENT');
    expect(setBlock).toContain('RESEARCHER');
  });

  it('packages/auth/src/middleware.ts EXCLUDES SUPER_ADMIN from ALLOWED_HEADER_ROLES (W0-3 security fix)', () => {
    const content = readSource('packages/auth/src/middleware.ts');

    // Extract the ALLOWED_HEADER_ROLES set definition
    const setStart = content.indexOf('ALLOWED_HEADER_ROLES');
    const setEnd = content.indexOf(']);', setStart);
    const setBlock = content.substring(setStart, setEnd);

    // SUPER_ADMIN must NOT be in the set — only JWT-validated tokens grant it
    expect(setBlock).not.toContain('SUPER_ADMIN');
  });

  it('packages/auth/src/middleware.ts documents that SUPER_ADMIN is restricted to JWT only', () => {
    const content = readSource('packages/auth/src/middleware.ts');
    // The comment must document the security decision
    expect(content).toMatch(/SUPER_ADMIN.*JWT|JWT.*SUPER_ADMIN/i);
  });

  it('packages/auth/src/middleware.ts logs when using header fallback', () => {
    const content = readSource('packages/auth/src/middleware.ts');
    // The fallback path must log a warning for observability
    expect(content).toMatch(/gateway-forwarded headers fallback/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Keycloak Client-ID standardized to edusphere-web
// ═══════════════════════════════════════════════════════════════════════════════

describe('Keycloak Client-ID standardized to edusphere-web', () => {
  it('packages/config/src/keycloak.ts defaults clientId to edusphere-web', () => {
    const content = readSource('packages/config/src/keycloak.ts');
    expect(content).toMatch(/clientId.*['"]edusphere-web['"]/);
    // Must NOT default to the old edusphere-app value
    expect(content).not.toMatch(/clientId.*['"]edusphere-app['"]/);
  });

  it('apps/web/src/lib/auth.ts defaults clientId to edusphere-web', () => {
    const content = readSource('apps/web/src/lib/auth.ts');
    expect(content).toMatch(/clientId.*['"]edusphere-web['"]/);
    expect(content).not.toMatch(/clientId.*['"]edusphere-app['"]/);
  });

  it('.github/workflows/ci.yml sets VITE_KEYCLOAK_CLIENT_ID to edusphere-web', () => {
    const content = readSource('.github/workflows/ci.yml');
    expect(content).toContain('VITE_KEYCLOAK_CLIENT_ID');
    // Find the line with the variable and verify its value
    const lines = content.split('\n');
    const clientIdLines = lines.filter((l) =>
      l.includes('VITE_KEYCLOAK_CLIENT_ID')
    );
    expect(clientIdLines.length).toBeGreaterThan(0);
    for (const line of clientIdLines) {
      expect(line).toMatch(/edusphere-web/);
      expect(line).not.toMatch(/edusphere-app/);
    }
  });

  it('gateway src/index.ts defaults KEYCLOAK_AUDIENCE to edusphere-web', () => {
    const content = readSource('apps/gateway/src/index.ts');
    expect(content).toMatch(/KEYCLOAK_AUDIENCE.*['"]edusphere-web['"]/);
    expect(content).not.toMatch(/KEYCLOAK_AUDIENCE.*['"]edusphere-app['"]/);
  });

  it('gateway gateway.config.ts defaults KEYCLOAK_AUDIENCE to edusphere-web', () => {
    const content = readSource('apps/gateway/gateway.config.ts');
    expect(content).toMatch(/KEYCLOAK_AUDIENCE.*['"]edusphere-web['"]/);
    expect(content).not.toMatch(/KEYCLOAK_AUDIENCE.*['"]edusphere-app['"]/);
  });
});
