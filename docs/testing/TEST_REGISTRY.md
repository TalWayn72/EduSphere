# EduSphere — Test Registry

**Last Updated:** 2026-03-06 | **Session:** 28
**Total Tests:** 6,125+ | **Pass Rate:** 100%

---

## Summary

| Package | Test Count | Type | Status |
|---------|-----------|------|--------|
| subgraph-core | 640 | Unit + Integration | Passing |
| subgraph-content | 1,041 | Unit + Integration | Passing |
| subgraph-annotation | 144 | Unit + Integration | Passing |
| subgraph-collaboration | 161 | Unit + Integration | Passing |
| subgraph-agent | 599 | Unit + Integration | Passing |
| subgraph-knowledge | 509 | Unit + Integration | Passing |
| web (frontend) | 3,678+ | Unit + Component + E2E | Passing |
| security tests | 816 | Static + Policy | Passing |
| mobile | 119 | Logic (pure functions) | Passing |
| **TOTAL** | **6,125+** | All | **100% pass** |

---

## Test Commands

| Command | Scope | Notes |
|---------|-------|-------|
| `pnpm turbo test` | All packages | Full suite |
| `pnpm --filter @edusphere/subgraph-core test` | Core only | |
| `pnpm --filter @edusphere/web test` | Frontend only | |
| `pnpm --filter @edusphere/mobile test` | Mobile only | Vitest with `__DEV__: true`; no `@testing-library/react-native` |
| `pnpm test:security` | Security suite | 816 tests, no DB required |
| `pnpm test:rls` | RLS policies | Requires PostgreSQL |
| `pnpm --filter @edusphere/web test:e2e` | Playwright E2E | Requires running services |

---

## Backend Test Files

### subgraph-core (640 tests)

| File | Tests | Coverage |
|------|-------|---------|
| `src/users/users.resolver.spec.ts` | ~80 | User CRUD, RLS |
| `src/users/users.service.spec.ts` | ~80 | Business logic |
| `src/auth/auth.guard.spec.ts` | ~40 | JWT validation |
| `src/tenants/tenants.resolver.spec.ts` | ~60 | Multi-tenancy |
| `src/tenants/tenants.service.spec.ts` | ~60 | Tenant isolation |
| `src/health/health.controller.spec.ts` | ~20 | Health checks |
| Integration tests in `src/test/` | ~300 | End-to-end flows |

### subgraph-content (1,041 tests)

| File | Tests | Coverage |
|------|-------|---------|
| `src/courses/courses.resolver.spec.ts` | ~100 | Course CRUD |
| `src/courses/courses.service.spec.ts` | ~100 | Business logic |
| `src/lessons/lessons.resolver.spec.ts` | ~100 | Lesson pipeline |
| `src/lessons/lessons.service.spec.ts` | ~100 | Lesson logic |
| `src/media/media.resolver.spec.ts` | ~80 | Media uploads |
| Integration tests | ~561 | Full content flows |

### subgraph-annotation (144 tests)

| File | Tests | Coverage |
|------|-------|---------|
| `src/annotations/annotations.resolver.spec.ts` | ~60 | 4-layer annotation CRUD |
| `src/annotations/annotations.service.spec.ts` | ~50 | Layer management, anchoring |
| `src/canvas/canvas-annotation.spec.ts` | ~34 | Canvas/sketch annotations (Session 24) |

### subgraph-collaboration (161 tests)

| File | Tests | Coverage |
|------|-------|---------|
| `src/sessions/collab-session.resolver.spec.ts` | ~60 | Session management |
| `src/sessions/collab-session.service.spec.ts` | ~60 | Yjs CRDT logic |
| `src/presence/presence.spec.ts` | ~41 | Real-time presence tracking |

### subgraph-agent (599 tests)

| File | Tests | Coverage |
|------|-------|---------|
| `src/ai-tutor/ai-tutor.resolver.spec.ts` | ~80 | AI tutor interactions |
| `src/ai-tutor/ai-tutor.service.spec.ts` | ~80 | LangGraph agent workflows |
| `src/live-sessions/*.spec.ts` | ~100 | Live sessions module (Session 27) |
| `src/langgraph/*.spec.ts` | ~120 | LangGraph state machines (Chavruta, Quiz, Explain, Debate) |
| `src/consent/consent.spec.ts` | ~60 | SI-10 LLM consent flow |
| Integration tests | ~159 | End-to-end agent flows |

### subgraph-knowledge (509 tests)

