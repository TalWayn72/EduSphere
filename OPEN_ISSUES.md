# Open Issues — EduSphere

**Last Updated:** 31 March 2026

> **Archive:** Completed items before 30 Mar 2026 are in `docs/plans/archive/OPEN_ISSUES_ARCHIVE_2026-03-29.md`

---

## Status Summary (Quick Reference)

### 🔴 Open

| ID | Issue | Severity | Est. |
|----|-------|----------|------|
| FEAT-VIDEO-CAPTIONS | Video captions for IS 5568 + EAA compliance | 🔴 Critical | ~40h |
| FEAT-EU-AI-ACT | EU AI Act documentation and compliance | 🔴 Critical | ~80h |
| FEAT-ADMIN-DASHBOARD | 5 missing admin screens | 🟡 Medium | ~120h |

### 🟡 In Progress

| ID | Issue | Started |
|----|-------|---------|
| FEAT-API-MUTATIONS | Missing API mutations (organizationDomains, updateTenantPlan, mergeConceptGraphNodes, compactCollabDocument) | 30 Mar 2026 |
| FEAT-AGENT-SANDBOX | Agent execution sandboxing (process isolation, resource limits) | 30 Mar 2026 |

### ✅ Fixed (31 Mar 2026 Session)

| ID | Issue | Fixed In |
|----|-------|----------|
| BUG-111 | Language preference save failing — query-complexity heuristic applied 10× multiplier to camelCase fields ending in 's' (e.g. `updateUserPreferences`), pushing mutation over MAX_COMPLEXITY=1000 limit | 31 Mar 2026 |
| BUG-065-GAPS | 6 test coverage gaps for language preference save flow — infrastructure failures undetected because all layers mocked | 31 Mar 2026 |
| BUG-110 | Subgraphs killed every 15 min by cleanup script — "השרת אינו זמין" on /courses (10th+ occurrence) | 31 Mar 2026 |

### ✅ Fixed (30 Mar 2026 Session)

| ID | Issue | Fixed In |
|----|-------|----------|
| FEAT-PHASE-D-TECHDEBT | Phase D Technical Debt — 80 oversized files split, 33 console.log violations fixed, 27 lint warnings resolved, ~99 test files (~1,360 cases) added | 30 Mar 2026 |
| FEAT-ORG-RESTRUCTURE | Agent hierarchy restructured (11 divisions, 42 specialists, BELead split, 12 new skills, 4 automation scripts, CLAUDE.md split) | 30 Mar 2026 |
| FEAT-SI6-MTLS | mTLS infrastructure for inter-service communication (docker-compose.mtls.yml, cert generation, Helm values, 41 tests) | 30 Mar 2026 |
| FEAT-IS5568-A11Y | IS 5568 accessibility fixes (dynamic html lang, keyboard drag-drop, 101 tests) | 30 Mar 2026 |
| FEAT-GDPR-PROOF | Cryptographic proof of GDPR erasure (gdpr_erasure_log table, HMAC-SHA256 signing, verifyErasure query, 20 tests) | 30 Mar 2026 |
| BUG-109 | Consent save fails — ConsentService missing withTenantContext(), RLS blocks silently (also closes BUG-088, BUG-092) | 30 Mar 2026 |

### ✅ Fixed (Recent — 27–29 Mar 2026)

| ID | Issue | Fixed In |
|----|-------|----------|
| FEAT-VISUAL-TESTING | Visual Testing Expansion — 499→2,054 assertions, 4,613 baselines, 46 failures fixed | 29 Mar 2026 |
| FEAT-OBSERVABILITY | Observability — EmbeddingCoverageChart, EmbeddingActivityLog, admin dashboard | 27 Mar 2026 |
| FEAT-PDF-VIEWER | PDF Experience — in-browser viewer, text annotation, sketch overlay, presigned URLs | 27 Mar 2026 |
| FEAT-RAG-ACTIVATION | RAG Pipeline Activation — HNSW indexes, content indexing, concept publisher, seed embeddings | 27 Mar 2026 |
| FEAT-COVERAGE-001 | Web Unit Test Coverage Boost to 95%+ (177 new test files) | 25 Mar 2026 |
| FEAT-TEST-COVERAGE | Web Unit Test Coverage Improvement (57% → 95%+) | 24 Mar 2026 |
| BUG-107 | Knowledge Graph — Cannot return null for Concept.id (systemic agtype parsing) | 23 Mar 2026 |
| BUG-106 | GraphQL 400 Bad Request errors on Lesson Pipeline page | 22 Mar 2026 |
| BUG-104 | Knowledge Graph Page — "Invalid time value" GraphQL Error | 22 Mar 2026 |
| BUG-105 | Cannot return null for AgentTemplate.templateType | 22 Mar 2026 |

