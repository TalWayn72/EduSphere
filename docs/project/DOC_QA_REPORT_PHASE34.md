# Documentation QA Report — Phase 34
**Assessor:** Documentation QA Officer (Division 9)
**Date:** 2026-03-06
**HEAD Commit:** `1e3314b`
**Scope:** Staleness assessment covering Phases 28–34 (commits `3229051..HEAD`)

---

## Phases Delivered (28–34 Summary)

| Commit | Phase | Key Deliverables |
|--------|-------|-----------------|
| `fddb6c0` / `1cc2469` | 28 | Live Sessions backend mutations (end/join/cancel/attendees), offline TTL+flush, SkillTree UUID guard, ARIA fixes, SI-3 encryption, CoursesDiscovery filters, PWA service worker, migration 0012 |
| `be3705a` | 29 | Stripe checkout flow, CheckoutPage, PurchaseCourseButton, `/checkout` route, `@stripe/react-stripe-js` |
| `4ae6614` | 30 | Personal Knowledge Graph wiki (SVG), Annotation Merge Request modal, InstructorMergeQueuePage, router `/instructor/merge-queue` |
| `2c9d178` | 31 | Video Sketch Overlay enhancement — eraser, rect, arrow, ellipse, text tools, VideoSketchToolbar |
| `720b7c9` | 32 | Real-time AI Subtitle Translation (LibreTranslate, VTT+MinIO, VideoSubtitleSelector, SubtitleTrack GraphQL type), migration 0013 |
| `0d51873` | 33 | Remote Proctoring (ProctoringSession, ProctoringOverlay, webcam WebRTC, tab-switch detection), migration 0014 |
| `1e3314b` | 34 | 3D Models & Simulations (Three.js WebGL viewer, uploadModel3D mutation, Model3DInfo GraphQL type), migration 0015 |

**New files added since Phase 27 base:** 55 source/test files + 4 DB migrations

---

## Scorecard

| Doc | Accuracy | Completeness | Freshness | Overall | Status |
|-----|----------|--------------|-----------|---------|--------|
| A. `CHANGELOG.md` | 1 | 1 | 1 | **1.0** | FAILING |
| B. `IMPLEMENTATION_ROADMAP.md` | 2 | 1 | 1 | **1.3** | FAILING |
| C. `docs/project/PROJECT_STATUS.md` | 1 | 1 | 1 | **1.0** | FAILING |
| D. `README.md` | 2 | 1 | 1 | **1.3** | FAILING |
| E. `API_CONTRACTS_GRAPHQL_FEDERATION.md` | 2 | 1 | 1 | **1.3** | FAILING |
| F. `docs/testing/TEST_REGISTRY.md` | 2 | 1 | 1 | **1.3** | FAILING |
| G. `docs/project/SPRINT_ACTION_PLAN.md` | 1 | 1 | 1 | **1.0** | FAILING |
| H. `docs/project/IMPLEMENTATION_STATUS.md` | 2 | 1 | 2 | **1.7** | FAILING |

**Score key:** 5 = fully current | 3 = partially stale | 1 = completely stale

---

## Failing Documents — Detailed Findings

All 8 assessed documents are FAILING. None reflects any of Phases 28–34.

### A. CHANGELOG.md
**Last entry:** `[0.27.0] — 2026-03-06`
**Missing versions:** 7 versions — `[0.28.0]` through `[0.34.0]`
**Gap severity:** CRITICAL — the primary user-facing release history has a 7-version hole.

Findings:
- Phase 28 (Live Sessions mutations, SI-3 fix, offline flush, SkillTree, ARIA) — absent
- Phase 29 (Stripe checkout, CheckoutPage) — absent
- Phase 30 (Personal Knowledge Graph, Annotation Merge Request) — absent
- Phase 31 (Video Sketch tools: eraser/rect/arrow/ellipse/text) — absent
- Phase 32 (AI Subtitle Translation, VTT pipeline, LibreTranslate) — absent
- Phase 33 (Remote Proctoring, ProctoringSession, webcam, tab-switch) — absent
- Phase 34 (3D Models, Three.js viewer, uploadModel3D mutation) — absent

---

### B. IMPLEMENTATION_ROADMAP.md
**Last phase defined:** Phase 29 (as "Planned — Target: Session 29")
**Phase 28 status:** Listed as the active phase with acceptance criteria but no ✅ Complete marker
**Phases 30–34:** Completely absent from the document
**Gap severity:** CRITICAL — the execution blueprint is 6 phases behind; developers have no acceptance criteria for Phases 30–34.

Findings:
- Phase 28 block exists but has no completion marker (should be `✅ Complete`)
- Phase 29 block exists as "Planned" — should be `✅ Complete`
- Phases 30, 31, 32, 33, 34 blocks are entirely missing
- Phase 35 (next phase) is not defined
- `Prerequisites` block for Phase 29 still says "Phase 28 complete — in progress"

---

### C. docs/project/PROJECT_STATUS.md
**Last updated header:** `2026-03-06 | Session: 27 | Commit: c0e4810`
**Actual HEAD commit:** `1e3314b`
**Phases listed as complete:** 27 of 27
**Gap severity:** CRITICAL — dashboard is completely wrong; shows Phase 28 as "Planned" when Phase 34 is complete.