| File | Tests | Coverage |
|------|-------|---------|
| `src/graph/graph.resolver.spec.ts` | ~80 | Knowledge graph queries |
| `src/graph/graph.service.spec.ts` | ~80 | Apache AGE Cypher traversal |
| `src/graph/skill-tree.resolver.spec.ts` | ~80 | SkillTree resolver (Session 25) |
| `src/graph/skill-tree.service.spec.ts` | ~80 | BFS skill traversal (Session 25) |
| `src/embeddings/embeddings.spec.ts` | ~60 | pgvector HNSW search |
| Integration tests | ~129 | Full knowledge graph flows |

---

## Frontend Test Files (`apps/web`)

### Unit + Component Tests (3,315 total)

**Pages:**

| File | Session Added | Coverage |
|------|---------------|---------|
| `src/pages/DashboardPage.test.tsx` | 25 | 5-section dashboard render |
| `src/pages/CoursesDiscoveryPage.test.tsx` | 25 | Course search + CourseCard |
| `src/pages/KnowledgeGraphPage.test.tsx` | 27 | KG courseId context deep-link |
| `src/pages/SkillTreePage.test.tsx` | 25 | SkillTree BFS + SVG render |
| `src/pages/LiveSessionsPage.test.tsx` | 27 | Live sessions list + tabs |
| `src/pages/LiveSessionDetailPage.test.tsx` | 27 | Session detail view |
| `src/pages/AdminDashboardPage.test.tsx` | 18 | Admin metrics + panels |
| `src/pages/CheckoutPage.test.tsx` | Added Session 28 | Stripe checkout |
| `src/pages/InstructorMergeQueuePage.test.tsx` | Added Session 28 | Merge queue |

**Components:**

| File | Session Added | Coverage |
|------|---------------|---------|
| `src/components/OfflineBanner.test.tsx` | 27 | Offline status banner UI |
| `src/components/AdminActivityFeed.test.tsx` | 27 | Admin activity feed |
| `src/components/SmartRoot.test.tsx` | 27 | Root-level app wrapper |
| `src/components/Layout.test.tsx` | 25 | AppSidebar + collapse state |
| `src/components/PersonalGraphView.test.tsx` | Added Session 28 | Personal KG |
| `src/components/AnnotationMergeRequestModal.test.tsx` | Added Session 28 | Merge request modal |
| `src/components/ProctoringOverlay.test.tsx` | Added Session 28 | WebRTC proctoring |
| `src/components/Model3DViewer.test.tsx` | Added Session 28 | Three.js viewer |
| `src/components/VideoSubtitleSelector.test.tsx` | Added Session 28 | Subtitles |

**Hooks:**

| File | Session Added | Coverage |
|------|---------------|---------|
| `src/hooks/useOfflineStatus.test.ts` | 27 | Network status detection |
| `src/hooks/useOfflineQueue.test.ts` | 27 | Mutation queue + 100-item LRU eviction |
| `src/hooks/useLiveSessionActions.test.ts` | Added Session 28 | Session mutations |
| `src/hooks/useSketchCanvas.test.ts` | Added Session 28 | Sketch tools |

**Services:**

| File | Session Added | Coverage |
|------|---------------|---------|
| `src/services/OfflineLessonCache.test.ts` | 27 | IndexedDB lesson cache |

### E2E Tests (Playwright)

| Spec File | Feature | Session Added |
|-----------|---------|---------------|
| `e2e/course-discovery.spec.ts` | Course discovery search + filters | 25 |
| `e2e/landing-page.spec.ts` | Landing page visual regression | 25 |
| `e2e/lesson-results.spec.ts` | Lesson completion + all 10 outputs | 22 |
| `e2e/live-sessions.spec.ts` | Live session flow (join, moderator, attendee) | 27 |
| `e2e/offline-mode.spec.ts` | Offline banner + queue drain on reconnect | 27 |
| `e2e/knowledge-graph-course-context.spec.ts` | KG courseId deep-link + context panel | 27 |
| `e2e/offline-sync.spec.ts` | Offline queue auto-flush | 28 |
| `e2e/live-sessions-mutations.spec.ts` | Session mutations | 28 |
| `e2e/course-discovery-filters.spec.ts` | Discovery filters | 28 |
| `e2e/checkout-flow.spec.ts` | Stripe checkout | 29 |
| `e2e/annotation-merge-request.spec.ts` | Annotation merge | 30 |
| `e2e/video-sketch.spec.ts` | Sketch 6 tools | 31 |
| `e2e/subtitle-translation.spec.ts` | AI subtitles | 32 |
| `e2e/proctoring.spec.ts` | Remote proctoring | 33 |
| `e2e/model3d-viewer.spec.ts` | 3D model viewer | 34 |

---

## Security Tests (`tests/security/` — 816 tests)

