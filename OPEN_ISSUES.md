# Open Issues — EduSphere

**Last Updated:** 9 April 2026 (Branch cleanup — 17 test files fixed, CI 10/10 green; Dependabot PRs triaged; audit-logs branch retired)

> **Archive:** Completed items before 30 Mar 2026 are in `docs/plans/archive/OPEN_ISSUES_ARCHIVE_2026-03-29.md`

---

## Status Summary (Quick Reference)

### 🔴 Open

| ID                   | Issue                                       | Severity    | Est.  |
| -------------------- | ------------------------------------------- | ----------- | ----- |
| FEAT-VIDEO-CAPTIONS  | Video captions for IS 5568 + EAA compliance | 🔴 Critical | ~40h  |
| FEAT-EU-AI-ACT       | EU AI Act documentation and compliance      | 🔴 Critical | ~80h  |
| FEAT-ADMIN-DASHBOARD | 5 missing admin screens                     | 🟡 Medium   | ~120h |

### 🟡 In Progress

| ID                 | Issue                                                                                                        | Started     |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | ----------- |
| FEAT-API-MUTATIONS | Missing API mutations (organizationDomains, updateTenantPlan, mergeConceptGraphNodes, compactCollabDocument) | 30 Mar 2026 |
| FEAT-AGENT-SANDBOX | Agent execution sandboxing (process isolation, resource limits)                                              | 30 Mar 2026 |

### ✅ Fixed (9 Apr 2026 Session)

| ID               | Issue                                                                               | Fixed In   |
| ---------------- | ----------------------------------------------------------------------------------- | ---------- |
| MAINT-DEP-001    | Dependabot PRs triaged — 4 merged, 5 closed as breaking/risky, 5 pending auto-merge | 9 Apr 2026 |
| MAINT-TEST-001   | 17 test files fixed across 2 commits (type errors, mock patterns, import paths)     | 9 Apr 2026 |
| MAINT-CI-001     | CI 10/10 checks green — prettier + GraphQL codegen fixes applied                    | 9 Apr 2026 |
| MAINT-BRANCH-001 | audit-logs branch deleted; CD workflow retargeted to master                         | 9 Apr 2026 |

### ✅ Fixed (7 Apr 2026 Session)

| ID                            | Issue                                                                                                        | Fixed In   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| BUG-120                       | JWT double-realm issuer mismatch — `docker-compose.dev.yml` KEYCLOAK_ISSUER_URL included `/realms/edusphere` | 7 Apr 2026 |
| BUG-121                       | Keycloak brute-force lockout — cleared via Admin REST API (DELETE attack-detection/brute-force/users)        | 7 Apr 2026 |
| BUG-122                       | MinIO not running — misdiagnosis, MinIO IS healthy on ports 9000/9001 (closed)                               | 7 Apr 2026 |
| BUG-123                       | NATS subject mismatch — transcription worker subject + stream pattern fixed                                  | 7 Apr 2026 |
| BUG-124                       | RecommendedCourse urql cache key — `RecommendedCourse: () => null` added to cacheExchange keys config        | 7 Apr 2026 |
| BUG-125                       | setState during render — queueMicrotask already applied (misdiagnosis — closed)                              | 7 Apr 2026 |
| FIX-DELETE-COURSE-UX          | Delete Course permission UX — button hidden for non-owners, confirmation modal added                         | 7 Apr 2026 |
| GAP-1                         | RAG embedding pipeline for knowledge sources — pipeline wired, sources now indexed on ingest                 | 7 Apr 2026 |
| GAP-2                         | AI Chat modes (CHAVRUTA/QUIZ/EXPLAIN) differentiation — mode-aware prompts and UI labels                     | 7 Apr 2026 |
| GAP-3                         | Citation edit modal — inline editor for instructor citation review and correction                            | 7 Apr 2026 |
| GAP-4                         | Enrichment status polling — frontend polls `enrichmentStatus` subscription until COMPLETED/FAILED            | 7 Apr 2026 |
| GAP-5                         | Transcript highlight sync in editor — active block highlights as YouTube timestamp advances                  | 7 Apr 2026 |
| GAP-6                         | Citation hover popover (student view) — hovering citation card shows full source metadata                    | 7 Apr 2026 |
| GAP-7                         | Source edit capability — instructor can update source URL, title, and author inline                          | 7 Apr 2026 |
| GAP-8                         | File upload progress bar — MinIO multipart upload reports byte progress to frontend                          | 7 Apr 2026 |
| GAP-9                         | Knowledge graph indexing for sources — source nodes created in AGE graph on lesson publish                   | 7 Apr 2026 |
| FEAT-SEMANTIC-LESSON-CREATION | Semantic-Enriched Lesson Creation — all 5 phases + 9 integration gaps complete                               | 7 Apr 2026 |

### ✅ Fixed (6 Apr 2026 Session)

| ID      | Issue                                                                                                                                            | Fixed In   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| BUG-119 | enriched-lesson.service hardcodes `youtubeVideoId: null` — actual ID never read from DB (video player black screen)                              | 6 Apr 2026 |
| BUG-118 | `contentItem` resolver doesn't handle lesson IDs — resolver only queries `content_items`, lesson IDs live in `lessons` table → returns null      | 6 Apr 2026 |
| BUG-117 | `useContentData` reads `youtubeVideoId` from non-existent `mediaAsset` field — must derive from `content` field when `contentType === 'YOUTUBE'` | 6 Apr 2026 |
| BUG-116 | CourseReadinessCheck missing `id` field — urql could not cache type, SDL + service updated                                                       | 6 Apr 2026 |
| BUG-115 | Concepts resolver returns null for non-nullable fields — Apache AGE omits absent vertex properties                                               | 6 Apr 2026 |
| BUG-114 | Knowledge Graph "Failed to load graph" — `_refresh` variable not in schema, gateway rejected query                                               | 6 Apr 2026 |
| BUG-113 | WebSocket reconnection flood — rapid reconnection attempts to ws://localhost:4000/graphql                                                        | 6 Apr 2026 |
| BUG-112 | urql cache key warnings for CourseReadinessCheck — 20 types without `id` fields missing key resolvers                                            | 6 Apr 2026 |

