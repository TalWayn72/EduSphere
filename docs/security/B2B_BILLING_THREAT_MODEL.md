# B2B Billing & Pilot — STRIDE Threat Model

**Date:** 2026-03-11
**Scope:** B2B Go-to-Market features introduced in the B2B-GTM-PLATFORM-COMPLETION-v2 plan
**Analyst:** Security & Compliance Agent (Phase 50)
**Status:** PARTIALLY REMEDIATED — T-01 through T-06 resolved (2026-03-11); T-07 through T-15 pending

---

## 1. Executive Summary

The B2B billing features introduce five new attack surfaces: a **public pilot signup endpoint** (unauthenticated), a **YAU counting mechanism**, **subscription status checks**, a **platform admin billing dashboard**, and a **pricing/ROI frontend page**. This model identifies 22 distinct threats across STRIDE categories, rates them by likelihood × impact, and prescribes exact code controls with verification tests.

---

## 2. Assets Under Analysis

| Asset | Sensitivity | Location |
|-------|-------------|----------|
| `pilot_requests` table | HIGH — business leads + PII | `packages/db/src/schema/billing.ts` |
| `tenant_subscriptions` table | CRITICAL — active billing state | `packages/db/src/schema/billing.ts` |
| `yau_events` table | HIGH — billable usage data | `packages/db/src/schema/billing.ts` |
| `usage_snapshots` table | HIGH — invoice-grade data | `packages/db/src/schema/billing.ts` |
| `requestPilot` mutation | HIGH — public endpoint | Planned: subgraph-core |
| `approvePilot` / `rejectPilot` mutations | CRITICAL — admin actions | Planned: subgraph-core |
| `platformUsageOverview` query | CRITICAL — all-tenant data | Planned: subgraph-core |
| `myTenantUsage` query | MEDIUM — own tenant data | Planned: subgraph-core |
| `/admin/billing` route | CRITICAL — financial data | Planned: apps/web |

---

## 3. STRIDE Threat Tables

### 3.1 Pilot Request Submission (Public Endpoint — No Auth)

| STRIDE Category | Threat | Likelihood | Impact | Risk Rating |
|-----------------|--------|-----------|--------|-------------|
| **Spoofing** | Attacker submits fake org names or impersonates real institutions (Harvard, MIT) to get demo access | HIGH | HIGH | **CRITICAL** |
| **Tampering** | Attacker manipulates `requestedSeatLimit` to an extreme value (e.g., 999999) to probe billing logic | MEDIUM | MEDIUM | MEDIUM |
| **Repudiation** | Pilot submitter denies making request (no IP/timestamp logged at submission) | MEDIUM | LOW | LOW |
| **Info Disclosure** | Error message reveals whether email already exists in `pilot_requests` (email enumeration) | HIGH | MEDIUM | **HIGH** |
| **DoS** | Automated bot flooding: 1000s of submissions/minute saturate `pilot_requests` table and admin review queue | HIGH | HIGH | **CRITICAL** |
| **Elevation of Privilege** | No direct EoP vector on public endpoint; but approved pilot grants platform access → **identity theft of pilot account** | LOW | CRITICAL | **HIGH** |

**Spoofing mitigations required:**
- Zod validation: `institutionName` max 255 chars, strip HTML tags
- CAPTCHA or Turnstile on frontend form (not server-side mandatory, but strongly recommended)
- Deduplication: reject within 24h if same email already has `status = 'pending'`

**DoS mitigations required:**
- Gateway rate limit: **max 5 `requestPilot` calls per IP per hour** (sliding window)
- Separate rate-limit bucket from authenticated requests (IP-only key, no tenant)
- `pilot_requests` table row count alert: alert ops if > 500 pending rows

**Info Disclosure mitigation:**
- Always return the SAME generic success response regardless of whether email exists
- Never return "email already registered" — return "Your request has been received" always

---

### 3.2 YAU Counting Mechanism

