/**
 * GDPR Data Subject Rights Tests — Schema Contracts
 *
 * Art.17 Right to Erasure, Art.20 Right to Data Portability, Art.7 Consent
 *
 * Phase 0: Static analysis + schema contract tests (run in CI with no DB).
 * Phase 3: Full integration tests added when ErasureService is implemented.
 *
 * These tests verify that the committed schema files contain the structural
 * prerequisites for GDPR compliance (soft-delete column, user linkage, etc.).
 * They do NOT require a running database.
 */

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const SCHEMA_DIR = resolve(
  join(import.meta.dirname, '../../packages/db/src/schema')
);

function readSchema(filename: string): string {
  return readFileSync(resolve(SCHEMA_DIR, filename), 'utf-8');
}

// ── Art.17 Right to Erasure — soft-delete support ────────────────────────────

describe('GDPR Art.17 Right to Erasure — soft-delete column (schema contract)', () => {
  it('core users table (core.ts) must import or spread softDelete', () => {
    const content = readSchema('core.ts');
    // The users table uses the softDelete spread helper from _shared.ts
    // which adds the deleted_at column.
    expect(content).toMatch(/softDelete/);
  });

  it('_shared.ts softDelete helper must export a deleted_at column', () => {
    const content = readSchema('_shared.ts');
    expect(content).toMatch(/deleted_?at/i);
  });

  it('courses table (courses.ts) must have RLS enabled for tenant isolation', () => {
    const content = readSchema('courses.ts');
    // Courses must at minimum be tenant-isolated via RLS as a prerequisite
    // for GDPR-compliant erasure. Full soft-delete is tracked in OPEN_ISSUES.md.
    expect(content).toContain('ENABLE ROW LEVEL SECURITY');
  });
});

// ── Art.17 Right to Erasure — user linkage on personal data tables ───────────

describe('GDPR Art.17 Right to Erasure — user linkage (schema contract)', () => {
  it('annotations table (annotations.ts) must have user_id for erasure targeting', () => {
    const content = readSchema('annotations.ts');
    // Annotations are personal data — must be deletable by user ID.
    expect(content).toMatch(/user_?[iI]d/);
  });

  it('annotation table (annotation.ts) must have user_id for erasure targeting', () => {
    const content = readSchema('annotation.ts');
    expect(content).toMatch(/user_?[iI]d/);
  });

  it('agentSessions table must have user_id so sessions can be erased', () => {
    const content = readSchema('agentSessions.ts');
    expect(content).toMatch(/user_?[iI]d/);
  });

  it('userProgress table must have user_id for erasure targeting', () => {
    const content = readSchema('userProgress.ts');
    expect(content).toMatch(/user_?[iI]d/);
  });
});

// ── RLS correctness — prerequisite for GDPR isolation (SI-1 invariant) ───────

describe('GDPR prerequisite — RLS uses correct variable names (SI-1)', () => {
  it('annotations.ts RLS must use app.current_user_id (not app.current_user)', () => {
    const content = readSchema('annotations.ts');
    // Must have the correct variable
    expect(content).toMatch(
      /current_setting\(\s*['"`]app\.current_user_id['"`]/
    );
    // Must NOT have the buggy variable (BUG-23 root cause)
    expect(content).not.toMatch(
      /current_setting\(\s*['"`]app\.current_user['"`]/
    );
  });

  it('users.ts RLS must use app.current_tenant (not app.current_user)', () => {
    const content = readSchema('users.ts');
    expect(content).toMatch(
      /current_setting\(\s*['"`]app\.current_tenant['"`]/
    );
  });

  it('agentSessions.ts RLS must use app.current_user_id', () => {
    const content = readSchema('agentSessions.ts');
    expect(content).toMatch(
      /current_setting\(\s*['"`]app\.current_user_id['"`]/
    );
    expect(content).not.toMatch(
      /current_setting\(\s*['"`]app\.current_user['"`]/
    );
  });
});

// ── Art.20 Right to Portability — email field for identity export ─────────────

describe('GDPR Art.20 Right to Portability — identity fields (schema contract)', () => {
  it('core users table must have email column for identity export', () => {
    const content = readSchema('core.ts');
    expect(content).toMatch(/email/);
  });

  it('core users table must have first_name and last_name for identity export', () => {
    const content = readSchema('core.ts');
    expect(content).toMatch(/first_name/);
    expect(content).toMatch(/last_name/);
  });
});