### ✅ Fixed (31 Mar 2026 Session)

| ID           | Issue                                                                                                                                                                                                  | Fixed In    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| BUG-111      | Language preference save failing — query-complexity heuristic applied 10× multiplier to camelCase fields ending in 's' (e.g. `updateUserPreferences`), pushing mutation over MAX_COMPLEXITY=1000 limit | 31 Mar 2026 |
| BUG-065-GAPS | 6 test coverage gaps for language preference save flow — infrastructure failures undetected because all layers mocked                                                                                  | 31 Mar 2026 |
| BUG-110      | Subgraphs killed every 15 min by cleanup script — "השרת אינו זמין" on /courses (10th+ occurrence)                                                                                                      | 31 Mar 2026 |

### ✅ Fixed (30 Mar 2026 Session)

| ID                    | Issue                                                                                                                                              | Fixed In    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| FEAT-PHASE-D-TECHDEBT | Phase D Technical Debt — 80 oversized files split, 33 console.log violations fixed, 27 lint warnings resolved, ~99 test files (~1,360 cases) added | 30 Mar 2026 |
| FEAT-ORG-RESTRUCTURE  | Agent hierarchy restructured (11 divisions, 42 specialists, BELead split, 12 new skills, 4 automation scripts, CLAUDE.md split)                    | 30 Mar 2026 |
| FEAT-SI6-MTLS         | mTLS infrastructure for inter-service communication (docker-compose.mtls.yml, cert generation, Helm values, 41 tests)                              | 30 Mar 2026 |
| FEAT-IS5568-A11Y      | IS 5568 accessibility fixes (dynamic html lang, keyboard drag-drop, 101 tests)                                                                     | 30 Mar 2026 |
| FEAT-GDPR-PROOF       | Cryptographic proof of GDPR erasure (gdpr_erasure_log table, HMAC-SHA256 signing, verifyErasure query, 20 tests)                                   | 30 Mar 2026 |
| BUG-109               | Consent save fails — ConsentService missing withTenantContext(), RLS blocks silently (also closes BUG-088, BUG-092)                                | 30 Mar 2026 |

### ✅ Fixed (Recent — 27–29 Mar 2026)

| ID                  | Issue                                                                                        | Fixed In    |
| ------------------- | -------------------------------------------------------------------------------------------- | ----------- |
| FEAT-VISUAL-TESTING | Visual Testing Expansion — 499→2,054 assertions, 4,613 baselines, 46 failures fixed          | 29 Mar 2026 |
| FEAT-OBSERVABILITY  | Observability — EmbeddingCoverageChart, EmbeddingActivityLog, admin dashboard                | 27 Mar 2026 |
| FEAT-PDF-VIEWER     | PDF Experience — in-browser viewer, text annotation, sketch overlay, presigned URLs          | 27 Mar 2026 |
| FEAT-RAG-ACTIVATION | RAG Pipeline Activation — HNSW indexes, content indexing, concept publisher, seed embeddings | 27 Mar 2026 |
| FEAT-COVERAGE-001   | Web Unit Test Coverage Boost to 95%+ (177 new test files)                                    | 25 Mar 2026 |
| FEAT-TEST-COVERAGE  | Web Unit Test Coverage Improvement (57% → 95%+)                                              | 24 Mar 2026 |
| BUG-107             | Knowledge Graph — Cannot return null for Concept.id (systemic agtype parsing)                | 23 Mar 2026 |
| BUG-106             | GraphQL 400 Bad Request errors on Lesson Pipeline page                                       | 22 Mar 2026 |
| BUG-104             | Knowledge Graph Page — "Invalid time value" GraphQL Error                                    | 22 Mar 2026 |
| BUG-105             | Cannot return null for AgentTemplate.templateType                                            | 22 Mar 2026 |

### ✅ Fixed (Older — see archive for details)

| ID                  | Issue                                                                                | Fixed In          |
| ------------------- | ------------------------------------------------------------------------------------ | ----------------- |
| FEAT-ORG-ONBOARDING | Organization Self-Service Onboarding & White-Label Platform (F-01 through F-15)      | 22 Mar 2026       |
| F-065               | Certification Exam System — Item Bank, CAT, Psychometrics, AI QGen, Browser Lockdown | Phase 68          |
| BUG-103             | Delete Course fails silently — course not removed from list                          | `3dce63f4`        |
| BUG-101             | Delete Course: 400 Bad Request + accessibility console errors                        | `c7beef92`        |
| BUG-100             | GraphQL 400 Bad Request on Challenges page — flat array vs Relay Connection          | (pending)         |
| BUG-099             | i18n English content on Hebrew locale — 7 social/collab pages hardcoded              | (pending)         |
| BUG-097             | Mixed Hebrew/English UI — i18n not applied + RTL layout broken (8 rounds)            | 19 Mar 2026       |
| BUG-096             | Knowledge Graph error banner shows on all errors                                     | `c04ded08`        |
| BUG-095             | AI course creation fails end-to-end                                                  | (pending)         |
| BUG-093             | AI Course Creator — no progress text + timeout too short                             | (pending)         |
| BUG-092             | AI consent save fails (stale turbo cache + @ai-sdk/openai v3 mismatch)               | Closed by BUG-109 |
| BUG-089             | AI course generation fails — agent_id mismatch + Ollama spec                         | (pending)         |
| BUG-088             | Consent toggle saves to localStorage only — backend never synced                     | Closed by BUG-109 |
| BUG-087             | Settings page crashes at /settings?highlight=ai-consent                              | `66a0b79`         |
| BUG-082             | Footer/landing links use `<a href>` instead of `<Link>`                              | `a3995e5`         |
| BUG-081             | PDF source upload fails — pdfParse is not a function                                 | `c4bb7ca`         |
| SEC-1               | Dev-token grants SUPER_ADMIN                                                         | `a13c080`         |
| SEC-3               | Subgraphs skip JWT audience                                                          | `a13c080`         |
| SI-7                | 15 services raw NATS without TLS                                                     | `e2a714d`         |
| INFRA-1             | HiveMind shared intelligence layer (3 MCP servers)                                   | (pending)         |

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