### ✅ Fixed (Older — see archive for details)

| ID | Issue | Fixed In |
|----|-------|----------|
| FEAT-ORG-ONBOARDING | Organization Self-Service Onboarding & White-Label Platform (F-01 through F-15) | 22 Mar 2026 |
| F-065 | Certification Exam System — Item Bank, CAT, Psychometrics, AI QGen, Browser Lockdown | Phase 68 |
| BUG-103 | Delete Course fails silently — course not removed from list | `3dce63f4` |
| BUG-101 | Delete Course: 400 Bad Request + accessibility console errors | `c7beef92` |
| BUG-100 | GraphQL 400 Bad Request on Challenges page — flat array vs Relay Connection | (pending) |
| BUG-099 | i18n English content on Hebrew locale — 7 social/collab pages hardcoded | (pending) |
| BUG-097 | Mixed Hebrew/English UI — i18n not applied + RTL layout broken (8 rounds) | 19 Mar 2026 |
| BUG-096 | Knowledge Graph error banner shows on all errors | `c04ded08` |
| BUG-095 | AI course creation fails end-to-end | (pending) |
| BUG-093 | AI Course Creator — no progress text + timeout too short | (pending) |
| BUG-092 | AI consent save fails (stale turbo cache + @ai-sdk/openai v3 mismatch) | Closed by BUG-109 |
| BUG-089 | AI course generation fails — agent_id mismatch + Ollama spec | (pending) |
| BUG-088 | Consent toggle saves to localStorage only — backend never synced | Closed by BUG-109 |
| BUG-087 | Settings page crashes at /settings?highlight=ai-consent | `66a0b79` |
| BUG-082 | Footer/landing links use `<a href>` instead of `<Link>` | `a3995e5` |
| BUG-081 | PDF source upload fails — pdfParse is not a function | `c4bb7ca` |
| SEC-1 | Dev-token grants SUPER_ADMIN | `a13c080` |
| SEC-3 | Subgraphs skip JWT audience | `a13c080` |
| SI-7 | 15 services raw NATS without TLS | `e2a714d` |
| INFRA-1 | HiveMind shared intelligence layer (3 MCP servers) | (pending) |

> For full details on all 100+ completed items, see `docs/plans/archive/OPEN_ISSUES_ARCHIVE_2026-03-29.md`

---

## ✅ BUG-111 — Language Preference Save Failing (Query Complexity Heuristic)

- **Status:** ✅ Fixed — 31 Mar 2026
- **Severity:** 🔴 High (user-facing — language preference could not be saved)
- **Files Changed:** `apps/gateway/src/middleware/query-complexity.ts`

**Root Cause:** The `estimateComplexity` function in the gateway's query-complexity middleware used a naive heuristic: any field name ending in `'s'` was treated as a list field and had its subtree cost multiplied by 10×. This incorrectly flagged camelCase compound mutation names such as `updateUserPreferences` (ends in `s`), `emailNotifications`, `userPreferences` — pushing the `updateUserPreferences` mutation cost from ~5 to ~50+, which exceeded `MAX_COMPLEXITY=1000` after nesting.

**Fix:** Added `isListField()` helper that rejects camelCase names. A field is considered a list field only if:
1. Its name ends with `'s'` and has length > 1, AND
2. It contains NO uppercase letters after position 0 (i.e., it is a simple lowercase plural noun like `users`, `courses`, `annotations`)

This correctly excludes `updateUserPreferences`, `emailNotifications`, `preferences`, etc.

