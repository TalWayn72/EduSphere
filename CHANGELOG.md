# Changelog

All notable changes to EduSphere are documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
Versioning: Session-based (Session N = version 0.N.0)

---

## [0.44.0] — 2026-03-09

### Added
- **Skills-Based Learning Paths** — full DB schema (4 tables: skills, skill_prerequisites, skill_paths, learner_skill_progress) with Drizzle ORM + migration 0026
- RLS policies on skill_paths (tenant isolation) and learner_skill_progress (per-user isolation, SI-1 compliant with app.current_user_id)
- `apps/subgraph-agent/src/skills/` — SkillService, SkillGapService, SkillResolver, SDL with 5 queries + 2 mutations
- `apps/web/src/pages/SkillPathPage.tsx` — `/skills` route, grid layout with mounted guard, loading/empty/error states
- `apps/web/src/pages/SkillGapDashboard.tsx` — `/skills/gap/:pathId` route, two-column mastered/gap view
- `apps/web/src/components/skills/SkillPathCard.tsx` — card with progress bar, expand/collapse, gap analysis CTA
- `apps/web/src/lib/graphql/skills.queries.ts` — SKILLS_QUERY, SKILL_PATHS_QUERY, MY_SKILL_PROGRESS_QUERY, SKILL_GAP_ANALYSIS_QUERY, UPDATE_SKILL_PROGRESS_MUTATION
- AppSidebar — added "Skill Paths" nav item (Target icon, /skills route)
- Router — added /skills and /skills/gap/:pathId lazy routes

### Security
- learner_skill_progress RLS uses app.current_user_id (SI-1 compliant, not app.current_user)
- skill_paths RLS restricts writes to INSTRUCTOR/ORG_ADMIN/SUPER_ADMIN roles

### Tests
- 21 RLS validation tests (packages/db/src/rls/skills-rls.test.ts)
- 4 SkillPathPage unit tests (hardened with act() + waitFor timeout:5000)
- 5 SkillGapDashboard unit tests
- 7 security tests (tests/security/api-security.spec.ts — Phase 44 block)
- Seed data: 20 sample skills + 10 prerequisite edges

---

## [0.43.0] — 2026-03-09

### Added
- **Expo SDK 55 Migration** — apps/mobile upgraded to Expo ~55.0.0 + RN 0.83.0, expo-video ~2.0.0 replaces expo-av, react-native-reanimated ^4.0.0 (New Architecture), edgeToEdgeEnabled: true for Android 16+
- **SCORM 2004 Player** — apps/web/src/lib/scorm/scorm2004-data-model.ts (CMI data model, ISO 8601 duration utils), apps/web/src/components/scorm/Scorm2004Player.tsx (iframe player with postMessage SCORM 2004 API)
- **cmi5 AU Launcher** — apps/web/src/components/scorm/Cmi5Player.tsx + apps/subgraph-content/src/scorm/cmi5-launcher.service.ts (9 required ADL verbs, MoveOn criteria, launch URL builder)
- **InstructorAnalyticsDashboard** — /instructor/analytics route, 4 stat cards, 4 tabs (Overview, Learner Engagement, At-Risk Learners, AI Usage), role-gated to INSTRUCTOR+
- **MyProgressPage** — /my-progress route, student self-analytics (streak, challenges, leaderboard rank)
- **AI Usage Analytics** — AiUsageService querying xapi_statements for AI tutor usage metrics, aiUsageStats GraphQL query
- **Microlearning resolvers** — dailyMicrolesson, microlearningPaths, createMicrolearningPath in subgraph-content
- **DropOffFunnelChart** — Recharts bar chart with color-coded drop-off rates (red/amber/green thresholds)
- **AtRiskLearnersPanel** — table component with risk scores, days since active, progress %, risk factor badges