| STRIDE Category | Threat | Likelihood | Impact | Risk Rating |
|-----------------|--------|-----------|--------|-------------|
| **Spoofing** | Tenant forges `user_id` in YAU event to inflate their own headcount (defeating seat-limit enforcement) | LOW | HIGH | MEDIUM |
| **Tampering** | Tenant admin directly updates `yau_events.is_counted = false` to suppress counting (YAU deflation) | MEDIUM | HIGH | **HIGH** |
| **Tampering** | Tenant admin updates `yau_events.last_active_at` to manipulate year-boundary attribution | LOW | HIGH | MEDIUM |
| **Repudiation** | No audit trail when `isCounted` flag is toggled — billing disputes unresolvable | HIGH | HIGH | **HIGH** |
| **Info Disclosure** | `yau_events_admin_read` policy leaks CROSS-TENANT if `current_setting` returns NULL (unset session) | MEDIUM | CRITICAL | **CRITICAL** |
| **DoS** | Attacker triggers millions of YAU events for a tenant to bloat `yau_events` table | MEDIUM | MEDIUM | MEDIUM |
| **Elevation of Privilege** | Year-boundary race: user logs in at 23:59:59 Dec 31 in timezone UTC+14 — counted in wrong year | LOW | MEDIUM | LOW |

**CRITICAL finding — RLS NULL bypass:**
The `yau_events_admin_read` policy is:
```sql
user_id::text = current_setting('app.current_user_id', TRUE)
OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
```
If a caller sets `app.current_user_role` to `SUPER_ADMIN` without a valid session (e.g., direct DB connection that bypasses `withTenantContext`), they see ALL rows across ALL tenants. The outer tenant-isolation policy (`yau_events_tenant_isolation`) is conjunctive with the admin_read policy via `OR`, meaning admin_read can override tenant isolation. This is a confirmed RLS design flaw.

**Remediation:** The `yau_events_admin_read` policy must be subordinate to `yau_events_tenant_isolation`. Use a separate SUPER_ADMIN bypass policy rather than OR-ing the admin check into the data policy.

**YAU Tampering mitigation:**
- `isCounted` column should be IMMUTABLE once set to true (application-level constraint)
- Writes to `yau_events` must go through `YauCounterService` only — no direct Drizzle insert outside the service
- Add DB trigger or application check: if `isCounted = true`, reject updates

**Audit trail:**
- Every `isCounted` state change must emit a NATS `billing.yau.counted` event with full context
- `usage_snapshots` serves as the immutable monthly record — snapshots must never be deletable by tenants

---

### 3.3 Subscription Status Checks

| STRIDE Category | Threat | Likelihood | Impact | Risk Rating |
|-----------------|--------|-----------|--------|-------------|
| **Spoofing** | Tenant A passes Tenant B's `tenantId` in `myTenantUsage(year)` query to read B's subscription | MEDIUM | CRITICAL | **CRITICAL** |
| **Tampering** | ORG_ADMIN calls `approvePilot` on their own tenant (self-approval of pilot → free activation) | LOW | CRITICAL | **CRITICAL** |
| **Tampering** | PILOT tenant continues accessing features after `pilotExpiresAt` (expired pilot bypass) | HIGH | HIGH | **HIGH** |
| **Repudiation** | No log entry when pilot expires or subscription lapses — billing disputes | MEDIUM | HIGH | HIGH |
| **Info Disclosure** | `approvePilot` returns full `TenantSubscription` including internal `notes` field to caller | MEDIUM | MEDIUM | MEDIUM |
| **DoS** | Repeated subscription status checks on every authenticated request (N+1 DB query pattern) | HIGH | MEDIUM | HIGH |
| **Elevation of Privilege** | PILOT plan user requests `platformUsageOverview` — sees all tenants' data if role check is missing | LOW | CRITICAL | **CRITICAL** |

**CRITICAL — IDOR on `myTenantUsage`:**
The planned SDL shows `myTenantUsage(year: Int): TenantUsageStats!` with only `@authenticated`. This is vulnerable if the resolver uses a `tenantId` argument from the caller rather than extracting it from the JWT context. The resolver MUST use `ctx.authContext.tenantId` (from JWT), never `@Args('tenantId')`.