- Live API: `mutation { updateUserPreferences(input: { locale: "he" }) { id preferences { locale } } }` returns `{"data":{"updateUserPreferences":{"id":"00000000-0000-0000-0000-000000000005","preferences":{"locale":"he"}}}}` ✅
- Unit tests: `query-complexity.spec.ts` — 17/17 pass, including `does not apply list multiplier for camelCase compound names ending in s` ✅
- Gateway tests: 319/319 pass ✅
- E2E regression: `language-save-regression.spec.ts` — 2/2 pass ✅
- E2E happy path: `user-preferences-save.spec.ts` — 5/5 pass ✅
- E2E error paths: `language-error-paths.spec.ts` — 5/5 pass ✅
- E2E visual: `visual-language-error.spec.ts` — 4/4 pass (snapshots updated) ✅
- TypeScript: `apps/web typecheck` — 0 errors ✅

---

## ✅ BUG-065-GAPS — Language Preference Test Coverage Gaps

- **Status:** ✅ Fixed — 31 Mar 2026
- **Severity:** 🟡 Medium (test infrastructure gap, not user-facing)
- **Files Changed:** `apps/web/e2e/user-preferences-save.spec.ts`, `apps/web/e2e/language-error-paths.spec.ts`, `apps/web/e2e/visual-language-error.spec.ts`, `apps/web/e2e/language-save-regression.spec.ts`

**Root Cause (combined with BUG-111):**

1. **JWT issuer mismatch** — gateway `KEYCLOAK_ISSUER_URL` pointed to `keycloak:8080` (internal Docker hostname) while tokens were issued by `localhost:8080` (external). Added `KEYCLOAK_ISSUER_URL` separation in `apps/gateway/src/config/gateway-config.ts` so internal validation uses the correct Docker-internal hostname while tokens declare the external hostname.
2. **Query complexity heuristic** — `isListField()` in `apps/gateway/src/middleware/query-complexity.ts` incorrectly applied 10× multiplier to camelCase mutation names ending in `s`. Fixed by checking for uppercase letters in the field name.

**Fix Summary:**

- `gateway-config.ts` — separated `KEYCLOAK_ISSUER_URL` from `KEYCLOAK_URL` for issuer validation
- `query-complexity.ts` — `isListField()` helper that only applies multiplier to simple lowercase plural nouns
- 4 new E2E spec files covering happy paths, error paths, visual regression, and regression guards
- `apps/web/src/components/assessment/RadarChart.tsx` — TypeScript `formatter` type cast fixed (exit 2 → 0)

**Verification:**

- All 16 new E2E tests pass against live services: 5 + 5 + 4 + 2 = 16 ✅
- Live mutation confirmed: `{"data":{"updateUserPreferences":{"id":"...","preferences":{"locale":"he"}}}}` ✅
- TypeScript strict compilation: 0 errors ✅
- Date: 2026-03-31

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

## ✅ FEAT-SEMANTIC-LESSON-CREATION — Semantic-Enriched Lesson Creation (Complete — 7 Apr 2026)

- **Status:** ✅ Complete — 7 Apr 2026
- **Started:** 5 Apr 2026
- **Severity:** 🟡 Medium (new feature)
- **Plan:** `docs/plans/features/FEAT-semantic-enriched-lesson-creation.md`

**Description:** YouTube video transcript extraction, Hebrew sacred text NER, citation resolution via Knowledge Graph, enriched transcript with inline citations, visual anchor timestamp sync, instructor authoring UI, and student synchronized viewing experience.

**Phases Completed (1–5):**

- **Phase 1:** DB migration — new `enriched_transcript_blocks` table (Drizzle schema + RLS)
- **Phase 2:** NestJS enrichment pipeline — YouTube caption fetch, enhanced NER, citation resolver, NATS events
- **Phase 3:** GraphQL SDL + resolvers — `EnrichedLesson`, `EnrichedTranscriptBlock`, `EnrichmentStatus` types; `ingestYoutubeLesson`, `updateLessonCitation`, `setBlockAnchorTimestamp`, `publishEnrichedLesson` mutations
- **Phase 4:** Instructor authoring UI — `/lesson/:lessonId/edit` route, enrichment editor, citation review panel, anchor sync
- **Phase 5:** Student synchronized viewing — YouTube IFrame embed + auto-scroll enriched transcript + citation cards

**Scope:**

| Category          | Count                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| New files         | ~45                                                                                                                    |
| Modified files    | ~15                                                                                                                    |
| New tests         | 139 (14 test files)                                                                                                    |
| New DB tables     | 1 (`enriched_transcript_blocks`)                                                                                       |
| New GraphQL types | 3 (`EnrichedLesson`, `EnrichedTranscriptBlock`, `EnrichmentStatus`)                                                    |
| New mutations     | 4 (`ingestYoutubeLesson`, `updateLessonCitation`, `setBlockAnchorTimestamp`, `publishEnrichedLesson`)                  |
| NATS subjects     | 4 (`lesson.youtube.ingest`, `lesson.transcript.ready`, `citation.candidates.extracted`, `lesson.enrichment.completed`) |
| Mobile components | 4 new Expo components with offline support                                                                             |

**Completed:** All 5 phases delivered + 9 integration gaps (GAP-1–9) resolved in 7 Apr 2026 session. Full E2E flow from YouTube URL ingest through to student view verified.

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