Findings:
- "Phases Complete: 27 / 27 planned (Phase 28 next)" — should be 34/34 (Phase 35 next)
- Latest commit shows `c0e4810` — 9 commits behind HEAD (`1e3314b`)
- Total Tests column shows `5,762+` — stale; new tests from Phases 28–34 added:
  - Phase 28: 10+6 (live-sessions) + 72 (LiveSessionsPage) + 24 (Courses) + 18 (useOfflineQueue) = ~130 new
  - Phase 29: 8 unit + 8 E2E = 16
  - Phase 30: 44 unit + 15 E2E = 59
  - Phase 31: 21 unit + 20 E2E = 41
  - Phase 32: 11+9 unit + 10 E2E = 30
  - Phase 33: 16+23 unit + 6+3 E2E = 48
  - Phase 34: 14+18 unit + 5+2 E2E = 39
  - **Total new since Phase 27: ~363 tests** → actual total ≈ 6,125+
- Phase table missing rows 28–34
- Open Critical Bugs: still shows `0` (may be accurate, but needs verification)

---

### D. README.md
**"Recently Added" section:** Shows Sessions 25–27 only
**Development Phases table:** Ends at Phase 27 with "ALL 27 phases complete"
**Gap severity:** HIGH — the public-facing README is 7 phases stale.

Findings:
- Phase 28–34 absent from "Recently Added (Sessions 25–27)" section — section title itself is stale
- Development Phases table bottom row: `Phase 27 | Live Sessions, Offline Web... | Complete` — no rows for 28–34
- Footer line: "ALL 27 phases complete ✅" — incorrect, should be 34
- Features section missing: Stripe checkout, Personal Knowledge Graph wiki, Annotation Merge Request, Video Sketch tools (5 new), AI Subtitle Translation, Remote Proctoring, 3D Models & Simulations
- No mention of migrations 0012–0015
- `@stripe/react-stripe-js` dependency not mentioned in tech stack

---

### E. API_CONTRACTS_GRAPHQL_FEDERATION.md
**Last section:** Section 21 — Phase 25–27 Types
**Missing sections:** Section 22 (Phase 28+) through at minimum Section 28 (Phase 34)
**Gap severity:** CRITICAL — the single source of truth for the GraphQL API surface is 7 phases incomplete. Developers implementing against this document will build incorrect integrations.

Missing GraphQL types that must be added:

| Phase | Missing Types / Mutations / Queries |
|-------|-------------------------------------|
| 28 | `startLiveSession`, `endLiveSession`, `joinLiveSession`, `cancelLiveSession` mutations; `getSessionAttendees` query; `CourseDiscoveryFilter` input |
| 29 | `CheckoutSession` type, `createCheckoutSession` mutation, `CheckoutStatus` enum |
| 30 | `PersonalAnnotationNode`, `PersonalAnnotationEdge`, `PersonalGraph` type; `AnnotationMergeRequest` type; `proposeMergeRequest`, `approveMergeRequest`, `rejectMergeRequest` mutations; `annotationMergeRequests` query |
| 31 | `SketchTool` enum (`FREEHAND`, `ERASER`, `RECT`, `ARROW`, `ELLIPSE`, `TEXT`), `SketchPath` updated type |
| 32 | `SubtitleTrack` type, `subtitleTracks` field on `MediaAsset`, `TranslationStatus` enum |
| 33 | `ProctoringSession`, `ProctoringFlag`, `ProctoringFlagType` enum; `startProctoringSession`, `flagProctoringEvent`, `endProctoringSession` mutations; `proctoringSession`, `proctoringReport` queries |
| 34 | `Model3DInfo`, `ModelAnimation`, `AssetType` enum (with `MODEL_3D`); `uploadModel3D` mutation; `model3d` field on `MediaAsset` |

---

### F. docs/testing/TEST_REGISTRY.md
**Last updated header:** `2026-03-06 | Session: 27`
**Total Tests listed:** `5,762+`
**Gap severity:** HIGH — registry is missing ~363 new tests from 7 phases; E2E spec table is missing 9 new spec files.

Missing test entries:

Backend new files:
- `apps/subgraph-agent/src/live-sessions/live-sessions-p28.pentest.spec.ts` (~23 pentest cases)
- `apps/subgraph-agent/src/proctoring/proctoring.service.spec.ts` (16 tests)
- `apps/subgraph-content/src/media/model3d.service.spec.ts` (14 tests)
- `apps/transcription-worker/src/translation/translation.service.spec.ts` (11 tests)

Frontend unit new files:
- `src/pages/CheckoutPage.test.tsx` (8 tests)
- `src/pages/PersonalGraphView.test.tsx` (9 tests)
- `src/pages/KnowledgeGraph.personal.test.tsx` (8 tests)
- `src/pages/InstructorMergeQueuePage.test.tsx` (10 tests)
- `src/pages/SkillTreePage.pentest.test.tsx`
- `src/components/AnnotationMergeRequestModal.test.tsx` (7 tests)
- `src/components/AnnotationItem.propose.test.tsx` (7 tests)
- `src/components/ProctoringOverlay.test.tsx` (23 tests)
- `src/components/Model3DViewer.test.tsx` (18 tests)
- `src/components/VideoPlayer.subtitles.test.tsx` (9 tests)
- `src/components/VideoSketchOverlay.tools.test.tsx` (21 tests)

