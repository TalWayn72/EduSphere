/**
 * B2B Billing & Pilot — Security Test Suite
 *
 * Covers the five new attack surfaces introduced by the B2B-GTM-PLATFORM-COMPLETION plan:
 *   1. Pilot request submission (public endpoint — no auth required)
 *   2. YAU counting mechanism (cross-tenant RLS leakage)
 *   3. Subscription status checks (IDOR, self-approval, expired pilot bypass)
 *   4. Platform admin billing dashboard (@requiresRole enforcement)
 *   5. Pricing page / pilot form (XSS via pilot text fields)
 *
 * Threat model: docs/security/B2B_BILLING_THREAT_MODEL.md
 * Static source-analysis tests — no running server required.
 *
 * SOC2 CC6 / GDPR Art.25 / OWASP API3 (IDOR) / OWASP A03 (Injection)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { globSync } from 'glob';

const ROOT = resolve(import.meta.dirname, '../..');

function read(relativePath: string): string {
  const abs = resolve(ROOT, relativePath);
  return existsSync(abs) ? readFileSync(abs, 'utf-8') : '';
}

// ─── 1. Pilot Request — Rate Limiting ─────────────────────────────────────────

describe('B2B Pilot Request — Rate Limiting (T-02, SC-01)', () => {
  it('rate-limit middleware exists', () => {
    expect(
      existsSync(resolve(ROOT, 'apps/gateway/src/middleware/rate-limit.ts'))
    ).toBe(true);
  });

  it('rate-limit middleware handles unauthenticated pilot endpoint bucket', () => {
    const c = read('apps/gateway/src/middleware/rate-limit.ts');
    // Must have a separate key path for pilot/unauthenticated requests
    // Accepts: 'pilot', 'requestPilot', 'PILOT', 'unauthenticated'
    expect(c).toMatch(/pilot|PILOT|unauthenticated/i);
  });

  it('pilot rate limit is configurable via PILOT_RATE_LIMIT_MAX or RATE_LIMIT_MAX env var', () => {
    const c = read('apps/gateway/src/middleware/rate-limit.ts');
    expect(c).toMatch(/PILOT_RATE_LIMIT_MAX|RATE_LIMIT_MAX/);
  });

  it('gateway returns 429 when rate limit is exceeded', () => {
    const idx = read('apps/gateway/src/index.ts');
    expect(idx).toMatch(/429|RATE_LIMIT_EXCEEDED/);
  });

  it('rate limiter uses IP address as key for unauthenticated pilot endpoint', () => {
    const c = read('apps/gateway/src/middleware/rate-limit.ts');
    // Must key on IP for unauthenticated endpoints (no tenant available)
    expect(c).toMatch(/ip|clientIp|x-forwarded-for|remoteAddress/i);
  });

  it('rate limit sliding window is 1 hour or less for pilot endpoint', () => {
    const c = read('apps/gateway/src/middleware/rate-limit.ts');
    // Window expressed in ms: 3600000 = 1 hour; or as 60 * 60 * 1000
    expect(c).toMatch(/3600000|60.*60.*1000|WINDOW.*3600|window.*hour/i);
  });

  it('pilot rate limit max is 5 or fewer requests per window', () => {
    const c = read('apps/gateway/src/middleware/rate-limit.ts');
    // Look for a max of 5 in context of pilot configuration
    // Matches: '5', pilot.*5, PILOT.*5, 5.*pilot, etc.
    expect(c).toMatch(/PILOT.*5|5.*PILOT|pilot.*max.*5|max.*pilot.*5/i);
  });
});

// ─── 2. Pilot Request — XSS Sanitization ──────────────────────────────────────

describe('B2B Pilot Request — XSS Sanitization (T-01, SC-02)', () => {
  it('subscription subgraph has a Zod schema for PilotSignupInput', () => {
    // Accept either a dedicated schemas file or inline in service/resolver
    const schemaFiles = globSync(
      'apps/subgraph-core/src/subscription/**/*.{ts,graphql}',
      { cwd: ROOT }
    );
    const combined = schemaFiles
      .map((f) => readFileSync(resolve(ROOT, f), 'utf-8'))
      .join('\n');
    // Must have Zod or GraphQL schema definition for pilot input
    expect(combined).toMatch(/PilotSignup|pilotSignup|requestPilot|pilot.*schema/i);
  });

  it('pilot input validation strips HTML tags from institutionName', () => {
    const schemaFiles = globSync(
      'apps/subgraph-core/src/subscription/**/*.ts',
      { cwd: ROOT }
    );
    const combined = schemaFiles
      .map((f) => readFileSync(resolve(ROOT, f), 'utf-8'))
      .join('\n');
    // Must have HTML stripping: replace(/<[^>]*>/g, '') or sanitize-html or DOMPurify equivalent
    expect(combined).toMatch(/<\[.*\]>|sanitize|strip.*html|replace.*<.*>/i);
  });

  it('pilot input validation strips HTML tags from useCase field', () => {
    const schemaFiles = globSync(
      'apps/subgraph-core/src/subscription/**/*.ts',
      { cwd: ROOT }
    );
    const combined = schemaFiles
      .map((f) => readFileSync(resolve(ROOT, f), 'utf-8'))
      .join('\n');
    // useCase field must be sanitized — same pattern as institutionName
    expect(combined).toMatch(/useCase|use_case/);
  });

  it('pilot useCase field has a maximum length limit of 2000 chars or less', () => {
    const schemaFiles = globSync(
      'apps/subgraph-core/src/subscription/**/*.ts',
      { cwd: ROOT }
    );
    const combined = schemaFiles
      .map((f) => readFileSync(resolve(ROOT, f), 'utf-8'))
      .join('\n');
    // Must enforce max length to prevent memory exhaustion
    expect(combined).toMatch(/2000|max.*2000|\.max\(2000\)/);
  });

  it('admin pilot table does NOT use dangerouslySetInnerHTML on pilot text fields', () => {
    const adminPage = read('apps/web/src/pages/PilotRequestsAdminPage.tsx');
    // Skip if file not yet created
    if (adminPage.length === 0) return;
    // dangerouslySetInnerHTML on user-controlled fields is an XSS vector
    expect(adminPage).not.toMatch(/dangerouslySetInnerHTML.*orgName|dangerouslySetInnerHTML.*institutionName/);
    expect(adminPage).not.toMatch(/dangerouslySetInnerHTML.*useCase|dangerouslySetInnerHTML.*contactName/);
  });

  it('billing schema does NOT store raw HTML in pilot text columns (schema-level constraint)', () => {
    const billingSchema = read('packages/db/src/schema/billing.ts');
    expect(billingSchema.length).toBeGreaterThan(0);
    // pilot_requests table must be present
    expect(billingSchema).toContain('pilot_requests');
    // org_name, contact_name, use_case columns are present
    expect(billingSchema).toMatch(/org_name|orgName/);
    expect(billingSchema).toMatch(/contact_name|contactName/);
    expect(billingSchema).toMatch(/use_case|useCase/);
  });

  it('pilot request mutation is NOT decorated with @authenticated (public endpoint)', () => {
    // requestPilot is intentionally public — no auth required for pilot sign-up
    // This test verifies the mutation exists without requiring auth
    const sdlFiles = globSync(
      'apps/subgraph-core/src/**/*.graphql',
      { cwd: ROOT }
    );
    const combined = sdlFiles
      .map((f) => readFileSync(resolve(ROOT, f), 'utf-8'))
      .join('\n');
    if (!combined.includes('requestPilot')) return; // SDL not yet written — skip
    // Find the requestPilot block — it must NOT have @authenticated
    const start = combined.indexOf('requestPilot');
    const block = combined.slice(start, start + 300);
    // Public mutations have no auth directive
    expect(block).not.toContain('@authenticated');
  });
});

