# Documentation QA Report — Session 27

**Auditor:** Documentation QA Officer (Division 9)
**Date:** 2026-03-06
**Scope:** 10 core project documents assessed for accuracy, completeness, clarity, and freshness relative to Session 27 (Phase 27 — Live Sessions, Offline Web, Knowledge Graph Context, SkillTree)

---

## Executive Summary

- **Total docs assessed:** 10
- **Docs passing quality bar (avg >= 3.5/5):** 5
- **Docs failing quality bar (avg < 3.5/5):** 5
- **Critical issues:** 6
- **High priority issues:** 9
- **Total specific edit instructions:** 18

The documentation set has a significant freshness problem. Several core documents (`PROJECT_STATUS.md`, `TEST_REGISTRY.md`, `CHANGELOG.md`) are severely out of date — they describe a project in early planning stages or contain no content, while the actual codebase is at Session 27 with >5,762 tests passing. `API_CONTRACTS_GRAPHQL_FEDERATION.md` is missing the LiveSession and SkillTree types introduced in Phase 27. The security docs and architecture doc are in good shape. The `OPEN_ISSUES.md` is current and accurate. `TESTING_CONVENTIONS.md` lacks the mobile-specific patterns that have become mandatory since Session 25.

---

## Quality Scorecard

| Doc | Accuracy | Completeness | Clarity | Freshness | Overall | Priority |
|-----|----------|--------------|---------|-----------|---------|----------|
| A. README.md | 3 | 3 | 5 | 2 | **3.25** | HIGH |
| B. OPEN_ISSUES.md | 5 | 5 | 4 | 5 | **4.75** | LOW |
| C. docs/project/PROJECT_STATUS.md | 1 | 1 | 4 | 1 | **1.75** | CRITICAL |
| D. docs/testing/TESTING_CONVENTIONS.md | 4 | 3 | 5 | 2 | **3.50** | HIGH |
| E. docs/security/SESSION_26_SECURITY_AUDIT.md | 5 | 5 | 5 | 5 | **5.00** | LOW |
| F. CHANGELOG.md | 1 | 1 | 3 | 1 | **1.50** | CRITICAL |
| G. docs/architecture/ARCHITECTURE.md | 4 | 3 | 5 | 3 | **3.75** | MEDIUM |
| H. API_CONTRACTS_GRAPHQL_FEDERATION.md | 4 | 2 | 5 | 2 | **3.25** | HIGH |
| I. docs/testing/TEST_REGISTRY.md | 1 | 1 | 4 | 1 | **1.75** | CRITICAL |
| J. docs/plans/phase-27-security-audit.md | N/A | N/A | N/A | N/A | **N/A** | NOTE |

**Score legend:** 5 = excellent, 4 = good, 3 = acceptable, 2 = poor, 1 = severely wrong/missing

---

## Doc J — Plans Directory Note

`docs/plans/phase-27-security-audit.md` does **not** exist in `docs/plans/`. The file lives at:
- `docs/security/PHASE_27_SECURITY_AUDIT.md` (correct permanent location — security audit archived in security folder)

The `OPEN_ISSUES.md` (Phase 27 deliverables section) references the path as `docs/plans/phase-27-security-audit.md` which is a broken cross-link. The file has been correctly placed in `docs/security/` but the cross-reference in OPEN_ISSUES.md points to a path that does not exist.

---

## Critical Issues (must fix)

### CRIT-1 — PROJECT_STATUS.md describes a completely different project (Score: 1.75)

**File:** `docs/project/PROJECT_STATUS.md`
**Last Updated:** 2026-02-18

The Phase Breakdown section (line 48 onward) describes phases labeled "Phase 0: Foundation Setup", "Phase 1: Core Authentication", "Phase 2: Academic Structure", "Phase 3: Teaching & Learning Tools" — all marked **"Not Started / 0% completion"**. These are NOT the EduSphere phases (Phase 0-17 of the GraphQL Federation platform). This document appears to be a stale template from a different project or an early draft that was never updated.

Specific contradictions:
- Line 53: "Status: Not Started" — Reality: Phases 0-17 are all complete since February 2026
- Line 59: "Initialize Next.js 14+ project" — Reality: EduSphere uses Vite + React 19, NOT Next.js
- Line 94: "Phase 1: Core Authentication — Multi-role (Admin, Teacher, Student, Parent)" — Reality: roles are SUPER_ADMIN/ORG_ADMIN/INSTRUCTOR/STUDENT/RESEARCHER
- Line 100: "Phase 2: Academic Structure — Status: Not Started" — Reality: full content subgraph has been live since Phase 2
- Line 35: "190 tests passing — 146 frontend, 37 backend, 7 mobile" — Reality: >5,762 tests across all packages (OPEN_ISSUES.md line 6)
- The Executive Summary (lines 9-22) is correct but everything below line 47 is wrong