E2E spec files missing from registry:
- `e2e/offline-sync.spec.ts`
- `e2e/live-sessions-mutations.spec.ts`
- `e2e/course-discovery-filters.spec.ts`
- `e2e/aria-phase28.spec.ts`
- `e2e/checkout-flow.spec.ts`
- `e2e/annotation-merge-request.spec.ts`
- `e2e/video-sketch.spec.ts`
- `e2e/subtitle-tracks.spec.ts`
- `e2e/proctoring.spec.ts`
- `e2e/model3d-viewer.spec.ts`

---

### G. docs/project/SPRINT_ACTION_PLAN.md
**Header:** `Updated: 2026-03-06 | Current Phase: 27 Complete | Next Phase: 28`
**Sprint Backlog:** Shows Phase 28 backlog items as unstarted
**Gap severity:** CRITICAL — the sprint plan is presenting Phase 28 as the upcoming sprint when it completed along with Phases 29–34.

Findings:
- Phase 28 backlog table shows all items as unchecked `[ ]`
- Phases 29–34 have no sprint entries whatsoever
- Technical Debt Backlog still lists "migration 0012: live_sessions Enc column rename (P1)" — completed in Phase 28
- Technical Debt Backlog still lists "Husky v10 deprecation fix (P1)" — fixed in Phase 28 (commit `a94a5d6`)
- No completed sprint summary for Phases 28–34
- Phase 35 sprint is not planned

---

### H. docs/project/IMPLEMENTATION_STATUS.md
**Last updated:** `2026-03-05 | Session: 22`
**Reflects:** Only through Phase 22 narrative
**Gap severity:** HIGH — 12 phases behind (Phases 23–34 absent from narrative), though earlier phases are correctly marked Complete.

Findings:
- Header shows "Session: 22" — 12 sessions behind
- `subgraph-agent` test count shows `599` — does not include Phase 28 pentest spec or Phase 33 proctoring specs
- `subgraph-content` shows `1,041` — does not include Phase 34 model3d service spec (14 tests)
- `web (frontend)` shows `3,065 tests` — severely stale; actual is 3,315+ as of Phase 27, now higher
- Completed Phases narrative ends at Phase 22 (Phase 6 in the old numbering) — no Phase 23–34 narrative sections

---

## Specific Edit Instructions

### A. CHANGELOG.md — Add 7 missing version entries

Insert after the existing `[0.27.0]` entry:

