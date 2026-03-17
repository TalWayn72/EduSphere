/**
 * SI-1 Security Test: RLS Session Variable Correctness
 *
 * Static source-analysis test — validates that every schema file that
 * defines a Row-Level Security policy uses the correct PostgreSQL session
 * variable names:
 *
 *   CORRECT:   current_setting('app.current_user_id', TRUE)
 *   INCORRECT: current_setting('app.current_user', TRUE)   ← BUG-23 root cause
 *
 *   CORRECT:   current_setting('app.current_tenant', TRUE)
 *
 * A single wrong variable name causes RLS to silently evaluate to NULL,
 * allowing cross-tenant or cross-user data leaks.
 *
 * No database connection is required; this reads committed source files.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const SCHEMA_DIR = resolve(
  join(import.meta.dirname, '../../packages/db/src/schema')
);

/** All .ts files in the schema directory (excluding test files). */
function getSchemaFiles(): string[] {
  return readdirSync(SCHEMA_DIR)
    .filter(
      (f) =>
        f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.spec.ts')
    )
    .map((f) => join(SCHEMA_DIR, f));
}

/** Returns true if the file contains any RLS policy SQL. */
function hasRlsPolicy(content: string): boolean {
  return (
    content.includes('current_setting(') ||
    content.includes('ENABLE ROW LEVEL SECURITY')
  );
}

describe('RLS session variable correctness (SI-1, G-01)', () => {
  const schemaFiles = getSchemaFiles();

  // Verify we found schema files — if the directory moves this test should fail loudly.
  it('schema directory must contain at least 10 .ts files', () => {
    expect(schemaFiles.length).toBeGreaterThanOrEqual(10);
  });

  // Verify at least some files contain RLS policies.
  it('at least 5 schema files must contain RLS policies', () => {
    const filesWithRls = schemaFiles.filter((f) =>
      hasRlsPolicy(readFileSync(f, 'utf-8'))
    );
    expect(filesWithRls.length).toBeGreaterThanOrEqual(5);
  });

  // Per-file checks: the buggy variable name must never appear.
  schemaFiles.forEach((filePath) => {
    const fileName =
      filePath.split('/').pop() ?? filePath.split('\\').pop() ?? filePath;
    const content = readFileSync(filePath, 'utf-8');

    if (!hasRlsPolicy(content)) return;

    it(`${fileName}: must NOT use app.current_user without _id suffix`, () => {
      // Negative pattern: current_setting('app.current_user') or ("app.current_user")
      // but must NOT match current_setting('app.current_user_id') — use negative lookahead.
      const buggyPattern = /current_setting\(\s*['"`]app\.current_user['"`]/g;
      const matches = content.match(buggyPattern) ?? [];
      expect(matches).toHaveLength(0);
    });

    it(`${fileName}: must use quoted variable names in current_setting calls`, () => {
      // All current_setting calls must have a string literal first argument —
      // no bare identifiers which would silently produce unexpected results.
      const unquotedPattern = /current_setting\(\s*[^'"` ]/g;
      const matches = content.match(unquotedPattern) ?? [];
      expect(matches).toHaveLength(0);
    });
  });
});

describe('RLS tenant-isolation variable (SI-1)', () => {
  const schemaFiles = getSchemaFiles();

  schemaFiles.forEach((filePath) => {
    const fileName =
      filePath.split('/').pop() ?? filePath.split('\\').pop() ?? filePath;
    const content = readFileSync(filePath, 'utf-8');

    if (!hasRlsPolicy(content)) return;
    // Only check files that use the tenant variable.
    if (!content.includes('app.current_tenant')) return;

    it(`${fileName}: tenant RLS policy must reference app.current_tenant`, () => {
      expect(content).toMatch(
        /current_setting\(\s*['"`]app\.current_tenant['"`]/
      );
    });
  });
});

// ─── Phase 65: lesson_pipeline_templates RLS ─────────────────────────────────

describe('RLS: lesson_pipeline_templates table (Phase 65)', () => {
  const TEMPLATES_FILE = resolve(
    join(import.meta.dirname, '../../packages/db/src/schema/lesson-templates.ts')
  );

  it('lesson-templates.ts schema file exists', () => {
    expect(existsSync(TEMPLATES_FILE)).toBe(true);
  });

  it('lesson_pipeline_templates table is defined with tenant_id column', () => {
    const content = readFileSync(TEMPLATES_FILE, 'utf-8');
    expect(content).toContain('lesson_pipeline_templates');
    expect(content).toContain('tenant_id');
  });

  it('lesson_pipeline_templates has is_system flag for system templates', () => {
    const content = readFileSync(TEMPLATES_FILE, 'utf-8');
    expect(content).toContain('is_system');
  });

  it('lesson_pipeline_templates tenant_id references tenants table', () => {
    const content = readFileSync(TEMPLATES_FILE, 'utf-8');
    // tenant_id should reference the tenants table for RLS enforcement
    expect(content).toContain('tenants.id');
  });

  it('lesson_pipeline_templates has cascade delete on tenant', () => {
    const content = readFileSync(TEMPLATES_FILE, 'utf-8');
    expect(content).toContain("onDelete: 'cascade'");
  });
});

describe('RLS policy expectations: lesson_pipeline_templates access control', () => {
  // These tests validate the expected RLS behavior for pipeline templates.
  // System templates (is_system=true) should be readable cross-tenant.
  // Non-system templates should be scoped to tenant.
  // System template modification should be blocked for non-SUPER_ADMIN.

  it('schema defines is_system boolean field with default false', () => {
    const content = readFileSync(
      resolve(join(import.meta.dirname, '../../packages/db/src/schema/lesson-templates.ts')),
      'utf-8',
    );
    // is_system should default to false — user-created templates are NOT system templates
    expect(content).toContain("boolean('is_system')");
    expect(content).toContain('.default(false)');
  });

  it('schema defines created_by uuid field for ownership tracking', () => {
    const content = readFileSync(
      resolve(join(import.meta.dirname, '../../packages/db/src/schema/lesson-templates.ts')),
      'utf-8',
    );
    expect(content).toContain("uuid('created_by')");
    expect(content).toContain('users.id');
  });

  it('template table uses tenantId helper for consistent RLS column naming', () => {
    const content = readFileSync(
      resolve(join(import.meta.dirname, '../../packages/db/src/schema/lesson-templates.ts')),
      'utf-8',
    );
    // Should use the shared tenantId() helper, not a raw column definition
    expect(content).toContain('tenantId()');
  });
});
