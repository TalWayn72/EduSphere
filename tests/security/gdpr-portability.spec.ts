/**
 * Static security tests for GDPR Art.20 (Data Portability).
 * G-11 implementation verification.
 * Split from gdpr-erasure.spec.ts for file size compliance.
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
    expect(content).toContain("'GDPR_EXPORT'");
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