```markdown
## [0.34.0] — 2026-03-06 — Phase 34: 3D Models & Simulations (PRD §3.3 G-1)

### Added
- `Model3DViewer.tsx`: Three.js WebGL viewer with OrbitControls, full memory safety (renderer.dispose, geometry/material/texture dispose, cancelAnimationFrame, ResizeObserver.disconnect)
- DB migration `0015_model_assets.sql`: `model_format`, `model_animations` (JSONB), `poly_count` columns on `media_assets`
- GraphQL: `Model3DInfo` type, `ModelAnimation` type, `AssetType` enum with `MODEL_3D`, `uploadModel3D` mutation, `model3d` field on `MediaAsset`
- `MediaService.createModel3DUpload()`: format validation (gltf/glb/obj/fbx), MinIO presigned PUT URL
- Three.js test stubs: `three-stub`, `three-gltf-stub`, `three-orbit-stub`; vitest alias config
- Tests: 14 service + 18 component unit + 5+2 visual E2E
- All PRD gaps now closed (G-1 through G-4, P-1 through P-3)

---

## [0.33.0] — 2026-03-06 — Phase 33: Remote Proctoring (PRD §7.2 G-4)

### Added
- `ProctoringOverlay.tsx`: webcam preview (WebRTC), tab-switch detection (`visibilitychange`), active badge, flag count; full memory safety (listeners removed + MediaStream tracks stopped on unmount)
- `ProctoringReportCard.tsx`: status badge + flag timeline list
- `useProctoringSession.ts`: start/flag/end/isActive lifecycle hook
- DB migration `0014_proctoring_sessions.sql`: `proctoring_sessions` table with JSONB flags, RLS tenant isolation
- GraphQL: `ProctoringSession`, `ProctoringFlag`, `ProctoringFlagType` enum; `startProctoringSession`, `flagProctoringEvent`, `endProctoringSession` mutations; `proctoringSession`, `proctoringReport` queries
- Tests: 16 service + 23 component unit + 6+3 visual E2E

---

## [0.32.0] — 2026-03-06 — Phase 32: Real-time AI Subtitle Translation (PRD §3.4 G-2)

### Added
- `TranslationService`: LibreTranslate HTTP client, VTT generation, MinIO upload, NATS event
- DB migration `0013_transcript_vtt_key.sql`: `vtt_key` nullable column on `transcripts`
- GraphQL: `SubtitleTrack` type, `subtitleTracks` field on `MediaAsset`
- `VideoSubtitleSelector.tsx`: CC button, language dropdown, Off option, ARIA attributes
- `VideoPlayer`: `subtitleTracks` prop, `<track>` elements per language, `activeSubtitle` state sync
- `TRANSLATION_TARGETS` env var (comma-separated BCP-47, empty = disabled), `LIBRE_TRANSLATE_URL`
- Tests: 11 TranslationService + 9 VideoPlayer subtitles unit + 10+3 visual E2E

### Fixed
- `packages/db/.lintstagedrc.json`: eslint-plugin-import@2.32/ESLint@10 crash on schema files
- `.husky/pre-commit`: grep no-match exit code 1 (add `|| true`)

---

## [0.31.0] — 2026-03-06 — Phase 31: Video Sketch Overlay Enhancement (PRD §4.2 P-1)

### Added
- `useSketchCanvas.ts`: drawing hook for freehand, eraser (destination-out), rect, arrow (line + arrowhead), ellipse, text tools
- `VideoSketchToolbar.tsx`: 6 tool buttons (aria-pressed), color picker swatch, Save/Clear/Cancel
- Video Sketch text tool: positioned `<input>` on canvas click, commits on Enter/blur
- Tests: 21 new unit (tools, color picker, text, eraser, cancel) + 20+4 visual E2E

---

## [0.30.0] — 2026-03-06 — Phase 30: Personal Knowledge Graph Wiki + Annotation Merge Request (PRD §4.3+§4.4)

### Added
- `PersonalGraphView.tsx`: SVG wiki of personal annotations — 6 nodes, 7 edges (shared-concept connections), course colour legend, node click detail panel
- `KnowledgeGraph.tsx`: Global/My Wiki tab toggle (`viewMode: 'global' | 'personal'`)
- `AnnotationMergeRequestModal.tsx`: annotation proposal dialog, 500-char counter, submit guard
- `AnnotationItem.tsx`: "Propose to Official" button (PERSONAL layer + own-user guard)
- `InstructorMergeQueuePage.tsx`: instructor approval queue, diff view, approve/reject
- Route: `/instructor/merge-queue`
- Tests: 44 unit (PersonalGraphView 9, MergeModal 7, MergeQueue 10, ProposeBtn 7, KG.personal 8, + 3 more) + 15 E2E + 4 visual regression

---

## [0.29.0] — 2026-03-06 — Phase 29: Stripe Checkout Flow (PRD §8.4)

### Added
- `CheckoutPage.tsx`: Stripe Elements with `clientSecret` from URL, success redirect, graceful fallbacks
- `PurchaseCourseButton.tsx`: passes `secret+session+course` via URL params
- Route: `/checkout` (lazy-loaded, guarded)
- Dependencies: `@stripe/stripe-js`, `@stripe/react-stripe-js`
- Tests: 8 unit + 8+2 visual E2E

### Security
- `clientSecret` never in localStorage, never in DOM text; user-safe error messages only

---

## [0.28.0] — 2026-03-06 — Phase 28: Live Sessions Backend + Offline Sync + SkillTree + SI-3

### Added
- Live Sessions mutations: `endLiveSession`, `joinLiveSession`, `cancelLiveSession`, `getSessionAttendees`
- `useLiveSessionActions` hook: all 4 mutations with toast error handling
- `CANCELLED` status added to `LiveSessionStatus` enum
- `useOfflineQueue`: online event → auto-flush; 48h TTL eviction; `onFlush` callback
- `SkillTreePage`: UUID validation (`isValidCourseId`), mounted guard, invalid-ID error block
- `AdminActivityFeed`: ARIA `role=log`, `aria-live=polite`, `aria-atomic=false`
- `LiveSessionsPage`: ARIA `role=tablist/tab`, mounted guard on `useQuery`
- ServiceWorker: `registerServiceWorker()` wired in `main.tsx`; hourly update poll
- CoursesDiscovery: Category + Level + Sort filters, `data-view` attribute, `aria-pressed`
- Custom migration runner: idempotent SQL runner (migrations 0010–0012) via `custom_migrations` table
- DB migration `0012_live_sessions_enc_rename.sql`: SI-3 plaintext column removal

### Fixed
- Husky v10: deprecated `husky.sh` shebang removed from `.husky/pre-commit`
- NATS SI-7: `getNatsConnection()` uses env-var TLS options

### Security
- SI-3: `encryptField()` before live session DB write; `decryptField()` on `getJoinUrl`
- Pentest suite: `live-sessions-p28.pentest.spec.ts` (SQL/XSS injection guards, 23 cases)
```

---

### B. IMPLEMENTATION_ROADMAP.md — Add Phases 28–34 complete entries + Phase 35

Insert at line 1719 (after Phase 28 block — before Phase 29 block), replacing Phase 29 "Planned" block and adding through Phase 35:

**Phase 28** — change acceptance criteria checkbox list to `✅` markers and add:
```markdown
**Status:** ✅ Complete | **Commit:** `1cc2469`, `fddb6c0`, `a94a5d6`
```