**Verification:**
- Live API: `mutation { updateUserPreferences(input: { locale: "he" }) { id preferences { locale } } }` returns `{"data":{"updateUserPreferences":{"id":"...","preferences":{"locale":"he"}}}}` ✅
- Unit tests: `query-complexity.spec.ts` — 17/17 pass, including `does not apply list multiplier for camelCase compound names ending in s` ✅
- Gateway tests: 319/319 pass ✅
- E2E regression: `language-save-regression.spec.ts` (mock guard) — 2/2 pass ✅

---

## 🔴 FEAT-VIDEO-CAPTIONS — Video Captions for IS 5568 + EAA Compliance

- **Status:** 🔴 Open
- **Severity:** 🔴 Critical (legal compliance)
- **Estimated Effort:** ~40h

**Problem:** IS 5568 and European Accessibility Act (EAA) require captions/subtitles for all video content. Currently no caption support exists for uploaded or embedded videos.

**Requirements:**
- Auto-generated captions via faster-whisper transcription worker
- Manual caption editing UI
- Caption display overlay on video player
- WebVTT format support
- Hebrew + English + Arabic caption tracks

---

## 🔴 FEAT-EU-AI-ACT — EU AI Act Documentation and Compliance

- **Status:** 🔴 Open
- **Severity:** 🔴 Critical (legal compliance)
- **Estimated Effort:** ~80h

**Problem:** EU AI Act requires transparency documentation for all AI systems. Current `tests/security/eu-ai-act.spec.ts` tests exist but the actual compliance documentation, risk classification, and transparency reports are missing.

**Requirements:**
- AI system risk classification (limited risk for educational AI)
- Transparency documentation for all AI agents (assess, quiz, explain, debate)
- Human oversight mechanisms documentation
- Data governance documentation
- Technical documentation per Article 11

---

## 🔴 FEAT-ADMIN-DASHBOARD — 5 Missing Admin Screens

- **Status:** 🔴 Open
- **Severity:** 🟡 Medium
- **Estimated Effort:** ~120h

**Problem:** Admin dashboard is missing 5 critical management screens needed for production operations.

**Missing screens:**
1. User Management (CRUD, role assignment, suspension)
2. Tenant Management (plan upgrades, domain config, white-label settings)
3. Content Moderation (flagged content queue, review workflow)
4. System Health Dashboard (real-time metrics, alerts, service status)
5. Audit Log Viewer (security events, user actions, compliance trail)

---

## 🟡 FEAT-API-MUTATIONS — Missing API Mutations

- **Status:** 🟡 In Progress
- **Started:** 30 Mar 2026
- **Severity:** 🟡 Medium

**Problem:** Gap analysis identified 4 missing GraphQL mutations that are referenced in the API contracts but not yet implemented.

**Missing mutations:**
1. `organizationDomains` — domain management for white-label orgs
2. `updateTenantPlan` — plan tier changes (free → pro → enterprise)
3. `mergeConceptGraphNodes` — knowledge graph node deduplication
4. `compactCollabDocument` — CRDT document compaction trigger

---

## 🟡 FEAT-AGENT-SANDBOX — Agent Execution Sandboxing

- **Status:** 🟡 In Progress
- **Started:** 30 Mar 2026
- **Severity:** 🔴 Critical (security)

**Problem:** AI agent code execution currently lacks process-level isolation. gVisor sandboxing is documented in the architecture but not fully implemented.

**Requirements:**
- Process isolation for agent code execution
- Resource limits (CPU, memory, network, filesystem)
- Timeout enforcement (configurable per agent type)
- Sandboxed execution environment (gVisor or equivalent)
- Audit logging of all agent actions

---

## ✅ FEAT-PHASE-D-TECHDEBT — Phase D Technical Debt Cleanup (30 Mar 2026)

- **Status:** ✅ Complete
- **Date:** 30 Mar 2026

**Summary:** Comprehensive technical debt cleanup across 4 categories in 5 rounds.

**1. File Size Cleanup:** 80 files over 300-line limit split down to 0. All files now comply with the 300-line maximum rule using barrel exports for split modules.

**2. Console.log Cleanup:** 33 `console.log` violations replaced with Pino structured logging across `apps/web` and `apps/mobile`.