**CRITICAL — Self-approval:**
`approvePilot` must verify: `approvedBy.tenantId !== targetTenantId`. A SUPER_ADMIN from Tenant A cannot approve Tenant A's own pilot (conflict of interest). Since SUPER_ADMIN is platform-wide, this is enforced by: SUPER_ADMIN accounts must have `tenantId = PLATFORM_TENANT_ID` (a special reserved UUID). If a SUPER_ADMIN has a non-platform tenantId in their JWT, the mutation must be rejected.

**Expired pilot bypass:**
- `isPilotExpired()` must be checked on EVERY authenticated request for PILOT-plan tenants
- The NestJS `SeatLimitGuard` must be applied globally (not just on `createUser`)
- Expired pilot should: block new enrollments, block AI features, allow data export/read for 30-day grace period

---

### 3.4 Platform Admin Billing Dashboard

| STRIDE Category | Threat | Likelihood | Impact | Risk Rating |
|-----------------|--------|-----------|--------|-------------|
| **Spoofing** | Attacker forges JWT with `role: SUPER_ADMIN` claim (requires key compromise) | LOW | CRITICAL | HIGH |
| **Tampering** | ORG_ADMIN directly queries `allTenantSubscriptions` GraphQL field to enumerate all tenants | MEDIUM | CRITICAL | **CRITICAL** |
| **Repudiation** | Admin actions (approve, reject, setTenantPlan) lack audit log entries | HIGH | HIGH | **HIGH** |
| **Info Disclosure** | `platformUsageOverview` returns `annualPriceUsd` for all tenants — competitor pricing disclosure | HIGH | HIGH | **HIGH** |
| **Info Disclosure** | `/admin/billing` route accessible by ORG_ADMIN via forced browsing (missing SUPER_ADMIN guard) | MEDIUM | HIGH | **HIGH** |
| **DoS** | `platformUsageOverview` scans all tenant YAU data without pagination — full table scan at scale | HIGH | MEDIUM | HIGH |
| **Elevation of Privilege** | ORG_ADMIN queries `setTenantPlan` mutation (missing `@requiresRole(roles: [SUPER_ADMIN])` directive) | LOW | CRITICAL | **CRITICAL** |

**Mass data disclosure — `platformUsageOverview`:**
Returning `annualPriceUsd` to a SUPER_ADMIN who could be compromised exposes all tenants' contract values. Consider: field-level access restriction on `annualPriceUsd` (only return to requests that also have `billing:read` scope).

**Forced browsing mitigation:**
- Frontend route `/admin/billing` and `/admin/platform-usage` must check role client-side (ProtectedRoute with `roles: ['SUPER_ADMIN']`)
- Backend resolvers are the real enforcement — frontend check is defense in depth only
- GraphQL gateway must enforce `@requiresRole(roles: [SUPER_ADMIN])` on all billing admin queries

**Audit log requirement:**
Every call to `approvePilot`, `rejectPilot`, `setTenantPlan` must emit a structured Pino log entry at `info` level with: `tenantId`, `adminUserId`, `action`, `previousState`, `newState`, `timestamp`. These must also be stored in the `audit_log` table (if it exists).

---

### 3.5 Pricing Page (Frontend)

| STRIDE Category | Threat | Likelihood | Impact | Risk Rating |
|-----------------|--------|-----------|--------|-------------|
| **Spoofing** | N/A — static pricing page, no auth | — | — | — |
| **Tampering** | Client-side ROI calculator: user manipulates DOM/JS to show inflated savings (no server validation; cosmetic only) | HIGH | LOW | LOW |
| **Repudiation** | Pilot form submission not idempotent — double-click submits two requests | MEDIUM | LOW | LOW |
| **Info Disclosure** | Pilot signup form exposes endpoint URL discoverable via browser devtools | LOW | LOW | — |
| **DoS** | Form submission spam (covered in 3.1) | HIGH | HIGH | See 3.1 |
| **Elevation of Privilege** | XSS via `institutionName` / `useCase` fields stored in DB and rendered in admin UI without sanitization | HIGH | HIGH | **CRITICAL** |

