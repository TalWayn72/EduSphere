# Documentation Delta Audit — Phase 34
**Auditor:** Documentation Manager (Division 10)
**Date:** 2026-03-06
**Scope:** Phases 28-34 (commits 3229051..1e3314b)
**Previous docs overhaul:** commit `3229051` (covered through Phase 27)
**Current HEAD:** `1e3314b` (Phase 34 complete — ALL PRD gaps closed)

---

## New commits since last docs overhaul

| Commit | Date | Phase | Summary |
|--------|------|-------|---------|
| `fddb6c0` | 2026-03-06 | 28 (Part 1) | Live Sessions backend, OfflineQueue TTL+flush, SkillTree UUID guard, ARIA fixes, Husky v10 |
| `a94a5d6` | 2026-03-06 | infra | Fix Husky v10 pre-commit hook (#!/bin/sh, remove deprecated husky.sh sourcing) |
| `1cc2469` | 2026-03-06 | 28 (Part 2) | Live Sessions mutations, offline flush, discovery filters, SI-3 |
| `be3705a` | 2026-03-06 | 29 | Stripe checkout flow, CheckoutPage, PurchaseCourseButton fix (PRD §8.4) |
| `4ae6614` | 2026-03-06 | 30 | Personal Knowledge Graph wiki + Annotation Merge Request (PRD §4.3+§4.4) |
| `2c9d178` | 2026-03-06 | 31 | Video Sketch Overlay Enhancement — eraser, rect, arrow, ellipse, text tools (PRD §4.2) |
| `720b7c9` | 2026-03-06 | 32 | Real-time AI Subtitle Translation (PRD §3.4 G-2) |
| `0d51873` | 2026-03-06 | 33 | Remote Proctoring (PRD §7.2 G-4) |
| `1e3314b` | 2026-03-06 | 34 | 3D Models & Simulations (PRD §3.3 G-1) — ALL PRD GAPS CLOSED |

**Total commits:** 9 (8 feature + 1 infra fix)
**Total new files added:** 55

---

## New files introduced in Phases 28-34

### Backend (subgraph-agent)
- `apps/subgraph-agent/src/live-sessions/live-sessions-p28.pentest.spec.ts`
- `apps/subgraph-agent/src/proctoring/proctoring.graphql`
- `apps/subgraph-agent/src/proctoring/proctoring.module.ts`
- `apps/subgraph-agent/src/proctoring/proctoring.resolver.ts`
- `apps/subgraph-agent/src/proctoring/proctoring.service.spec.ts`
- `apps/subgraph-agent/src/proctoring/proctoring.service.ts`

### Backend (subgraph-content)
- `apps/subgraph-content/src/media/model3d.service.spec.ts`

### Backend (transcription-worker)
- `apps/transcription-worker/src/translation/translation.module.ts`
- `apps/transcription-worker/src/translation/translation.service.spec.ts`
- `apps/transcription-worker/src/translation/translation.service.ts`
- `apps/transcription-worker/src/translation/translation.types.ts`

### Frontend (web)
- `apps/web/src/components/AnnotationMergeRequestModal.tsx` + `.test.tsx`
- `apps/web/src/components/AnnotationItem.propose.test.tsx`
- `apps/web/src/components/Model3DViewer.tsx` + `.test.tsx`
- `apps/web/src/components/ProctoringOverlay.tsx` + `.test.tsx`
- `apps/web/src/components/ProctoringReportCard.tsx`
- `apps/web/src/components/VideoSubtitleSelector.tsx`
- `apps/web/src/components/VideoSketchToolbar.tsx`
- `apps/web/src/components/VideoPlayer.subtitles.test.tsx`
- `apps/web/src/components/VideoSketchOverlay.tools.test.tsx`
- `apps/web/src/components/useSketchCanvas.ts`
- `apps/web/src/hooks/useLiveSessionActions.ts`
- `apps/web/src/hooks/useProctoringSession.ts`
- `apps/web/src/lib/graphql/model3d.queries.ts`
- `apps/web/src/lib/graphql/proctoring.queries.ts`
- `apps/web/src/lib/mock-personal-graph.ts`
- `apps/web/src/pages/CheckoutPage.tsx` + `.test.tsx`
- `apps/web/src/pages/InstructorMergeQueuePage.tsx` + `.test.tsx`
- `apps/web/src/pages/PersonalGraphView.tsx` + `.test.tsx`
- `apps/web/src/pages/KnowledgeGraph.personal.test.tsx`
- `apps/web/src/pages/SkillTreePage.pentest.test.tsx`
- `apps/web/src/test/stubs/three-gltf-stub.ts`
- `apps/web/src/test/stubs/three-orbit-stub.ts`
- `apps/web/src/test/stubs/three-stub.ts`

### E2E tests
- `apps/web/e2e/annotation-merge-request.spec.ts`
- `apps/web/e2e/aria-phase28.spec.ts`
- `apps/web/e2e/checkout-flow.spec.ts`
- `apps/web/e2e/course-discovery-filters.spec.ts`
- `apps/web/e2e/live-sessions-mutations.spec.ts`
- `apps/web/e2e/model3d-viewer.spec.ts`
- `apps/web/e2e/offline-sync.spec.ts`
- `apps/web/e2e/proctoring.spec.ts`
- `apps/web/e2e/subtitle-tracks.spec.ts`
- `apps/web/e2e/video-sketch.spec.ts`

### Database
- `packages/db/src/migrations/0012_live_sessions_enc_rename.sql` + `.test.ts`
- `packages/db/src/migrations/0013_transcript_vtt_key.sql`
- `packages/db/src/migrations/0014_proctoring_sessions.sql`
- `packages/db/src/migrations/0015_model_assets.sql`
- `packages/db/.lintstagedrc.json`

---

## New GraphQL Types / APIs detected in Phases 28-34

### Phase 28 — Live Sessions mutations + SI-3 security

**New mutations (subgraph-agent):**
- `endLiveSession(id: ID!): LiveSession!`
- `joinLiveSession(id: ID!): LiveSession!`
- `cancelLiveSession(id: ID!): LiveSession!`
- `startLiveSession(input: StartLiveSessionInput!): LiveSession!`

**New queries:**
- `getSessionAttendees(sessionId: ID!): [User!]!`

**New enum values:**
- `LiveSessionStatus.CANCELLED`

**Security:**
- SI-3 implementation: `encryptField`/`decryptField`/`deriveTenantKey` exported from `packages/db`
- Renamed columns: `attendee_password_enc`, `moderator_password_enc` (migration 0012)

**Infrastructure:**
- `packages/db/src/migrate.ts` — idempotent custom SQL runner (custom_migrations table)
- `pwa.ts` — ServiceWorker callbacks; `vite.config.ts` — theme_color `#6366F1`
- `useOfflineQueue` — online auto-flush + 48h TTL + LRU 100-item eviction

### Phase 29 — Stripe Checkout (PRD §8.4)

**New pages/routes:**
- `/checkout` — `CheckoutPage` (lazy-loaded, guarded)

**New packages:**
- `@stripe/stripe-js`
- `@stripe/react-stripe-js`

**New components:**
- `CheckoutPage` — Stripe Elements with `clientSecret` from URL param, success redirect
- `PurchaseCourseButton` — passes secret/session/course via URL (no localStorage)

**Security:**
- `clientSecret` never in localStorage, never in DOM text
- User-safe error messages (no raw Stripe error strings in DOM)

### Phase 30 — Personal Knowledge Graph + Annotation Merge Request (PRD §4.3+§4.4)

**New pages/routes:**
- `/knowledge-graph` (tab toggle: Global / My Wiki via `viewMode`)
- `/instructor/merge-queue` — `InstructorMergeQueuePage`

**New components:**
- `PersonalGraphView` — SVG wiki of personal annotations (6 nodes, 7 edges, course colour legend)
- `AnnotationMergeRequestModal` — textarea, 0/500 char counter, submit guard, aria-modal
- `InstructorMergeQueuePage` — diff view, approve/reject, resolved section
- `AnnotationItem` — new `Propose to Official` button (PERSONAL layer + own-user only)

**New GraphQL-adjacent types:**
- `viewMode: 'global' | 'personal'` on KnowledgeGraph page state
- `proposingId` + `submittedIds` state in AnnotationPanel

### Phase 31 — Video Sketch Overlay Enhancement (PRD §4.2)

**New components:**
- `VideoSketchToolbar` — 6 tool buttons (aria-pressed), color picker swatch, Save/Clear/Cancel
- `useSketchCanvas` hook — freehand, eraser (destination-out), rect, arrow, ellipse, text tools

**New types/exports:**
- `SketchTool` union: `'freehand' | 'eraser' | 'rect' | 'arrow' | 'ellipse' | 'text'`
- `SketchPath` re-exported for backward compatibility

### Phase 32 — Real-time AI Subtitle Translation (PRD §3.4 G-2)

**New DB column (migration 0013):**
- `transcripts.vtt_key` (nullable varchar) — MinIO VTT file key

**New GraphQL types (subgraph-content):**
```graphql
type SubtitleTrack {
  language: String!   # BCP-47 e.g. "en", "he", "fr"
  label: String!
  url: String!        # Presigned MinIO GET URL
}
```

**New field on MediaAsset:**
```graphql
type MediaAsset {
  # ...existing fields...
  subtitleTracks: [SubtitleTrack!]!  @ResolveField
}
```

**New components:**
- `VideoSubtitleSelector` — CC button, language dropdown, Off option, ARIA attributes
- `VideoPlayer` — `subtitleTracks` prop, `<track>` elements per language, `activeSubtitle` state

**New environment variables:**
- `TRANSLATION_TARGETS` — comma-separated BCP-47 codes (empty = disabled)
- `LIBRE_TRANSLATE_URL` — LibreTranslate server URL

**New service (transcription-worker):**
- `TranslationService` — LibreTranslate HTTP client, VTT generation, MinIO upload, NATS event
- `TranslationModule` — NestJS module (imports NatsModule, exports TranslationService)

### Phase 33 — Remote Proctoring (PRD §7.2 G-4)

**New DB table (migration 0014):**
- `proctoring_sessions` — `id`, `tenant_id`, `user_id`, `session_id`, `started_at`, `ended_at`, `flags` (JSONB), `recording_key`, RLS enabled

**New GraphQL types (subgraph-agent):**
```graphql
enum ProctoringFlagType {
  TAB_SWITCH
  FACE_NOT_VISIBLE
  MULTIPLE_FACES
  AUDIO_DETECTED
  COPY_PASTE
  FULLSCREEN_EXIT
}

type ProctoringFlag {
  type: ProctoringFlagType!
  timestamp: DateTime!
  details: String
}

type ProctoringSession {
  id: ID!
  userId: ID!
  sessionId: ID!
  startedAt: DateTime!
  endedAt: DateTime
  flags: [ProctoringFlag!]!
  recordingKey: String
}
```

**New mutations (subgraph-agent):**
```graphql
type Mutation {
  startProctoringSession(sessionId: ID!): ProctoringSession!  @authenticated
  flagProctoringEvent(
    proctoringSessionId: ID!
    type: ProctoringFlagType!
    details: String
  ): ProctoringSession!  @authenticated
  endProctoringSession(proctoringSessionId: ID!): ProctoringSession!  @authenticated
}
```

**New queries (subgraph-agent):**
```graphql
type Query {
  proctoringSession(id: ID!): ProctoringSession  @authenticated
  proctoringReport(sessionId: ID!): ProctoringSession  @authenticated
}
```

**New frontend components:**
- `ProctoringOverlay` — webcam preview (WebRTC), tab-switch detection (visibilitychange), active badge, flag count badge
- `ProctoringReportCard` — status badge + flag timeline list
- `AssessmentForm` — `proctoringEnabled` prop integration
- `useProctoringSession` hook — start/flag/end/isActive lifecycle
- `proctoring.queries.ts` — 3 mutations + 1 query (urql/gql)

### Phase 34 — 3D Models & Simulations (PRD §3.3 G-1)

**New DB columns on `media_assets` (migration 0015):**
- `model_format` — varchar nullable (gltf/glb/obj/fbx)
- `model_animations` — JSONB nullable
- `poly_count` — integer nullable

**New enum value:**
- `AssetType.MODEL_3D`

**New GraphQL types (subgraph-content):**
```graphql
type ModelAnimation {
  name: String!
  duration: Float!
}

type Model3DInfo {
  format: String!
  animations: [ModelAnimation!]!
  polyCount: Int
}
```

**New field and mutation (subgraph-content):**
```graphql
type MediaAsset {
  # ...existing fields...
  model3d: Model3DInfo  # nullable
}

type Mutation {
  uploadModel3D(
    courseId: ID!
    format: String!
    filename: String!
  ): MediaAsset!  @authenticated  @requiresScopes(scopes: ["content:write"])
}
```

**New frontend components:**
- `Model3DViewer` — Three.js WebGL viewer (dynamic import), OrbitControls, loading/error states, full memory safety
- `model3d.queries.ts` — `UPLOAD_MODEL_3D_MUTATION` + `GET_MEDIA_ASSET_MODEL_QUERY`

**New test stubs:**
- `three-stub.ts`, `three-gltf-stub.ts`, `three-orbit-stub.ts` (vitest alias entries)

---

## Updated test counts (Phase 34 HEAD)

Based on OPEN_ISSUES.md header (authoritative):

| Package | Phase 27 count | Phase 34 count | Delta |
|---------|---------------|----------------|-------|
| subgraph-agent | 599 | ~677 | +78 (live sessions mutations + pentest + proctoring: 16 unit + 23 overlay) |
| subgraph-content | 1,041 | 1,055+ | +14 (model3d service spec) |
| subgraph-knowledge | 509 | 509 | ~0 |
| subgraph-core | 640 | 640 | 0 |
| subgraph-annotation | 144 | 144 | 0 |
| subgraph-collaboration | 161 | 161 | 0 |
| web (frontend) | 3,315 | ~3,594+ | +279 (checkout 8 + personal graph 44 + sketch tools 21 + subtitles 9 + proctoring 23 + model3d 18 + live sessions 82 + courses discovery 24 + offline queue 18 + merge queue 10 + annotation propose 7 + KG personal 8 + SkillTree pentest + ARIA + E2E new specs) |
| security tests | 816 | 819 | +3 (SI-3 regression guards) |
| mobile | 119 | 119 | 0 |
| **TOTAL** | **5,762+** | **~6,350+** | **+588** |

---

## Documents requiring updates

| # | Document | Current state | Missing content | Effort |
|---|----------|--------------|----------------|--------|
| 1 | `CHANGELOG.md` | Ends at `[0.27.0]` | Versions `[0.28.0]` through `[0.34.0]` (7 new entries, one per phase) | M |
| 2 | `IMPLEMENTATION_ROADMAP.md` | Phase 28 defined as planned; no 29-34 defined | Mark Phase 28 as complete; add Phases 29-34 as completed sections; update Phase 29 "Planned" stub; add Phase 35 next | L |
| 3 | `docs/project/PROJECT_STATUS.md` | Shows Phase 27 complete, commit `c0e4810`, 5,762+ tests | Update session to 28, commit to `1e3314b`, phases 28-34 complete, 34/34, test count ~6,350+, "All PRD gaps closed" milestone | S |
| 4 | `docs/project/SESSION_SUMMARY.md` | Ends at Session 1 (early phases listed) — not updated past Phase 3 | Add Session 28 deliverables entry covering Phases 28-34 | M |
| 5 | `docs/project/IMPLEMENTATION_STATUS.md` | Last updated 2026-03-05, Session 22 noted, subgraph-agent at 599 tests | Update session to 28, update subgraph-agent to 677+, subgraph-content to 1,055+, web to 3,594+, total to 6,350+; append Phase 28-34 sections | M |
| 6 | `docs/project/SPRINT_ACTION_PLAN.md` | Shows Phase 27 complete, Phase 28 "upcoming" with old PWA-focused scope | Mark Phase 28-34 complete; add Phase 35 as next sprint goal | S |
| 7 | `docs/testing/TEST_REGISTRY.md` | Session 27, total 5,762+, subgraph-agent 599, web 3,315, security 816 | Update all counts; add new test files for Phases 28-34 in the per-package table | M |
| 8 | `API_CONTRACTS_GRAPHQL_FEDERATION.md` | Section 21 is last (Phases 25-27). No mention of Stripe, Proctoring, 3D, Subtitles, Personal Graph | Add **Section 22** covering Phases 28-34 types (8 subsections below) | L |
| 9 | `README.md` | "Recently Added (Sessions 25-27)" — no mention of 28-34; test counts stale (5,762+) | Update "Recently Added" to include Sessions 28 features; update test count to ~6,350+; note "All PRD gaps closed" | S |
| 10 | `docs/project/DOC_QA_REPORT_SESSION27.md` | QA report for Session 27 — archival, no update needed | N/A | 0 |

**Total documents requiring updates: 9** (all except the archival QA report)

---

## API_CONTRACTS Section 22 — Required subsections

The new Section 22 must cover:

| Subsection | Phase | Types |
|------------|-------|-------|
| 22.1 | Phase 28 | Live Session mutations (endLiveSession, joinLiveSession, cancelLiveSession, startLiveSession, CANCELLED enum, getSessionAttendees query) |
| 22.2 | Phase 28 | SI-3 encryption exports (encryptField/decryptField/deriveTenantKey from packages/db) |
| 22.3 | Phase 29 | Stripe checkout (CheckoutPage, PurchaseCourseButton, /checkout route, @stripe/stripe-js deps) |
| 22.4 | Phase 30 | Personal Knowledge Graph (PersonalGraphView, viewMode toggle, AnnotationMergeRequestModal, InstructorMergeQueuePage, /instructor/merge-queue route) |
| 22.5 | Phase 31 | Video Sketch Tools (SketchTool union, useSketchCanvas, VideoSketchToolbar, 6 tools) |
| 22.6 | Phase 32 | AI Subtitle Translation (SubtitleTrack type, subtitleTracks field on MediaAsset, TranslationService, TRANSLATION_TARGETS env) |
| 22.7 | Phase 33 | Remote Proctoring (ProctoringSession, ProctoringFlag, ProctoringFlagType enum, 3 mutations, 2 queries, proctoring_sessions DB table) |
| 22.8 | Phase 34 | 3D Models (Model3DInfo, ModelAnimation, AssetType.MODEL_3D, uploadModel3D mutation, model3d field on MediaAsset, migration 0015) |

---

## Work plan — parallel agents D1-D5

### Agent assignments (all run in parallel)

| Agent | Documents | Effort | Priority |
|-------|-----------|--------|----------|
| **D1** | `CHANGELOG.md` (add v0.28.0–v0.34.0) | M | P1 |
| **D2** | `IMPLEMENTATION_ROADMAP.md` (Phases 28-34 as complete + Phase 35 next) | L | P1 |
| **D3** | `API_CONTRACTS_GRAPHQL_FEDERATION.md` (Section 22 with 8 subsections) | L | P1 |
| **D4** | `docs/project/PROJECT_STATUS.md` + `docs/project/SESSION_SUMMARY.md` + `docs/project/SPRINT_ACTION_PLAN.md` | S | P2 |
| **D5** | `docs/project/IMPLEMENTATION_STATUS.md` + `docs/testing/TEST_REGISTRY.md` + `README.md` | M | P2 |

### Execution order

1. Launch D1 + D2 + D3 in parallel (largest documents, most content to add)
2. Launch D4 + D5 in parallel (smaller updates, can start immediately)
3. Final review pass: verify all cross-references between documents are consistent

### Phase 35 definition (for IMPLEMENTATION_ROADMAP + SPRINT_ACTION_PLAN)

All PRD gaps are now closed (G-1 through G-4, P-1 through P-3). Phase 35 scope candidates:
- Performance hardening (Lighthouse >= 90 on all pages, code splitting, lazy loading)
- Advanced analytics dashboard (learning velocity, at-risk learners, 10+ KPIs per tenant)
- Mobile parity (Live Sessions, Offline mode, SkillTree, Proctoring on Expo SDK 54)
- AI personalization (recommendSkillPath via Apache AGE graph traversal on user_skill_mastery)
- Push notifications (VAPID + Web Push API + Keycloak NATS events)

---

## Summary

- **9 commits** audited (3229051..1e3314b)
- **Phases covered:** 28, 29, 30, 31, 32, 33, 34 (7 phases in one session)
- **Key milestone:** ALL PRD gaps closed (G-1 3D Models, G-2 Subtitles, G-3 Annotation Merge, G-4 Proctoring, P-1 Sketch Tools, P-2 Personal KG, P-3 Stripe Checkout)
- **New features:** Stripe checkout, Personal Knowledge Graph wiki, Annotation Merge Requests, Video Sketch tools (6 drawing modes), AI subtitle translation (LibreTranslate), Remote proctoring (WebRTC + flagging), 3D model viewer (Three.js)
- **New GraphQL types:** SubtitleTrack, ProctoringSession, ProctoringFlag, ProctoringFlagType, Model3DInfo, ModelAnimation — plus 8 new mutations
- **New DB tables:** proctoring_sessions (migration 0014)
- **New DB columns:** transcripts.vtt_key (0013), media_assets.model_format/model_animations/poly_count (0015), live_sessions column rename (0012)
- **New packages:** @stripe/stripe-js, @stripe/react-stripe-js, three (with test stubs)
- **Test delta:** ~+588 tests (5,762+ → ~6,350+)
- **Security additions:** SI-3 fully implemented (encryptField exports), proctoring isolation via RLS
- **9 documents need updating** (CHANGELOG, ROADMAP, API_CONTRACTS, PROJECT_STATUS, SESSION_SUMMARY, IMPLEMENTATION_STATUS, SPRINT_ACTION_PLAN, TEST_REGISTRY, README)
- **Recommended parallel execution:** 5 agents (D1-D5), D1+D2+D3 first wave, D4+D5 second wave
