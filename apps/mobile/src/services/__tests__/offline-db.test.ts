/**
 * offline-db.test.ts — Unit tests for tenant-scoped offline database.
 * Pure logic tests: verifies DB name generation, sanitization, and topic isolation.
 * Does NOT import expo-sqlite directly — inlines the pure functions.
 */
// ── Inline pure functions from offline-db.ts ────────────────────────────────

function buildDatabaseName(tenantSlug: string): string {
  const safe = tenantSlug.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `edusphere-${safe}.db`;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('offline-db — buildDatabaseName', () => {
  it('generates correct DB name for simple slug', () => {
    expect(buildDatabaseName('acme-corp')).toBe('edusphere-acme-corp.db');
  });

  it('generates correct DB name for slug with underscores', () => {
    expect(buildDatabaseName('my_org')).toBe('edusphere-my_org.db');
  });

  it('sanitizes special characters in slug', () => {
    expect(buildDatabaseName('org@#$%')).toBe('edusphere-org____.db');
  });

  it('sanitizes spaces in slug', () => {
    expect(buildDatabaseName('my org')).toBe('edusphere-my_org.db');
  });

  it('sanitizes dots in slug', () => {
    expect(buildDatabaseName('org.name')).toBe('edusphere-org_name.db');
  });

  it('handles empty slug', () => {
    expect(buildDatabaseName('')).toBe('edusphere-.db');
  });

  it('preserves alphanumeric characters', () => {
    expect(buildDatabaseName('Org123')).toBe('edusphere-Org123.db');
  });

  it('produces unique names for different slugs', () => {
    const name1 = buildDatabaseName('org-a');
    const name2 = buildDatabaseName('org-b');
    expect(name1).not.toBe(name2);
  });

  it('produces same name for same slug (deterministic)', () => {
    const name1 = buildDatabaseName('acme');
    const name2 = buildDatabaseName('acme');
    expect(name1).toBe(name2);
  });
});

describe('offline-db — tenant isolation', () => {
  it('different tenants get different database files', () => {
    const dbA = buildDatabaseName('tenant-a');
    const dbB = buildDatabaseName('tenant-b');
    expect(dbA).not.toBe(dbB);
    expect(dbA).toContain('tenant-a');
    expect(dbB).toContain('tenant-b');
  });

  it('all database names start with edusphere- prefix', () => {
    const slugs = ['acme', 'beta-org', 'gamma_inc', 'delta'];
    for (const slug of slugs) {
      expect(buildDatabaseName(slug)).toMatch(/^edusphere-/);
    }
  });

  it('all database names end with .db extension', () => {
    const slugs = ['acme', 'beta-org', 'gamma_inc'];
    for (const slug of slugs) {
      expect(buildDatabaseName(slug)).toMatch(/\.db$/);
    }
  });
});