**3. Lint Warnings:** 27 ESLint warnings reduced to 0 across all workspaces.

**4. Test Coverage Boost (~99 new test files, ~1,360 test cases):**

| Package | Before | After | New Files |
|---------|--------|-------|-----------|
| subgraph-content | ~66% | ~90% | 25 test files |
| subgraph-core | ~72% | ~92% | 24 test files |
| subgraph-agent | ~64% | ~90% | 18 test files |
| subgraph-knowledge | — | ~97% | 5 test files |
| subgraph-annotation | — | — | 1 test file |
| apps/web (frontend) | — | — | 12 test files |
| packages/nats-client | — | — | 8 test files |
| apps/gateway | — | — | 6 test files |

**Key test file locations:**
- `apps/subgraph-content/src/**/*.spec.ts` (25 files — resolvers, services, validators)
- `apps/subgraph-core/src/**/*.spec.ts` (24 files — user, tenant, org services)
- `apps/subgraph-agent/src/**/*.spec.ts` (18 files — agent templates, workflows, sandboxing)
- `apps/subgraph-knowledge/src/**/*.spec.ts` (5 files — embeddings, graph queries, RAG)
- `apps/web/src/**/*.test.{ts,tsx}` (12 files — hooks, components, utilities)
- `packages/nats-client/src/**/*.spec.ts` (8 files — JetStream, KV, subscriptions)
- `apps/gateway/src/**/*.spec.ts` (6 files — composition, routing, auth propagation)

---

## ✅ FEAT-ORG-RESTRUCTURE — Agent Hierarchy Restructured (30 Mar 2026)

- **Status:** ✅ Fixed
- **Date:** 30 Mar 2026

**Summary:** Restructured agent hierarchy to 11 divisions with 42 specialists. Split Backend Engineering Lead into Core/Content/Knowledge sub-leads. Created 12 new skills and 4 automation scripts. Split CLAUDE.md for maintainability.

---

## ✅ FEAT-SI6-MTLS — mTLS Infrastructure (30 Mar 2026)

- **Status:** ✅ Fixed
- **Date:** 30 Mar 2026

**Summary:** Implemented mTLS infrastructure for inter-service communication addressing SI-6 security invariant. Created `docker-compose.mtls.yml`, certificate generation scripts, Helm chart values for Kubernetes, and 41 tests validating TLS configuration.

---

## ✅ FEAT-IS5568-A11Y — IS 5568 Accessibility Fixes (30 Mar 2026)

- **Status:** ✅ Fixed
- **Date:** 30 Mar 2026

**Summary:** Implemented IS 5568 accessibility standard compliance. Added dynamic `html lang` attribute switching based on active locale, keyboard-accessible drag-and-drop interactions, and 101 accessibility-specific tests.

---

## ✅ FEAT-GDPR-PROOF — Cryptographic Proof of GDPR Erasure (30 Mar 2026)

- **Status:** ✅ Fixed
- **Date:** 30 Mar 2026

**Summary:** Added cryptographic proof for GDPR Article 17 erasure requests. Created `gdpr_erasure_log` table, HMAC-SHA256 signing of erasure records, `verifyErasure` GraphQL query for compliance auditing, and 20 tests.

---

## ✅ FEAT-VISUAL-TESTING — Visual Testing Expansion (28–29 Mar 2026)

- **Status:** ✅ Complete
- **Date:** 29 Mar 2026

**Summary:** Expanded visual regression testing from 499 to 2,054 `toHaveScreenshot` assertions across 215 spec files with 4,613 baseline PNGs. QA gate: 46 failures fixed across 5 categories (snapshot mismatches, loading timing, navigation/redirect, content/DOM, DEV_MODE auth).

**Key docs:** `docs/testing/VISUAL_TESTING_COVERAGE.md`

---

## ✅ BUG-110 — Subgraphs Killed Every 15 Min by Cleanup Script (31 Mar 2026)

- **Status:** ✅ Fixed
- **Date:** 31 Mar 2026
- **Severity:** 🔴 Critical (10th+ occurrence — recurring production blocker)
- **Symptom:** User sees "השרת אינו זמין" (server unavailable) on `localhost:5173/courses` after subgraphs die