**Impact:** Any developer or stakeholder reading this document gets a completely false picture of project status. This is the highest-priority documentation failure.

---

### CRIT-2 — CHANGELOG.md is empty (Score: 1.50)

**File:** `CHANGELOG.md`

The file contains only 6 lines:
```
# Changelog
All notable changes to EduSphere will be documented in this file.
This file is auto-generated from conventional commits via `pnpm changelog`.
```

No entries exist for any session (1-27). There is no Session 27 entry, no Session 26 entry, no Session 25 entry. The file is functionally empty. This violates Keep a Changelog format (https://keepachangelog.com) which requires sections for each release.

**Impact:** Zero release history. New contributors cannot understand project evolution.

---

### CRIT-3 — TEST_REGISTRY.md contains only planned/fictional test counts (Score: 1.75)

**File:** `docs/testing/TEST_REGISTRY.md`
**Status line (line 7):** "Status: Core test suites planned; i18n tests fully implemented (February 2026)."

Every single table entry shows "Status: Planned" with aspirational test counts (e.g., "150+ (Planned)" for Knowledge Subgraph). The actual test counts from OPEN_ISSUES.md as of Session 27:
- Web: 3,315 tests (251 files)
- Backend subgraphs: 2,296 tests (core 640 + content 1041 + annotation 144 + collab 161 + agent 599 + knowledge 509)
- Security: 816 tests (32 spec files)
- Mobile: 119+ tests
- Gateway: 138 tests
- Total: >5,762 tests

None of the Session 25-27 test files are listed:
- `AITutorScreen.test.ts` — NOT listed
- `skill-tree.resolver.spec.ts` — NOT listed
- `skill-tree.service.spec.ts` — NOT listed
- `SkillTreePage.test.tsx` — NOT listed
- `LiveSessionsPage.test.tsx` — NOT listed
- `LiveSessionDetailPage.test.tsx` — NOT listed
- `KnowledgeGraphPage.test.tsx` — NOT listed
- `OfflineBanner.test.tsx` — NOT listed
- `useOfflineStatus.test.ts` — NOT listed
- `useOfflineQueue.test.ts` — NOT listed
- `AdminActivityFeed.test.tsx` — NOT listed
- `SmartRoot.test.tsx` — NOT listed

**Impact:** The registry is misleading — it shows ~1,000 "planned" tests but hides the reality of 5,762+ passing tests. New team members cannot find which test files cover which features.

---

### CRIT-4 — OPEN_ISSUES.md cross-link for phase-27-security-audit.md is broken

**File:** `OPEN_ISSUES.md`, line 40
**Text:** `Security audit: docs/plans/phase-27-security-audit.md`
**Reality:** File is at `docs/security/PHASE_27_SECURITY_AUDIT.md`

The plans directory does not contain `phase-27-security-audit.md`. The correct file is in `docs/security/PHASE_27_SECURITY_AUDIT.md`. While this is a cross-link error rather than a content error, it makes the security audit unreachable to anyone following the reference.

---

### CRIT-5 — README.md test counts are severely outdated (Score deduction on Completeness/Freshness)

**File:** `README.md`, Testing section (lines 419-476)

The README states:
- "Frontend Unit Tests: 146 tests / 12 suites passing"
- "Backend Unit Tests: 37 tests / 3 suites passing (subgraph-core)"
- Frontend E2E: "Specs ready — needs dev server" (marked as pending)

Reality (from OPEN_ISSUES.md, verified Session 27):
- Web: 3,315 tests (251 files) — not 146
- Backend: 2,296 tests across all 6 subgraphs — not 37 from core only
- E2E Playwright: tests are written and passing, not "needs dev server"
- Security: 816 tests not mentioned at all
- Mobile: 119 tests not mentioned at all

The listed test suites (Layout.test.tsx with 11 tests, ActivityFeed with 12 tests, etc.) are from an early phase snapshot and represent less than 5% of the current test coverage.

**Impact:** Grossly misrepresents the project's test maturity to any reader.

---

### CRIT-6 — README.md Phase table cuts off at Phase 17 with incorrect "Current Status"

**File:** `README.md`, lines 305-323

The Development Phases table ends at Phase 17 and the status line reads:
> "Current Status: ALL 17 phases complete — Backend + Frontend fully built. Next: Phase 7 Production Hardening (K8s) + Phase 8 Mobile (Expo)."

This is contradictory (says "all 17 complete" but then says "Next: Phase 7 + Phase 8"). More critically, it makes no mention of:
- Phase 27 (Live Sessions, Offline Web, Course Discovery, KG Context) — completed Session 26
- Session 25 (UI/UX Revolution — Design System, AppSidebar, VideoPlayer, SkillTree, WCAG 2.2 AA)
- Phases 18-27 do not appear in the table at all

---

## High Priority Issues

### HP-1 — README.md demo credentials are wrong

**File:** `README.md`, lines 60-70
**Problem:** The README lists demo accounts with password `Demo123!` and emails like `admin@edusphere.dev`, `orgadmin@edusphere.dev`. The real credentials (from CLAUDE.md and OPEN_ISSUES.md) are:
- `super.admin@edusphere.dev` / (password managed by `scripts/reset-keycloak-passwords.cjs`)
- `org.admin@example.com` (dot, not underscore — note different domain too)
- `instructor@example.com`
- `student@example.com`
- `researcher@example.com`

The README's email formats (`admin@edusphere.dev`, `orgadmin@edusphere.dev`) do not match the actual Keycloak users. Anyone trying to use the README to log in will fail.

---

### HP-2 — README.md pnpm version mismatch

**File:** `README.md`, line 16 and line 179
- Prerequisites line: "pnpm 9+"
- Tech Stack table: "pnpm 9.x + Turbo latest"
- CLAUDE.md states: pnpm >=10.0.0

The project requires pnpm 10+, not pnpm 9+. This will cause failed installs for developers who read the README and install pnpm 9.

---

### HP-3 — README.md KEYCLOAK_CLIENT_ID is wrong

**File:** `README.md`, line 531
```env
KEYCLOAK_CLIENT_ID=edusphere-app
```

CLAUDE.md Critical Patterns section states: "Client: `edusphere-web` (NOT `edusphere-app`)". The README propagates the wrong client ID. Any developer following the README setup will have a broken Keycloak configuration.

---

### HP-4 — README.md Phases table missing Phases 18-27

**File:** `README.md`, lines 304-323
Phases 18-27 are entirely absent. At minimum, Phase 27 (Live Sessions, Offline Web, KG Context) which was completed in Session 26 should appear. Sessions 25 (UI/UX Revolution, Design System, Accessibility WCAG 2.2 AA) also represent a complete numbered phase that is absent.

---

### HP-5 — API_CONTRACTS_GRAPHQL_FEDERATION.md missing LiveSession type

**File:** `API_CONTRACTS_GRAPHQL_FEDERATION.md`

A full search for `LiveSession`, `SkillTree`, and `createLiveSession` in the API contracts file returns zero matches. Phase 27 introduced:
- `LiveSession` type (owned by Collaboration subgraph)
- `createLiveSession`, `updateLiveSession`, `endLiveSession` mutations
- `liveSessions` query
- `SkillTree` / `SkillTreeNode` types (owned by Knowledge subgraph)
- `getSkillTree`, `updateMasteryLevel` operations

None of these are documented in the API contracts. The contracts are the "single source of truth" per their own header — they are currently incomplete for Phase 27 features.

---

### HP-6 — docs/architecture/ARCHITECTURE.md status says "Phase 0"

**File:** `docs/architecture/ARCHITECTURE.md`, line 6
```
Status: Phase 0 (Foundation) — Implementation in progress
```

The project is at Phase 27. This header is severely stale. The body content of the architecture doc is accurate (all 6 subgraphs, Hive Gateway, AGE, pgvector described correctly) but the status header contradicts the actual state.

---

### HP-7 — ARCHITECTURE.md missing offline architecture

**File:** `docs/architecture/ARCHITECTURE.md`

Phase 27 introduced a full offline architecture for the web app:
- ServiceWorker (Workbox-style) for offline caching
- IndexedDB-backed `useOfflineQueue` for operation queuing
- `OfflineBanner` component for user feedback
- `OfflineLessonCache` service for lesson content

None of this is mentioned in the architecture document. Section 4 (Offline-First Mobile) describes Expo SQLite offline patterns but makes no mention of web offline capability.

---

### HP-8 — TESTING_CONVENTIONS.md missing mobile test patterns

**File:** `docs/testing/TESTING_CONVENTIONS.md`

The document has 3,162 lines of detailed testing guidance but contains no section on mobile-specific testing patterns that have been established since Session 25:

**Missing patterns (critical to document):**
1. `__DEV__` global — must add `define: { __DEV__: true }` to `vitest.config.ts` for mobile tests
2. `@testing-library/react-native` is NOT installed — mobile tests must be pure logic tests (no `render`/`screen`)
3. Mobile test file pattern: mock Apollo + navigation + i18n, test logic directly
4. `CoursesScreen.test.tsx` and `MasteryBadge.test.tsx` as canonical examples

These patterns are documented in CLAUDE.md and MEMORY.md but not in the testing conventions document where developers would look for them.

---

### HP-9 — TESTING_CONVENTIONS.md missing urql mock patterns

**File:** `docs/testing/TESTING_CONVENTIONS.md`

The urql mocking patterns established in MEMORY.md (and hardened through BUG-039, BUG-052, BUG-029) are absent:

**Missing patterns:**
1. Mock by document string (NOT call-count based) — prevents false-positive/false-negative test failures
2. `NOOP_MUTATION` pattern for unused mutations
3. Cast as `never` (not `as ReturnType<typeof urql.useQuery>` — missing `stale`/`hasNext`)
4. `vi.resetAllMocks()` at start of tests needing clean mock state
5. Mounted guard pattern for React concurrent-mode (BUG-052/BUG-039)

---

## Medium Priority Issues

### MP-1 — ARCHITECTURE.md offline web section missing

Already covered in HP-7 above. Additionally, the Architecture doc's "Design Philosophy" (line 44) lists "Offline-First Mobile: Expo SDK 54 with SQLite caching" but does not mention offline-first web (ServiceWorker + IndexedDB) which was shipped in Phase 27.

---

### MP-2 — README.md PostgreSQL version inconsistency

**File:** `README.md`
- Badge (line 7): "PostgreSQL 16+"
- Tech Stack table (line 184): "PostgreSQL 16.x"
- Service Health Check table (line 81): "PostgreSQL 16"

**PROJECT_STATUS.md** (line 34): "PostgreSQL 17 + AGE + pgvector"
**ARCHITECTURE.md** (line 156): "PostgreSQL 16"

The actual running version appears to be PostgreSQL 17 (per PROJECT_STATUS.md which shows the live Docker state). The README and Architecture doc consistently say 16. This should be resolved with the correct version.

---

### MP-3 — docs/security/ missing Session 27 pentest documentation

**File:** `docs/security/`
**Present:** `PHASE_27_SECURITY_AUDIT.md`, `SESSION_26_SECURITY_AUDIT.md`
**Missing:** A Session 27 security audit document

OPEN_ISSUES.md (Phase 27 section, line 34) references "PenTests: PENTEST-001..023 (auth bypass, IDOR, XSS, injection)" but there is no dedicated session document for Session 27 security findings. The `PHASE_27_SECURITY_AUDIT.md` exists in `docs/security/` and covers Phase 27 changes — this may be sufficient, but the naming convention is inconsistent with `SESSION_26_SECURITY_AUDIT.md`. Consider either: (a) renaming to `SESSION_27_SECURITY_AUDIT.md`, or (b) updating OPEN_ISSUES.md to reference the correct filename.

---

## Specific Edit Instructions

### Edit 1 — README.md: Fix pnpm version requirement

**File:** `README.md`, line 16
**Change:** `pnpm 9+` → `pnpm 10+`

---

### Edit 2 — README.md: Fix Keycloak client ID

**File:** `README.md`, line 531
**Change:** `KEYCLOAK_CLIENT_ID=edusphere-app` → `KEYCLOAK_CLIENT_ID=edusphere-web`

---

### Edit 3 — README.md: Replace demo credentials table

**File:** `README.md`, lines 60-70
**Change:** Replace the demo accounts table with:
```markdown
### Demo User Accounts

See `scripts/reset-keycloak-passwords.cjs` for current passwords (single source of truth).

| Role | Email |
|------|-------|
| Super Admin | super.admin@edusphere.dev |
| Org Admin | org.admin@example.com |
| Instructor | instructor@example.com |
| Student | student@example.com |
| Researcher | researcher@example.com |
```

---

### Edit 4 — README.md: Update test counts in Testing section

**File:** `README.md`, lines 419-476
**Change:** Replace the entire Testing table section with current numbers:
- Frontend Unit Tests: 3,315 tests / 251 suites passing
- Backend Unit Tests: 2,296 tests (core 640 + content 1041 + annotation 144 + collab 161 + agent 599 + knowledge 509)
- Security Tests: 816 tests / 32 spec files
- Mobile Tests: 119 tests
- Gateway Tests: 138 tests
- Frontend E2E: Playwright specs active and passing
- Total: >5,762 tests

Remove the individual suite list (lines 431-444) — it is a stale snapshot from Session 17 and no longer representative.

---

### Edit 5 — README.md: Add Phase 27 row to Development Phases table

**File:** `README.md`, after line 320 (Phase 17 row)
**Add:**
```markdown
| **Phases 18-24** | Competitive Gap Closure — 39 features (Tier 1+2+3), Admin Upgrade (F-101–F-113) | 15-25 days | ✅ Complete |
| **Phase 25**     | UI/UX Revolution — Design System, AppSidebar, VideoPlayer, SkillTree, WCAG 2.2 AA | 5-7 days   | ✅ Complete |
| **Phase 26**     | PRD Gap Closure — G1+G2+G3+G5+G6+G8 (Context Panel, Sketch Overlay, Agent Studio) | 3-5 days   | ✅ Complete |
| **Phase 27**     | Live Sessions, Offline Web, Course Discovery, Knowledge Graph Context              | 5-7 days   | ✅ Complete |
```

**Change current status line (line 321) to:**
```markdown
**Current Status:** ALL 27 phases complete — Backend + Frontend + Mobile fully built and tested.
>5,762 tests passing across 26 TypeScript packages. See [OPEN_ISSUES.md](OPEN_ISSUES.md) for live tracking.
```

---

### Edit 6 — PROJECT_STATUS.md: Full rewrite required

**File:** `docs/project/PROJECT_STATUS.md`
**Action:** Complete replacement. The current Phase Breakdown section (line 47 onward) is from a different project (uses Next.js, roles like "Teacher/Parent", Cloudflare R2 — none of which are EduSphere).

Replace lines 47-693 with an accurate breakdown reflecting Phases 0-27, actual completion status, actual test counts, and actual technology (Vite/React, not Next.js). The Executive Summary (lines 1-44) is largely accurate and should be preserved but updated:
- Line 4: "190 tests passing" → ">5,762 tests passing"
- Line 14: "Phases 1-17 complete" → "Phases 1-27 complete"
- Remove blocker about LangGraph TypeScript errors (resolved in a subsequent session)

---

### Edit 7 — CHANGELOG.md: Add Session entries

**File:** `CHANGELOG.md`
**Action:** Add entries following Keep a Changelog format for at minimum Sessions 25, 26, 27:

```markdown
## [Unreleased]

## [0.27.0] — 2026-03-06 (Session 27 / Phase 27)
### Added
- Live Sessions (BigBlueButton integration, FE + BE + NATS)
- Offline Web (ServiceWorker + IndexedDB + OfflineBanner + OfflineLessonCache)
- Course Discovery improvements (/explore, /discover routing fixes)
- KnowledgeGraph courseId context parameter
- AdminActivityFeed component
- SkillTree (skill-tree.service.ts + skill-tree.resolver.ts + SkillTreePage)
- SmartRoot router component
- Phase 27 Security Audit (SI-3 fix: BBB passwords encrypted)

### Fixed
- BUG-054: Storage progress bar appeared full at 0% usage
- Raw GraphQL error message exposed in LiveSessionsPage DOM

## [0.26.0] — 2026-03-05 (Session 26)
### Added
- PRD Gap features G1 (Context Panel), G2 (Video Sketch Overlay), G3 (Annotation Promote), G5 (Agent Studio), G6 (Deep Link), G8 (Auto-Flashcards)
- FEAT-055 LessonResultsPage all pipeline outputs

## [0.25.0] — 2026-03-04 (Session 25)
### Added
- UI/UX Revolution: Design System (Indigo #6366F1 tokens), ThemeProvider (3-tier)
- AppSidebar (collapsible 240px/64px, 6 nav groups)
- VideoPlayerWithCurriculum, KnowledgeSkillTree (BFS + SVG bezier)
- WCAG 2.2 AA accessibility: SkipLinks, useFocusTrap, useAnnounce, useReducedMotion
- Mobile Design System alignment (theme.ts, MasteryBadge, indigo tokens)
- DB migration 0010 (tenant_themes table + user_preferences columns)
```

---

### Edit 8 — TEST_REGISTRY.md: Add actual test counts and Session 25-27 files

**File:** `docs/testing/TEST_REGISTRY.md`
**Action:**
1. Replace the status line (line 7) with: "Status: ACTIVE — >5,762 tests passing as of Session 27 (March 2026)"
2. Replace all "Planned" status rows with actual counts from OPEN_ISSUES.md
3. Add a new section "Session 25-27 New Test Files" listing all files introduced:

```markdown
## Session 25-27 New Test Files

### Mobile (apps/mobile)
| File | Tests | Coverage |
|------|-------|----------|
| `src/screens/AITutorScreen.test.ts` | new | AITutor consent, send, error |
| `src/screens/HomeScreen.test.tsx` | new | HomeScreen indigo tokens, stats |

### Web Pages (apps/web/src/pages)
| File | Tests | Coverage |
|------|-------|----------|
| `KnowledgeGraphPage.test.tsx` | new | courseId context routing |
| `SkillTreePage.test.tsx` | new | BFS traversal, mastery levels |
| `LiveSessionsPage.test.tsx` | new | list, join, error states |
| `LiveSessionDetailPage.test.tsx` | new | detail view, chat, end session |

### Web Components (apps/web/src/components)
| File | Tests | Coverage |
|------|-------|----------|
| `OfflineBanner.test.tsx` | new | offline/online states, aria-live |
| `AdminActivityFeed.test.tsx` | new | feed, interval cleanup, types |
| `SmartRoot.test.tsx` | new | auth/unauth routing |

### Web Hooks (apps/web/src/hooks)
| File | Tests | Coverage |
|------|-------|----------|
| `useOfflineStatus.test.ts` | new | navigator.onLine, event listeners |
| `useOfflineQueue.test.ts` | new | enqueue, flush, LRU eviction |

### Backend (apps/subgraph-knowledge)
| File | Tests | Coverage |
|------|-------|----------|
| `graph/skill-tree.resolver.spec.ts` | new | getSkillTree, updateMasteryLevel |
| `graph/skill-tree.service.spec.ts` | new | BFS traversal, mastery update |
```

---

### Edit 9 — API_CONTRACTS_GRAPHQL_FEDERATION.md: Add LiveSession type

**File:** `API_CONTRACTS_GRAPHQL_FEDERATION.md`
**Action:** Add to Section 10 (Collaboration Subgraph) or create a new subsection:

```graphql
# LiveSession — owned by Collaboration subgraph (port 4004)
type LiveSession @key(fields: "id") {
  id: ID!
  tenantId: ID!
  title: String!
  description: String
  status: LiveSessionStatus!
  scheduledAt: DateTime
  startedAt: DateTime
  endedAt: DateTime
  attendeePasswordEnc: String   # Encrypted — SI-3 compliant
  moderatorPasswordEnc: String  # Encrypted — SI-3 compliant
  recordingUrl: URL
  createdBy: User!
  createdAt: DateTime!
}

enum LiveSessionStatus {
  SCHEDULED
  LIVE
  ENDED
  CANCELLED
}

type Query {
  liveSessions(tenantId: ID!, first: Int, after: Cursor): LiveSessionConnection! @authenticated
}

type Mutation {
  createLiveSession(input: CreateLiveSessionInput!): LiveSession! @authenticated @requiresScopes(scopes: ["session:write"])
  updateLiveSession(id: ID!, input: UpdateLiveSessionInput!): LiveSession! @authenticated
  endLiveSession(id: ID!): LiveSession! @authenticated @requiresScopes(scopes: ["session:write"])
}
```

---

### Edit 10 — API_CONTRACTS_GRAPHQL_FEDERATION.md: Add SkillTree type

**File:** `API_CONTRACTS_GRAPHQL_FEDERATION.md`
**Action:** Add to Section 12 (Knowledge Subgraph):

```graphql
# SkillTree — owned by Knowledge subgraph (port 4006)
type SkillTreeNode {
  id: ID!
  label: String!
  type: String!   # "CONCEPT" | "TERM" | etc.
  masteryLevel: Float!  # 0.0 - 1.0
  connections: [ID!]!
}

type Query {
  getSkillTree(tenantId: ID!, userId: ID!): [SkillTreeNode!]! @authenticated
}

type Mutation {
  updateMasteryLevel(conceptId: ID!, level: Float!): SkillTreeNode! @authenticated
}
```

---

### Edit 11 — ARCHITECTURE.md: Update status header

**File:** `docs/architecture/ARCHITECTURE.md`, line 6
**Change:**
```markdown
> **Status:** Phase 0 (Foundation) — Implementation in progress
```
to:
```markdown
> **Status:** Phase 27 Complete — All 27 phases implemented and in production
```

---

### Edit 12 — ARCHITECTURE.md: Add offline web section

**File:** `docs/architecture/ARCHITECTURE.md`
**Action:** Add a new subsection to Section 4 (or create Section 4.1 after the Offline-First Mobile subsection):

```markdown
### 4.2 Offline-First Web

Phase 27 added offline capabilities to the React SPA:

- **ServiceWorker**: Workbox-style caching for static assets and API responses
- **IndexedDB queue**: `useOfflineQueue` hook persists GraphQL mutations when offline; replays on reconnect
- **`useOfflineStatus`**: Subscribes to `navigator.onLine` + browser `online`/`offline` events
- **`OfflineBanner`**: Accessible banner (`role="status"`, `aria-live="polite"`) informs users of offline state
- **`OfflineLessonCache`**: Caches lesson content (video metadata, transcripts) for offline playback

**Offline sync pattern:**
1. User goes offline → `useOfflineStatus` detects → `OfflineBanner` appears
2. User performs action (e.g., annotation) → `useOfflineQueue` enqueues GraphQL mutation in IndexedDB (LRU cap: 100 items)
3. User goes online → queue flushes in insertion order → mutations replayed to gateway
4. On conflict: last-write-wins (future: CRDT merge)
```

---

### Edit 13 — TESTING_CONVENTIONS.md: Add Mobile Testing section

**File:** `docs/testing/TESTING_CONVENTIONS.md`
**Action:** Add a new section "9. Mobile Testing (Expo SDK 54)" after Section 8 (E2E Testing):

```markdown
## 9. Mobile Testing (Expo SDK 54 / Vitest)

### Key Constraint: No @testing-library/react-native

`@testing-library/react-native` is NOT installed in `apps/mobile`. All mobile tests must be **pure logic tests** — no JSX rendering, no `screen`, no `render()`.

### Required vitest.config.ts Configuration

Every `apps/mobile/vitest.config.ts` MUST include:
```typescript
export default defineConfig({
  define: {
    __DEV__: true,  // React Native global — required or tests throw ReferenceError
  },
  // ...
});
```

### Mobile Test Pattern

```typescript
// DO: test logic, not rendering
describe('AITutorScreen', () => {
  it('blocks send when consent not granted', () => {
    const consentGranted = false;
    expect(shouldAllowSend(consentGranted, 'hello')).toBe(false);
  });
});

// DO NOT: import render, screen, or any component
// import { render, screen } from '@testing-library/react-native'; // FORBIDDEN
```

### Mock Dependencies

Mobile tests must mock:
- `@apollo/client` or `urql` for GraphQL calls
- `@react-navigation/native` for navigation
- `i18n-js` or `react-i18next` for translations
- `expo-*` packages via manual mocks in `src/__mocks__/`

### Canonical Examples

- `apps/mobile/src/screens/AITutorScreen.test.ts` — pure logic, consent gate
- `apps/mobile/src/screens/HomeScreen.test.tsx` — stats utils, streak logic
```

---

### Edit 14 — TESTING_CONVENTIONS.md: Add urql Mock Patterns section

**File:** `docs/testing/TESTING_CONVENTIONS.md`
**Action:** Add to Section 5 (Mocking Strategy) or create a new subsection:

```markdown
### urql Mocking Patterns (Web)

These patterns prevent flaky tests and false positives from urql internal state:

#### 1. Mock by Document String (not call-count)

```typescript
// CORRECT: discriminate by query content
vi.mocked(urql.useMutation).mockImplementation((doc) => {
  if (String(doc).includes('CREATE_ANNOTATION')) return [{ fetching: false }, mockCreate] as never;
  if (String(doc).includes('DELETE_ANNOTATION')) return [{ fetching: false }, mockDelete] as never;
  return NOOP_MUTATION;
});

const NOOP_MUTATION = [
  { fetching: false },
  vi.fn().mockResolvedValue({ data: undefined, error: undefined })
] as never;  // Cast as never — ReturnType<useQuery> is missing stale/hasNext
```

#### 2. Reset State Between Tests

```typescript
beforeEach(() => {
  vi.resetAllMocks(); // clears specificMockImpls queue — prevents state bleed
});
```

#### 3. Mounted Guard (Concurrent Mode — BUG-052/BUG-039)

When a component appears as a sibling in React Router routes, wrap queries with a mount guard to prevent urql cache dispatch during sibling render:

```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => { setMounted(true); }, []);
const [result] = useQuery({ query: MY_QUERY, pause: !mounted });
```

#### 4. Highlight Component Text Matching (BUG-053)

```typescript
// WRONG: fails when Highlight splits text into <mark>/<span> fragments
expect(screen.getByText('Test Course')).toBeInTheDocument();