**CRITICAL — Stored XSS via pilot form fields:**
The `org_name`, `contact_name`, and `use_case` fields in `pilot_requests` are displayed in the admin UI (`PilotRequestsAdminPage`). If these are rendered as raw HTML without sanitization, an attacker can inject `<script>` tags or event handlers that execute in the SUPER_ADMIN's browser context — full account takeover.

**Mitigations:**
1. Backend: Zod validation on `requestPilot` input: strip all HTML tags using `DOMPurify`-equivalent server-side sanitizer (e.g., `sanitize-html` npm package with `allowedTags: []`)
2. Frontend: React JSX escapes by default — ensure no `dangerouslySetInnerHTML` is used in admin table cells
3. Database: `use_case` field is `text` type with no length limit — enforce max 2000 chars at Zod layer
4. CSP header: `Content-Security-Policy: default-src 'self'` must be set to mitigate XSS impact even if sanitization fails

**Double-submit prevention:**
- Disable submit button after first click
- Server-side: deduplication check on `(contactEmail, orgName)` within 24h window

---

## 4. Risk Register (Prioritized)

| ID | Threat | Risk | Status |
|----|--------|------|--------|
| T-01 | Stored XSS via pilot form fields in admin UI | CRITICAL | ✅ RESOLVED — SC-02: `stripHtml()` transform in `billing.schemas.ts` + `subscription.schemas.ts` (2026-03-11) |
| T-02 | DoS via bot flooding of public `requestPilot` endpoint | CRITICAL | ✅ RESOLVED — SC-01: `checkPilotRateLimit()` added to `rate-limit.ts`; 5 req/hr per IP, 1-hour sliding window (2026-03-11) |
| T-03 | IDOR on `myTenantUsage` — caller supplies tenantId from args | CRITICAL | ✅ RESOLVED — SC-03: IDOR guard in `billing.resolver.ts` `tenantUsage()` — ORG_ADMIN restricted to own tenantId (2026-03-11) |
| T-04 | ORG_ADMIN self-approval of own pilot via `approvePilot` | CRITICAL | ✅ RESOLVED — SC-04: `guardSelfApproval()` in `subscription.service.ts`; self-approval guard in `pilot.service.ts` (2026-03-11) |
| T-05 | Missing `@requiresRole(SUPER_ADMIN)` on `setTenantPlan` mutation | CRITICAL | ✅ RESOLVED — SC-05: `@requiresRole(roles: [SUPER_ADMIN])` present in `billing.graphql` (pre-existing, confirmed by tests) |
| T-06 | YAU RLS NULL bypass — `yau_events_admin_read` OR overrides tenant isolation | CRITICAL | ✅ RESOLVED — SC-06: Split into 3 policies: `yau_events_user_self_read` + `yau_events_org_admin_tenant_read` + `yau_events_super_admin_read` in `packages/db/src/schema/billing.ts` (2026-03-11) |
| T-07 | Expired pilot bypass — no enforcement on authenticated requests | HIGH | Requires remediation |
| T-08 | `platformUsageOverview` returns all tenants' contract pricing | HIGH | Requires remediation |
| T-09 | No audit log on admin billing actions (approve/reject/setTenantPlan) | HIGH | Requires remediation |
| T-10 | Forced browsing to `/admin/billing` without SUPER_ADMIN guard | HIGH | Requires remediation |
| T-11 | YAU `isCounted` tampering — tenants can deflate billing counts | HIGH | Requires remediation |
| T-12 | Email enumeration on `requestPilot` (different error per email) | HIGH | Requires remediation |
| T-13 | `platformUsageOverview` has no pagination — full table scan DoS | MEDIUM | Requires remediation |
| T-14 | No deduplication on pilot submissions (same email/org) | MEDIUM | Requires remediation |
| T-15 | Missing Zod length limits on `useCase` text field | MEDIUM | Requires remediation |

---

## 5. Required Security Controls

### SC-01: Rate Limiting on `requestPilot` (addresses T-02)

**Location:** `apps/gateway/src/middleware/rate-limit.ts` — add special bucket for unauthenticated pilot endpoint

