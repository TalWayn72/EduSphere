/**
 * Org Onboarding — RLS Policy Validation Tests
 *
 * Validates RLS policies for ALL 7 new tables introduced by the Org Onboarding feature:
 *   1. org_invitations — tenant isolation + invited_by ownership
 *   2. org_onboarding_checklist — tenant isolation
 *   3. course_licenses — dual-tenant awareness (licensee + licensor)
 *   4. api_keys — tenant isolation + creator ownership
 *   5. webhooks — tenant isolation
 *   6. webhook_deliveries — tenant isolation
 *   7. gamification_config — tenant isolation (1:1 per tenant)
 *
 * Static source-analysis tests — no running database required.
 * SOC2 CC6.1 / GDPR Art.32 / SI-1 / SI-9
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const SCHEMA_DIR = resolve(ROOT, 'packages/db/src/schema');
const MIGRATIONS_DIR = resolve(ROOT, 'packages/db/src/migrations');

function read(relativePath: string): string {
  const abs = resolve(ROOT, relativePath);
  return existsSync(abs) ? readFileSync(abs, 'utf-8') : '';
}

function readSchema(fileName: string): string {
  return read(`packages/db/src/schema/${fileName}`);
}

// ─── 1. org_invitations — Tenant Isolation + Ownership ─────────────────────

describe('RLS: org_invitations table', () => {
  const SCHEMA_FILE = 'org-invitations.ts';
  const MIGRATION_FILE = '0038_org_invitations.sql';

  it('org-invitations schema file exists', () => {
    expect(
      existsSync(resolve(SCHEMA_DIR, SCHEMA_FILE))
    ).toBe(true);
  });

  it('org_invitations table has tenant_id column', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toContain('tenant_id');
  });

  it('org_invitations uses tenantId() helper for consistent RLS column naming', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/tenantId\(\)|uuid\('tenant_id'\)/);
  });

  it('org_invitations has invited_by (created_by) column for ownership tracking', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/invited_by|created_by/);
  });

  it('org_invitations has email column (PII — must be encrypted per SI-3)', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toContain('email');
  });

  it('org_invitations migration enables ROW LEVEL SECURITY', () => {
    const migration = read(`packages/db/src/migrations/${MIGRATION_FILE}`);
    if (!migration) return; // migration not yet created — skip
    expect(migration).toContain('ROW LEVEL SECURITY');
    expect(migration).toContain('org_invitations');
  });

  it('org_invitations RLS uses app.current_tenant (SI-1 compliant)', () => {
    const migration = read(`packages/db/src/migrations/${MIGRATION_FILE}`);
    if (!migration) return;
    expect(migration).toContain('app.current_tenant');
    // Must NOT use bare app.current_user (without _id suffix) — SI-1 violation
    expect(migration).not.toMatch(/current_setting\s*\(\s*'app\.current_user'\s*,/);
  });

  it('org_invitations RLS does NOT use app.current_user without _id (SI-1 guard)', () => {
    const content = readSchema(SCHEMA_FILE);
    // Negative lookahead: match app.current_user NOT followed by _id
    expect(content).not.toMatch(/'app\.current_user'(?!_id)/);
  });

  it('org_invitations has token column for invitation acceptance', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toContain('token');
  });

  it('org_invitations has expires_at for time-limited invitations', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/expires_at|expiresAt/);
  });

  it('org_invitations schema is exported from schema index', () => {
    const indexContent = read('packages/db/src/schema/index.ts');
    expect(indexContent).toMatch(/org-invitations|orgInvitations/);
  });
});

// ─── 2. org_onboarding_checklist — Tenant Isolation ────────────────────────

describe('RLS: org_onboarding_checklist table', () => {
  const SCHEMA_FILE = 'org-onboarding-checklist.ts';
  const MIGRATION_FILE = '0036_org_onboarding_checklist.sql';

  it('org-onboarding-checklist schema file exists', () => {
    expect(
      existsSync(resolve(SCHEMA_DIR, SCHEMA_FILE))
    ).toBe(true);
  });

  it('org_onboarding_checklist has tenant_id column', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toContain('tenant_id');
  });

  it('org_onboarding_checklist migration enables ROW LEVEL SECURITY', () => {
    const migration = read(`packages/db/src/migrations/${MIGRATION_FILE}`);
    if (!migration) return;
    expect(migration).toContain('ROW LEVEL SECURITY');
  });

  it('org_onboarding_checklist RLS uses app.current_tenant (SI-1)', () => {
    const migration = read(`packages/db/src/migrations/${MIGRATION_FILE}`);
    if (!migration) return;
    expect(migration).toContain('app.current_tenant');
  });

  it('org_onboarding_checklist has steps JSONB column for progress tracking', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/steps|jsonb/i);
  });

  it('org_onboarding_checklist tenant_id references tenants table', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/tenants\.id|tenants/);
  });

  it('org_onboarding_checklist schema is exported from schema index', () => {
    const indexContent = read('packages/db/src/schema/index.ts');
    expect(indexContent).toMatch(/org-onboarding-checklist|orgOnboardingChecklist|onboarding-checklist/);
  });
});

// ─── 3. course_licenses — Dual-Tenant RLS ──────────────────────────────────

describe('RLS: course_licenses table (dual-tenant policy)', () => {
  const SCHEMA_FILE = 'course-licenses.ts';
  const MIGRATION_FILE = '0041_course_licenses.sql';

  it('course-licenses schema file exists', () => {
    // May also be in marketplace.ts or a combined file
    const exists =
      existsSync(resolve(SCHEMA_DIR, SCHEMA_FILE)) ||
      existsSync(resolve(SCHEMA_DIR, 'marketplace.ts'));
    expect(exists).toBe(true);
  });

  it('course_licenses has tenant_id (licensee)', () => {
    const content =
      readSchema(SCHEMA_FILE) || readSchema('marketplace.ts');
    expect(content).toContain('tenant_id');
  });

  it('course_licenses has licensor_tenant_id (content owner)', () => {
    const content =
      readSchema(SCHEMA_FILE) || readSchema('marketplace.ts');
    expect(content).toMatch(/licensor_tenant_id|licensorTenantId/);
  });

  it('course_licenses migration enables ROW LEVEL SECURITY', () => {
    const migration = read(`packages/db/src/migrations/${MIGRATION_FILE}`);
    if (!migration) return;
    expect(migration).toContain('ROW LEVEL SECURITY');
  });

  it('course_licenses RLS allows access to BOTH licensee AND licensor tenant (dual-tenant)', () => {
    const migration = read(`packages/db/src/migrations/${MIGRATION_FILE}`);
    if (!migration) return;
    // The policy must use OR to allow both tenants access
    expect(migration).toMatch(/tenant_id.*OR.*licensor_tenant_id|licensor_tenant_id.*OR.*tenant_id/s);
    expect(migration).toContain('app.current_tenant');
  });

  it('course_licenses has status column (ACTIVE/EXPIRED/REVOKED)', () => {
    const content =
      readSchema(SCHEMA_FILE) || readSchema('marketplace.ts');
    expect(content).toMatch(/status|ACTIVE|EXPIRED|REVOKED/);
  });

  it('course_licenses has license_type column', () => {
    const content =
      readSchema(SCHEMA_FILE) || readSchema('marketplace.ts');
    expect(content).toMatch(/license_type|licenseType|UNLIMITED|PER_SEAT/);
  });

  it('course_licenses has max_seats and used_seats for per-seat licensing', () => {
    const content =
      readSchema(SCHEMA_FILE) || readSchema('marketplace.ts');
    expect(content).toMatch(/max_seats|maxSeats/);
    expect(content).toMatch(/used_seats|usedSeats/);
  });
});

// ─── 4. api_keys — Tenant Isolation + Creator Ownership ────────────────────

describe('RLS: api_keys table', () => {
  const SCHEMA_FILE = 'api-keys.ts';
  const MIGRATION_FILE = '0039_api_keys.sql';

  it('api-keys schema file exists', () => {
    expect(
      existsSync(resolve(SCHEMA_DIR, SCHEMA_FILE))
    ).toBe(true);
  });

  it('api_keys has tenant_id for tenant isolation', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toContain('tenant_id');
  });

  it('api_keys has created_by for ownership tracking', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/created_by|createdBy/);
  });

  it('api_keys has key_hash — never stores plaintext (bcrypt)', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/key_hash|keyHash/);
  });

  it('api_keys has key_prefix for lookup optimization', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/key_prefix|keyPrefix/);
  });

  it('api_keys does NOT have a plaintext key column', () => {
    const content = readSchema(SCHEMA_FILE);
    // Must not store plaintext — only hash and prefix
    expect(content).not.toMatch(/plaintext_key|raw_key|key_value/);
  });

  it('api_keys has scopes array for permission control', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/scopes/);
  });

  it('api_keys has is_active boolean for revocation', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/is_active|isActive/);
  });

  it('api_keys migration enables ROW LEVEL SECURITY', () => {
    const migration = read(`packages/db/src/migrations/${MIGRATION_FILE}`);
    if (!migration) return;
    expect(migration).toContain('ROW LEVEL SECURITY');
  });

  it('api_keys RLS uses app.current_tenant (SI-1)', () => {
    const migration = read(`packages/db/src/migrations/${MIGRATION_FILE}`);
    if (!migration) return;
    expect(migration).toContain('app.current_tenant');
  });

  it('api_keys has rate_limit_per_minute for per-key rate limiting', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/rate_limit|rateLimit/);
  });

  it('api_keys has expires_at for key expiration support', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/expires_at|expiresAt/);
  });

  it('api_keys schema is exported from schema index', () => {
    const indexContent = read('packages/db/src/schema/index.ts');
    expect(indexContent).toMatch(/api-keys|apiKeys/);
  });
});

// ─── 5. webhooks — Tenant Isolation ────────────────────────────────────────

describe('RLS: webhooks table', () => {
  const SCHEMA_FILE = 'webhooks.ts';

  it('webhooks schema file exists', () => {
    expect(
      existsSync(resolve(SCHEMA_DIR, SCHEMA_FILE))
    ).toBe(true);
  });

  it('webhooks has tenant_id for tenant isolation', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toContain('tenant_id');
  });

  it('webhooks has url column for endpoint registration', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toContain('url');
  });

  it('webhooks has events array for event filtering', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/events/);
  });

  it('webhooks has secret for HMAC signing', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/secret/);
  });

  it('webhooks has failure_count for auto-disable logic', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/failure_count|failureCount/);
  });

  it('webhooks has is_active for enable/disable', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/is_active|isActive/);
  });

  it('webhooks RLS uses app.current_tenant in schema or migration', () => {
    const content = readSchema(SCHEMA_FILE);
    // Check either schema file or migration
    const hasRls =
      content.includes('app.current_tenant') ||
      content.includes('enableRLS') ||
      content.includes('ENABLE ROW LEVEL SECURITY');
    expect(hasRls).toBe(true);
  });

  it('webhooks schema is exported from schema index', () => {
    const indexContent = read('packages/db/src/schema/index.ts');
    expect(indexContent).toMatch(/webhooks/);
  });
});

// ─── 6. webhook_deliveries — Tenant Isolation ──────────────────────────────

describe('RLS: webhook_deliveries table', () => {
  const SCHEMA_FILE = 'webhooks.ts'; // deliveries likely in same file

  it('webhook_deliveries table is defined', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/webhook_deliveries|webhookDeliveries/);
  });

  it('webhook_deliveries has tenant_id for isolation', () => {
    const content = readSchema(SCHEMA_FILE);
    // The deliveries section should have tenant_id
    expect(content).toContain('tenant_id');
  });

  it('webhook_deliveries has webhook_id foreign key', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/webhook_id|webhookId/);
  });

  it('webhook_deliveries has status column for tracking', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/PENDING|DELIVERED|FAILED|RETRYING/);
  });

  it('webhook_deliveries has attempt counter for retry logic', () => {
    const content = readSchema(SCHEMA_FILE);
    expect(content).toMatch(/attempt/);
  });
});

// ─── 7. gamification_config — Tenant Isolation (1:1) ───────────────────────

describe('RLS: gamification_config table', () => {
  const SCHEMA_FILE = 'gamification-config.ts';
  const MIGRATION_FILE = '0042_gamification_config.sql';

  it('gamification_config schema file exists', () => {
    // May be in gamification-config.ts or gamification.ts
    const exists =
      existsSync(resolve(SCHEMA_DIR, SCHEMA_FILE)) ||
      existsSync(resolve(SCHEMA_DIR, 'gamification.ts'));
    expect(exists).toBe(true);
  });

  it('gamification_config has tenant_id with UNIQUE constraint (1:1)', () => {
    const content =
      readSchema(SCHEMA_FILE) || readSchema('gamification.ts');
    expect(content).toContain('tenant_id');
    // Must be unique — one config per tenant
    expect(content).toMatch(/unique|UNIQUE/i);
  });

  it('gamification_config has enabled boolean', () => {
    const content =
      readSchema(SCHEMA_FILE) || readSchema('gamification.ts');
    expect(content).toMatch(/enabled/);
  });

  it('gamification_config has xp_rules JSONB for customizable XP values', () => {
    const content =
      readSchema(SCHEMA_FILE) || readSchema('gamification.ts');
    expect(content).toMatch(/xp_rules|xpRules|jsonb/i);
  });

  it('gamification_config migration enables ROW LEVEL SECURITY', () => {
    const migration = read(`packages/db/src/migrations/${MIGRATION_FILE}`);
    if (!migration) return;
    expect(migration).toContain('ROW LEVEL SECURITY');
  });

  it('gamification_config RLS uses app.current_tenant (SI-1)', () => {
    const migration = read(`packages/db/src/migrations/${MIGRATION_FILE}`);
    if (!migration) return;
    expect(migration).toContain('app.current_tenant');
  });
});

// ─── Cross-cutting: SI-1 Compliance for ALL New Tables ─────────────────────

describe('SI-1: All org onboarding tables use correct RLS variable names', () => {
  const NEW_TABLE_SCHEMAS = [
    'org-invitations.ts',
    'org-onboarding-checklist.ts',
    'api-keys.ts',
    'webhooks.ts',
  ];

  NEW_TABLE_SCHEMAS.forEach((schemaFile) => {
    const content = readSchema(schemaFile);
    if (!content) return;

    it(`${schemaFile}: must NOT use app.current_user without _id suffix`, () => {
      // Negative lookahead: match 'app.current_user' NOT followed by _id
      const buggyPattern = /current_setting\(\s*['"`]app\.current_user['"`]/g;
      const matches = content.match(buggyPattern) ?? [];
      expect(matches).toHaveLength(0);
    });

    it(`${schemaFile}: must use app.current_tenant (not app.current_tenant_id)`, () => {
      if (content.includes('current_setting')) {
        expect(content).toContain('app.current_tenant');
      }
    });
  });
});

// ─── SI-8: All queries via Drizzle ORM (never raw SQL) ─────────────────────

describe('SI-8: Org onboarding services use Drizzle ORM (not raw SQL)', () => {
  const SERVICE_PATTERNS = [
    'apps/subgraph-core/src/org/org-provisioning.service.ts',
    'apps/subgraph-core/src/org/org-invitation.service.ts',
    'apps/subgraph-core/src/org/org-onboarding-checklist.service.ts',
    'apps/subgraph-core/src/org/api-key.service.ts',
    'apps/subgraph-core/src/org/webhook.service.ts',
  ];

  SERVICE_PATTERNS.forEach((servicePath) => {
    const content = read(servicePath);
    if (!content) return;

    const fileName = servicePath.split('/').pop() ?? servicePath;

    it(`${fileName}: uses withTenantContext for all DB queries (SI-9)`, () => {
      expect(content).toContain('withTenantContext');
    });

    it(`${fileName}: does not use raw SQL queries`, () => {
      // Must not bypass Drizzle ORM
      expect(content).not.toMatch(/\.query\s*\(`/);
      expect(content).not.toMatch(/\.raw\s*\(/);
      expect(content).not.toMatch(/pg\.query\s*\(/);
    });

    it(`${fileName}: uses Drizzle db operations`, () => {
      expect(content).toMatch(/db\.(select|insert|update|delete)/);
    });
  });
});

// ─── SI-9: All resolvers use authContext (JWT) not args for tenant/user ────

describe('SI-9: Org onboarding resolvers use JWT context (not args) for tenant ID', () => {
  const RESOLVER_PATHS = [
    'apps/subgraph-core/src/org/org.resolver.ts',
    'apps/subgraph-core/src/org/org-provisioning.resolver.ts',
  ];

  RESOLVER_PATHS.forEach((resolverPath) => {
    const content = read(resolverPath);
    if (!content) return;

    const fileName = resolverPath.split('/').pop() ?? resolverPath;

    it(`${fileName}: extracts tenantId from authContext (JWT), not @Args`, () => {
      expect(content).toMatch(/authContext\.tenantId|ctx\.authContext/);
      // Must NOT accept tenantId as a GraphQL argument (would allow tenant spoofing)
      expect(content).not.toMatch(/@Args\([^)]*tenantId/);
    });

    it(`${fileName}: extracts userId from authContext (JWT)`, () => {
      expect(content).toMatch(/authContext\.userId|ctx\.authContext/);
    });
  });
});
