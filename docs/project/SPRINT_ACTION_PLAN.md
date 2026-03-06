# EduSphere — Sprint Action Plan

**Updated:** 2026-03-06 | **Current Phase:** 27 Complete | **Next Phase:** 28

---

## Current Sprint Status

All Phase 27 deliverables are complete. The team is now planning Phase 28.

---

## Phase 28 — Upcoming Sprint

### Sprint Goal

Deliver PWA capabilities, performance optimization, mobile feature parity, and advanced analytics.

### Sprint Backlog

| Priority | Task | Owner | Effort |
|----------|------|-------|--------|
| P1 | PWA: manifest + service worker install prompt | FE | M |
| P1 | Lighthouse score >= 90 (code splitting, lazy loading) | FE | L |
| P1 | Mobile: Live Sessions screen (Expo) | Mobile | L |
| P2 | Mobile: Offline support (expo-sqlite sync) | Mobile | L |
| P2 | Mobile: SkillTree screen (Expo + BFS graph) | Mobile | M |
| P2 | Analytics Dashboard (learning velocity, completion rates) | FE+BE | L |
| P3 | AI recommendations from UserSkillMastery (graph traversal) | AI | L |
| P3 | Push notifications (Keycloak events via NATS to mobile) | BE+Mobile | M |

### Definition of Done (Phase 28)

- [ ] PWA installable on Chrome/Safari/Firefox
- [ ] Lighthouse Performance >= 90 on Dashboard + Courses pages
- [ ] Mobile app covers Live Sessions, Offline, SkillTree
- [ ] Analytics dashboard: 10+ metrics per tenant
- [ ] AI recommendations in sidebar (based on mastery graph)
- [ ] All new features: unit + E2E + mobile tests
- [ ] `pnpm turbo test` — 100% pass
- [ ] `pnpm turbo typecheck` — 0 errors

---

## Technical Debt Backlog

| Item | Priority | Notes |
|------|----------|-------|
| git LFS history migration for PDF/DOCX | P2 | Requires user approval (rewrites history) |
| OPEN_ISSUES.md header cleanup | P3 | 1,200+ char header line — convert to structured table |
| migration 0012: live_sessions Enc column rename | P1 | SI-3 compliance — plaintext column names removed |
| Husky v10 deprecation fix | P1 | pre-commit hook uses deprecated Husky v9 API |
| ServiceWorker registration polish (main.tsx/pwa.ts) | P2 | Background sync TTL + queue flush on reconnect |

---

## Phase 27 — Completed (reference)

| ID | Deliverable | Tests |
|----|-------------|-------|
| T1.1 | Route fix: /explore, /discover, /courses/discover | 3 unit + 11 E2E |
| T1.2 | Live Sessions (FE + BE + NATS) | 21 unit + ~20 E2E + 12 visual |
| T2.2 | Offline Web (ServiceWorker + IndexedDB + OfflineBanner) | 32 unit + 5 E2E + 12 visual |
| T2.3 | KnowledgeGraph courseId context + AdminActivityFeed | 21 unit + 11 E2E + 13 visual |
| BUG-054 | Progress bar indicatorClassName fix | 20 unit + 8 E2E + 1 visual |
| Security | PENTEST-001..023 (auth, IDOR, XSS, injection) | 23 pen-tests pass |

---

## Health Checks (all passing as of 2026-03-06)

| Service | Port | Status |
|---------|------|--------|
| PostgreSQL (5432) | 5432 | Pass |
| Keycloak (8080) | 8080 | Pass |
| NATS JetStream | 4222 | Pass |
| MinIO | 9000 | Pass |
| Jaeger | 16686 | Pass |
| Gateway | 4000 | Pass |
| subgraph-core | 4001 | Pass |
| subgraph-content | 4002 | Pass |
| subgraph-annotation | 4003 | Pass |
| subgraph-collaboration | 4004 | Pass |
| subgraph-agent | 4005 | Pass |
| subgraph-knowledge | 4006 | Pass |
| Frontend | 5173 | Pass |

---

## Test Users (Keycloak)

| User | Role | Notes |
|------|------|-------|
| super.admin@edusphere.dev | SUPER_ADMIN | Cross-tenant access |
| org.admin@example.com | ORG_ADMIN | Tenant admin |
| instructor@example.com | INSTRUCTOR | Course management |
| researcher@example.com | RESEARCHER | Knowledge graph access |
| student@example.com | STUDENT | Learner access |

Passwords: see `scripts/reset-keycloak-passwords.cjs` (single source of truth).

---

*See [IMPLEMENTATION_ROADMAP.md](../../IMPLEMENTATION_ROADMAP.md) for full phase history.*
*See [OPEN_ISSUES.md](../../OPEN_ISSUES.md) for bug tracking.*