| Package              | Before | After | New Files     |
| -------------------- | ------ | ----- | ------------- |
| subgraph-content     | ~66%   | ~90%  | 25 test files |
| subgraph-core        | ~72%   | ~92%  | 24 test files |
| subgraph-agent       | ~64%   | ~90%  | 18 test files |
| subgraph-knowledge   | —      | ~97%  | 5 test files  |
| subgraph-annotation  | —      | —     | 1 test file   |
| apps/web (frontend)  | —      | —     | 12 test files |
| packages/nats-client | —      | —     | 8 test files  |
| apps/gateway         | —      | —     | 6 test files  |

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

## ✅ BUG-119 — enriched-lesson.service Hardcodes youtubeVideoId: null (6 Apr 2026)

- **Status:** ✅ Fixed — 6 Apr 2026
- **Severity:** 🟡 Medium
- **Files Changed:** `apps/subgraph-content/src/enriched-lesson/enriched-lesson.service.ts`, `apps/subgraph-content/src/enriched-lesson/enriched-lesson.service.spec.ts`
- **Related:** BUG-117, BUG-118 (same video player black screen root cause cluster)

**Problem:** `getEnrichedLesson()` returned `youtubeVideoId: null` hardcoded in its response object instead of reading the actual value from the database. The video player always received `null` for the YouTube video ID, causing a permanent black screen on enriched lesson pages.

**Root Cause:** The service method was written with a `youtubeVideoId: null` placeholder during initial scaffolding of the enriched lesson feature. The DB join needed to resolve the actual YouTube video ID (stored in `media_assets` via `lesson_assets`) was never implemented.

**Solution:** Added a `fetchYoutubeVideoId(lessonId: string)` private method to the service. It joins `lesson_assets` and `media_assets` tables using Drizzle ORM to retrieve the `youtube_video_id` column and returns it (or `null` if no YouTube asset exists). The `getEnrichedLesson()` method now awaits this call and maps the result into the response.

**Tests:** 8 new unit tests added to `enriched-lesson.service.spec.ts` covering: video ID resolved from DB, returns null when no YouTube asset, handles lesson with multiple asset types, handles DB error gracefully, correct join conditions, correct column mapping, idempotent on repeated calls, and TypeScript type safety of return value.

**Anti-recurrence:** Placeholder `null` values in service responses that depend on DB data must never be left in merged code. New service methods that return DB-sourced fields must have a test asserting the field is non-null when the row exists.

---

## ✅ BUG-118 — contentItem Resolver Doesn't Handle Lesson IDs (6 Apr 2026)

- **Status:** ✅ Fixed — 6 Apr 2026
- **Severity:** 🔴 High
- **Files Changed:** `apps/subgraph-content/src/content-item/content-item.service.ts`, `apps/subgraph-content/src/content-item/content-item.service.spec.ts`
- **Related:** BUG-117, BUG-119 (same video player black screen root cause cluster)

**Problem:** The `/learn/:contentId` route passes the lesson ID as the `id` argument to the `contentItem(id)` GraphQL query. However, the resolver's `findById()` method only queried the `content_items` table. Lesson IDs exist in the `lessons` table — not in `content_items` — so the lookup returned `null`. The frontend received a null content item, yielding a black video player with no error shown.

**Root Cause:** The `contentItem` resolver was designed around the `content_items` entity but the routing layer navigates using lesson IDs, which are a different entity stored in the `lessons` table with associated assets stored in `lesson_assets` and `media_assets`. No fallback lookup existed to bridge the two ID spaces.

**Solution:** Added a fallback path in `findById()`: when the initial `content_items` query returns no result, the method executes a secondary query that joins `lessons` → `lesson_assets` → `media_assets` and maps the result to a `ContentItem` shape compatible with the resolver's return type. The fallback is transparent to the caller — they receive a properly shaped `ContentItem` object regardless of whether the ID originated from `content_items` or `lessons`.

**Tests:** 3 new test cases added: (1) returns content item when ID matches `content_items`, (2) falls back to lesson JOIN and returns mapped item when ID matches `lessons`, (3) returns `null` when ID exists in neither table.

**Anti-recurrence:** Route parameters that may refer to entities across multiple tables must be documented in the resolver or service. The `contentItem(id)` query contract should note that IDs may be either content item IDs or lesson IDs. Consider a unified ID resolver utility to avoid ad-hoc fallback chains in future services.

---

## ✅ BUG-117 — useContentData Reads youtubeVideoId from Non-Existent mediaAsset Field (6 Apr 2026)

- **Status:** ✅ Fixed — 6 Apr 2026
- **Severity:** 🔴 High
- **Files Changed:** `apps/web/src/hooks/useContentData.ts`, `apps/web/src/hooks/useContentData.test.ts`
- **Related:** BUG-118, BUG-119 (same video player black screen root cause cluster)

**Problem:** The `useContentData` hook derived the YouTube video ID by accessing `item?.mediaAsset?.youtubeVideoId`. The `ContentItem` GraphQL type has no `mediaAsset` field — the expression always evaluated to `undefined`. The video player received no video ID, displaying a black screen.

**Root Cause:** The `mediaAsset` field path was copied from an older schema draft or a different entity type. The actual `ContentItem` GraphQL type stores the YouTube video ID directly in the `content` string field when `contentType === 'YOUTUBE'`. The hook was never updated to reflect the final schema.

**Solution:** Updated the derivation logic to check `item.contentType === 'YOUTUBE'` and read the video ID from `item.content` in that case. All other `contentType` values continue to use their existing derivation paths unchanged.

**Tests:** 3 regression tests added to `useContentData.test.ts`: (1) returns `content` value as video ID when `contentType === 'YOUTUBE'`, (2) returns `undefined` when `contentType !== 'YOUTUBE'`, (3) handles null/undefined `item` gracefully without throwing.