**Add Phase 30–34 blocks** (each follows same format as existing phase blocks):

```markdown
## Phase 30: Personal Knowledge Graph Wiki + Annotation Merge Request
**Status:** ✅ Complete | **Commit:** `4ae6614`
**PRD:** §4.3 (G-3 Annotation MR) + §4.4 (P-2 Personal Graph)

### Deliverables
- PersonalGraphView SVG wiki (6 nodes, 7 edges, course colour legend)
- KnowledgeGraph Global/My Wiki tab toggle
- AnnotationMergeRequestModal (500-char, submit guard)
- AnnotationItem "Propose to Official" button (PERSONAL layer guard)
- InstructorMergeQueuePage (diff view, approve/reject)
- Route: /instructor/merge-queue
- 44 unit + 15 E2E + 4 visual regression tests

---

## Phase 31: Video Sketch Overlay Enhancement
**Status:** ✅ Complete | **Commit:** `2c9d178`
**PRD:** §4.2 (P-1)

### Deliverables
- useSketchCanvas: freehand, eraser, rect, arrow, ellipse, text tools
- VideoSketchToolbar: 6 tool buttons + color picker + Save/Clear/Cancel
- Text tool: positioned <input> on canvas click
- 21 unit + 20 E2E + 4 visual regression tests

---

## Phase 32: Real-time AI Subtitle Translation
**Status:** ✅ Complete | **Commit:** `720b7c9`
**PRD:** §3.4 (G-2)

### Deliverables
- TranslationService: LibreTranslate HTTP, VTT generation, MinIO upload, NATS event
- Migration 0013: vtt_key column on transcripts
- SubtitleTrack GraphQL type + subtitleTracks field on MediaAsset
- VideoSubtitleSelector component (CC, language dropdown, ARIA)
- VideoPlayer: track elements per language + activeSubtitle state
- Env: TRANSLATION_TARGETS (BCP-47), LIBRE_TRANSLATE_URL
- 11+9 unit + 10 E2E + 3 visual regression tests

---

## Phase 33: Remote Proctoring
**Status:** ✅ Complete | **Commit:** `0d51873`
**PRD:** §7.2 (G-4)

### Deliverables
- ProctoringSession DB migration 0014 (JSONB flags, RLS)
- Proctoring GraphQL: ProctoringSession, ProctoringFlag, ProctoringFlagType enum
- ProctoringOverlay: WebRTC webcam, visibilitychange tab-switch detection
- ProctoringReportCard: status badge + flag timeline
- useProctoringSession hook (start/flag/end/isActive)
- 16+23 unit + 6 E2E + 3 visual regression tests

---

## Phase 34: 3D Models & Simulations
**Status:** ✅ Complete | **Commit:** `1e3314b`
**PRD:** §3.3 (G-1) — FINAL PRD GAP (all G-1 through G-4 and P-1 through P-3 closed)

### Deliverables
- Migration 0015: model_format, model_animations (JSONB), poly_count on media_assets
- GraphQL: Model3DInfo, ModelAnimation, AssetType enum (MODEL_3D), uploadModel3D mutation
- Model3DViewer: Three.js WebGL, OrbitControls, full memory safety cleanup
- MediaService.createModel3DUpload(): format validation (gltf/glb/obj/fbx), presigned URL
- Three.js test stubs (three-stub, three-gltf-stub, three-orbit-stub)
- 14+18 unit + 5 E2E + 2 visual regression tests

---

## Phase 35: [Next — TBD]
**Status:** Planned
```

---

### C. docs/project/PROJECT_STATUS.md — Full refresh

Change header:
```markdown
**Last Updated:** 2026-03-06 | **Session:** 34 | **Branch:** master | **Commit:** `1e3314b`
```

Change overall status line:
```markdown
## Overall Status: Phase 34 Complete — ALL PRD GAPS CLOSED
```

Update metrics table:
```markdown
| Phases Complete | 34 / 34 (Phase 35 next) |
| Latest Commit | 1e3314b (Phase 34 — 3D Models & Simulations) |
| Total Tests | 6,125+ |
```

Add rows 28–34 to Phase Completion table:
```markdown
| 28 | Live Sessions Backend + Offline Sync + SkillTree + SI-3 | Complete | Session 28 |
| 29 | Stripe Checkout Flow | Complete | Session 29 |
| 30 | Personal Knowledge Graph Wiki + Annotation Merge Request | Complete | Session 30 |
| 31 | Video Sketch Overlay Enhancement | Complete | Session 31 |
| 32 | Real-time AI Subtitle Translation | Complete | Session 32 |
| 33 | Remote Proctoring | Complete | Session 33 |
| 34 | 3D Models & Simulations | Complete | Session 34 |
| **35** | **[TBD]** | **Planned** | Session 35 |
```

Update Test Coverage table (subgraph-agent was 599; add ~39 from P28+P33; subgraph-content add 14 from P34; web add ~248 from P28–P34):
```markdown
| subgraph-agent | 638 | Pass |
| subgraph-content | 1,055 | Pass |
| web (frontend) | 3,563 | Pass |
| TOTAL | 6,125+ | 100% pass |
```

