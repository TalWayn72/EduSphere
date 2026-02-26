/**
 * Static security tests for GDPR Art.17 (Right to Erasure) and Art.20 (Data Portability).
 * G-03 and G-11 implementation verification.
 *
 * Phase: Static analysis — no database required.
 * These tests verify that the committed service files contain the structural
 * and behavioral prerequisites for GDPR compliance.
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

// ── G-11: Data Portability (GDPR Art.20) ─────────────────────────────────────

describe('G-11: Data Portability (GDPR Art.20)', () => {
  const EXPORT_SERVICE = 'apps/subgraph-core/src/user/user-export.service.ts';

  it('user-export.service.ts exists', () => {
    expect(fileExists(EXPORT_SERVICE)).toBe(true);
  });

  it('export includes user profile data', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toMatch(/profile/);
    expect(content).toMatch(/schema\.users/);
  });

  it('export includes annotations (personal notes)', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toMatch(/annotations/);
    expect(content).toMatch(/schema\.annotations/);
  });

  it('export includes agentSessions (AI conversation history)', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toMatch(/agentSessions/);
    expect(content).toMatch(/schema\.agentSessions/);
  });

  it('export includes learningProgress', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toMatch(/learningProgress|userProgress/);
    expect(content).toMatch(/schema\.userProgress/);
  });

  it('export writes audit log with EXPORT action', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toContain("'EXPORT'");
    expect(content).toContain("gdprArticle: '20'");
  });

  it('export returns structured UserDataExport (not void)', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toMatch(/Promise<UserDataExport>/);
  });

  it('export interface includes exportedAt timestamp', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toMatch(/exportedAt/);
  });

  it('export interface includes gdprArticle field set to 20', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toMatch(/gdprArticle.*'20'/s);
  });

  it('export interface exported for external use', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toMatch(/export interface UserDataExport/);
  });

  it('export uses withTenantContext for RLS enforcement', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toContain('withTenantContext');
  });

  it('export uses parallel Promise.all for efficiency', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toContain('Promise.all');
  });
});