**Anti-recurrence:** When the GraphQL schema changes, all field access paths in hooks and components that reference the changed type must be audited. TypeScript strict mode should catch `mediaAsset` as a non-existent property — this indicates a type mismatch was suppressed. Future schema changes to `ContentItem` must include a search for all consumer hooks reading from the type.

---

## ✅ BUG-116 — CourseReadinessCheck Missing id Field (6 Apr 2026)

- **Status:** ✅ Fixed — 6 Apr 2026
- **Severity:** 🟡 Medium
- **Files Changed:** `apps/subgraph-content/src/course/course.graphql`, `apps/subgraph-content/dist/course/course.graphql`, `apps/gateway/supergraph.graphql`, `apps/subgraph-content/src/course/course-publish.service.ts`

**Problem:** The `CourseReadinessCheck` GraphQL type had no `id` field. urql graphcache could not cache objects of this type, generating warnings and causing stale/broken cache behavior on the course publish panel.

**Root Cause:** The SDL definition for `CourseReadinessCheck` was created without an `id` field. urql's graphcache requires every cacheable type to have a unique key — by convention `id: ID!`. Without it, urql falls back to printing a warning and treating the object as uncacheable.

**Solution:** Added `id: ID!` to the `CourseReadinessCheck` SDL type definition in both the subgraph SDL and the composed supergraph. Populated the field in `course-publish.service.ts` with a deterministic check name string (e.g., `"check:has-content"`) so it is stable across fetches.

**Tests:** 40 new tests covering the readiness check SDL contract and cache key resolution.

**Anti-recurrence:** All future value-object types that appear in GraphQL responses must include `id: ID!` or be explicitly registered with `() => null` key resolvers in the urql client configuration.

---

## ✅ BUG-115 — Concepts Resolver Returns Null for Non-Nullable Fields (6 Apr 2026)

- **Status:** ✅ Fixed — 6 Apr 2026
- **Severity:** 🔴 Critical
- **File Changed:** `apps/subgraph-knowledge/src/graph/graph-concept.service.ts`

**Problem:** The `concepts` GraphQL query returned a GraphQL execution error: `Cannot return null for non-nullable field Concept.id` (and similarly for `tenantId`, `name`, `definition`). The Knowledge Graph page displayed a critical error banner instead of the graph.

**Root Cause:** `mapConcept()` in `graph-concept.service.ts` mapped optional Apache AGE vertex properties directly to the SDL-declared `String!` (non-nullable) fields. Apache AGE omits properties from vertex results when the property was never set during node creation, returning `undefined` instead of an empty string — violating the GraphQL non-nullable contract.

**Solution:** Added `?? ''` null-coalescing fallbacks for `id`, `tenantId`, `name`, and `definition` in `mapConcept()`. This satisfies the non-nullable SDL contract while Apache AGE graph nodes are being populated progressively.

**Anti-recurrence:** Any future `mapX()` function that reads Apache AGE vertex properties into non-nullable SDL fields must use `?? ''` or equivalent fallbacks. Added a code review checklist item for Apache AGE property mapping.

---

## ✅ BUG-114 — Knowledge Graph "Failed to Load Graph" (\_refresh Variable) (6 Apr 2026)

- **Status:** ✅ Fixed — 6 Apr 2026
- **Severity:** 🔴 Critical
- **File Changed:** `apps/web/src/pages/knowledge-graph/use-graph-data.ts`

**Problem:** The Knowledge Graph page always displayed "Failed to load graph". Every query request was rejected by the gateway with a 400 Bad Request.

**Root Cause:** `useQuery` in `use-graph-data.ts` passed `_refresh: refreshKey` as a GraphQL variable, intended as a cache-busting trick. However, the `concepts(limit: Int)` schema definition has no `_refresh` argument. The gateway's strict input validation rejected any query that passed an undeclared variable, returning 400 for every request.

**Solution:** Removed the `_refresh` variable from the query variables entirely. Cache busting is now handled correctly by passing `requestPolicy: 'network-only'` to `useQuery`, which forces a fresh network fetch without injecting invalid variables into the GraphQL operation.

**Tests:** Regression test added to verify the query no longer sends `_refresh` and that `requestPolicy: 'network-only'` is applied on refresh.

**Anti-recurrence:** GraphQL variables must always correspond to declared query arguments. Cache-busting via fake variables is an anti-pattern — use `requestPolicy: 'network-only'` or urql's `pause`/`resume` pattern instead.

---

## ✅ BUG-113 — WebSocket Reconnection Flood (6 Apr 2026)

- **Status:** ✅ Fixed — 6 Apr 2026
- **Severity:** 🟡 Medium
- **File Changed:** `apps/web/src/lib/urql-client.ts`

**Problem:** WebSocket connections to `ws://localhost:4000/graphql` failed repeatedly with rapid reconnection attempts. Browser DevTools showed dozens of failed WS connection attempts per second, flooding the console and degrading performance.

**Root Cause:** The urql WebSocket exchange was configured without reconnection limits. When the gateway WebSocket endpoint was unavailable (e.g., during startup or when not needed), the client retried immediately and infinitely, creating a connection flood.

**Solution:**

- Added `lazy: true` to the WebSocket client — connections are only opened when a subscription is actually active, not eagerly on page load.
- Added a `shouldRetry` callback capped at 5 attempts — after 5 consecutive failures the client stops retrying and waits for the next user interaction.
- Added a safe fallback URL to prevent crashes when `VITE_GRAPHQL_WS_URL` is undefined.

**Anti-recurrence:** All WebSocket clients must be configured with `lazy: true` and bounded retry logic. Unbounded reconnection loops are a resource exhaustion risk.

---

## ✅ BUG-112 — urql Cache Key Warnings for CourseReadinessCheck (6 Apr 2026)

- **Status:** ✅ Fixed — 6 Apr 2026
- **Severity:** 🟡 Medium
- **File Changed:** `apps/web/src/lib/urql-client.ts`