```typescript
// Pseudocode — add to checkRateLimit()
if (operationName === 'RequestPilot') {
  const key = `pilot:${clientIp}`;
  const limit = parseInt(process.env.PILOT_RATE_LIMIT_MAX ?? '5', 10);
  const windowMs = 60 * 60 * 1000; // 1 hour
  // check against in-memory or Redis sliding window
}
```

**Verification test:** `tests/security/b2b-billing-security.spec.ts` → "pilot request: rate limiting config"

---

### SC-02: XSS Sanitization on Pilot Input Fields (addresses T-01)

**Location:** Zod schema for `PilotSignupInput` in subgraph-core

```typescript
const pilotSignupSchema = z.object({
  institutionName: z.string()
    .min(2)
    .max(255)
    .transform(v => v.replace(/<[^>]*>/g, '').trim()),  // strip HTML tags
  contactEmail: z.string().email().max(255),
  estimatedUsers: z.number().int().min(1).max(100000),
  useCase: z.string()
    .min(10)
    .max(2000)
    .transform(v => v.replace(/<[^>]*>/g, '').trim()),  // strip HTML tags
  adminFirstName: z.string().min(1).max(100)
    .transform(v => v.replace(/<[^>]*>/g, '').trim()),
  adminLastName: z.string().min(1).max(100)
    .transform(v => v.replace(/<[^>]*>/g, '').trim()),
  requestedSeatLimit: z.number().int().min(1).max(50000).optional(),
});
```

**Verification test:** `tests/security/b2b-billing-security.spec.ts` → "pilot request: XSS sanitization"

---

### SC-03: tenantId from JWT Context on Billing Queries (addresses T-03)

**Location:** `apps/subgraph-core/src/subscription/subscription.resolver.ts`

```typescript
// WRONG — never do this:
async myTenantUsage(@Args('tenantId') tenantId: string) { ... }

// CORRECT — always extract from JWT context:
async myTenantUsage(@Context() ctx: GraphQLContext) {
  const tenantId = ctx.authContext.tenantId; // from JWT, not from args
  return this.subscriptionService.getActivePlan(tenantId);
}
```

**Verification test:** `tests/security/b2b-billing-security.spec.ts` → "subscription: IDOR guard"

---

### SC-04: Self-Approval Guard on `approvePilot` (addresses T-04)

**Location:** `apps/subgraph-core/src/subscription/subscription.service.ts`

```typescript
async approvePilot(targetTenantId: string, approvedByUserId: string): Promise<TenantSubscription> {
  // SUPER_ADMIN users have platform tenantId — but extra check for safety:
  const approver = await this.userService.findById(approvedByUserId);
  if (approver.tenantId === targetTenantId) {
    throw new ForbiddenException('Self-approval of pilot is not permitted');
  }
  // ... proceed with approval
}
```

**Verification test:** `tests/security/b2b-billing-security.spec.ts` → "subscription: self-approval guard"

---

### SC-05: `@requiresRole(roles: [SUPER_ADMIN])` on All Admin Billing Mutations (addresses T-05)

**Location:** SDL for subscription mutations in subgraph-core

```graphql
setTenantPlan(tenantId: ID!, plan: TenantPlan!, seatLimit: Int!, expiresAt: DateTime, isAirGapped: Boolean): TenantSubscription!
  @authenticated
  @requiresRole(roles: [SUPER_ADMIN])

approvePilot(tenantId: ID!, seatLimit: Int): TenantSubscription!
  @authenticated
  @requiresRole(roles: [SUPER_ADMIN])

rejectPilot(tenantId: ID!, reason: String!): Boolean!
  @authenticated
  @requiresRole(roles: [SUPER_ADMIN])
```

**Verification test:** `tests/security/b2b-billing-security.spec.ts` → "admin: @requiresRole on billing mutations"

---

### SC-06: Fix YAU RLS Policy to Prevent NULL Bypass (addresses T-06)

**Location:** `packages/db/src/schema/billing.ts` — `yauEvents` table policy