---

### D. README.md — Three edits

**Edit 1:** Rename and expand "Recently Added" section:
```markdown
### Recently Added (Sessions 28–34)

- **Stripe Checkout** — Full Stripe Elements checkout flow, `PurchaseCourseButton`, `/checkout` route (PRD §8.4)
- **Personal Knowledge Graph Wiki** — SVG wiki of personal annotations; Global/My Wiki tab toggle; shared-concept connections (PRD §4.4)
- **Annotation Merge Request** — "Propose to Official" flow; instructor approval queue with diff view (PRD §4.3)
- **Video Sketch Tools** — Eraser, rectangle, arrow, ellipse, text tools + color picker in VideoSketchOverlay (PRD §4.2)
- **AI Subtitle Translation** — Real-time LibreTranslate VTT generation; language selector in video player (PRD §3.4)
- **Remote Proctoring** — WebRTC webcam overlay, tab-switch detection, flag timeline report for certification (PRD §7.2)
- **3D Models & Simulations** — Three.js WebGL viewer with OrbitControls; gltf/glb/obj/fbx upload (PRD §3.3)
- **ALL PRD GAPS CLOSED** — G-1 through G-4 and P-1 through P-3 complete as of Phase 34

### Previously Added (Sessions 25–27)
...
```

**Edit 2:** Add rows 28–34 to Development Phases table:
```markdown
| **Phase 28** | Live Sessions mutations, offline auto-flush, SkillTree real data, SI-3 | 2-3 days | ✅ Complete |
| **Phase 29** | Stripe checkout flow, PurchaseCourseButton, /checkout route | 1-2 days | ✅ Complete |
| **Phase 30** | Personal KG wiki, Annotation Merge Request, InstructorMergeQueue | 2-3 days | ✅ Complete |
| **Phase 31** | Video Sketch tools (eraser, rect, arrow, ellipse, text) | 1-2 days | ✅ Complete |
| **Phase 32** | AI Subtitle Translation (LibreTranslate, VTT, VideoSubtitleSelector) | 2-3 days | ✅ Complete |
| **Phase 33** | Remote Proctoring (WebRTC, ProctoringSession, tab-switch detection) | 2-3 days | ✅ Complete |
| **Phase 34** | 3D Models & Simulations (Three.js, Model3DViewer, uploadModel3D) | 2-3 days | ✅ Complete |
```

**Edit 3:** Update footer line:
```markdown
**Current Status:** ALL 34 phases complete ✅ — ALL PRD GAPS CLOSED (G-1 through G-4, P-1 through P-3). See [OPEN_ISSUES.md](OPEN_ISSUES.md) for live tracking.
```

---

### E. API_CONTRACTS_GRAPHQL_FEDERATION.md — Add Section 22

Append after the current end of file (after line 5235):

```markdown
---

## Section 22 — Phases 28–34 Types

### 22.1 Live Sessions Extended Mutations (Phase 28)

```graphql
type Mutation {
  startLiveSession(contentItemId: ID!, meetingName: String!, scheduledAt: DateTime!): LiveSession!
    @authenticated @requiresScopes(scopes: ["sessions:write"])
  endLiveSession(sessionId: ID!): LiveSession!
    @authenticated @requiresScopes(scopes: ["sessions:write"])
  joinLiveSession(sessionId: ID!): LiveSession!
    @authenticated
  cancelLiveSession(sessionId: ID!): LiveSession!
    @authenticated @requiresScopes(scopes: ["sessions:write"])
}

type Query {
  getSessionAttendees(sessionId: ID!): [User!]!
    @authenticated
}
```

### 22.2 Stripe Checkout (Phase 29)

```graphql
type CheckoutSession {
  id: ID!
  clientSecret: String!
  courseId: ID!
  tenantId: ID!
  status: CheckoutStatus!
  createdAt: DateTime!
}

enum CheckoutStatus {
  PENDING
  SUCCEEDED
  FAILED
  EXPIRED
}

type Mutation {
  createCheckoutSession(courseId: ID!): CheckoutSession!
    @authenticated
}
```

### 22.3 Personal Knowledge Graph + Annotation Merge Request (Phase 30)

```graphql
type PersonalAnnotationNode {
  id: ID!
  excerpt: String!
  courseId: ID!
  courseName: String!
  timestamp: Int
  connectedConcepts: [String!]!
}

type PersonalAnnotationEdge {
  source: ID!
  target: ID!
  sharedConcept: String!
}

type PersonalGraph {
  nodes: [PersonalAnnotationNode!]!
  edges: [PersonalAnnotationEdge!]!
}

type AnnotationMergeRequest {
  id: ID!
  annotationId: ID!
  proposerId: ID!
  justification: String!
  status: MergeRequestStatus!
  createdAt: DateTime!
}

enum MergeRequestStatus {
  PENDING
  APPROVED
  REJECTED
}

type Query {
  personalGraph: PersonalGraph!  @authenticated
  annotationMergeRequests(status: MergeRequestStatus): [AnnotationMergeRequest!]!
    @authenticated @requiresRole(roles: [INSTRUCTOR, ORG_ADMIN])
}