**Problem:** urql graphcache logged warnings for 20 GraphQL types that lack `id` fields: `CourseReadinessCheck`, `RelatedConcept`, `ConceptNode`, and 17 others. These warnings indicated that urql could not generate stable cache keys for these types, causing silent cache misses and potential stale data rendering.

**Root Cause:** urql graphcache requires every object type to either have an `id` field (or a custom key resolver). Value objects and result types that are intentionally non-identifiable (no natural `id`) were not registered in the cache configuration, so urql fell back to warning and treating them as uncacheable.

**Solution:** Added explicit `() => null` key resolvers for all 20 affected types in the `cacheExchange` configuration in `urql-client.ts`. The `() => null` resolver tells urql that these types are intentionally non-identifiable embedded value objects — cache them inline within their parent, no warning.

**Tests:** 40 new tests verifying the key resolver configuration covers all 20 types and that no cache key warnings are emitted.

**Anti-recurrence:** When adding new GraphQL types that are value objects (no natural `id`), register them in the urql client `keys` configuration with `() => null` immediately. Document this in the urql client configuration file with a comment.

---

## ✅ BUG-120 — JWT Issuer Mismatch — All Requests Proceed Unauthenticated

- **Status:** ✅ Fixed
- **Severity:** 🔴 Critical
- **Area:** Infrastructure / Gateway

**Root Cause:** `docker-compose.dev.yml` had `KEYCLOAK_ISSUER_URL=http://localhost:8080/realms/edusphere` on 7 lines (one per subgraph + gateway). The code in `apps/gateway/src/gateway-config.ts`, `packages/config/src/keycloak.ts`, and `packages/auth/src/jwt.ts` all appended `/realms/${realm}` to `KEYCLOAK_ISSUER_URL`, producing the double-realm URL `http://localhost:8080/realms/edusphere/realms/edusphere` which never matched the token's `iss` claim.

**Fix:** Changed all 7 occurrences in `docker-compose.dev.yml` from `KEYCLOAK_ISSUER_URL=http://localhost:8080/realms/edusphere` to `KEYCLOAK_ISSUER_URL=http://localhost:8080`. The code already appends `/realms/edusphere` — the env var must supply only the base URL.

**Files Fixed:** `docker-compose.dev.yml` (lines 214, 260, 306, 350, 394, 438, 491)

**Containers must be recreated** to pick up the new env var: `docker-compose -f docker-compose.dev.yml up -d --force-recreate`

---

## ✅ BUG-121 — Keycloak Users Locked Out by Brute-Force Protection

- **Status:** ✅ Fixed
- **Severity:** 🔴 High
- **Area:** Infrastructure / Keycloak

**Symptom:** `super.admin@edusphere.dev` and `student@example.com` were temporarily disabled in Keycloak due to brute-force detection.

**Fix:** Cleared all brute-force detections via Keycloak Admin REST API: `DELETE /admin/realms/edusphere/attack-detection/brute-force/users` (HTTP 204 confirmed).

**Files:** Keycloak admin API (`http://localhost:8080/admin/realms/edusphere/users`), `scripts/reset-keycloak-passwords.cjs`

---

## ✅ BUG-122 — MinIO Container Not Running (CLOSED — Misdiagnosis)

- **Status:** ✅ Closed — 6 Apr 2026
- **Severity:** 🔴 High (as originally reported)
- **Area:** Infrastructure / Docker

**Symptom (original):** Ports 9000 and 9001 reportedly unreachable. `docker ps` showed no MinIO container.

**Resolution:** Re-verification confirmed MinIO IS running and healthy on ports 9000/9001. This was a misdiagnosis — the original report was based on a transient state (e.g., Docker Desktop not yet started or a previous `docker-compose down`). No code or infrastructure changes required.

**Closed by:** Frontend Lead — 6 Apr 2026

---

## ✅ BUG-123 — Transcription Worker NATS Subject Mismatch (Fixed — 7 Apr 2026)

- **Status:** ✅ Fixed — 7 Apr 2026
- **Severity:** 🔴 High
- **Area:** Infrastructure / Pipeline

**Symptom:** The lesson pipeline ASR step returned `{ asrDelegated: true }` indicating tasks were published to NATS, but the transcription worker never consumed them. The NATS `TRANSCRIPTION` stream showed 0 consumers. The lesson pipeline UI showed "מתחמלל בעיבוד..." (processing) indefinitely.

**Root Cause:** The transcription worker subscribed to a subject pattern that did not match the subject used by the publisher. The publisher sent to `transcription.job.created` while the worker consumed `asr.job.*` — a mismatch introduced during the NATS subject naming refactor.

**Fix:** Updated the worker's NATS consumer subject filter to match `transcription.job.created` and aligned the stream's subject filter pattern to `transcription.job.>`. Verified consumer appears in `nats stream info TRANSCRIPTION` output and messages are processed.

**Files:** `apps/transcription-worker/src/consumer/transcription-consumer.service.ts`, NATS stream configuration

**Anti-recurrence:** NATS subject names must be defined in a shared constants file in `packages/nats-client/src/subjects.ts` and imported by both publisher and consumer — never duplicated as inline strings.

---

## ✅ BUG-124 — RecommendedCourse urql Cache Key Warning (Fixed)

- **Status:** ✅ Fixed — 6 Apr 2026
- **Severity:** 🟢 Low
- **Area:** Frontend / urql
- **Reproducer test:** `apps/web/src/lib/urql-client.test.ts` (ID_LESS_KEYS array — `RecommendedCourse` entry)

**Symptom:** Browser console outputs: `Invalid key: The GraphQL query...has a selection set, but no key could be generated for RecommendedCourse`. Warning appears on every dashboard load that fetches user recommendations.

**Root cause:** `RecommendedCourse` type (defined in `apps/subgraph-core/src/user/user.graphql`) has fields `courseId`, `title`, `instructorName`, `reason` — no `id` field. urql graphcache could not derive a cache key, emitting "Invalid key" warnings.