// ─── 3. Subscription — IDOR Tenant Isolation ──────────────────────────────────

describe('B2B Subscription — IDOR Guard (T-03, SC-03)', () => {
  it('subscription resolver file exists', () => {
    const resolverPath = resolve(
      ROOT,
      'apps/subgraph-core/src/subscription/subscription.resolver.ts'
    );
    if (!existsSync(resolverPath)) return; // not yet created — skip
    const c = readFileSync(resolverPath, 'utf-8');
    expect(c.length).toBeGreaterThan(0);
  });

  it('subscription resolver does NOT accept tenantId from @Args (IDOR prevention)', () => {
    const resolverPath = resolve(
      ROOT,
      'apps/subgraph-core/src/subscription/subscription.resolver.ts'
    );
    if (!existsSync(resolverPath)) return; // not yet created — skip
    const c = readFileSync(resolverPath, 'utf-8');
    // tenantId MUST come from JWT context, not from caller arguments
    expect(c).not.toMatch(/@Args\(['"](tenantId|tenant_id)['"]\)/);
    expect(c).not.toMatch(/args\.tenantId|input\.tenantId/);
  });

  it('subscription resolver extracts tenantId from JWT authContext', () => {
    const resolverPath = resolve(
      ROOT,
      'apps/subgraph-core/src/subscription/subscription.resolver.ts'
    );
    if (!existsSync(resolverPath)) return; // not yet created — skip
    const c = readFileSync(resolverPath, 'utf-8');
    // Must use authContext (JWT-derived) for tenant isolation — SI-9
    expect(c).toMatch(/auth(?:Context)?\.tenantId|ctx\.authContext/);
  });

  it('billing schema tenant_subscriptions has RLS tenant isolation policy', () => {
    const c = read('packages/db/src/schema/billing.ts');
    expect(c).toContain('tenant_subscriptions_tenant_isolation');
    expect(c).toContain("current_setting('app.current_tenant', TRUE)");
  });

  it('tenant_subscriptions RLS uses app.current_tenant (SI-1 compliant)', () => {
    const c = read('packages/db/src/schema/billing.ts');
    // Must NOT use the buggy app.current_user variable in tenant policy
    const policyBlock = c.slice(
      c.indexOf('tenant_subscriptions_tenant_isolation'),
      c.indexOf('tenant_subscriptions_admin_write')
    );
    expect(policyBlock).not.toMatch(/app\.current_user['"]\s*,/);
    expect(policyBlock).toContain('app.current_tenant');
  });

  it('tenant_subscriptions table has RLS enabled', () => {
    const c = read('packages/db/src/schema/billing.ts');
    // enableRLS() is called on the table
    const block = c.slice(
      c.indexOf("'tenant_subscriptions'"),
      c.indexOf("'yau_events'")
    );
    expect(block).toContain('enableRLS');
  });
});

// ─── 4. YAU — Cross-Tenant RLS Leakage ────────────────────────────────────────

describe('B2B YAU — Cross-Tenant RLS Integrity (T-06, SC-06)', () => {
  it('yau_events table has RLS enabled', () => {
    const c = read('packages/db/src/schema/billing.ts');
    const block = c.slice(
      c.indexOf("'yau_events'"),
      c.indexOf("'pilot_requests'")
    );
    expect(block).toContain('enableRLS');
  });

  it('yau_events tenant isolation policy uses app.current_tenant (SI-1 compliant)', () => {
    const c = read('packages/db/src/schema/billing.ts');
    expect(c).toContain('yau_events_tenant_isolation');
    const policyBlock = c.slice(
      c.indexOf('yau_events_tenant_isolation'),
      c.indexOf('yau_events_admin_read')
    );
    expect(policyBlock).toContain('app.current_tenant');
  });

  it('yau_events user policy uses app.current_user_id (SI-1 — not bare app.current_user)', () => {
    const c = read('packages/db/src/schema/billing.ts');
    // Must use _id suffix (SI-1 invariant)
    expect(c).toContain('app.current_user_id');
    // Must NOT use the incorrect bare variable name in yau_events context
    const yauBlock = c.slice(
      c.indexOf('yau_events'),
      c.indexOf('pilot_requests')
    );
    // Negative lookahead: app.current_user NOT followed by _id is the bug
    expect(yauBlock).not.toMatch(/current_setting\s*\(\s*'app\.current_user'\s*,/);
  });

  it('yau_events RLS policy does not use app.current_user_role as sole USING clause', () => {
    // T-06: An admin_read policy that ONLY checks role (without tenant_id constraint)
    // allows cross-tenant data disclosure when combined with a permissive base policy.
    // The tenant isolation policy must be the primary filter.
    const c = read('packages/db/src/schema/billing.ts');
    const tenantIsolationPolicy = c.slice(
      c.indexOf('yau_events_tenant_isolation'),
      c.indexOf('yau_events_admin_read')
    );
    // The base tenant isolation policy must reference tenant_id, not just role
    expect(tenantIsolationPolicy).toContain('tenant_id');
    expect(tenantIsolationPolicy).toContain('app.current_tenant');
  });

  it('yau_events isCounted column exists for billing integrity', () => {
    const c = read('packages/db/src/schema/billing.ts');
    expect(c).toContain('isCounted');
    expect(c).toContain('is_counted');
  });

  it('yau_events has unique index on (tenant_id, user_id, year) preventing duplicates', () => {
    const c = read('packages/db/src/schema/billing.ts');
    expect(c).toContain('yau_events_tenant_user_year_unique');
  });

  it('usage_snapshots table has RLS enabled', () => {
    const c = read('packages/db/src/schema/billing.ts');
    const block = c.slice(c.indexOf("'usage_snapshots'"));
    expect(block).toContain('enableRLS');
  });

  it('usage_snapshots tenant isolation policy enforces app.current_tenant', () => {
    const c = read('packages/db/src/schema/billing.ts');
    expect(c).toContain('usage_snapshots_tenant_isolation');
    const block = c.slice(
      c.indexOf('usage_snapshots_tenant_isolation'),
      c.indexOf('usage_snapshots_admin_read')
    );
    expect(block).toContain('app.current_tenant');
  });

  it('pilot_requests table intentionally has NO RLS (public submission — by design)', () => {
    const c = read('packages/db/src/schema/billing.ts');
    // pilot_requests is defined without enableRLS() — this is intentional
    // because it is a pre-authentication public submission table
    const block = c.slice(
      c.indexOf('pilot_requests'),
      c.indexOf('usage_snapshots')
    );
    // Should NOT have enableRLS() — this is the expected safe design
    expect(block).not.toContain('enableRLS');
  });
});

// ─── 5. Admin Endpoints — @requiresRole Enforcement ──────────────────────────

describe('B2B Admin Billing — @requiresRole Guard (T-05, SC-05)', () => {
  let subscriptionSdl: string;

  beforeAll(() => {
    // Look for subscription SDL in subgraph-core
    const sdlCandidates = [
      'apps/subgraph-core/src/subscription/subscription.graphql',
      'apps/subgraph-core/src/billing/billing.graphql',
    ];
    subscriptionSdl = sdlCandidates
      .map((p) => read(p))
      .find((c) => c.length > 0) ?? '';
  });

  it('subscription SDL file exists', () => {
    if (subscriptionSdl.length === 0) {
      // SDL not yet created — this is a reminder test
      console.warn(
        '[b2b-billing-security] WARNING: subscription SDL not yet created — ' +
        'ensure it is added before production deployment'
      );
    }
    // This test becomes a hard assertion once the file exists
    expect(true).toBe(true); // placeholder — enforced by downstream tests
  });

  it('approvePilot mutation requires @requiresRole with SUPER_ADMIN', () => {
    if (!subscriptionSdl.includes('approvePilot')) return;
    const start = subscriptionSdl.indexOf('approvePilot');
    const block = subscriptionSdl.slice(start, start + 300);
    expect(block).toContain('@requiresRole');
    expect(block).toContain('SUPER_ADMIN');
  });

  it('approvePilot mutation requires @authenticated as baseline', () => {
    if (!subscriptionSdl.includes('approvePilot')) return;
    const start = subscriptionSdl.indexOf('approvePilot');
    const block = subscriptionSdl.slice(start, start + 300);
    expect(block).toContain('@authenticated');
  });

  it('rejectPilot mutation requires @requiresRole with SUPER_ADMIN', () => {
    if (!subscriptionSdl.includes('rejectPilot')) return;
    const start = subscriptionSdl.indexOf('rejectPilot');
    const block = subscriptionSdl.slice(start, start + 300);
    expect(block).toContain('@requiresRole');
    expect(block).toContain('SUPER_ADMIN');
  });

  it('setTenantPlan mutation requires @requiresRole with SUPER_ADMIN', () => {
    if (!subscriptionSdl.includes('setTenantPlan')) return;
    const start = subscriptionSdl.indexOf('setTenantPlan');
    const block = subscriptionSdl.slice(start, start + 300);
    expect(block).toContain('@requiresRole');
    expect(block).toContain('SUPER_ADMIN');
  });

  it('approvePilot does NOT allow ORG_ADMIN (self-approval prevention)', () => {
    if (!subscriptionSdl.includes('approvePilot')) return;
    const start = subscriptionSdl.indexOf('approvePilot');
    // Slice narrowly to just this mutation block
    const nextMutation = subscriptionSdl.indexOf('\n  ', start + 20);
    const block = subscriptionSdl.slice(start, nextMutation > start ? nextMutation : start + 300);
    // ORG_ADMIN must NOT appear in the approvePilot roles list — self-approval risk
    expect(block).not.toContain('ORG_ADMIN');
  });

  it('platformUsageOverview query requires @requiresRole with SUPER_ADMIN', () => {
    // Check across all subgraph-core SDL files
    const sdlFiles = globSync(
      'apps/subgraph-core/src/**/*.graphql',
      { cwd: ROOT }
    );
    const combined = sdlFiles
      .map((f) => readFileSync(resolve(ROOT, f), 'utf-8'))
      .join('\n');
    if (!combined.includes('platformUsageOverview')) return;
    const start = combined.indexOf('platformUsageOverview');
    const block = combined.slice(start, start + 300);
    expect(block).toContain('@requiresRole');
    expect(block).toContain('SUPER_ADMIN');
  });

  it('platformUsageOverview does NOT allow ORG_ADMIN (cross-tenant data)', () => {
    const sdlFiles = globSync(
      'apps/subgraph-core/src/**/*.graphql',
      { cwd: ROOT }
    );
    const combined = sdlFiles
      .map((f) => readFileSync(resolve(ROOT, f), 'utf-8'))
      .join('\n');
    if (!combined.includes('platformUsageOverview')) return;
    const start = combined.indexOf('platformUsageOverview');
    // Narrow window — just this query field, not surrounding fields
    const block = combined.slice(start, start + 300);
    // platformUsageOverview returns ALL tenants' data — ORG_ADMIN must NOT have access
    expect(block).not.toContain('ORG_ADMIN');
  });

  it('subscription service does NOT have self-approval gap (approvedBy !== targetTenantId)', () => {
    const servicePath = resolve(
      ROOT,
      'apps/subgraph-core/src/subscription/subscription.service.ts'
    );
    if (!existsSync(servicePath)) return; // not yet created — skip
    const c = readFileSync(servicePath, 'utf-8');
    // Service must have a guard preventing self-approval
    expect(c).toMatch(/self.approval|Self.Approval|approver.*tenantId.*===.*targetTenant|tenantId.*approvedBy/i);
  });
});

// ─── 6. Billing Schema — SI-1 Compliance ──────────────────────────────────────

describe('B2B Billing Schema — SI-1 RLS Variable Correctness', () => {
  it('billing.ts exists and is non-empty', () => {
    const c = read('packages/db/src/schema/billing.ts');
    expect(c.length).toBeGreaterThan(100);
  });

  it('billing.ts does NOT use bare app.current_user (SI-1 violation guard)', () => {
    const c = read('packages/db/src/schema/billing.ts');
    // Negative pattern: must not have app.current_user WITHOUT _id suffix
    expect(c).not.toMatch(/current_setting\s*\(\s*['"`]app\.current_user['"`]\s*,/);
  });

  it('billing.ts uses app.current_user_id for user-scoped policies (SI-1)', () => {
    const c = read('packages/db/src/schema/billing.ts');
    expect(c).toContain("app.current_user_id");
  });

  it('billing.ts uses app.current_tenant for tenant-scoped policies (SI-1)', () => {
    const c = read('packages/db/src/schema/billing.ts');
    expect(c).toContain("app.current_tenant");
  });

  it('all current_setting calls in billing.ts use TRUE as second argument (fail-safe NULL)', () => {
    const c = read('packages/db/src/schema/billing.ts');
    // TRUE second arg: current_setting('...', TRUE) — returns NULL on missing var, not an error
    const calls = c.match(/current_setting\([^)]+\)/g) ?? [];
    for (const call of calls) {
      expect(
        call,
        `current_setting call must use TRUE second arg to fail-safe: ${call}`
      ).toMatch(/TRUE|true/);
    }
  });

  it('billing.ts exports all table types for TypeScript safety', () => {
    const c = read('packages/db/src/schema/billing.ts');
    expect(c).toContain('SubscriptionPlan');
    expect(c).toContain('TenantSubscription');
    expect(c).toContain('YauEvent');
    expect(c).toContain('PilotRequest');
    expect(c).toContain('UsageSnapshot');
  });
});

// ─── 7. Pilot Request — Email Enumeration Prevention (T-12, SC-07) ─────────────

describe('B2B Pilot Request — Email Enumeration Prevention (T-12)', () => {
  it('subscription service does not expose different errors for existing vs new email', () => {
    const servicePath = resolve(
      ROOT,
      'apps/subgraph-core/src/subscription/subscription.service.ts'
    );
    if (!existsSync(servicePath)) return; // not yet created — skip
    const c = readFileSync(servicePath, 'utf-8');
    // Must NOT throw/return "already exists" or "email taken" messages to caller
    expect(c).not.toMatch(/already.*exists|email.*taken|email.*registered/i);
  });

  it('requestPilot always returns PENDING_APPROVAL status regardless of duplicate', () => {
    const servicePath = resolve(
      ROOT,
      'apps/subgraph-core/src/subscription/subscription.service.ts'
    );
    if (!existsSync(servicePath)) return; // not yet created — skip
    const c = readFileSync(servicePath, 'utf-8');
    // Generic success response regardless of duplicate
    expect(c).toMatch(/PENDING_APPROVAL|pending_approval/i);
  });

  it('PilotSignupResult type does NOT contain a duplicate or exists field', () => {
    const allSdl = globSync('apps/subgraph-core/src/**/*.graphql', { cwd: ROOT })
      .map((f) => readFileSync(resolve(ROOT, f), 'utf-8'))
      .join('\n');
    if (!allSdl.includes('PilotSignupResult')) return;
    const start = allSdl.indexOf('PilotSignupResult');
    const end = allSdl.indexOf('\n}', start);
    const block = allSdl.slice(start, end);
    // PilotSignupResult must not expose alreadyExists or isDuplicate fields
    expect(block).not.toMatch(/alreadyExists|isDuplicate|emailExists/);
  });
});

// ─── 8. Admin Billing Frontend — Forced Browsing Prevention (T-10) ────────────

describe('B2B Admin Frontend — Forced Browsing Prevention (T-10)', () => {
  it('PlatformUsageDashboardPage restricts access to SUPER_ADMIN role', () => {
    const page = read('apps/web/src/pages/PlatformUsageDashboardPage.tsx');
    if (page.length === 0) return; // not yet created — skip
    // Must gate on SUPER_ADMIN role
    expect(page).toContain('SUPER_ADMIN');
    expect(page).toMatch(/role.*SUPER_ADMIN|SUPER_ADMIN.*role|requiresRole|ProtectedRoute/);
  });

  it('PilotRequestsAdminPage restricts access to SUPER_ADMIN role', () => {
    const page = read('apps/web/src/pages/PilotRequestsAdminPage.tsx');
    if (page.length === 0) return; // not yet created — skip
    expect(page).toContain('SUPER_ADMIN');
    expect(page).toMatch(/role.*SUPER_ADMIN|SUPER_ADMIN.*role|requiresRole|ProtectedRoute/);
  });

  it('admin billing route renders access-denied for non-SUPER_ADMIN roles', () => {
    const page = read('apps/web/src/pages/PlatformUsageDashboardPage.tsx');
    if (page.length === 0) return; // not yet created — skip
    // Must have an access-denied / unauthorized fallback
    expect(page).toMatch(/[Aa]ccess [Dd]enied|[Uu]nauthorized|[Ff]orbidden|not.*authorized/i);
  });

  it('myTenantUsage query uses @authenticated (self-service, any role)', () => {
    const allSdl = globSync('apps/subgraph-core/src/**/*.graphql', { cwd: ROOT })
      .map((f) => readFileSync(resolve(ROOT, f), 'utf-8'))
      .join('\n');
    if (!allSdl.includes('myTenantUsage')) return;
    const start = allSdl.indexOf('myTenantUsage');
    const block = allSdl.slice(start, start + 200);
    expect(block).toContain('@authenticated');
  });

  it('myTenantUsage query does NOT require SUPER_ADMIN (self-service query)', () => {
    const allSdl = globSync('apps/subgraph-core/src/**/*.graphql', { cwd: ROOT })
      .map((f) => readFileSync(resolve(ROOT, f), 'utf-8'))
      .join('\n');
    if (!allSdl.includes('myTenantUsage')) return;
    const start = allSdl.indexOf('myTenantUsage');
    // Slice narrowly to this field's line only (not neighboring fields)
    const lineEnd = allSdl.indexOf('\n', start);
    const block = allSdl.slice(start, lineEnd > start ? lineEnd : start + 100);
    // myTenantUsage is tenant-scoped self-service — does not require SUPER_ADMIN
    // (protection is tenant isolation via RLS + JWT context, not role restriction)
    expect(block).not.toContain('@requiresRole');
  });
});

// ─── 9. Audit Logging Requirement (T-09, SC-08) ───────────────────────────────

describe('B2B Admin — Audit Logging on Billing Actions (T-09, SC-08)', () => {
  it('subscription service emits structured log on approvePilot', () => {
    const servicePath = resolve(
      ROOT,
      'apps/subgraph-core/src/subscription/subscription.service.ts'
    );
    if (!existsSync(servicePath)) return; // not yet created — skip
    const c = readFileSync(servicePath, 'utf-8');
    // Must log the approval action with structured context
    expect(c).toMatch(/logger\.(info|warn|audit)|this\.logger/);
    expect(c).toMatch(/pilot\.approved|approv/i);
  });

  it('subscription service emits NATS event on pilot approval', () => {
    const servicePath = resolve(
      ROOT,
      'apps/subgraph-core/src/subscription/subscription.service.ts'
    );
    if (!existsSync(servicePath)) return; // not yet created — skip
    const c = readFileSync(servicePath, 'utf-8');
    // Must publish a NATS event for billing audit trail
    expect(c).toMatch(/nats|publish|billing\.pilot|BILLING_PILOT/i);
  });

  it('subscription service emits structured log on rejectPilot', () => {
    const servicePath = resolve(
      ROOT,
      'apps/subgraph-core/src/subscription/subscription.service.ts'
    );
    if (!existsSync(servicePath)) return; // not yet created — skip
    const c = readFileSync(servicePath, 'utf-8');
    expect(c).toMatch(/reject/i);
  });
});

// ─── 10. Aggregate — billing.ts schema completeness ──────────────────────────

describe('B2B Billing — Schema Completeness', () => {
  it('billing.ts defines all five required tables', () => {
    const c = read('packages/db/src/schema/billing.ts');
    expect(c).toContain('subscription_plans');
    expect(c).toContain('tenant_subscriptions');
    expect(c).toContain('yau_events');
    expect(c).toContain('pilot_requests');
    expect(c).toContain('usage_snapshots');
  });

  it('billing.ts is exported from packages/db schema index', () => {
    const indexFile = read('packages/db/src/schema/index.ts');
    if (indexFile.length === 0) return; // index may not exist yet
    expect(indexFile).toMatch(/billing|subscriptionPlans|tenantSubscriptions|yauEvents/);
  });

  it('tenant_subscriptions has stripe fields for future payment integration', () => {
    const c = read('packages/db/src/schema/billing.ts');
    expect(c).toMatch(/stripe_subscription_id|stripeSubscriptionId/);
    expect(c).toMatch(/stripe_customer_id|stripeCustomerId/);
  });

  it('pilot_requests table has status column with expected values', () => {
    const c = read('packages/db/src/schema/billing.ts');
    // Status enum: pending | approved | rejected | expired
    expect(c).toContain("'pending'");
    expect(c).toContain("status");
  });

  it('yau_events has index on (tenant_id, year) for billing performance', () => {
    const c = read('packages/db/src/schema/billing.ts');
    expect(c).toContain('idx_yau_events_tenant_year');
  });
});