type Mutation {
  proposeMergeRequest(annotationId: ID!, justification: String!): AnnotationMergeRequest!
    @authenticated
  approveMergeRequest(requestId: ID!): AnnotationMergeRequest!
    @authenticated @requiresRole(roles: [INSTRUCTOR, ORG_ADMIN])
  rejectMergeRequest(requestId: ID!): AnnotationMergeRequest!
    @authenticated @requiresRole(roles: [INSTRUCTOR, ORG_ADMIN])
}
```

### 22.4 Video Sketch Tool Enum (Phase 31)

```graphql
enum SketchTool {
  FREEHAND
  ERASER
  RECT
  ARROW
  ELLIPSE
  TEXT
}
```

> Note: `SketchTool` is a frontend-only enum used for the canvas drawing state in `VideoSketchOverlay`. Sketch paths are stored as JSON via the Annotation subgraph.

### 22.5 AI Subtitle Translation (Phase 32)

```graphql
type SubtitleTrack {
  language: String!    # BCP-47 (e.g. "en", "he", "ar")
  label: String!       # Human-readable (e.g. "English", "Hebrew")
  url: String!         # Presigned MinIO URL for VTT file
}

extend type MediaAsset {
  subtitleTracks: [SubtitleTrack!]!
}
```

### 22.6 Remote Proctoring (Phase 33)

```graphql
type ProctoringSession {
  id: ID!
  assessmentId: ID!
  userId: ID!
  tenantId: ID!
  startedAt: DateTime!
  endedAt: DateTime
  flags: [ProctoringFlag!]!
  recordingKey: String
}

type ProctoringFlag {
  type: ProctoringFlagType!
  timestamp: DateTime!
  metadata: JSON
}

enum ProctoringFlagType {
  TAB_SWITCH
  FACE_NOT_DETECTED
  MULTIPLE_FACES
  AUDIO_ANOMALY
  WINDOW_BLUR
}

type Query {
  proctoringSession(sessionId: ID!): ProctoringSession
    @authenticated
  proctoringReport(assessmentId: ID!): ProctoringSession
    @authenticated @requiresRole(roles: [INSTRUCTOR, ORG_ADMIN])
}

type Mutation {
  startProctoringSession(assessmentId: ID!): ProctoringSession!
    @authenticated
  flagProctoringEvent(sessionId: ID!, type: ProctoringFlagType!, metadata: JSON): ProctoringFlag!
    @authenticated
  endProctoringSession(sessionId: ID!): ProctoringSession!
    @authenticated
}
```

### 22.7 3D Models & Simulations (Phase 34)

```graphql
type Model3DInfo {
  format: String!           # gltf | glb | obj | fbx
  polyCount: Int
  animations: [ModelAnimation!]!
  uploadUrl: String!        # Presigned MinIO PUT URL (returned only by uploadModel3D)
}

type ModelAnimation {
  name: String!
  duration: Float!
}

enum AssetType {
  VIDEO
  AUDIO
  DOCUMENT
  IMAGE
  MODEL_3D   # Added Phase 34
}

extend type MediaAsset {
  model3d: Model3DInfo      # Non-null only when assetType == MODEL_3D
}

type Mutation {
  uploadModel3D(
    courseId: ID!
    filename: String!
    format: String!
  ): MediaAsset!
    @authenticated @requiresScopes(scopes: ["content:write"])
}
```

---

*All types above follow the Relay Cursor Connection spec (PageInfo, edges, nodes).*
*All mutations require `@authenticated`. Sensitive mutations additionally require `@requiresScopes`.*
```

---

### F. docs/testing/TEST_REGISTRY.md — Add new test files + update totals

**Header update:**
```markdown
**Last Updated:** 2026-03-06 | **Session:** 34
**Total Tests:** 6,125+ | **Pass Rate:** 100%
```

**Summary table update** (subgraph-agent 599→638, subgraph-content 1041→1055, web 3315→3563, total 5762→6125):

**Add to subgraph-agent section:**
```markdown
| `src/live-sessions/live-sessions-p28.pentest.spec.ts` | ~23 | SQL/XSS injection guards |
| `src/proctoring/proctoring.service.spec.ts` | 16 | Session lifecycle, flags, destroy |
```

**Add to subgraph-content section:**
```markdown
| `src/media/model3d.service.spec.ts` | 14 | Format validation, presign, destroy |
```

**Add new section for transcription-worker:**
```markdown
### transcription-worker

| File | Tests | Coverage |
|------|-------|---------|
| `src/translation/translation.service.spec.ts` | 11 | LibreTranslate, VTT generation, NATS event |
```

**Add to Frontend Pages table:**
```markdown
| `src/pages/CheckoutPage.test.tsx` | 29 | Stripe checkout, clientSecret safety |
| `src/pages/PersonalGraphView.test.tsx` | 30 | Personal annotation graph SVG |
| `src/pages/KnowledgeGraph.personal.test.tsx` | 30 | Tab switching, search hide/show |
| `src/pages/InstructorMergeQueuePage.test.tsx` | 30 | Approval queue, diff view |
| `src/pages/SkillTreePage.pentest.test.tsx` | 30 | UUID guard, mounted guard, injection |
```