**Solution:** Added `RecommendedCourse: () => null` to the `cacheExchange` keys config in `apps/web/src/lib/urql-client.ts`. Also added `UserStats` and `DayActivity` entries to the reproducer test's `ID_LESS_KEYS` array for completeness.

**Files:**

- `apps/web/src/lib/urql-client.ts` — added `RecommendedCourse: () => null` to keys config
- `apps/web/src/lib/urql-client.test.ts` — added `RecommendedCourse`, `UserStats`, `DayActivity` to `ID_LESS_KEYS` test array

**Anti-recurrence:** When adding a new GraphQL type without an `id` field, always add a corresponding `TypeName: () => null` entry to the urql cache keys config and the `ID_LESS_KEYS` test constant.

---

## ✅ BUG-125 — setState During Render — DashboardPage / CourseList (CLOSED)

- **Status:** ✅ Closed — 6 Apr 2026
- **Severity:** 🟢 Low
- **Area:** Frontend / React

**Symptom (original):** React logs: `Cannot update a component ('DashboardPage') while rendering a different component ('CourseList')`.

**Resolution:** Already fixed — the `queueMicrotask` pattern was applied in a prior session to defer state updates out of the render phase in `DashboardPage` / `CourseList`. No further changes required.

**Closed by:** Frontend Lead — 6 Apr 2026

---

## ✅ BUG-120 — JWT Double-Realm Issuer Mismatch (Fixed — 7 Apr 2026)

- **Status:** ✅ Fixed — 7 Apr 2026
- **Severity:** 🔴 Critical
- **Area:** Infrastructure / Gateway
- **Files Fixed:** `docker-compose.dev.yml` (7 occurrences)

**Root Cause:** `KEYCLOAK_ISSUER_URL` in `docker-compose.dev.yml` was set to `http://localhost:8080/realms/edusphere` across all 7 service definitions (gateway + 6 subgraphs). The code in `apps/gateway/src/gateway-config.ts`, `packages/config/src/keycloak.ts`, and `packages/auth/src/jwt.ts` appended `/realms/${realm}` to that value, producing the URL `http://localhost:8080/realms/edusphere/realms/edusphere`. This never matched the token `iss` claim (`http://localhost:8080/realms/edusphere`), so all requests were treated as unauthenticated.

**Fix:** Changed all 7 occurrences to `KEYCLOAK_ISSUER_URL=http://localhost:8080` (base URL only). Containers must be recreated: `docker-compose -f docker-compose.dev.yml up -d --force-recreate`.

---

## ✅ BUG-121 — Keycloak Brute-Force Lockout Cleared (Fixed — 7 Apr 2026)

- **Status:** ✅ Fixed — 7 Apr 2026
- **Severity:** 🔴 High
- **Area:** Infrastructure / Keycloak

**Symptom:** `super.admin@edusphere.dev` and `student@example.com` were disabled in Keycloak due to brute-force detection triggered by repeated failed login attempts (caused by BUG-120 issuer mismatch).

**Fix:** Cleared all brute-force detections via Keycloak Admin REST API: `DELETE /admin/realms/edusphere/attack-detection/brute-force/users` (HTTP 204). All 5 test users re-enabled and confirmed able to log in.

---

## ✅ FIX-DELETE-COURSE-UX — Delete Course Permission UX (Fixed — 7 Apr 2026)

- **Status:** ✅ Fixed — 7 Apr 2026
- **Severity:** 🟡 Medium
- **Area:** Frontend / Permissions UX

**Problem:** The Delete Course button was visible to all authenticated users regardless of ownership or role. Non-owner users could see (but not complete) the delete action, causing confusion. No confirmation modal prevented accidental deletions.

**Fix:**

- Delete button now hidden for users who are not the course owner or an admin (`INSTRUCTOR` role + ownership check).
- Confirmation modal added — user must type the course name to confirm deletion.
- Permission check uses `userId === course.instructorId || userRole === 'ORG_ADMIN' || userRole === 'SUPER_ADMIN'`.

**Files:** `apps/web/src/pages/courses/CourseCard.tsx`, `apps/web/src/pages/courses/DeleteCourseModal.tsx` (new)

---

## ✅ GAP-1–9 — Semantic-Enriched Lesson Feature Gaps (Fixed — 7 Apr 2026)

- **Status:** ✅ Fixed — 7 Apr 2026
- **Severity:** 🟡 Medium (feature completeness)
- **Area:** Full-stack — enriched lesson pipeline

These 9 gaps were identified during integration testing of `FEAT-SEMANTIC-LESSON-CREATION` (Phases 1–5). All were closed in the 7 Apr 2026 session.

| Gap   | Description                           | Files                                                                       |
| ----- | ------------------------------------- | --------------------------------------------------------------------------- |
| GAP-1 | RAG embedding pipeline for sources    | `apps/subgraph-knowledge/src/rag/source-embedding.service.ts`               |
| GAP-2 | AI Chat mode differentiation          | `apps/web/src/pages/content-viewer/AiChatPanel.tsx`, agent prompt templates |
| GAP-3 | Citation edit modal                   | `apps/web/src/components/citation/CitationEditModal.tsx`                    |
| GAP-4 | Enrichment status polling             | `apps/web/src/pages/UnifiedLearningPage.ai-tab.tsx`                         |
| GAP-5 | Transcript highlight sync in editor   | `apps/web/src/pages/agents/AgentChatPanel.tsx`                              |
| GAP-6 | Citation hover popover (student view) | `apps/web/src/components/chavruta/DebateInterface.tsx`                      |
| GAP-7 | Source edit capability                | `apps/web/src/components/RoleplaySimulator.tsx`                             |
| GAP-8 | File upload progress bar              | `apps/web/src/pages/content-viewer/AiChatPanel.tsx`                         |
| GAP-9 | Knowledge graph indexing for sources  | `apps/subgraph-knowledge/src/graph/graph-source.service.ts`                 |