// CORRECT: check full document text content
expect(document.body.textContent).toContain('Test Course');
```
```

---

### Edit 15 — OPEN_ISSUES.md: Fix broken cross-link

**File:** `OPEN_ISSUES.md`, line 40
**Change:**
```markdown
Security audit: docs/plans/phase-27-security-audit.md
```
to:
```markdown
Security audit: docs/security/PHASE_27_SECURITY_AUDIT.md
```

---

### Edit 16 — README.md: Fix PostgreSQL version badge and references

**File:** `README.md`
- Line 7 badge: Update to show PostgreSQL 17+ (matching `PROJECT_STATUS.md` actual Docker state)
- Line 184 Tech Stack table: PostgreSQL version `16.x` → `17.x`
- Line 34 DB section header: "PostgreSQL 16" → "PostgreSQL 17"

Confirm actual DB version by checking `infrastructure/docker-compose.yml` postgres image tag, then use that consistently.

---

### Edit 17 — ARCHITECTURE.md: Add offline web to Design Philosophy

**File:** `docs/architecture/ARCHITECTURE.md`, lines 43-47
Current item 4 reads: "Offline-First Mobile: Expo SDK 54 with SQLite caching and optimistic UI updates"

**Change to:**
```markdown
4. **Offline-First**: Expo SDK 54 (SQLite + TanStack Query) for mobile. Web PWA via ServiceWorker + IndexedDB queue (`useOfflineQueue`) for offline mutation replay.
```

