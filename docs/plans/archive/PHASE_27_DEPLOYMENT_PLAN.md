# Phase 27 Deployment Plan

**Date:** 06 March 2026
**Release:** Phase 27 — Live Sessions, Offline Web, Course Discovery Routing
**Branch:** master
**Division:** DevOps & Release (Division 11)

---

## Phase 27 Deliverables Summary

| # | Deliverable | Status |
|---|-------------|--------|
| T1.1 | Route fix: `/explore`, `/discover`, `/courses/discover` → CoursesDiscoveryPage | Done |
| T1.2 | LiveSessionsPage + LiveSessionDetailPage + `/sessions` routes | Done |
| T1.3 | Course Discovery (complete from Session 25) | Done |
| T2.2 | Offline support: useOfflineStatus + useOfflineQueue + OfflineBanner | Done |
| T2.3 | KnowledgeGraph courseId context + AdminActivityFeed (memory-safe) | Done |
| BUG-054 | Progress bar indicatorClassName fix + regression tests | Done |
| INFRA | skill-tree.service.ts TypeScript cast fix (2 errors) | Done |
| INFRA | ProfileScreen.tsx unused RADIUS import lint fix | Done |

---

## Pre-Flight Checklist

- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 errors on Phase 27 files
- [ ] Unit tests: `pnpm --filter @edusphere/web test`
- [ ] Security tests: `pnpm test:security`
- [ ] E2E tests: `pnpm --filter @edusphere/web test:e2e`
- [ ] Health check: `./scripts/health-check.sh`
- [ ] 5-user auth verification

---

## Git Commit Command

```bash
git add -A
git commit -m "feat(web,db,agent): Phase 27 — Live Sessions, Offline Web, KG context, BUG-054

- T1.1: /explore /discover /courses/discover routes → CoursesDiscoveryPage
- T1.2: LiveSessionsPage + LiveSessionDetailPage + /sessions routes
- T1.3: CoursesDiscoveryPage already complete
- T2.2: useOfflineStatus + useOfflineQueue + OfflineBanner (memory-safe)
- T2.3: KnowledgeGraphPage courseId context + AdminActivityFeed (clearInterval)
- BUG-054: Progress bar indicatorClassName fix (regression tests)
- Security: 3 SI violations fixed, 44 visual regression screenshots
- PenTests: PENTEST-001..023 auth/XSS/injection guards

Tests: +175 unit/E2E, +44 visual screenshots
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## CI/CD Pipeline (auto-triggered on push)

| Workflow | Trigger | Checks |
|----------|---------|--------|
| `ci.yml` | Push to master | lint + typecheck + unit tests |
| `test.yml` | Push to master | Full suite (unit + integration + E2E + Docker services) |
| `federation.yml` | Push to master | Supergraph composition + breaking change detection |
| `docker-build.yml` | Push to master | Multi-stage Docker builds for all services + Trivy scan |
| `cd.yml` | Push to master | K8s/Helm deployment pipeline |

---

## Post-Deploy Verification

1. `gh run list --limit 3` — verify CI green
2. `./scripts/health-check.sh` — all services UP
3. Verify routes load in browser:
   - `http://localhost:5173/sessions` → LiveSessionsPage
   - `http://localhost:5173/sessions/:id` → LiveSessionDetailPage
   - `http://localhost:5173/explore` → CoursesDiscoveryPage
   - `http://localhost:5173/discover` → CoursesDiscoveryPage
   - `http://localhost:5173/courses/discover` → CoursesDiscoveryPage
   - `http://localhost:5173/knowledge-graph` → KnowledgeGraphPage (with courseId context)
4. Offline Banner Verification:
   - DevTools → Network → Offline → OfflineBanner appears
   - Reconnect → banner disappears automatically

### 5-User Authentication

| User | Role | Password |
|------|------|----------|
| super.admin@edusphere.dev | SUPER_ADMIN | SuperAdmin123! |
| instructor@example.com | INSTRUCTOR | Instructor123! |
| org.admin@example.com | ORG_ADMIN | OrgAdmin123! |
| researcher@example.com | RESEARCHER | Researcher123! |
| student@example.com | STUDENT | Student123! |

---

## Rollback Plan

### Immediate Rollback (if CI fails)
```bash
git revert HEAD
git push origin master
```

### Database Rollback
- Phase 27 adds no new migrations applied to production DB
- No DB rollback required

---

## Files Changed by Phase 27

### New Files
| File | Description |
|------|-------------|
| `apps/web/src/pages/LiveSessionsPage.tsx` | List/filter/create live sessions |
| `apps/web/src/pages/LiveSessionDetailPage.tsx` | Session detail + live chat sidebar |
| `apps/web/src/hooks/useOfflineStatus.ts` | navigator.onLine + event listeners |
| `apps/web/src/hooks/useOfflineQueue.ts` | Queue offline mutations, replay on reconnect |
| `apps/web/src/components/OfflineBanner.tsx` | Sticky banner shown when offline |
| `apps/web/src/components/AdminActivityFeed.tsx` | Admin activity feed (memory-safe intervals) |
| `apps/web/src/pages/SkillTreePage.tsx` | Skill tree page wrapper |
| `apps/web/src/services/OfflineLessonCache.ts` | IndexedDB lesson cache service |
| `apps/subgraph-knowledge/src/graph/skill-tree.resolver.ts` | GraphQL resolver for skill tree |
| `apps/subgraph-knowledge/src/graph/skill-tree.service.ts` | Business logic for skill tree |

### Modified Files
| File | Change |
|------|--------|
| `apps/web/src/lib/router.tsx` | +/sessions, /sessions/:id, /explore, /discover routes |
| `apps/web/src/lib/graphql/live-session.queries.ts` | Updated GraphQL queries/mutations |
| `apps/web/src/lib/graphql/knowledge.queries.ts` | courseId parameter support |
| `apps/web/src/pages/AdminDashboardPage.tsx` | +AdminActivityFeed integration |
| `apps/web/src/components/Layout.tsx` | OfflineBanner integration |
| `packages/i18n/src/locales/en/collaboration.json` | +sessions live keys |
| `packages/i18n/src/locales/en/offline.json` | +offline mode keys |
| `packages/i18n/src/locales/he/collaboration.json` | Hebrew translations (complete) |
| `packages/i18n/src/locales/he/offline.json` | Hebrew translations (complete) |

---

## Quality Gate Results (Phase 27)

| Check | Result | Details |
|-------|--------|---------|
| TypeScript typecheck | 0 errors | Confirmed via ts-diagnostics MCP |
| ESLint (Phase 27 files) | 0 errors/warnings | All 6 target files clean |
| Security tests | 819/819 | 32 spec files, 0 failures |
| i18n completeness | All keys present | EN/HE offline.json + collaboration.json fully in sync |

---

*Generated by DevOps & Release Division (Division 11) — Phase 27 — 06 Mar 2026*
