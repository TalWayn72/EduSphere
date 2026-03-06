# EduSphere — Sprint Action Plan

**Updated:** 2026-03-06 | **Current Phase:** 34 Complete | **Next Phase:** 35

---

## Milestone: ALL PRD Gaps Closed

Phase 34 (3D Models & Simulations) closed the final PRD gap. All G and P items are complete:

| Gap ID | Feature | Phase |
|--------|---------|-------|
| G-1 | 3D Models & Simulations | Phase 34 ✅ |
| G-2 | Real-time AI Subtitle Translation | Phase 32 ✅ |
| G-3 | Annotation Merge Request | Phase 30 ✅ |
| G-4 | Remote Proctoring | Phase 33 ✅ |
| P-1 | Video Sketch Overlay Enhancement | Phase 31 ✅ |
| P-2 | Personal Knowledge Graph Wiki | Phase 30 ✅ |
| P-3 | Stripe Checkout Flow | Phase 29 ✅ |

---

## Phase 35 — Upcoming Sprint

### Sprint Goal
Deliver performance excellence, mobile feature parity, and advanced analytics.

### Sprint Backlog

| Priority | Task | Owner | Effort |
|----------|------|-------|--------|
| P1 | Lighthouse score >= 90 (code splitting, lazy loading) | FE | L |
| P1 | PWA: install prompt + push notifications (NATS -> mobile) | FE+BE | M |
| P1 | Mobile: Live Sessions screen (Expo SDK 54) | Mobile | L |
| P2 | Mobile: SkillTree screen (Expo + BFS graph) | Mobile | M |
| P2 | Mobile: Offline sync (expo-sqlite + useOfflineQueue) | Mobile | M |
| P2 | Analytics dashboard: 10+ metrics per tenant | FE+BE | L |
| P3 | AI recommendations from UserSkillMastery graph | AI | L |
| P3 | Mobile: 3D Models viewer (Expo three-fiber) | Mobile | L |

### Definition of Done (Phase 35)
- [ ] Lighthouse Performance >= 90 on Dashboard, Courses, Lesson pages
- [ ] PWA installable on Chrome/Safari/Firefox
- [ ] Mobile app: Live Sessions, SkillTree, Offline, 3D viewer
- [ ] Analytics: 10+ metrics with time-range filters
- [ ] AI recommendations sidebar (skill gap + next course)
- [ ] `pnpm turbo test` — 100% pass
- [ ] `pnpm turbo typecheck` — 0 errors

---

## Technical Debt Backlog

| Item | Priority | Notes |
|------|----------|-------|
| git LFS history migration for PDF/DOCX | P2 | Requires user approval (rewrites history) |
| OPEN_ISSUES.md header cleanup | P3 | Mega-line header -> structured table |
| SESSION_SUMMARY.md Sessions 28 detail | P3 | Agent-D5 will append |

---

## Health Checks (passing as of 2026-03-06)

| Service | Status |
|---------|--------|
| PostgreSQL (5432) | ✅ |
| Keycloak (8080) | ✅ |
| NATS JetStream | ✅ |
| MinIO | ✅ |
| Jaeger | ✅ |
| Gateway (4000) | ✅ |
| All 6 subgraphs (4001-4006) | ✅ |
| Frontend (5173) | ✅ |

---

*See [IMPLEMENTATION_ROADMAP.md](../../IMPLEMENTATION_ROADMAP.md) for full phase history.*
*See [OPEN_ISSUES.md](../../OPEN_ISSUES.md) for bug tracking.*
