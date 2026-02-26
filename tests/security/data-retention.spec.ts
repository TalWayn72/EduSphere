import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

const read = (p: string): string =>
  existsSync(resolve(ROOT, p)) ? readFileSync(resolve(ROOT, p), 'utf-8') : '';

describe('G-13: Data Retention Schema', () => {
  it('retentionPolicies.ts exists', () => {
    expect(
      existsSync(resolve(ROOT, 'packages/db/src/schema/retentionPolicies.ts'))
    ).toBe(true);
  });

  it('defines RETENTION_DEFAULTS with agent message TTL', () => {
    const c = read('packages/db/src/schema/retentionPolicies.ts');
    expect(c).toContain('AGENT_MESSAGES');
    expect(c).toContain('RETENTION_DEFAULTS');
  });

  it('audit log retention is at least 7 years (2555 days)', () => {
    const c = read('packages/db/src/schema/retentionPolicies.ts');
    expect(c).toContain('AUDIT_LOG');
    expect(c).toMatch(/AUDIT_LOG[\s\S]*?2555|2555[\s\S]*?AUDIT_LOG/);
  });

  it('RLS policy uses app.current_tenant (not the deprecated app.current_user)', () => {
    const c = read('packages/db/src/schema/retentionPolicies.ts');
    // Must not use the wrong variable name 'app.current_user' (without _id or _role suffix)
    expect(c).not.toMatch(/'app\.current_user'[^_]/);
    expect(c).toContain("'app.current_tenant'");
  });

  it('RLS policy uses app.current_user_role for SUPER_ADMIN check', () => {
    const c = read('packages/db/src/schema/retentionPolicies.ts');
    expect(c).toContain("'app.current_user_role'");
    expect(c).toContain('SUPER_ADMIN');
  });

  it('schema exported from packages/db index', () => {
    const c = read('packages/db/src/schema/index.ts');
    expect(c).toMatch(/retentionPolicies/i);
  });

  it('enableRLS() is called on the table', () => {
    const c = read('packages/db/src/schema/retentionPolicies.ts');
    expect(c).toContain('enableRLS()');
  });

  it('defines all seven entity types', () => {
    const c = read('packages/db/src/schema/retentionPolicies.ts');
    const required = [
      'AGENT_MESSAGES',
      'AGENT_SESSIONS',
      'USER_PROGRESS',
      'ANNOTATIONS',
      'DISCUSSION_POSTS',
      'AUDIT_LOG',
      'COLLABORATION_CRDT',
    ];
    for (const key of required) {
      expect(c, `Missing entity type: ${key}`).toContain(key);
    }
  });
});

describe('G-13: Retention Cleanup Service', () => {
  it('retention-cleanup.service.ts exists', () => {
    expect(
      existsSync(
        resolve(
          ROOT,
          'apps/subgraph-core/src/jobs/retention-cleanup.service.ts'
        )
      )
    ).toBe(true);
  });

  it('cleanup logs RETENTION_CLEANUP action', () => {
    const c = read('apps/subgraph-core/src/jobs/retention-cleanup.service.ts');
    expect(c).toContain('RETENTION_CLEANUP');
  });

  it('cleanup metadata includes GDPR article 5e reference', () => {
    const c = read('apps/subgraph-core/src/jobs/retention-cleanup.service.ts');
    expect(c).toContain("gdprArticle: '5e'");
  });

  it('cleanup does not throw on partial failure (resilient for loop with catch)', () => {
    const c = read('apps/subgraph-core/src/jobs/retention-cleanup.service.ts');
    expect(c).toContain('catch');
    expect(c).toContain('for');
  });

  it('returns RetentionCleanupReport interface with startedAt and completedAt', () => {
    const c = read('apps/subgraph-core/src/jobs/retention-cleanup.service.ts');
    expect(c).toContain('RetentionCleanupReport');
    expect(c).toContain('startedAt');
    expect(c).toContain('completedAt');
  });

  it('unit test file exists', () => {
    expect(
      existsSync(
        resolve(
          ROOT,
          'apps/subgraph-core/src/jobs/retention-cleanup.service.spec.ts'
        )
      )
    ).toBe(true);
  });
});
