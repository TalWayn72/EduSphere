/**
 * SEC-10: GDPR Export Attestation — SHA-256 hash in audit_log after export.
 *
 * Static analysis tests that verify the export service:
 *  1. Computes a SHA-256 hash of the export payload
 *  2. Writes the hash to audit_log with action='GDPR_EXPORT'
 *  3. Includes piiManifest in the export for transparency
 *  4. Uses createHash from node:crypto (not a weak hash)
 *
 * Phase: Static analysis — no database required.
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

const EXPORT_SERVICE = 'apps/subgraph-core/src/user/user-export.service.ts';
const PII_MANIFEST = 'packages/db/src/config/pii-bearing-tables.json';

// ── SEC-10: Export Attestation — SHA-256 ────────────────────────────────────

describe('SEC-10: GDPR Export Attestation', () => {
  it('export service file exists', () => {
    expect(fileExists(EXPORT_SERVICE)).toBe(true);
  });

  it('export service imports createHash from node:crypto', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toContain("from 'node:crypto'");
    expect(content).toContain('createHash');
  });

  it('export service computes SHA-256 hash (not MD5 or SHA-1)', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toContain("createHash('sha256')");
  });

  it('export service exports computeExportHash function', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toMatch(/export function computeExportHash/);
  });

  it('computeExportHash uses .digest("hex")', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toContain(".digest('hex')");
  });

  it('audit log action is GDPR_EXPORT (not plain EXPORT)', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toContain("action: 'GDPR_EXPORT'");
  });

  it('audit log metadata includes sha256 field', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toContain('sha256:');
    // The sha256 value comes from computeExportHash
    expect(content).toContain('sha256Hash');
  });

  it('export data includes piiManifest for transparency', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toContain('piiManifest');
    expect(content).toMatch(/piiManifest.*tables/s);
  });

  it('pii-bearing-tables.json manifest file exists', () => {
    expect(fileExists(PII_MANIFEST)).toBe(true);
  });

  it('UserDataExport interface includes piiManifest field', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toMatch(/export interface UserDataExport/);
    expect(content).toMatch(/piiManifest.*PiiTableEntry\[\]/);
  });

  it('PiiTableEntry interface is exported', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toMatch(/export interface PiiTableEntry/);
  });

  it('audit log metadata includes piiTablesIncluded count', () => {
    const content = readFile(EXPORT_SERVICE);
    expect(content).toContain('piiTablesIncluded');
  });
});