---

### Edit 18 — TESTING_CONVENTIONS.md: Add Session 27 E2E test file references

**File:** `docs/testing/TESTING_CONVENTIONS.md`, Section 8 (E2E Testing)
**Action:** Add a reference table of recently added E2E specs to the existing E2E section:

```markdown
### Phase 27 E2E Specs (Playwright)

| Spec File | Scenarios | Feature |
|-----------|-----------|---------|
| `e2e/live-sessions.spec.ts` | ~20 | Live Session CRUD + join flow |
| `e2e/offline-mode.spec.ts` | 5 | Offline banner + queue |
| `e2e/knowledge-graph-course-context.spec.ts` | 11 | KG courseId context |
| `e2e/settings-storage.spec.ts` | 7 | Progress bar + storage quota |
| `e2e/course-discovery.spec.ts` | 11 | /explore and /discover routes |
```

---

## Docs Not Needing Immediate Action

### SESSION_26_SECURITY_AUDIT.md — Score 5.0/5
Fully current, accurate, well-structured. All 10 SI invariants documented. Router security analysis included. The hardcoded `tenantId: "tenant-1"` finding in AITutorScreen is documented and rated correctly. No changes needed.

### PHASE_27_SECURITY_AUDIT.md — Score 5.0/5
Fully current for Phase 27 scope. Three findings (HIGH: plaintext passwords, MEDIUM: raw error message, LOW: console.warn) are documented with fixes applied. All OWASP checks documented. No changes needed.