The current `yau_events_admin_read` policy with OR allows admin role to bypass tenant isolation entirely. The correct pattern is to use a SEPARATE policy for SUPER_ADMIN rather than OR-ing into the tenant policy:

```typescript
// WRONG — admin OR can bypass tenant isolation:
pgPolicy('yau_events_admin_read', {
  using: sql`
    user_id::text = current_setting('app.current_user_id', TRUE)
    OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
  `,
}),

// CORRECT — split into two policies:
pgPolicy('yau_events_user_self_read', {
  for: 'select',
  using: sql`
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND user_id::text = current_setting('app.current_user_id', TRUE)
  `,
}),
pgPolicy('yau_events_super_admin_read', {
  for: 'select',
  using: sql`current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN'`,
}),
pgPolicy('yau_events_org_admin_tenant_read', {
  for: 'select',
  using: sql`
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND current_setting('app.current_user_role', TRUE) = 'ORG_ADMIN'
  `,
}),
```

**Verification test:** `tests/security/b2b-billing-security.spec.ts` → "YAU: cross-tenant RLS"

---

### SC-07: Generic Response on `requestPilot` to Prevent Email Enumeration (addresses T-12)

**Location:** `apps/subgraph-core/src/subscription/subscription.service.ts`

Always return `{ status: "PENDING_APPROVAL", message: "Your request has been received. We will contact you within 24 hours.", requestId: <uuid> }` regardless of whether:
- The email is already in `pilot_requests`
- The email is already a registered user
- The org name already exists

Log the duplicate at `info` level server-side, but never expose this to the caller.

---

### SC-08: Audit Logging for All Admin Billing Actions (addresses T-09)

**Location:** `apps/subgraph-core/src/subscription/subscription.service.ts`

```typescript
this.logger.info({
  event: 'pilot.approved',
  tenantId,
  approvedByUserId,
  seatLimit,
  pilotEndsAt,
  timestamp: new Date().toISOString(),
}, 'Pilot approved by SUPER_ADMIN');
```

All three admin actions must emit structured Pino logs AND a NATS event:
- `pilot.approved` → `billing.pilot.approved`
- `pilot.rejected` → `billing.pilot.rejected`
- `tenant.plan.changed` → `billing.plan.changed`

---

## 6. Existing Codebase Audit Findings

### 6.1 `billing.ts` Schema — Issues Found

**Issue 1 (T-06):** `yau_events_admin_read` policy ORs user-level and admin-level checks, allowing admin role to bypass tenant isolation.
```
packages/db/src/schema/billing.ts:145-151
```
**Severity:** CRITICAL

**Issue 2:** `pilot_requests` table has no RLS. This is intentional (public submissions), but the schema comment should explicitly document why: "Admin reads via SUPER_ADMIN role check in resolver; no RLS because submissions are pre-authentication."
```
packages/db/src/schema/billing.ts:157-193
```
**Severity:** LOW (by design — needs documentation)

**Issue 3:** `tenant_subscriptions_admin_write` policy uses OR — same bypass risk as Issue 1:
```sql
tenant_id::text = current_setting('app.current_tenant', TRUE)
OR current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN'
```
This means a SUPER_ADMIN in a compromised session can write to ANY tenant's subscription.
```
packages/db/src/schema/billing.ts:99-104
```
**Severity:** HIGH — intentional for SUPER_ADMIN, but must be gated behind strict JWT validation at gateway

**Issue 4:** `usage_snapshots_admin_read` policy allows ORG_ADMIN to read their own tenant's snapshot. But since `usage_snapshots` contains `yauCount` and `storageGb`, an ORG_ADMIN could monitor their billing trajectory. This is **by design** and acceptable.
**Severity:** LOW / acceptable

### 6.2 Existing Security Test Coverage Gaps

The following B2B billing surfaces have **zero existing test coverage** in `tests/security/`:

| Surface | Gap |
|---------|-----|
| `requestPilot` mutation rate limiting | Not tested |
| `requestPilot` XSS sanitization | Not tested |
| `myTenantUsage` IDOR (tenantId from args) | Not tested |
| `approvePilot` self-approval guard | Not tested |
| `setTenantPlan` @requiresRole enforcement | Not tested |
| YAU cross-tenant RLS bypass | Not tested |
| `platformUsageOverview` role guard | Not tested |
| `billing.ts` schema RLS correctness | Not tested |

All gaps are addressed by `tests/security/b2b-billing-security.spec.ts`.

---

## 7. Security Controls Summary Table

| Control | Addresses | File to Change | Test |
|---------|-----------|---------------|------|
| SC-01 Rate limit `requestPilot` (5/IP/hr) | T-02 | `gateway/src/middleware/rate-limit.ts` | b2b-billing-security.spec.ts |
| SC-02 Zod XSS sanitization on pilot fields | T-01 | `subgraph-core/src/subscription/*.ts` | b2b-billing-security.spec.ts |
| SC-03 tenantId from JWT ctx only | T-03 | `subgraph-core/src/subscription/subscription.resolver.ts` | b2b-billing-security.spec.ts |
| SC-04 Self-approval guard | T-04 | `subgraph-core/src/subscription/subscription.service.ts` | b2b-billing-security.spec.ts |
| SC-05 @requiresRole on admin mutations | T-05 | Subscription SDL in subgraph-core | b2b-billing-security.spec.ts |
| SC-06 Fix YAU RLS (separate policies) | T-06 | `packages/db/src/schema/billing.ts` | b2b-billing-security.spec.ts |
| SC-07 Generic response (no enum) | T-12 | `subgraph-core/src/subscription/subscription.service.ts` | b2b-billing-security.spec.ts |
| SC-08 Audit logging | T-09 | `subgraph-core/src/subscription/subscription.service.ts` | b2b-billing-security.spec.ts |

---

## 8. Compliance Mapping

| Security Invariant | Applies To | Status |
|-------------------|-----------|--------|
| SI-1 (RLS variable names) | `billing.ts` YAU policies | COMPLIANT — uses `app.current_user_id` |
| SI-2 (CORS fail-closed) | Gateway — pilot endpoint | COMPLIANT (gateway-level) |
| SI-3 (PII encryption) | `contactEmail`, `contactName` in pilot_requests | GAP — contact PII stored plaintext |
| SI-4 (Keycloak brute-force) | N/A — pilot endpoint pre-auth | N/A |
| SI-5 (SSL verification) | N/A — internal service | N/A |
| SI-6 (inter-service mTLS) | Subgraph-core subscription service | COMPLIANT (Linkerd) |
| SI-7 (NATS TLS) | `billing.*` NATS events | Requires verification on new service |
| SI-8 (DB pool) | Subscription service | Must use `getOrCreatePool()` |
| SI-9 (withTenantContext) | All subscription queries | REQUIRED — must wrap all billing queries |
| SI-10 (LLM consent) | Not applicable to billing | N/A |

**SI-3 Gap:** `pilot_requests.contact_email` and `pilot_requests.contact_name` are PII fields stored as plaintext `varchar`. Per SI-3, these must be encrypted at rest using `encryptField(value, tenantKey)`. However, since `pilot_requests` has no tenant isolation (pre-auth submission), the encryption key derivation must use a platform-level key rather than a per-tenant key.

---

## 9. Recommended Implementation Order

1. **Before any billing code goes to production:**
   - Fix SC-06 (YAU RLS) — critical data integrity
   - Implement SC-01 (rate limiting) — DoS protection on public endpoint
   - Implement SC-02 (XSS sanitization) — stored XSS is the highest-impact frontend attack
   - Implement SC-05 (@requiresRole) — authorization enforcement

2. **Before admin billing dashboard ships:**
   - Implement SC-03 (IDOR guard)
   - Implement SC-04 (self-approval)
   - Implement SC-08 (audit logging)

3. **Before pilot approval workflow goes live:**
   - Implement SC-07 (email enumeration prevention)
   - Address SI-3 gap for pilot PII fields

---

*Document generated by Security & Compliance Agent — Phase 50 B2B Threat Analysis*
*Related test file: `tests/security/b2b-billing-security.spec.ts`*
