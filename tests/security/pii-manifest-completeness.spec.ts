/**
 * SEC-10: PII Manifest Completeness — verify pii-bearing-tables.json
 * covers all tables with PII columns in the schema directory.
 *
 * Static analysis tests that scan schema files for PII indicators
 * and cross-reference against the manifest.
 *
 * Phase: Static analysis — no database required.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const SCHEMA_DIR = resolve(ROOT, 'packages/db/src/schema');
const MANIFEST_PATH = resolve(
  ROOT,
  'packages/db/src/config/pii-bearing-tables.json'
);

interface PiiTableEntry {
  name: string;
  schemaFile: string;
  piiColumns: string[];
  note?: string;
}

interface PiiManifest {
  tables: PiiTableEntry[];
  version: string;
}

function loadManifest(): PiiManifest {
  const raw = readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(raw) as PiiManifest;
}

/**
 * Known PII column patterns — column names that indicate personally
 * identifiable or user-generated content.
 */
const PII_COLUMN_PATTERNS = [
  'email',
  'first_name',
  'last_name',
  'phone',
  'ip_address',
  'user_agent',
  'bio',
  'avatar_url',
  'text_content',
  'expo_push_token',
  'web_push_subscription',
];

// ── Structural Tests ────────────────────────────────────────────────────────

describe('PII Manifest — structural validation', () => {
  it('pii-bearing-tables.json exists', () => {
    expect(existsSync(MANIFEST_PATH)).toBe(true);
  });

  it('manifest has a version field', () => {
    const manifest = loadManifest();
    expect(manifest.version).toBeDefined();
    expect(typeof manifest.version).toBe('string');
  });

  it('manifest has a non-empty tables array', () => {
    const manifest = loadManifest();
    expect(Array.isArray(manifest.tables)).toBe(true);
    expect(manifest.tables.length).toBeGreaterThan(0);
  });

  it('every table entry has name, schemaFile, and piiColumns', () => {
    const manifest = loadManifest();
    for (const entry of manifest.tables) {
      expect(typeof entry.name).toBe('string');
      expect(typeof entry.schemaFile).toBe('string');
      expect(Array.isArray(entry.piiColumns)).toBe(true);
      expect(entry.piiColumns.length).toBeGreaterThan(0);
    }
  });

  it('every schemaFile referenced in manifest exists on disk', () => {
    const manifest = loadManifest();
    for (const entry of manifest.tables) {
      const schemaPath = resolve(SCHEMA_DIR, entry.schemaFile);
      expect(
        existsSync(schemaPath),
        `Schema file missing for table "${entry.name}": ${entry.schemaFile}`
      ).toBe(true);
    }
  });

  it('no duplicate table names in manifest', () => {
    const manifest = loadManifest();
    const names = manifest.tables.map((t) => t.name);
    const uniqueNames = new Set(names);
    expect(names.length).toBe(uniqueNames.size);
  });
});

// ── Completeness Tests ──────────────────────────────────────────────────────

describe('PII Manifest — completeness', () => {
  it('manifest includes the users table', () => {
    const manifest = loadManifest();
    const names = manifest.tables.map((t) => t.name);
    expect(names).toContain('users');
  });

  it('users table lists email as a PII column', () => {
    const manifest = loadManifest();
    const usersEntry = manifest.tables.find((t) => t.name === 'users');
    expect(usersEntry).toBeDefined();
    expect(usersEntry!.piiColumns).toContain('email');
  });

  it('manifest includes annotations table (user-authored notes)', () => {
    const manifest = loadManifest();
    const names = manifest.tables.map((t) => t.name);
    expect(names).toContain('annotations');
  });

  it('manifest includes agent_messages table (conversation content)', () => {
    const manifest = loadManifest();
    const names = manifest.tables.map((t) => t.name);
    expect(names).toContain('agent_messages');
  });

  it('manifest includes user_consents table (IP addresses)', () => {
    const manifest = loadManifest();
    const names = manifest.tables.map((t) => t.name);
    expect(names).toContain('user_consents');
  });

  it('manifest includes push_notification_tokens table (device tokens)', () => {
    const manifest = loadManifest();
    const names = manifest.tables.map((t) => t.name);
    expect(names).toContain('push_notification_tokens');
  });

  it('manifest includes text_submissions table', () => {
    const manifest = loadManifest();
    const names = manifest.tables.map((t) => t.name);
    expect(names).toContain('text_submissions');
  });

  it('manifest includes audit_log table (IP + user_agent)', () => {
    const manifest = loadManifest();
    const names = manifest.tables.map((t) => t.name);
    expect(names).toContain('audit_log');
  });

  it('schema files with known PII columns are all covered', () => {
    const manifest = loadManifest();
    const manifestSchemaFiles = new Set(
      manifest.tables.map((t) => t.schemaFile)
    );

    // Read all .ts schema files (skip test files, index, shared)
    const schemaFiles = readdirSync(SCHEMA_DIR).filter(
      (f) =>
        extname(f) === '.ts' &&
        !f.includes('.test.') &&
        !f.includes('.spec.') &&
        f !== 'index.ts' &&
        f !== '_shared.ts'
    );

    const uncoveredWithPii: string[] = [];

    for (const file of schemaFiles) {
      if (manifestSchemaFiles.has(file)) continue;

      const content = readFileSync(resolve(SCHEMA_DIR, file), 'utf-8');
      const hasPiiColumn = PII_COLUMN_PATTERNS.some((col) =>
        content.includes(`'${col}'`)
      );

      if (hasPiiColumn) {
        uncoveredWithPii.push(file);
      }
    }

    expect(
      uncoveredWithPii,
      `Schema files with PII columns not in manifest: ${uncoveredWithPii.join(', ')}`
    ).toEqual([]);
  });

  it('manifest covers at least 10 tables', () => {
    const manifest = loadManifest();
    expect(manifest.tables.length).toBeGreaterThanOrEqual(10);
  });
});