### Security
- SCORM 2004 suspend_data has no length cap (unlike SCORM 1.2's 4096-byte limit)
- cmi5 launch URL includes all required ADL security parameters (actor, endpoint, authToken, activityId, registration)
- 5 security tests for Phase 43 SCORM/analytics RBAC (tests/security/api-security.spec.ts)

### Tests
- 9 mobile migration tests (apps/mobile/src/screens/__tests__/VideoMigration.test.ts)
- 20 SCORM 2004 data model tests (scorm2004-data-model.test.ts)
- 14 cmi5 launcher service tests (cmi5-launcher.service.spec.ts)
- 12 InstructorAnalyticsDashboard tests + 7 DropOffFunnelChart tests
- 9 MyProgressPage tests
- 6 AiUsageService tests

---

## [0.42.0] — 2026-03-09

### Added
- **White-Label Runtime** — tenants can now customize the UI at runtime via `myTenantBranding` GraphQL query
- `useTenantBranding` hook — applies CSS variables + optional `customCss` (injected via `textContent`, XSS-safe)
- `BrandingContext` + `BrandingProvider` — all authenticated pages receive live branding
- `AppSidebar` dynamic branding — shows tenant logo, org name, conditional "Powered by EduSphere" footer
- `publicBranding(slug)` GraphQL query (unauthenticated) — Login page customization per tenant
- `usePublicBranding` hook — Login page reads `?tenant=` slug and applies public branding

### Security
- `customCss` injection uses `el.textContent` not `el.innerHTML` (XSS prevention)
- `publicBranding` query returns only 6 safe public fields — no `customCss` or `hideEduSphereBranding`
- E2E security test: verifies public query does not expose sensitive branding fields

### Tests
- 8 new unit tests (useTenantBranding, BrandingContext, usePublicBranding, tenant-branding-public service)
- 6 new E2E tests (white-label.spec.ts)
- 3 new security tests (api-security.spec.ts)

---

## [0.41.0] — 2026-03-09

### Added
- **xAPI NATS Bridge** — `XapiNatsBridgeService` subscribes to 6 NATS learning events and auto-generates xAPI 1.0.3 statements (completed, registered, attended, launched, attempted, responded)
- **xAPI verb mappings** — pure `natsToXapiStatement()` mapper with full ADL-compliant verb table
- **xAPI export** — `xapiStatementCount` query + `clearXapiStatements` mutation (SUPER_ADMIN only)
- **Google Drive import** — native-fetch `GoogleDriveClient` + `importFromDrive` GraphQL mutation + `DriveImportCard` React component with OAuth flow
- **OAuthCallbackPage** — `/oauth/google/callback` route relays authorization code via `postMessage`
- **Mobile xAPI offline queue** — `XapiOfflineQueue` (expo-sqlite) with 500-row eviction cap + `useXapiTracking` hook

### Changed
- `content-import.graphql` — added `DriveImportInput` type + `importFromDrive` mutation
- `xapi.graphql` — added `xapiStatementCount` + `clearXapiStatements` fields
- `xapi.module.ts` — registered `XapiNatsBridgeService` + `XapiExportService`
- `supergraph.graphql` — added new xAPI and Drive import fields

### Security
- Drive `accessToken` is never stored in DB or logs — used in-flight only
- NATS bridge skips any event missing `tenantId` or `userId`
- All xAPI admin mutations require `ORG_ADMIN` or `SUPER_ADMIN` role

---

## [0.38.0] — 2026-03-08 — Phase 38: Certificate Download, Marketplace, QuizBuilder, SRS Mobile (commit a2ffe4f)

### Added
- `certificate-download.service.ts` — S3Client presigned URL (15-min TTL) with ownership check before signing
- `certificateDownloadUrl` GraphQL query: SDL type definition, resolver, and supergraph federation entry
- `marketplace.service.ts` — Drizzle 3-table JOIN with parameterized filters for course marketplace browsing
- `CertificatesPage.tsx` — urql query with mounted guard; raw `pdfUrl` is never rendered into the DOM (SI-9 compliant)
- `QuizBuilderPage.tsx` + `QuizBuilderForm.tsx` + `QuizQuestion.tsx` — instructor-facing quiz creation flow
- `MarketplacePage.tsx` — real `title`/`instructorName` fields from JOIN query + debounced filter bar
- `InstructorEarningsPage.tsx` — converted `enabled: false` pattern to mounted guard for memory safety
- `AppSidebar.tsx` — Certificates, SRS Review, and Quiz Builder navigation items added
- `SrsReviewScreen.tsx` + `CertificatesScreen.tsx` — Expo SDK 54 mobile screens
- `srs.logic.ts` + `certificates.logic.ts` — pure business logic modules with 32 unit tests
- i18n: `certificates`, `srsReview`, `quizBuilder`, `gamification` namespaces synced to all 10 locales

### Fixed
- `DashboardPage`: `bannerTimerRef` cleanup on unmount (memory safety — `clearTimeout` in `useEffect` return)
- `webPush` / service-worker ESLint `no-undef` errors resolved

### Tests
- Web: **3,881 tests** across 302 files (net +131 tests vs Phase 37)
- Security: **967 assertions** including +19 new `graphql-authorization` checks
- Mobile: **19 tests** (pure logic — `srs.logic.spec.ts` + `certificates.logic.spec.ts`)
- E2E: 4 new Playwright specs — `certificates.spec.ts`, `marketplace-data.spec.ts`, `quiz-builder.spec.ts`, `srs-review.spec.ts`

### Security
- SI-9 compliant throughout: `tenantId` sourced from JWT context only, never from GraphQL arguments
- Raw `pdfUrl` never injected into DOM — returned only via secure presigned URL with 15-min TTL
- +19 `graphql-authorization` security test assertions covering new queries/mutations

---

## [0.27.0] — 2026-03-06 — Phase 27: Live Sessions, Offline Web, Course Discovery, KG Context

### Added
- Live Sessions subgraph (subgraph-agent): `LiveSessionsPage`, `LiveSessionDetailPage`, NATS JetStream event integration (`session.started`, `session.ended`)
- Offline Web: ServiceWorker + IndexedDB via `OfflineLessonCache`, `OfflineBanner` component, `useOfflineStatus` hook, `useOfflineQueue` hook with 100-item LRU eviction
- `AdminActivityFeed` component with 30-second auto-refresh and `clearInterval` cleanup (memory safety compliant)
- KnowledgeGraph courseId context: `KnowledgeGraphPage` now passes `courseId` from URL params to graph queries
- `CoursesDiscoveryPage`: search input, category/level filters, `MasteryBadge` integration, card layout
- Routes fully wired: `/explore`, `/discover`, `/courses/discover`, `/sessions`, `/skill-tree`
- `SmartRoot` component for root-level route resolution
- 175 new tests (109 unit + 66 E2E), 44 visual regression screenshots

### Fixed
- BUG-054: `<Progress>` `barColor` was applied to the container div (outer wrapper), making the bar appear solid at 0% usage. Added `indicatorClassName` prop — color now applies to the inner indicator div only.

### Security
- SI-3: `attendeePasswordEnc` / `moderatorPasswordEnc` — AES-256-GCM encryption for live session passwords (plaintext columns removed)
- Raw GraphQL error messages no longer exposed in `LiveSessionsPage` DOM (replaced with generic user message)
- PENTEST-001..023: penetration tests covering auth bypass, IDOR, XSS, injection for live sessions and offline queue
- GDPR Art.30: `PROCESSING_ACTIVITIES.md` added for data processing register

---

## [0.34.0] — 2026-03-06 — Phase 34: 3D Models & Simulations (PRD §3.3 G-1)

🎉 **ALL PRD GAPS CLOSED** — G-1, G-2, G-3, G-4, P-1, P-2, P-3 all complete.

### Added
- `Model3DViewer.tsx`: Three.js WebGL viewer with OrbitControls, loading/error states, full memory safety
- `Model3DInfo` + `ModelAnimation` GraphQL types; `AssetType.MODEL_3D` enum value
- `uploadModel3D` mutation with format validation (gltf/glb/obj/fbx) + MinIO presigned URL
- DB migration 0015: `model_format`, `model_animations` (JSONB), `poly_count` on `media_assets`
- Three.js vitest stubs (three-stub, three-gltf-stub, three-orbit-stub)

### Tests
- 14 service tests + 18 component tests + 5 E2E + 2 visual regression

---

## [0.33.0] — 2026-03-06 — Phase 33: Remote Proctoring (PRD §7.2 G-4)

### Added
- `ProctoringOverlay.tsx`: WebRTC webcam preview, tab-switch detection, flag count badge
- `ProctoringReportCard.tsx`: status badge + flag timeline
- `ProctoringSession`, `ProctoringFlag`, `ProctoringFlagType` enum (GraphQL + DB)
- Mutations: `startProctoringSession`, `flagProctoringEvent`, `endProctoringSession`
- Queries: `proctoringSession`, `proctoringReport`
- DB migration 0014: `proctoring_sessions` table with JSONB flags + RLS tenant isolation
- Memory safety: `visibilitychange` listener removed + `MediaStream.getTracks().stop()` on unmount

### Tests
- 16 service tests + 23 component tests + 6 E2E + 3 visual regression

---

## [0.32.0] — 2026-03-06 — Phase 32: Real-time AI Subtitle Translation (PRD §3.4 G-2)

### Added
- `TranslationService`: LibreTranslate HTTP client, VTT generation, MinIO upload, NATS event
- `SubtitleTrack` GraphQL type; `subtitleTracks` field on `MediaAsset`
- `VideoSubtitleSelector`: CC button, language dropdown, Off option, ARIA attributes
- `VideoPlayer`: multi-language subtitle track support with `<track>` elements
- DB migration 0013: `transcripts.vtt_key` column for VTT file storage in MinIO
- Env: `TRANSLATION_TARGETS` (comma-separated BCP-47), `LIBRE_TRANSLATE_URL`
- `.husky/pre-commit`: added `|| true` to fix grep no-match exit code crash

### Tests
- 11 unit (TranslationService) + 9 unit (VideoPlayer subtitles) + 10 E2E + 3 visual regression

---

## [0.31.0] — 2026-03-06 — Phase 31: Video Sketch Overlay Enhancement (PRD §4.2 P-1)

### Added
- `useSketchCanvas.ts`: drawing hook with 6 tools — freehand, eraser, rect, arrow, ellipse, text
- `VideoSketchToolbar.tsx`: 6 tool buttons (aria-pressed), color picker, Save/Clear/Cancel
- Text tool: positioned `<input>` on canvas click, commits on Enter/blur
- Color picker: full swatch support per tool
- Shape preview during mousemove via `shapeEndRef` pattern

### Tests
- 21 new unit tests + 4 visual regression screenshots (freehand, eraser, rect, toolbar-inactive)

---

## [0.30.0] — 2026-03-06 — Phase 30: Personal Knowledge Graph Wiki + Annotation Merge Request (PRD §4.3+§4.4)

### Added
- `PersonalGraphView.tsx`: SVG wiki of personal annotations across all courses (6 nodes, 7 edges, colour legend)
- `KnowledgeGraph.tsx`: Global / My Wiki tab toggle (`viewMode: 'global' | 'personal'`)
- `AnnotationMergeRequestModal.tsx`: propose annotation to official knowledge base, 500-char counter
- `AnnotationItem.tsx`: "Propose to Official" button (PERSONAL layer + own-user only)
- `InstructorMergeQueuePage.tsx`: approval queue with diff view, approve/reject; route `/instructor/merge-queue`

### Tests
- 44 unit tests + 15 E2E + 4 visual regression (kg-global, kg-personal-wiki, merge-queue ×2)

---

## [0.29.0] — 2026-03-06 — Phase 29: Stripe Checkout Flow (PRD §8.4)

### Added
- `CheckoutPage.tsx`: Stripe Elements with `clientSecret` from URL params, success redirect
- `PurchaseCourseButton`: passes `secret+session+course` via URL; `/checkout` route (lazy-loaded)
- Packages: `@stripe/stripe-js`, `@stripe/react-stripe-js`
- Security: `clientSecret` never in `localStorage`, never in DOM text, user-safe error messages

### Tests
- 8 unit tests + 8 E2E + 2 visual regression screenshots (checkout-flow.spec.ts)

---

## [0.28.0] — 2026-03-06 — Phase 28: Live Sessions Mutations, Offline Sync, PWA, SI-3 Fix

### Added
- Live Session mutations: `endLiveSession`, `joinLiveSession`, `cancelLiveSession`, `startLiveSession`
- `useLiveSessionActions` hook: all 4 mutations with toast error handling
- `CANCELLED` status added to `LiveSessionStatus` enum
- SI-3 security fix: `encryptField()`/`decryptField()` wired in `live-session.service.ts` (plaintext never written to DB)
- `useOfflineQueue`: online-event flush + 48h TTL + 100-item LRU
- Background sync: `pwa.ts` with `onNeedRefresh`/`onOfflineReady`/`onRegistered` callbacks; hourly SW poll
- PWA: `vite.config.ts` theme_color `#6366F1` (Indigo design system)
- `CoursesDiscovery`: Category + Level + Sort filters; `aria-pressed`, `aria-label`, `role="group"`
- DB migration 0012: idempotent `custom_migrations` table runner for migrations 0010-0012
- NATS SI-7 fix: `getNatsConnection()` uses env-var TLS (`NATS_TLS_CA_FILE`)
- Husky v10: `#!/bin/sh` (removed deprecated `husky.sh` sourcing)

### Security
- SI-3 regression tests: assert plaintext never written to DB
- SI-7: NATS TLS configuration via environment variables
- `live-sessions-p28.pentest.spec.ts`: SQL/XSS injection guards

### Tests
- 72 LiveSessionsPage unit + 24 CoursesDiscovery unit + 18 useOfflineQueue unit + 10 live-session SI-3 + 6 memory safety + 4 E2E specs

---

## [0.26.0] — 2026-03-05 — Session 25 Phase 5: Mobile Design System Alignment

### Added
- `apps/mobile/src/lib/theme.ts`: Indigo design tokens (`COLORS.primary = #6366F1`, `SPACING`, `RADIUS`, `FONT`, `SHADOW`)
- `MasteryBadge` mobile component: 5-level badge with semantic colors and `testID=mastery-badge-${level}`
- `HomeScreen` redesign: indigo primary palette, streak row with flame icon, 4 stat cards with semantic colors
- `CoursesScreen`: search input integration, `MasteryBadge` per course, left-accent card layout
- `ProfileScreen` + `SettingsScreen`: migrated from iOS `#007AFF` / Material `#2563EB` to `COLORS.primary`
- Navigation: `tabBarActiveTintColor` unified to `COLORS.primary`
- `apps/mobile/src/lib/ai-consent.ts`: AI consent check utilities
- `apps/mobile/src/lib/stats-utils.ts`: learning statistics utility functions

### Changed
- Mobile vitest config: added `__DEV__: true` global define; `CoursesScreen`, `MasteryBadge`, `HomeScreen` test files included
- Mobile test pattern: pure logic tests only (no `@testing-library/react-native` — not installed)

---

## [0.25.4] — 2026-03-06 — Session 25 Phase 4: Accessibility (WCAG 2.2 AAA)

### Added
- `SkipLinks` component: keyboard-accessible skip-to-main-content and skip-to-navigation links
- `useFocusTrap` hook: traps keyboard focus within modals and dialogs
- `useAnnounce` hook: dual ARIA live region announcer (polite + assertive)
- `useReducedMotion` hook: respects `prefers-reduced-motion` media query
- `ThemeSettingsPage` at `/settings/theme`: user-facing theme controls (light/dark/system, color scheme, font size, reduced motion, high contrast)
- FOUC prevention: inline script in `index.html` reads `localStorage` before React hydrates

### Changed
- `useFocusTrap` TypeScript fix: `noUncheckedIndexedAccess` guard — `const firstEl: HTMLElement = first` after null guard

---

## [0.25.3] — 2026-03-06 — Session 25 Phase 3: Learning Experience (Video + KnowledgeSkillTree)

### Added
- `VideoPlayerWithCurriculum`: 320px collapsible curriculum sidebar alongside video player with progress tracking
- `KnowledgeSkillTree` (alias `SkillTreePage`): BFS graph traversal + SVG bezier edge connections; renders mastery levels per node
- `SkillTreePage` route at `/skill-tree`

---

## [0.25.2] — 2026-03-06 — Session 25 Phase 2: Navigation + Dashboard Revolution

### Added
- `AppSidebar`: collapsible 240px → 64px icon-only sidebar, 6 navigation groups, hover tooltips in collapsed state
- `DashboardPage` redesign: 5 sections — KPIs, learning streak, course progress, skill mastery, recent activity
- `CoursesDiscoveryPage` with `CourseCard` component: search, sort, filter, mastery badge
- Tenant-themes DB migration (`0010_tenant_themes`): `tenant_themes` table + RLS + `user_preferences` columns

### Changed
- `Layout.tsx`: `AppSidebar` integration; Layout test mock hoists `mockGetCurrentUser()` to avoid `require()` inside `vi.mock`

---

## [0.25.1] — 2026-03-05 — Session 25 Phase 1: Design System + Theme Engine

### Added
- Indigo design system: primary `#6366F1`, mastery level tokens (Novice → Expert), semantic color scales
- `ThemeProvider`: 3-tier theming (globals.css `:root` → tenant primitives via CSS vars inline → user prefs via class toggles on `<html>`)
- `LandingPage` at `/`: hero, features section, CTA, responsive layout
- `MasteryBadge` web component: 5 mastery levels with accessible labels
- `globals.css` design token variables

---

## [0.24.0] — 2026-03-05 — Session 24: PRD Gap Closure (G1 + G2 + G3 + G5 + G6 + G8)

### Added
- **G1 — Context Panel**: `ContextPanel.tsx` — debounced HybridRAG sidebar (600ms), shows Related Concepts + Related Segments with jump-to-timestamp; replaces stub "Collaboration coming soon" tab
- **G2 — Canvas/Spatial Annotations (Video Sketch Overlay)**: `VideoSketchOverlay.tsx` — HTML5 Canvas freehand sketching over video; normalized (0–1) coordinates saved as `SketchPath[]` with video timestamp; SVG overlay shows existing sketches within ±3s window
- **G3 — Annotation Promote**: `promoteAnnotation` mutation in backend SDL + `AnnotationService.promote()`; `CommentCard` gains Promote button (ArrowUpCircle, indigo) for INSTRUCTOR layer promotion
- **G5 — Agent Studio (No-Code Workflow Builder)**: `AgentStudioPage.tsx` at `/agents/studio` — drag-and-drop LangGraph-style agent composer with 6 node types, SVG bezier edges, click-to-connect, properties panel
- **G6 — Deep Linking (Search → Video Timestamp)**: `SemanticResult.startTime` field; search results for transcripts link directly to `/learn/:entityId?t=<seconds>`
- **G8 — Auto-Flashcards (Annotation → SRS)**: `CommentCard` Flashcard button — calls `createFlashcard()` which reuses `createReviewCard` SRS mutation
- Playwright E2E specs for all 6 gap features; visual regression screenshots

### Fixed
- DB migration idempotency: removed `CONCURRENTLY` from migration 0007, added `IF NOT EXISTS` to migration 0009
- Session 24 completion gate: 0 lint errors, 0 TypeScript errors, all security tests pass

---

## [0.23.0] — 2026-03-05 — Session 23: Mobile Polish + Quality

### Added
- `LoggerModule` extraction: shared NestJS logger module extracted for reuse across all 6 subgraphs
- `TIME` constants package (`packages/config`): centralized duration constants (seconds, minutes, hours)
- Mobile TypeScript: all remaining `any` types replaced with proper interfaces across mobile services and screens
- `@ts-expect-error` descriptions added to all suppressed errors in pipeline spec (CI requirement)

### Fixed
- Mobile `any` type elimination: `apps/mobile/src/screens/`, services, and type files fully typed
- Security audit clean: 0 `no-explicit-any` violations in production code

---

## [0.22.0] — 2026-03-05 — Session 22: Gateway v2.5 + Admin Phase 7 + Code Quality

### Added
- **Hive Gateway v2.5.1** upgrade with improved performance and federation v2.7 compliance
- **Admin Phase 7 — Notification Templates**: template editor with variable interpolation, preview, channel selection
- Code Quality Initiative (CQI) tracks: T2 (no-explicit-any enforcement), T4 (file splitting), T6 (barrel files), T8 (service extraction), T9 (test isolation), T11 (memory safety)
- E2E expansion: Playwright specs for 10 additional admin routes
- DB migration: idempotent migration guards

### Fixed
- BUG-047: Language persistence — Hebrew UI setting now survives page refresh (localStorage + `i18n.changeLanguage`)
- BUG-048: Drizzle schema drift — dead `courses.ts` schema identified; real schema is `content.ts` (exported from `index.ts`)
- BUG-052: React concurrent-mode — `useUserPreferences` and `SRSWidget` now use `mounted` guard before `useQuery`

---

## [0.21.0] — 2026-03-05 — Session 21: Master Completion Plan (Tracks 0–6)

### Added
- **Admin Phases 1–3**: User Management CRUD, Org Settings, Analytics dashboard
- **LangGraph tools**: additional agent nodes (Socratic, Assessment, Feedback)
- `useOptimistic` pattern for instant UI updates on mutation submit
- OpenBadges federation fix: moved badge resolvers from Core → Content subgraph

### Fixed
- FEAT-055: `LessonResultsPage` — all 10 pipeline output types rendered; E2E 28/28 passing
- LessonResultsPage video/assets UI with BUG-039 i18n scripts
- pnpm security overrides: `tar >=7.5.10`, `rollup >=4.59.0`, `minimatch >=9.0.7`
- Memory safety: `OnModuleDestroy` implemented on all 20+ services with DB/NATS connections

---

## [0.20.0] — 2026-03-04 — Session 20: Bug Wave + Competitive Gap Features

### Added
- Tier 1+2+3 competitive gap features (39 total): xAPI/LRS, OpenBadges 3.0, BI export, Portal builder, Social following, Marketplace, Saved searches, Persisted queries, Announcement system, Gamification
- `MyOpenBadgesPage` + `BadgeVerifierPage` (frontend)
- `MyBadgesScreen` (mobile — OpenBadges viewer)
- `AgentsPage` with template selector and history
- AuditLog S3 export functionality

### Fixed
- BUG-039: React 19 concurrent-mode `setState`-during-render in `Layout`/`useSrsQueueCount` — deferred with `useEffect` mount guard
- BUG-040: Video/document annotations disappear after save — urql cache invalidation fixed
- BUG-041: Keycloak UUID alignment — all 5 demo users have consistent UUIDs across Keycloak + DB
- BUG-042: GraphQL network error banner — raw urql error strings replaced with user-friendly messages
- BUG-043: Raw `error.message` in `/graph` UI + `Invalid Date` in `ActivityHeatmap`
- BUG-044: "Unexpected error" on lesson creation — missing UUID validation + try/catch added
- BUG-045: Pipeline Builder non-functional — config panel, `handleRun` race condition, backend resolvers

---

## [0.19.0] — 2026-03-03 — Session 19: Security Hardening + Admin Upgrade

### Added
- CQI-003: Eliminate all `no-explicit-any` from production code (all 6 subgraphs + web + mobile)
- Admin Upgrade (F-101–F-113): UserManagement UX improvements (role confirm modal, toasts, tenant safety)
- HIVE-001: CI gate — GraphQL Hive schema composition check in every PR
- Visual QA: 53/53 zero-error E2E verification across all routes and all 5 roles

### Fixed
- BUG-037: SourceManager Unauthorized — Keycloak missing `tenant_id` claim; realm export updated
- BUG-038: Unauthorized `[GraphQL]` error on lesson page — global auth exchange + middleware hardening
- CodeQL critical/high vulnerabilities: 12 fixed (SQL injection patterns, XSS vectors, prototype pollution)
- Prettier formatting: 327 source files formatted consistently

---

## [0.18.0] — 2026-03-02 — Session 18: Media Upload + i18n + Infrastructure Fixes

### Added
- FEAT-046: Custom Pipeline Builder ("Build from Scratch") — visual node editor with config panel
- i18n admin namespace + AdminSidebar/Dashboard/StatCards translations (EN + HE)
- 15 i18n namespaces (added `srs` namespace)
- Lighthouse CI Core Web Vitals gate + bundle-size-check
- Vite `manualChunks`: split 523 kB entry bundle into cacheable vendor layers

### Fixed
- BUG-035: Media upload 404 — MinIO bucket creation on startup + urql cache key + UUID courseId
- BUG-036: Media upload S3 CRC32 + .doc contentType + JWT UUID
- BUG-039 i18n: LTI and SCIM/HRIS nav labels translated to Hebrew
- CI-003: 5 CI workflow failures fixed (PNPM version, Trivy SARIF, security scanning, SBOM)
- Deploy: 4 service crashes after container recreate fixed (`e109c29`)

---

## [0.17.0] — 2026-02-22 — Session 17: API-First Level 4 + Stack Capabilities

### Added
- Level 4 Enterprise API-First compliance: persisted queries, schema registry, contract tests
- New stack capabilities: Pino logging (all services), LangGraph checkpointing, React Router v7, Tailwind v4
- AGE RLS: Apache AGE graph queries now respect row-level security tenant isolation
- NATS gateway: event routing through gateway layer for cross-subgraph pub/sub

### Fixed
- BUG-028: DEV_MODE logout persistence — session flag properly cleared
- BUG-029: urql UserPreferences cache key collision fixed
- BUG-030: `SRSWidget` `setState`-during-render fixed with deferred update pattern
- BUG-031: `@deprecated` multi-line CI false-positive resolved
- BUG-032: Docker GHA cache pnpm@9 stale layers fixed with scoped cache keys
- CI-002: 4 full test suite CI failures resolved

---

## [0.16.0] — 2026-02-20 — Session 16: Phase 8.2 + Observability + LangGraph v1

### Added
- Phase 8.2: faster-whisper transcription worker (NATS consumer, GPU-accelerated speech-to-text)
- OpenTelemetry + Jaeger distributed tracing across all 6 subgraphs and gateway
- LangGraph v1 state machines: Chavruta, Quiz, Explain, Debate agent workflows
- LangGraph checkpointing with NestJS `OnModuleInit`/`OnModuleDestroy` lifecycle
- GraphQL real-time AI streaming via `graphql-ws` subscriptions
- K8s Helm chart + k6 load tests (lesson pipeline, 100K concurrent user scenarios)

---

## [0.15.0] — 2026-02-20 — Session 15: Visual QA + E2E Comprehensive Coverage

### Added
- Comprehensive Playwright visual QA spec: all routes + all 5 roles
- 9 E2E spec suites covering admin routes, annotation flows, search, agents
- BUG fix waves 1–7: 35 bugs across auth, layout, UX, and data layers resolved

### Fixed
- BUG-033: OpenBadges federation tests stale CORE→CONTENT move
- BUG-034: SourceManager DEV_MODE `rawContent` missing field
- Keycloak 26 JWT validation and RLS context issues fixed permanently

---

## [0.14.0] — 2026-02-21 — Session 14: Full Quality Gates Pass

### Added
- Lint: 21/21 packages clean (zero warnings)
- Build: 19/19 packages build successfully
- Tests: 2,213+ tests passing across all packages

### Changed
- pnpm/action-setup downgraded v4→v2 across all CI workflows (corepack conflict)
- All CI workflow `pnpm` steps standardized to v2 action

---

## [0.13.0] — 2026-02-20 — Session 13: Test Coverage Expansion

### Added
- Backend test waves 42–49: subgraph-content, core, knowledge, agent resolver tests
- Frontend test waves 30–41: 500+ new unit tests across components, hooks, pages
- Test coverage targets: >90% line coverage per subgraph, >80% component coverage
- `@testing-library/react` integration for jsdom component rendering

---

## [0.12.0] — 2026-02-20 — Session 12: Stack Upgrade (UPGRADE-001)

### Changed
- PostgreSQL upgraded to PG18 (`all-in-one` container Build 10)
- Full dependency upgrade: NestJS 11, Drizzle ORM v1, TanStack Query v5, Zustand v5, Expo SDK 54, React 19, Vite 6
- React Router v7 migration (from v6)
- Tailwind CSS v4 migration

### Added
- Read replicas configuration for high-availability DB reads
- Persisted queries support in Hive Gateway

---

## [0.11.0] — 2026-02-20 — Session 11: Security Compliance (SEC-001 + SEC-002)

### Added
- GraphQL Federation authentication hardening (SEC-001): `@authenticated` directive enforced on all mutations
- Security test expansion to 1,400+ tests across all packages (SEC-002)
- OWASP Top 10 coverage: SQL injection, XSS, CORS, rate limiting, query complexity
- Keycloak brute-force protection enabled (`failureFactor: 5`)

---

## [0.10.0] — 2026-02-18 — Session 10: Phase 8 Mobile (Expo SDK 54)

### Added
- `apps/mobile`: Expo SDK 54 (React Native 0.81) offline-first mobile application
- Screens: Auth, Home, Courses, CourseViewer, Lessons, Annotations, OfflineSync, Profile
- Offline-first: `expo-sqlite` + TanStack Query for local data persistence
- `MyBadgesScreen`: OpenBadges 3.0 viewer for mobile
- Mobile build configuration: EAS Build, `pnpm cap:sync`, `pnpm cap:build`

---

## [0.9.0] — 2026-02-18 — Session 9: Phase 7 Production Hardening

### Added
- Helm chart for Kubernetes deployment (`infrastructure/k8s/`)
- k6 load tests: lesson pipeline scenario, concurrent user simulation (100K target)
- Traefik v3.6 reverse proxy with Let's Encrypt auto-TLS and rate limiting
- CD pipeline (`cd.yml`): staging → production with rollback plan
- Multi-stage Docker builds for all 8 services with Trivy vulnerability scanning

---

## [0.8.0] — 2026-02-18 — Session 8: Phases 14–17 Frontend Completion

### Added
- Phase 14: Annotation overlay on video (`VideoAnnotationLayer`, `AnnotationTimeline`, `LayerToggleBar`)
- Phase 15: User menu, profile page, authentication completion
- Phase 16: Course Wizard (4-step: Details → Media → Curriculum → Settings), `CourseEditPage`
- Phase 17: Collaboration editor (`CollaborativeEditor.tsx`) with Yjs/TipTap, real-time cursors, offline buffer

---

## [0.7.0] — 2026-02-18 — Session 7: Phases 10–13 Frontend

### Added
- Phase 10: Video player with HLS streaming, transcript sync, transcript search → video jump
- Phase 11: Global semantic search bar, search results page, search → video timestamp
- Phase 12: AI Agent chat interface with streaming cursor, stop generation, session history
- Phase 13: Knowledge Graph visualization with Cytoscape.js, concept detail panel, learning path overlay

---

## [0.6.0] — 2026-02-18 — Session 6: Phase 9 Dashboard Analytics

### Added
- Dashboard: activity heatmap (GitHub-style), progress bars, activity feed
- Spaced Repetition System (SRS): queue badge in nav, review session UI
- Notification bell: real-time notification center with WebSocket subscription
- CourseList: search/sort/tabs, `LeaderboardPage`

---

## [0.5.0] — 2026-02-18 — Session 5: Backend GraphQL Integration + Security

### Added
- Backend-connected GraphQL queries in all frontend pages (replaced mock data)
- Security hardening: CSP headers, CORS configuration, JWT scope validation
- 146 new unit tests (3 test suites)
- Vite bundle optimization: lazy-loading for CourseWizard steps 2–4

### Fixed
- CI failures: LTI conflicts, Stripe types, migration ordering, TypeScript strict errors, E2E port mismatches

---

## [0.4.0] — 2026-02-18 — Session 4: Phases 3–6 Subgraphs + Gateway + Frontend

### Added
- Annotation subgraph (4003): 4-layer annotation system (PERSONAL/SHARED/INSTRUCTOR/AI_GENERATED) + Word-Style
- Collaboration subgraph (4004): Yjs CRDT, WebSocket subscriptions, `@authenticate` guards
- Agent subgraph (4005): LangGraph.js state machines (Chavruta, Quiz, Explain, Debate) + LlamaIndex RAG
- Knowledge subgraph (4006): Apache AGE Cypher queries, pgvector HybridRAG, K-means clustering
- Hive Gateway v2 (4000): supergraph composition, JWT propagation, rate limiting, query depth/complexity
- Frontend shell: React 19 + Vite 6, shadcn/ui + Tailwind, React Router v6, all initial pages

---

## [0.3.0] — 2026-02-17 — Session 3: Phase 2 Authentication + Content Subgraph

### Added
- Keycloak v26 realm: 5 roles (SUPER_ADMIN, ORG_ADMIN, INSTRUCTOR, RESEARCHER, STUDENT), JWKS endpoint
- Core subgraph (4001): User, Tenant CRUD with RLS + JWT validation
- Content subgraph (4002): Courses, Lessons, Media, Transcription pipeline, Course Forking, Search
- JWT validation via JWKS; `@authenticated` / `@requiresScopes` / `@requiresRole` GraphQL directives
- `packages/auth`: JWT validation, context extraction, NestJS guards

---

## [0.2.0] — 2026-02-17 — Session 2: Phase 1 Data Layer

### Added
- 16 PostgreSQL tables with full Row-Level Security (RLS) using `withTenantContext()` pattern
- Apache AGE graph ontology: Concept, Person, Term, Source, TopicCluster vertex/edge types
- pgvector HNSW indexes (768-dim) for semantic search using `nomic-embed-text` embeddings
- Drizzle ORM v1 with native RLS (`pgTable.withRLS()`), migrations, seed data
- Seed: 5 demo users × 3 tenants, sample courses, knowledge graph nodes

---

## [0.1.0] — 2026-02-17 — Session 1: Phase 0 Foundation

### Added
- Monorepo scaffold: pnpm workspaces + Turborepo (`apps/*`, `packages/*`, `infrastructure/`)
- Docker Compose stack: PostgreSQL 16 + Apache AGE 1.5 + pgvector 0.8, Keycloak, NATS JetStream, MinIO, Jaeger
- All-in-one Docker container for local development (Build 1)
- TypeScript strict configuration: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- Health check script (`./scripts/health-check.sh`), smoke test script (`./scripts/smoke-test.sh`)
- GitHub Actions CI/CD workflows: `ci.yml`, `test.yml`, `federation.yml`, `docker-build.yml`, `cd.yml`
- VS Code workspace configuration with recommended extensions
- Shared packages scaffolded: `packages/db`, `packages/auth`, `packages/graphql-shared`, `packages/nats-client`, `packages/tsconfig`, `packages/eslint-config`