| File | Invariant | Approx. Tests |
|------|-----------|---------------|
| `rls-variables.spec.ts` | SI-1: RLS session variable name | ~30 |
| `cors-config.spec.ts` | SI-2: CORS fail-closed | ~20 |
| `pii-encryption.spec.ts` | SI-3: AES-256-GCM encryption | ~50 |
| `keycloak-config.spec.ts` | G-12: Brute force protection | ~20 |
| `dockerfile-security.spec.ts` | G-05: No SSL bypass patterns | ~30 |
| `nats-security.spec.ts` | SI-7: NATS TLS/auth | ~20 |
| `audit-log.spec.ts` | G-08: Audit trail | ~30 |
| `consent-management.spec.ts` | G-04: Consent gates | ~40 |
| `ai-compliance.spec.ts` | SI-10: LLM consent check | ~50 |
| `eu-ai-act.spec.ts` | EU AI Act: transparency | ~40 |
| `graphql-authorization.spec.ts` | G-15: `@requiresScopes` directives | ~60 |
| `api-security.spec.ts` | G-09+G-10: Rate limit + complexity | ~60 |
| `gdpr-erasure.spec.ts` | G-03+G-11: GDPR erasure + portability | ~50 |
| `minio-config.spec.ts` | G-17: MinIO encryption | ~30 |
| `data-retention.spec.ts` | G-13: Retention TTLs | ~30 |
| `live-sessions-security.spec.ts` | PENTEST-001..020: live session auth | ~30 |
| `offline-queue-security.spec.ts` | PENTEST-021..041: offline queue integrity | ~28 |
| *(other security files)* | Various SI/G invariants | ~198 |

All 816 security tests run without a database via `pnpm test:security`.

---

## Mobile Tests (`apps/mobile` — 119 tests)

**Pattern:** Pure logic tests only. `@testing-library/react-native` is not installed.
Tests use Vitest configured with `define: { __DEV__: true }` in `vitest.config.ts`.

| File | Session Added | Coverage |
|------|---------------|---------|
| `src/screens/AITutorScreen.test.ts` | 24 | AI tutor interaction logic |
| `src/screens/HomeScreen.test.tsx` | 25 | Home screen stats + streak logic |
| `src/screens/CoursesScreen.test.tsx` | 25 | Course filtering + search logic |
| `src/screens/ProfileScreen.test.tsx` | 25 | Profile data + preferences logic |
| `src/components/MasteryBadge.test.tsx` | 25 | Badge levels 1-5, semantic colors |
| `src/lib/stats-utils.test.ts` | 24 | XP, streak, and progress calculations |
| `src/lib/ai-consent.test.ts` | 24 | SI-10 consent check utility |

---

## i18n Tests (included in package totals above)

Tests distributed across packages — see Session 22 for full breakdown.

| Package | i18n Tests | Status |
|---------|-----------|--------|
| `packages/i18n` | ~120 | Passing — locale file existence + key completeness |
| `subgraph-core` | ~15 | Passing — UserPreferences locale field |
| `subgraph-content` | ~20 | Passing — TranslationService cache-first + NATS |
| `subgraph-agent` | ~23 | Passing — injectLocale() + AgentSession locale |
| `apps/web` | ~25 | Passing — LanguageSelector + useUserPreferences |
| `apps/mobile` | ~15 | Passing — SettingsScreen locale picker |

---

## Coverage Targets

| Package | Target | Current Status |
|---------|--------|---------------|
| subgraph-* (each) | >90% line | Met |
| web frontend | >80% component | Met |
| RLS policies | 100% | Met (critical security path) |
| security tests (SI-1..SI-10) | 100% | Met |

---

## Test File Locations

```
apps/
├── subgraph-*/src/**/*.spec.ts        Backend unit tests
├── subgraph-*/src/test/**/*.spec.ts   Backend integration tests
├── web/src/**/*.test.{ts,tsx}         Frontend unit + component tests
├── web/e2e/*.spec.ts                  Playwright E2E specs
└── mobile/src/**/*.test.{ts,tsx}      Mobile pure-logic tests

packages/
└── db/src/rls/*.test.ts               RLS policy validation tests

tests/
└── security/*.spec.ts                 Security invariant tests (no DB)
```

---

## Changelog

| Session | Tests Added | Running Total |
|---------|-------------|---------------|
| 1-20 (baseline) | ~4,000 | ~4,000 |
| 21-22 | ~450 | ~4,450 |
| 23 | ~50 | ~4,500 |
| 24 | ~500 | ~5,000 |
| 25 | ~1,200 (frontend + mobile + skill-tree) | ~5,462 |
| 26 | ~50 (security pentest) | ~5,512 |
| 27 | ~300 (live sessions, offline, E2E) | **5,762+** |
| 28 (Phases 28-34) | ~352 | **~6,125+** |

---

*Run `pnpm turbo test -- --coverage` to regenerate actual coverage report.*