### API_CONTRACTS_GRAPHQL_FEDERATION.md (existing content) — Score 4/5
The existing content (Sections 1-12 as far as reviewed) is accurate and well-structured. The 6 subgraphs are correctly described, federation patterns are correct, entity ownership table is correct. The only deficiency is missing Phase 27 types (LiveSession, SkillTree) covered in Edit 9 and Edit 10.

### ARCHITECTURE.md (body content) — Score 4/5
The component diagrams (Section 3), database architecture (Section 5), and security architecture (Section 9) are accurate and complete for Phases 0-17. The Mermaid diagram correctly shows all 6 subgraphs, Hive Gateway, PostgreSQL + AGE, NATS, MinIO, Keycloak. Only issues are the stale status header (Edit 11) and missing offline web section (Edit 12).

---

## Priority Order for Fixes

| Priority | Edit | Effort | Impact |
|----------|------|--------|--------|
| P0 | Edit 6: PROJECT_STATUS.md full rewrite | High | Critical — wrong project described |
| P0 | Edit 7: CHANGELOG.md add session entries | Medium | Critical — empty changelog |
| P0 | Edit 8: TEST_REGISTRY.md actual counts | Medium | Critical — all counts are fictional |
| P1 | Edit 4: README.md test counts | Low | High — misrepresents test coverage |
| P1 | Edit 5: README.md Phase table | Low | High — missing Phases 18-27 |
| P1 | Edit 2: README.md Keycloak client ID | Trivial | High — breaks developer setup |
| P1 | Edit 1: README.md pnpm version | Trivial | High — blocks pnpm install |
| P1 | Edit 3: README.md demo credentials | Low | High — login fails with listed creds |
| P1 | Edit 15: OPEN_ISSUES.md cross-link | Trivial | Medium — broken file reference |
| P2 | Edit 9: API contracts LiveSession | Medium | High — contracts incomplete |
| P2 | Edit 10: API contracts SkillTree | Low | High — contracts incomplete |
| P2 | Edit 13: TESTING_CONVENTIONS mobile | Medium | High — undocumented pattern causes test failures |
| P2 | Edit 14: TESTING_CONVENTIONS urql | Medium | High — undocumented pattern causes flaky tests |
| P3 | Edit 11: ARCHITECTURE.md status | Trivial | Medium — misleading status |
| P3 | Edit 12: ARCHITECTURE.md offline web | Low | Medium — missing architecture section |
| P3 | Edit 16: README.md PostgreSQL version | Trivial | Low — version inconsistency |
| P3 | Edit 17: ARCHITECTURE.md offline design | Trivial | Low — minor completeness gap |
| P3 | Edit 18: TESTING_CONVENTIONS E2E files | Low | Low — convenience reference |
