/**
 * Static security tests for GDPR Art.17 (Right to Erasure).
 * G-03 and G-03b (cryptographic proof) implementation verification.
 * G-11 (Data Portability) moved to gdpr-portability.spec.ts.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

function readFile(relPath: string): string {
  const full = resolve(ROOT, relPath);
  return existsSync(full) ? readFileSync(full, 'utf-8') : '';
}

function fileExists(relPath: string): boolean {
  return existsSync(resolve(ROOT, relPath));
}

// ── G-03: Right to Erasure (GDPR Art.17) ─────────────────────────────────────

describe('G-03: Right to Erasure (GDPR Art.17)', () => {
  const ERASURE_SERVICE = 'apps/subgraph-core/src/user/user-erasure.service.ts';

  it('user-erasure.service.ts exists', () => {
    expect(fileExists(ERASURE_SERVICE)).toBe(true);
  });

  it('erasure service uses hard-delete (db.delete), not soft-delete', () => {
    const content = readFile(ERASURE_SERVICE);
    // Must perform actual deletes
    expect(content).toContain('.delete(');
    // Must NOT set deleted_at (soft-delete is not sufficient for GDPR Art.17)
    expect(content).not.toMatch(/set\s*\(\s*\{[^}]*deleted_at/s);
    expect(content).not.toMatch(/\.set\s*\(\s*\{\s*deletedAt/s);
  });

  it('erasure service hard-deletes agentMessages', () => {
    const content = readFile(ERASURE_SERVICE);
    expect(content).toMatch(/agentMessages/);
    expect(content).toContain('.delete(');
  });

  it('erasure service hard-deletes agentSessions', () => {
    const content = readFile(ERASURE_SERVICE);
    expect(content).toMatch(/agentSessions/);
  });

  it('erasure service hard-deletes annotations', () => {
    const content = readFile(ERASURE_SERVICE);
    expect(content).toMatch(/annotations/);
  });

  it('erasure service hard-deletes userProgress', () => {
    const content = readFile(ERASURE_SERVICE);
    expect(content).toMatch(/userProgress/);
  });

  it('erasure service hard-deletes userCourses (enrollments)', () => {
    const content = readFile(ERASURE_SERVICE);
    expect(content).toMatch(/userCourses/);
  });

  it('erasure service hard-deletes the user record itself', () => {
    const content = readFile(ERASURE_SERVICE);
    expect(content).toMatch(/schema\.users/);
    // Must include delete operation on users table
    expect(content).toContain('.delete(schema.users)');
  });

  it('erasure service writes audit log with DATA_ERASURE action', () => {
    const content = readFile(ERASURE_SERVICE);
    expect(content).toContain('DATA_ERASURE');
    expect(content).toContain("gdprArticle: '17'");
  });

  it('erasure service uses withTenantContext for RLS enforcement', () => {
    const content = readFile(ERASURE_SERVICE);
    expect(content).toContain('withTenantContext');
  });

  it('erasure service returns ErasureReport with status field', () => {
    const content = readFile(ERASURE_SERVICE);
    expect(content).toMatch(/ErasureReport/);
    expect(content).toMatch(/status.*IN_PROGRESS|COMPLETED|FAILED/);
  });

  it('erasure service exports ErasureReport interface', () => {
    const content = readFile(ERASURE_SERVICE);
    expect(content).toMatch(/export interface ErasureReport/);
  });

  it('erasure service has unit tests', () => {
    expect(
      fileExists('apps/subgraph-core/src/user/user-erasure.service.spec.ts')
    ).toBe(true);
  });

  it('unit test file covers COMPLETED status case', () => {
    const content = readFile(
      'apps/subgraph-core/src/user/user-erasure.service.spec.ts'
    );
    expect(content).toContain('COMPLETED');
  });

  it('unit test file covers FAILED status case', () => {
    const content = readFile(
      'apps/subgraph-core/src/user/user-erasure.service.spec.ts'
    );
    expect(content).toContain('FAILED');
  });
});

// ── G-03b: Cryptographic Proof of Erasure ────────────────────────────────────

describe('G-03b: Cryptographic Proof of Erasure', () => {
  const PROOF_SERVICE = 'apps/subgraph-core/src/user/erasure-proof.service.ts';
  const ERASURE_LOG_SCHEMA = 'packages/db/src/schema/gdpr-erasure-log.ts';
  const MIGRATION = 'packages/db/src/migrations/0043_gdpr_erasure_log.sql';

  it('erasure-proof.service.ts exists', () => {
    expect(fileExists(PROOF_SERVICE)).toBe(true);
  });

  it('gdpr-erasure-log schema exists', () => {
    expect(fileExists(ERASURE_LOG_SCHEMA)).toBe(true);
  });

  it('migration 0043 exists for gdpr_erasure_log', () => {
    expect(fileExists(MIGRATION)).toBe(true);
  });

  it('proof service uses SHA-256 for hashing', () => {
    const content = readFile(PROOF_SERVICE);
    expect(content).toContain("createHash('sha256')");
  });

  it('proof service uses HMAC-SHA256 for signing', () => {
    const content = readFile(PROOF_SERVICE);
    expect(content).toContain("createHmac('sha256'");
  });

  it('proof service hashes userId (no PII in log)', () => {
    const content = readFile(PROOF_SERVICE);
    expect(content).toContain('hashUserId');
    expect(content).toContain("createHash('sha256')");
  });

  it('proof service generates a verification token', () => {
    const content = readFile(PROOF_SERVICE);
    expect(content).toContain('createVerificationToken');
    expect(content).toContain('verificationToken');
  });

  it('proof service stores proof in gdprErasureLog', () => {
    const content = readFile(PROOF_SERVICE);
    expect(content).toContain('schema.gdprErasureLog');
    expect(content).toContain('.insert(');
  });

  it('proof service has verifyErasure method', () => {
    const content = readFile(PROOF_SERVICE);
    expect(content).toContain('async verifyErasure');
  });

  it('proof service has verifyToken method', () => {
    const content = readFile(PROOF_SERVICE);
    expect(content).toContain('verifyToken');
  });

  it('erasure log schema has RLS enabled', () => {
    const content = readFile(ERASURE_LOG_SCHEMA);
    expect(content).toContain('enableRLS()');
    expect(content).toContain('pgPolicy');
  });

  it('erasure log stores user_id as hash not plaintext', () => {
    const content = readFile(ERASURE_LOG_SCHEMA);
    expect(content).toContain('user_id_hash');
    expect(content).not.toMatch(/user_id['"]?\)\.notNull/);
  });

  it('migration creates RLS policy', () => {
    const content = readFile(MIGRATION);
    expect(content).toContain('ENABLE ROW LEVEL SECURITY');
    expect(content).toContain('CREATE POLICY');
  });

  it('erasure service integrates proof generation', () => {
    const content = readFile(
      'apps/subgraph-core/src/user/user-erasure.service.ts'
    );
    expect(content).toContain('ErasureProofService');
    expect(content).toContain('generateAndStore');
  });

  it('proof service has unit tests', () => {
    expect(
      fileExists('apps/subgraph-core/src/user/erasure-proof.service.spec.ts')
    ).toBe(true);
  });

  it('GraphQL schema includes verifyErasure query', () => {
    const content = readFile('apps/subgraph-core/src/admin/audit.graphql');
    expect(content).toContain('verifyErasure');
    expect(content).toContain('ErasureVerification');
  });

  it('verifyErasure requires ORG_ADMIN or SUPER_ADMIN', () => {
    const content = readFile('apps/subgraph-core/src/admin/audit.graphql');
    const verifyBlock = content.slice(content.indexOf('verifyErasure'));
    expect(verifyBlock).toContain('@authenticated');
    expect(verifyBlock).toContain('ORG_ADMIN');
    expect(verifyBlock).toContain('SUPER_ADMIN');
  });

  it('resolver wires verifyErasure to proof service', () => {
    const content = readFile(
      'apps/subgraph-core/src/admin/audit-log.resolver.ts'
    );
    expect(content).toContain('verifyErasure');
    expect(content).toContain('ErasureProofService');
  });

  it('uses GDPR_SIGNING_KEY env var', () => {
    const content = readFile(PROOF_SERVICE);
    expect(content).toContain('GDPR_SIGNING_KEY');
  });

  it('schema exports gdprErasureLog from index', () => {
    const content = readFile('packages/db/src/schema/index.ts');
    expect(content).toContain('gdpr-erasure-log');
  });
});

// G-11 (Data Portability) tests moved to gdpr-portability.spec.ts
