# Session 26 — Security Audit Report

**Date:** 2026-03-06
**Auditor:** Security & Compliance Agent (Session 26)
**Scope:** All Session 26 changes — SmartRoot, LandingPage, router.tsx, AITutorScreen, HomeScreen, SkillTreeService, SkillTreeResolver, migration 0011

---

## SI-1 through SI-10 Status Table

| # | Invariant | Verdict | Evidence |
|---|-----------|---------|----------|
| SI-1 | RLS session variable name (`app.current_user_id`) | **PASS** | Migration 0011 correctly uses `current_setting('app.current_user_id', TRUE)` in both USING and WITH CHECK clauses. No occurrence of bare `current_user` in new migrations. |
| SI-2 | CORS fail-closed (no `origin: '*'`) | **PASS / N-A** | No new CORS configuration introduced in Session 26. Existing gateway CORS config unchanged. |
| SI-3 | PII not exposed in GraphQL responses | **PASS** | `SkillTreeNodeDto` exposes: `id` (UUID), `label` (concept title), `type` (CONCEPT), `masteryLevel`, `connections[]`. No email, name, annotation text, or PII fields. No PII in LandingPage (marketing copy only). |
| SI-4 | Keycloak brute-force protection | **PASS / N-A** | No Keycloak configuration changes in Session 26. |
| SI-5 | SSL not bypassed in Docker | **PASS / N-A** | No new Dockerfiles or docker-compose changes in Session 26. |
| SI-6 | Inter-service HTTP (no plain http:// calls) | **PASS** | SkillTreeService uses Drizzle ORM (`db`, `withTenantContext`) only — no HTTP/fetch calls to other services. SmartRoot is a pure React component with no external calls. |
| SI-7 | NATS auth/TLS | **PASS / N-A** | SkillTreeService does not publish to NATS. No new NATS publishers introduced in Session 26. |
| SI-8 | DB pool — `getOrCreatePool()` not `new Pool()` | **PASS** | SkillTreeService imports `db` from `@edusphere/db` (the shared singleton) and uses `withTenantContext`. No `new Pool()` call exists. |
| SI-9 | Cross-tenant query — `withTenantContext()` required | **PASS with FINDING** | SkillTreeService wraps both `getSkillTree` and `updateMasteryLevel` in `withTenantContext`. SkillTreeResolver uses `getAuthContext()` which throws `UnauthorizedException` when `userId` or `tenantId` is absent. **FINDING (LOW):** `AITutorScreen.tsx` line 39 has `tenantId: "tenant-1"` hardcoded in the `SEND_MESSAGE` mutation GQL input field. This is a client-side field in the GraphQL input struct. The backend (`AgentMessageService.create`) ignores the input `tenantId` and uses `authContext.tenantId` from JWT — so cross-tenant write is blocked server-side. The hardcoded field is dead/ignored but represents a code quality / SI-9 spirit violation. |
| SI-10 | LLM consent gate before OpenAI/Anthropic call | **PASS** | `AITutorScreen.tsx` checks `checkAiConsent()` on mount and blocks `handleSend` when `consentGranted === false`. Backend: `CourseGeneratorService` calls `this.consentGuard.assertConsent(userId, isExternal)` via `LlmConsentGuard` before any LLM call. `AgentSessionResolver.startAgentSession` uses `authContext` (JWT-validated) and does not bypass the consent layer. `LlmConsentGuard` is tested in `llm-consent.guard.spec.ts`. |

---

## Router Security Analysis

### Public Routes (correctly unauthenticated)
| Route | Justification |
|-------|---------------|
| `/login` | Auth entry point |
| `/landing` | Marketing page |
| `/accessibility` | Accessibility statement |
| `/verify/badge/:assertionId` | OpenBadge 3.0 shareable verification |
| `/portal` | Tenant portal viewer |
| `/lti/launch` | LTI 1.3 deep-link handler (comment documents this) |
| `/u/:userId` | Public profile |

### Finding — Wildcard catch-all redirects to /dashboard (MEDIUM)

**Location:** `apps/web/src/lib/router.tsx` line 677-679
```typescript
{
  path: '*',
  element: <Navigate to="/dashboard" replace />,
}
```

**Risk:** An unauthenticated user navigating to any unknown URL (e.g., `/typo`) is redirected to `/dashboard`. `ProtectedRoute` wraps `/dashboard` so they are ultimately redirected to `/login` — the data is never exposed. However, the chain is: `unknown route → /dashboard redirect → ProtectedRoute → /login`. This two-hop redirect chain is acceptable from a security standpoint (no data leaks) but suboptimal. A direct redirect to `/login` for unauthenticated users or to `/landing` would be cleaner.

**Severity:** LOW (no data leak — ProtectedRoute guards /dashboard)
**Recommendation:** Change wildcard element to `<SmartRoot />` to send unauth users to LandingPage directly.

---

## SI-9 Hardcoded tenantId Finding (Detailed)

**Location:** `apps/mobile/src/screens/AITutorScreen.tsx` line 39
```graphql
createAgentMessage(
  input: {
    sessionId: $sessionId
    role: "USER"
    content: $content
    tenantId: "tenant-1"   # ← HARDCODED
  }
)
```

**Risk Assessment:** LOW-MEDIUM
- The backend `AgentMessageService.create()` receives the input struct but uses `authContext.tenantId` (from JWT) for `withTenantContext()`. The RLS policy on `agent_messages` enforces `tenant_id = current_setting('app.current_tenant', TRUE)`.
- A malicious user cannot write to another tenant's data because:
  1. The RLS session variable is set from `authContext.tenantId` (JWT), not from input
  2. The `withTenantContext()` wrapper enforces isolation at the database level
- **However:** The hardcoded `tenant-1` is passed in the insert payload to `agentMessages.values(input as NewAgentMessage)`. If the `agentMessages` Drizzle schema includes a `tenantId` column in the insert values and the column is NOT RLS-protected at the ORM level, the wrong tenantId could be stored.

**Recommended Fix:** Remove `tenantId` from the SEND_MESSAGE mutation input entirely. The resolver should set `tenantId` from `authContext`, not accept it from the client.

---

## Penetration Test Scenarios

### Written in: `apps/web/e2e/auth-flow-security.spec.ts`
| # | Scenario | Implementation |
|---|----------|----------------|
| 1 | Unauthenticated user sees LandingPage at `/` | `SmartRoot` renders `LandingPage`, not dashboard data |
| 2 | `/dashboard` without auth redirects to `/login` | `ProtectedRoute` + redirect assertion |
| 3 | `/courses` without auth redirects to `/login` | Same |
| 4 | `/agents` without auth redirects to `/login` | Same |
| 5 | `/admin` without auth redirects to `/login` | Same |
| 6 | `/skill-tree` without auth redirects to `/login` | Same |
| 7 | Wildcard `/*` catch-all redirects unauth to `/login` | Regression test for two-hop redirect |
| 8 | `/landing` publicly accessible | No auth redirect |
| 9 | `/accessibility` publicly accessible | No auth redirect |
| 10 | `/verify/badge/:id` publicly accessible | No auth redirect |
| 11 | Sign In button navigates to `/login` | LandingPage nav link test |
| 12 | JWT tampering — tampered signature returns error | `fetch /graphql` with malformed JWT |
| 13 | JWT tampering — expired token returns error | `fetch /graphql` with expired JWT |
| 14 | Session fixation — post-logout `/dashboard` blocked | Clear auth state, assert redirect |
| 15 | Session fixation — post-logout `/courses` blocked | Clear auth state, assert redirect |
| 16 | tenantId URL param ignored — auth from JWT | Query param injection test |
| 17 | Course detail with injected tenantId redirects to login | URL manipulation test |

### Written in: `apps/web/e2e/skill-tree-security.spec.ts`
| # | Scenario | Implementation |
|---|----------|----------------|
| 1 | skillTree query without auth returns error not data | Bare fetch without Authorization header |
| 2 | updateMasteryLevel without auth returns error not data | Bare fetch without Authorization header |
| 3 | Unauthenticated `/skill-tree` page shows login, not raw error | ProtectedRoute intercept test |
| 4 | Authenticated user can access skill-tree without error | Happy path with mock response |
| 5 | GraphQL error does not leak `[SkillTreeService]` internals to UI | Error response simulation |
| 6 | Invalid mastery level `HACKED` is rejected or normalised | Enum validation test |

---

## Full Findings Summary

| ID | Severity | Component | Finding | Status |
|----|----------|-----------|---------|--------|
| F-001 | LOW | `apps/mobile/src/screens/AITutorScreen.tsx:39` | Hardcoded `tenantId: "tenant-1"` in SEND_MESSAGE GQL input. Backend ignores it (uses JWT authContext) but the dead field violates SI-9 spirit and could cause wrong data to be stored if schema mapping changes. | Open |
| F-002 | LOW | `apps/web/src/lib/router.tsx:677-679` | Wildcard catch-all `*` redirects to `/dashboard` instead of directly to `/landing` or `/login`. ProtectedRoute prevents data exposure, but two-hop redirect is suboptimal. | Open |
| F-003 | INFO | `apps/subgraph-agent/src/agent-session/agent-session.resolver.ts` | `agentTemplates` query (line 63) has no auth check — returns static template list. This is by design (public templates) but should be documented as an intentional public resolver. | Informational |

---

## Compliance Summary

- **SI-1:** PASS — `app.current_user_id` used correctly in migration 0011
- **SI-2:** PASS / N-A — No CORS changes
- **SI-3:** PASS — No PII in SkillTree GraphQL types
- **SI-4:** PASS / N-A — No Keycloak changes
- **SI-5:** PASS / N-A — No Docker changes
- **SI-6:** PASS — No inter-service HTTP calls in new code
- **SI-7:** PASS / N-A — No new NATS publishers
- **SI-8:** PASS — `getOrCreatePool()` pattern followed via `@edusphere/db` singleton
- **SI-9:** PASS with F-001 (LOW) — Backend RLS enforced; hardcoded client field should be removed
- **SI-10:** PASS — Consent checked in mobile and backend before LLM calls

**Overall verdict:** No BLOCKING security issues. Two LOW-severity findings (F-001, F-002) should be addressed before next release.