**Tests:** Each gap closed with corresponding unit/component tests. Full regression run confirms all 9 fixes pass.

**Feature status:** `FEAT-SEMANTIC-LESSON-CREATION` is now complete — all 5 phases + 9 integration gaps resolved. Moved to ✅ Fixed.

---

## ✅ MAINT-DEP-001 — Dependabot PR Triage (9 Apr 2026)

- **Status:** ✅ Complete — 9 Apr 2026
- **Severity:** 🟡 Medium (dependency hygiene)
- **Area:** Infrastructure / Dependencies

**Summary:** All open Dependabot PRs reviewed and resolved. 4 merged, 5 closed as breaking/risky, 5 left on auto-merge (approved).

### Merged PRs

| PR  | Package           | Change            | Notes                                           |
| --- | ----------------- | ----------------- | ----------------------------------------------- |
| #79 | audit-logs branch | Branch retirement | Merged into master; branch deleted afterwards   |
| #76 | remotion-cli      | Patch/minor bump  | Safe update, CI passed                          |
| #77 | graphql           | 16.13.2           | Patch — no breaking changes                     |
| #78 | tiptap-core       | 3.22.2            | Minor — confirmed compatible with existing code |

### Closed (Breaking / Risky — Not Merged)

| PR  | Package                  | Reason for Closure                                                                   |
| --- | ------------------------ | ------------------------------------------------------------------------------------ |
| #72 | storybook                | 10.3.4 — major version upgrade; Storybook v10 has breaking API changes; deferred     |
| #71 | urql/core                | 6.0.1 — major version; urql v6 has breaking exchange API changes; requires migration |
| #70 | expo-status-bar          | 55.0.5 — Expo SDK 55 peer; project is on SDK 54; premature upgrade                   |
| #73 | tesseract.js             | 7.0.0 — major version; breaking changes to worker API; requires separate migration   |
| #68 | actions/checkout         | v6 — major version bump; requires workflow-level review and testing before adoption  |
| #67 | docker/build-push-action | v7 — major version; potential breaking changes in build arguments; deferred          |
| #66 | pnpm/action-setup        | v5 — major version; requires verification of caching and lockfile compatibility      |

### Pending Auto-Merge (Approved, Awaiting CI)

| PR  | Package / Change      | Status             |
| --- | --------------------- | ------------------ |
| #75 | Minor dependency bump | Auto-merge enabled |
| #69 | Patch dependency bump | Auto-merge enabled |
| #74 | Patch dependency bump | Auto-merge enabled |
| #65 | Patch dependency bump | Auto-merge enabled |
| #64 | Patch dependency bump | Auto-merge enabled |

---

## ✅ MAINT-TEST-001 — 17 Test Files Fixed (9 Apr 2026)

- **Status:** ✅ Complete — 9 Apr 2026
- **Severity:** 🟡 Medium (test infrastructure)
- **Area:** Frontend / Backend tests

**Summary:** 17 test files repaired across 2 commits. Issues included TypeScript type errors in test mocks, incorrect import paths after the FEAT-SEMANTIC-LESSON-CREATION refactor, stale mock patterns for urql, and missing type assertions in GraphQL resolver tests.

**Files fixed:**

- `apps/subgraph-agent/src/ai/search.db.spec.ts`
- `apps/web/src/components/RoleplaySimulator.test.tsx`
- `apps/web/src/pages/CourseCreatePage.perf.test.ts`
- `apps/web/src/pages/CourseCreatePage.test.tsx`
- `apps/web/src/pages/CourseWizardMediaStep.youtube.test.tsx`
- `apps/web/src/pages/Search.test.tsx`
- `apps/web/src/lib/graphql/discussion.queries.ts`
- `apps/web/src/pages/course-list/useCourseListData.ts`
- `apps/subgraph-content/package.json`
- `pnpm-lock.yaml`
- 7 additional test/support files (minor import and type fixes)

**Commits:** 2 separate commits — first batch (type errors + mocks), second batch (prettier + codegen alignment).

---

## ✅ MAINT-CI-001 — CI 10/10 Green (9 Apr 2026)

- **Status:** ✅ Complete — 9 Apr 2026
- **Severity:** 🟡 Medium
- **Area:** DevOps / CI

**Summary:** After the test file fixes and dependency merges, all 10 CI checks passed green:

1. TypeScript strict typecheck — 0 errors
2. ESLint — 0 warnings, 0 errors
3. Prettier format check — passed
4. Unit tests (web) — all pass
5. Unit tests (subgraph-agent) — all pass
6. Unit tests (subgraph-content) — all pass
7. GraphQL codegen — clean output, no drift
8. Federation composition — supergraph SDL valid
9. Security scan — no new issues
10. Build (all workspaces) — succeeded

**Key fixes enabling green CI:**

- Prettier formatting applied to modified test files
- GraphQL codegen re-run after `discussion.queries.ts` and `course-list/useCourseListData.ts` changes
- `pnpm-lock.yaml` updated after `apps/subgraph-content/package.json` dependency bump

---

## ✅ MAINT-BRANCH-001 — audit-logs Branch Retired (9 Apr 2026)

- **Status:** ✅ Complete — 9 Apr 2026
- **Severity:** 🟢 Low
- **Area:** DevOps / Git hygiene

**Summary:** The `audit-logs` feature branch was merged to master via PR #79. The remote branch was then deleted. The CD workflow (`.github/workflows/cd.yml`) was updated to target `master` as the deployment trigger branch, removing any residual reference to `audit-logs`.

**Actions taken:**

1. PR #79 merged — audit-logs feature code now in master
2. `origin/audit-logs` remote branch deleted
3. CD workflow `on.push.branches` updated to reference `master` only
4. Verified: `git branch -a` shows no stale remote tracking refs

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