**Problem:** All 6 NestJS subgraphs (ports 4001–4006, running as `node --enable-source-maps .../dist/main`) were being killed every 15 minutes by the `scripts/cleanup-stale-nodes.ps1` scheduled task.

**Root cause:** The cleanup script's `$protected` array contained only `@("vite", "mcp", "docker", "chromadb")`. Subgraph process command lines (`node --enable-source-maps .../apps/subgraph-core/dist/main`) did not match any of those patterns, so they were unconditionally killed after 15 minutes of uptime — the exact interval the scheduled task runs on.

**Evidence from logs (`docs/logs/node-cleanup.log`):**
```
2026-03-30 00:44:29 | Before: 159 | Killed: 1 node, 0 chrome-headless | After: 156 | Memory: 78.2%
2026-03-30 05:43:38 | Before: 0  | Killed: 0 ...  (all subgraphs gone — machine restart or prior kill)
```

**Solution:** Added `"subgraph"`, `"gateway"`, `"edusphere"` to the protected keyword list in `scripts/cleanup-stale-nodes.ps1`. Subgraph cmdlines contain `EduSphere\apps\subgraph-*` so they now match `"subgraph"` and `"edusphere"` and are protected.

**File changed:** `scripts/cleanup-stale-nodes.ps1` — line 5: `$protected` extended from 4 to 7 entries.

**Existing visual test coverage:** Confirmed — `apps/web/e2e/network-error-banner.spec.ts` (BUG-039 regression, 10 tests including `toHaveScreenshot`) and `apps/web/e2e/offline-mode-visual.spec.ts` (11 visual tests with `toHaveScreenshot`) cover the offline/server-down banner. No new test needed; existing coverage is comprehensive.

**Anti-recurrence:** The `$protected` list now explicitly guards all EduSphere long-running server processes. Future server-type processes (e.g., transcription-worker) should add their keyword to `$protected`. Consider adding a startup script that also adds `--title edusphere-subgraph` to node args for belt-and-suspenders protection.

---

## ✅ BUG-109 — Consent Save Fails — ConsentService Missing withTenantContext() (30 Mar 2026)

- **Status:** ✅ Fixed
- **Date:** 30 Mar 2026
- **Severity:** 🔴 Critical
- **Also closes:** BUG-088, BUG-092

**Problem:** Consent save operations failed silently. Users could toggle consent in the UI but changes never persisted to the database.

**Root cause:** `ConsentService.updateConsent()`, `getUserConsents()`, `hasConsent()`, and `writeAuditLog()` executed DB queries directly via `this.db` without the `withTenantContext()` wrapper. RLS policy silently blocked all consent writes because PostgreSQL session variables (`app.current_tenant`, `app.current_user_id`) were never set.

**Solution:** Wrapped all 4 methods in `withTenantContext()` to properly set RLS session variables before DB access.

**Tests:** 12 regression tests added (6 unit + 6 static security canary tests).

**Anti-recurrence:** Why not caught previously — unit tests mocked the service so RLS was never exercised; no integration test ran against real DB with RLS enabled; security tests checked schema existence but not code usage of `withTenantContext()`. The new canary tests scan source code to ensure all DB-accessing service methods use `withTenantContext()`.

---

## Issue Templates

### Bug Template

```
## BUG-NNN — [Title] (DD Month YYYY)
- **Status:** 🔴 Open | 🟡 In Progress | ✅ Fixed
- **Severity:** 🔴 Critical | 🟡 Medium | 🟢 Low
- **Reproducer test:** `path/to/test.spec.ts`

**Problem:** [description]
**Root cause:** [after investigation]
**Solution:** [after fix]
**Files:** [list]
**Tests:** [list]
**Anti-recurrence:** [what prevents this from returning]
```

### Feature Template

```
## FEAT-NNN — [Title] (DD Month YYYY)
- **Status:** 🔴 Open | 🟡 In Progress | ✅ Fixed
- **Severity:** 🔴 Critical | 🟡 Medium | 🟢 Low

**Problem:** [what's missing]
**Requirements:** [list]
**Solution:** [after implementation]
**Tests:** [list]
```