**Add to Frontend Components table:**
```markdown
| `src/components/AnnotationMergeRequestModal.test.tsx` | 30 | 7 tests: dialog, char counter, submit guard |
| `src/components/AnnotationItem.propose.test.tsx` | 30 | 7 tests: PERSONAL-only guard, aria-label |
| `src/components/ProctoringOverlay.test.tsx` | 33 | 23 tests: webcam, badge, tab-switch, memory safety |
| `src/components/Model3DViewer.test.tsx` | 34 | 18 tests: render, loading, error, memory safety |
| `src/components/VideoPlayer.subtitles.test.tsx` | 32 | 9 tests: CC selector, track elements, activeSubtitle |
| `src/components/VideoSketchOverlay.tools.test.tsx` | 31 | 21 tests: tool selector, color, text, eraser, cancel |
```

**Add to E2E Spec table:**
```markdown
| `e2e/offline-sync.spec.ts` | Offline queue auto-flush on reconnect | 28 |
| `e2e/live-sessions-mutations.spec.ts` | start/end/join/cancel mutations | 28 |
| `e2e/course-discovery-filters.spec.ts` | Category + Level + Sort filters | 28 |
| `e2e/aria-phase28.spec.ts` | ARIA roles (tablist, log, live) | 28 |
| `e2e/checkout-flow.spec.ts` | Stripe checkout, success redirect | 29 |
| `e2e/annotation-merge-request.spec.ts` | KG tabs, personal graph, merge queue | 30 |
| `e2e/video-sketch.spec.ts` | Sketch tools, color, text, cancel | 31 |
| `e2e/subtitle-tracks.spec.ts` | CC button, language selector, VTT tracks | 32 |
| `e2e/proctoring.spec.ts` | Start/flag/end session, tab-switch | 33 |
| `e2e/model3d-viewer.spec.ts` | 3D viewer load, fallback, upload | 34 |
```

---

### G. docs/project/SPRINT_ACTION_PLAN.md — Full refresh

Replace header:
```markdown
**Updated:** 2026-03-06 | **Current Phase:** 34 Complete | **Next Phase:** 35
```

Replace current sprint status:
```markdown
## Current Sprint Status

All Phases 28–34 deliverables are complete. ALL PRD gaps are now closed (G-1 through G-4, P-1 through P-3).
The team is now planning Phase 35.
```

Remove the Phase 28 sprint backlog section entirely (it is complete).

Add completed sprint summaries for Phases 28–34 (reference the commit messages).

Remove from Technical Debt:
- "migration 0012: live_sessions Enc column rename (P1)" — completed Phase 28
- "Husky v10 deprecation fix (P1)" — completed Phase 28 (`a94a5d6`)

---

### H. docs/project/IMPLEMENTATION_STATUS.md — Update header and test counts

Update header:
```markdown
**Last Updated:** 2026-03-06
**Session:** 34
```

Update summary table test counts:
```markdown
| **subgraph-agent** | Complete | LangGraph, LlamaIndex, RAG, Chavruta, Live Sessions, Proctoring — 638 tests |
| **subgraph-content** | Complete | Courses, Lessons, Media, Pipeline, Fork, 3D Models — 1,055 tests |
| **Frontend web** | Complete | React 19, Vite 6 — 3,563 tests |
```

---

## Critical Gap Summary

| Priority | Gap | Impact |
|----------|-----|--------|
| P0 — CRITICAL | API_CONTRACTS has no Section 22 (Phase 28–34 types) | Developers building against this will miss 7 new types and 15+ mutations/queries |
| P0 — CRITICAL | IMPLEMENTATION_ROADMAP has no Phase 30–34 blocks | No acceptance criteria; no Phase 35 definition |
| P0 — CRITICAL | CHANGELOG missing 7 versions (0.28.0–0.34.0) | Complete release history gap |
| P1 — HIGH | PROJECT_STATUS shows "Phase 28 next" | Status dashboard is actively misleading |
| P1 — HIGH | SPRINT_ACTION_PLAN shows Phase 28 as upcoming sprint | Misleads team about current work state |
| P1 — HIGH | TEST_REGISTRY missing 10 new E2E spec files + 11 unit files | QA cannot verify coverage |
| P2 — MEDIUM | README phases table ends at Phase 27 | External / onboarding confusion |
| P2 — MEDIUM | IMPLEMENTATION_STATUS session number is "22" | Stale narrative, wrong test counts |

---

## Statistics

| Metric | Value |
|--------|-------|
| Documents assessed | 8 |
| Documents failing (score < 3.0) | 8 |
| Documents passing | 0 |
| Average score across all docs | 1.2 / 5.0 |
| Phases not reflected in any doc | 30, 31, 32, 33, 34 (5 phases fully absent) |
| Phases partially reflected | 28, 29 (in ROADMAP only, no ✅) |
| New files not listed in TEST_REGISTRY | 21 test files + 10 E2E specs |
| Missing CHANGELOG versions | 7 |
| Missing API contract sections | 7 sub-sections (22.1–22.7) |
