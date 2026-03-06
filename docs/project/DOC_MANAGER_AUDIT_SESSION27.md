# Documentation Manager Audit — Session 27

**Auditor:** Documentation Manager (Division 10)
**Date:** 2026-03-06
**Scope:** Full documentation inventory and gap analysis for EduSphere as of Session 27 (master = `c0e4810`)
**Total docs audited:** 120 documents across 18 directories

---

## Executive Summary

The EduSphere documentation corpus spans 120+ files organized across 18 subdirectories. The core infrastructure docs (architecture, API contracts, security, deployment) are well-structured. However, four critical documents are severely out of date relative to the actual codebase state, and three major doc types are either missing or contain only placeholder content. The project has advanced through Session 27 / Phase 27 but several key tracking documents still reference Sessions 1-3 or Phase 8 as the endpoint.

---

## Section 1: Inventory Audit Results

### Root Documents

| File | Exists | Up to Date | Cross-linked | Status |
|------|--------|-----------|--------------|--------|
| README.md | Yes | Partial — accurate architecture, but test counts stale (no mention of 5,762+ tests), demo passwords say "Demo123!" but CLAUDE.md says different | Yes (INDEX.md) | NEEDS UPDATE |
| CLAUDE.md | Yes | Yes — reflects Session 25 patterns, Mobile Design System, iron rules | Yes | OK |
| OPEN_ISSUES.md | Yes | Yes — covers through Phase 27 / Session 26 completion, BUG-054 fixed | Yes | OK (6,774 lines) |
| IMPLEMENTATION_ROADMAP.md | Yes | CRITICAL GAP — only goes through Phase 17. Phases 18-27 are not defined or marked complete. No mention of Session 25 UI/UX Revolution, Session 26 Phase 27 LiveSessions/Offline | Yes | CRITICAL UPDATE NEEDED |
| CHANGELOG.md | Yes | CRITICAL GAP — file is 5 lines (stub only: "auto-generated from conventional commits"). No releases documented. | Yes | CRITICAL: MUST BE CREATED |
| API_CONTRACTS_GRAPHQL_FEDERATION.md | Yes | Partial — covers all 6 original subgraphs. MISSING: LiveSession type, SkillTree type, KnowledgeGraph courseId context (all Phase 27 additions). | Yes | HIGH UPDATE NEEDED |

### docs/project/ — Project Status Documents

| File | Exists | Up to Date | Gap |
|------|--------|-----------|-----|
| SESSION_SUMMARY.md | Yes | CRITICAL GAP — only covers Session 1 (Feb 2026, Phase 0-2 partial). Sessions 3-27 are completely absent. | Covers only 1 of 27 sessions |
| PROJECT_STATUS.md | Yes | CRITICAL GAP — last updated 2026-02-18, reflects "Phase 0-8 complete, 190 tests passing". Reality: Phase 27 complete, 5,762+ tests. Contains "Not Started" for all phases. | 18 days behind, 10 phases behind |
| IMPLEMENTATION_STATUS.md | Yes | Partial — last updated 2026-03-05 (Session 22). Missing Sessions 23, 24, 25, 26, 27. Missing: Design System, UI/UX Revolution, SkillTree, LiveSessions, Offline Web. | 5 sessions behind |
| SPRINT_ACTION_PLAN.md | Yes | CRITICAL GAP — written in Hebrew, reflects Phase 3 state (Feb 2026), discusses "Gateway is blocking" and frontend not started. Completely obsolete. | 24 phases behind |

### docs/security/

| File | Exists | Complete | Notes |
|------|--------|----------|-------|
| SESSION_26_SECURITY_AUDIT.md | Yes | Yes — covers all SI-1 through SI-10, router analysis, all Session 26 files | OK |
| PHASE_27_SECURITY_AUDIT.md | Yes (in security/) | Yes — covers HIGH finding (BBB passwords plaintext SI-3), all Phase 27 files | OK |
| phase-27-security-audit.md | Yes (in security/) | Appears to be a duplicate/companion to PHASE_27_SECURITY_AUDIT.md | MERGE CANDIDATE |
| SECURITY_PLAN.md | Yes | Yes | OK |
| SECURITY_CHECKLIST.md | Yes | Partial — does not reference Phase 27 checks | MEDIUM UPDATE |
| All other security docs | Yes | Yes | OK |

Note: There are two Phase 27 security audit files in docs/security/ (`PHASE_27_SECURITY_AUDIT.md` and `phase-27-security-audit.md`). These should be merged.

### docs/testing/

| File | Exists | Up to Date | Gap |
|------|--------|-----------|-----|
| TEST_REGISTRY.md | Yes | CRITICAL GAP — shows all tests as "Planned" with target counts (e.g., "150+ planned" for Core). Reality: Core=640 actual, Content=1041, Agent=599, Knowledge=509. No Session 25-27 test files listed. | Entire registry is outdated |
| TESTING_CONVENTIONS.md | Yes | Yes — patterns are current | OK |
| E2E_TESTING.md | Yes | Partial — does not reference Session 25-27 E2E specs | MEDIUM |
| PHASE_27_QA_TEST_PLAN.md | Yes | Yes — covers Phase 27 test plan | OK |
| Other testing docs | Yes | Yes | OK |

### docs/plans/

| Folder | Contents | Status |
|--------|----------|--------|
| bugs/ | BUG-005, BUG-039 | Partial — only 2 of 54+ bugs documented here. Most bug docs are inline in OPEN_ISSUES.md |
| features/ | 5 feature specs | Some may be superseded (ACCESSIBILITY_AND_THEMING superseded by actual Phase 25 implementation) |
| archive/ | 10 plan files | Contains PHASE_27_DEPLOYMENT_PLAN.md, MASTER_COMPLETION_PLAN.md, GAP_CLOSURE_PLAN.md, etc. Most are historical and correct for archiving. |

### docs/INDEX.md

| Assessment | Details |
|-----------|---------|
| Exists | Yes |
| Last updated | Session 26 (header says March 2026) |
| Gaps | Missing cross-links to: plans/archive/ contents, security/phase-27-security-audit.md (duplicate file), docs/project/DOC_MANAGER_AUDIT_SESSION27.md (this file — once created) |
| Overall quality | Good structure, role-based navigation table is well-done |

### API_CONTRACTS_GRAPHQL_FEDERATION.md — Phase 27 Type Gaps

The following types introduced in Phase 27 (commit `c0e4810`) are MISSING from API_CONTRACTS:

| Type/Feature | Session Introduced | Present in API_CONTRACTS |
|---|---|---|
| `LiveSession` entity | Session 26 / Phase 27 | NO |
| `LiveSessionStatus` enum | Session 26 / Phase 27 | NO |
| `LiveSessionConnection` | Session 26 / Phase 27 | NO |
| `SkillTreeNode` type | Session 25 / Phase 26 | NO |
| `SkillTreeEdge` type | Session 25 / Phase 26 | NO |
| `UserSkillMastery` type | Session 25 (migration 0011) | NO |
| `KnowledgeGraph courseId` filter context | Session 26 | NO |
| `AdminActivityFeed` queries | Session 26 | NO |

### README.md — Specific Issues

| Issue | Detail |
|-------|--------|
| Demo user passwords | README says "Demo123!" but CLAUDE.md references different passwords per role. The authoritative source is `scripts/reset-keycloak-passwords.cjs` — README must align. |
| Test count | README does not display total test count prominently. OPEN_ISSUES.md shows 5,762+ tests. |
| No mention of Phase 27 features | LiveSessions, Offline Web, Course Discovery, SkillTree, Design System are absent from Features section |
| No mention of Session 25 UI/UX Revolution | Design System (Indigo #6366F1), AppSidebar, ThemeProvider, WCAG 2.2 AAA not in Features |
| i18n | i18n (Hebrew/English) is a major feature not in README Features section |

---

## Section 2: Gap Analysis — 10 Specific Checks

### A. SESSION_SUMMARY.md — Sessions 24, 25, 26, 27

**Finding: CRITICAL GAP**
File covers only Session 1 (2026-02-17, Phase 0-2 partial). Sessions 2 through 27 are entirely absent. The file reads as the first session summary ever written and was never updated.

Action required: Full rewrite covering Sessions 1-27 with cumulative statistics.

### B. PROJECT_STATUS.md — Current State (master = c0e4810)

**Finding: CRITICAL GAP**
File was last updated 2026-02-18 with: "190 tests passing, Phase 0-8, planning phase." The actual state is: Phase 27 complete, 5,762+ tests passing, all 6 subgraphs running, UI/UX Revolution complete, LiveSessions/Offline Web deployed.

The Phase Breakdown section lists all phases as "Not Started" with 0% completion — a complete inversion of reality.

Action required: Full rewrite to reflect current state.

### C. IMPLEMENTATION_STATUS.md — All 27 Phases

**Finding: HIGH GAP**
File covers through Session 22 (2026-03-05). Missing:
- Session 23: Mobile TS fixes, LoggerModule extraction, TIME constants
- Session 24: PRD Gap Closure G1+G2+G3+G5+G6+G8, canvas annotations, Video sketch overlay, AI Tutor screen improvements
- Session 25: UI/UX Revolution (Design System, AppSidebar, Dashboard, VideoPlayer, KnowledgeSkillTree, WCAG 2.2 AAA, ThemeSettings), Mobile Design System alignment
- Session 26 / Phase 27: LiveSessionsPage, OfflineBanner, useOfflineStatus/Queue, AdminActivityFeed, KG courseId context, BUG-054

Action required: Append Sessions 23-27 entries and update test counts.

### D. CHANGELOG.md — All Releases through Session 27

**Finding: CRITICAL GAP**
File is 5 lines — a stub with the comment "auto-generated from conventional commits via `pnpm changelog`". No releases are documented. Given 27 sessions and 20+ commits with conventional commit format, this should contain a full release log.

Action required: Create full CHANGELOG with entries from git log.

### E. OPEN_ISSUES.md — Open Bug Tracking

**Finding: OK with minor notes**
OPEN_ISSUES.md is thorough and current (6,774 lines). Phase 27 is documented as complete. BUG-054 is fixed. The header shows the correct date (06 Mar 2026) and comprehensive completion status.

Minor note: The file is extremely long and the summary header line is a single 1,200+ character line. Could benefit from a structured summary table at the top instead of one mega-line.

### F. IMPLEMENTATION_ROADMAP.md — Phase 27 Complete, Phase 28 Defined

**Finding: CRITICAL GAP**
The roadmap goes only to Phase 17 (Collaboration Real-Time Editor, marked complete Feb 2026). Phases 18-27 are entirely absent from the roadmap document:
- Phase 18-22: Admin upgrade, Competitive Gap features (Tiers 1-3), Security Compliance, Memory Safety
- Phase 23: Mobile polish, quality improvements
- Phase 24: PRD Gap Closure
- Phase 25: UI/UX Revolution (Design System, Theming, Accessibility)
- Phase 26: SkillTree implementation
- Phase 27: LiveSessions, Offline Web, Course Discovery, KG context

Phase 28 (next work) is not yet defined anywhere.

Action required: Append Phases 18-27 with completion status and define Phase 28.

### G. TEST_REGISTRY.md — Sessions 25-27 Test Files

**Finding: CRITICAL GAP**
The entire registry shows tests as "Planned" with estimated target counts. No actual test files or real counts are reflected. Key gaps:

| Subgraph | Registry Says | Actual |
|----------|--------------|--------|
| Core | 150+ Planned | 640 actual |
| Content | 200+ Planned | 1,041 actual |
| Annotation | 120+ Planned | 144 actual |
| Collaboration | 100+ Planned | 161 actual |
| Agent | 180+ Planned | 599 actual |
| Knowledge | 150+ Planned | 509 actual |
| Web Frontend | Not listed | 3,315 actual |
| Security | Not listed | 816 actual |

New test files from Sessions 25-27 not listed at all:
- `apps/web/src/pages/LiveSessionsPage.test.tsx`
- `apps/web/src/pages/LiveSessionDetailPage.test.tsx`
- `apps/web/src/pages/SkillTreePage.test.tsx`
- `apps/web/src/pages/KnowledgeGraphPage.test.tsx`
- `apps/web/src/hooks/useOfflineStatus.test.ts`
- `apps/web/src/hooks/useOfflineQueue.test.ts`
- `apps/web/src/components/OfflineBanner.test.tsx`
- `apps/web/src/components/AdminActivityFeed.test.tsx`
- `apps/web/src/components/SmartRoot.test.tsx`
- `apps/mobile/src/screens/AITutorScreen.test.ts`
- `apps/subgraph-knowledge/src/graph/skill-tree.service.spec.ts`
- `apps/subgraph-knowledge/src/graph/skill-tree.resolver.spec.ts`
- `apps/web/e2e/live-sessions.spec.ts`
- `apps/web/e2e/offline-mode.spec.ts`
- `apps/web/e2e/knowledge-graph-course-context.spec.ts`

### H. docs/security/SESSION_26_SECURITY_AUDIT.md

**Finding: OK**
File exists and is complete. Covers all SI-1 through SI-10, router analysis (public routes, wildcard catch-all finding MEDIUM), SkillTree RLS, AITutorScreen consent flow. Well-structured with verdict table.

Minor note: The duplicate `phase-27-security-audit.md` (lowercase) vs `PHASE_27_SECURITY_AUDIT.md` (uppercase) in the same security/ directory creates confusion. Should be merged into one canonical file.

### I. README.md — Accurate Stats

**Finding: NEEDS UPDATE**
- Demo user passwords: README shows "Demo123!" — this contradicts the authoritative password source in `scripts/reset-keycloak-passwords.cjs` which sets per-role passwords (SuperAdmin123!, Instructor123!, etc.). The README credentials table is wrong.
- No mention of 5,762+ tests, WCAG 2.2 AAA badge, i18n (Hebrew/English), LiveSessions, Offline Web, SkillTree, Design System
- WCAG badge shows "AA" but CLAUDE.md indicates AAA was achieved in Session 25

### J. API_CONTRACTS_GRAPHQL_FEDERATION.md — LiveSessions, SkillTree, KnowledgeGraph

**Finding: HIGH GAP**
Zero occurrences of "LiveSession", "SkillTree", or "skill_tree" in the document. All Phase 27 types (LiveSession, LiveSessionStatus, LiveSessionConnection) and Phase 25-26 types (SkillTreeNode, SkillTreeEdge, UserSkillMastery, MasteryLevel enum) are absent from the API contracts document.

The document ends at Section 20 covering the original 8-phase design. The 10 new entity types introduced in Sessions 25-27 need a Section 21 (or additions to relevant subgraph sections).

---

## Section 3: Docs to Delete, Merge, and Create

### DELETE — Fully Superseded or Duplicate

| File | Reason |
|------|--------|
| `docs/security/phase-27-security-audit.md` (lowercase) | Duplicate of `PHASE_27_SECURITY_AUDIT.md`. Merge content then delete lowercase version. |
| `docs/security/SUBPROCESSORS.md` | Apparent duplicate of `SUBPROCESSOR_REGISTER.md` in same directory |
| `docs/plans/features/ACCESSIBILITY_AND_THEMING_IMPLEMENTATION_SPEC.md` | Superseded by the actual Session 25 implementation. Should move to archive/. |

### MERGE — Near-Duplicates

| Files | Action |
|-------|--------|
| `docs/security/SUBPROCESSORS.md` + `docs/security/SUBPROCESSOR_REGISTER.md` | Merge into single `SUBPROCESSOR_REGISTER.md` |
| `docs/security/phase-27-security-audit.md` + `docs/security/PHASE_27_SECURITY_AUDIT.md` | Merge into `PHASE_27_SECURITY_AUDIT.md`, delete lowercase file |
| `docs/plans/archive/PHASE_27_DEPLOYMENT_PLAN.md` + `docs/plans/archive/REMAINING_WORK_PLAN.md` | Review — REMAINING_WORK_PLAN may be superseded |

### CREATE FROM SCRATCH

| Document | Path | Purpose |
|----------|------|---------|
| SESSIONS_23_TO_27_SUMMARY.md | `docs/project/` | Append to SESSION_SUMMARY.md with Sessions 23-27 |
| PHASE_28_SPEC.md | `docs/plans/features/` | Define Phase 28 scope and acceptance criteria |
| DESIGN_SYSTEM.md | `docs/development/` | Document Indigo Design System tokens, ThemeProvider, COLORS, SPACING |

---

## Section 4: Cross-linking Gaps in INDEX.md

| Gap | Action |
|-----|--------|
| `docs/project/DOC_MANAGER_AUDIT_SESSION27.md` (this file) | Add to INDEX.md under docs/project/ |
| `docs/security/PHASE_27_SECURITY_AUDIT.md` | Listed in INDEX.md as `phase-27-security-audit.md` (lowercase) — fix to match actual filename |
| `docs/plans/archive/` contents | INDEX.md lists plans/ but does not list individual archive files — add a table |
| Session 25 test files in plans/ | No plan doc exists for Session 25 UI/UX Revolution (plan was executed inline). Should add `PHASE_25_IMPLEMENTATION_SUMMARY.md` in archive/. |

---

## DOCUMENTATION MANAGER WORK PLAN — Session 27

### Priority 1 — CRITICAL (blocking navigation/onboarding)

| # | Doc | Action | Effort |
|---|-----|--------|--------|
| 1 | `CHANGELOG.md` | Create full changelog from git log (Sessions 1-27, all commits) | L |
| 2 | `PROJECT_STATUS.md` | Full rewrite — current phase=27 complete, 5,762+ tests, all services running, real metrics | M |
| 3 | `SESSION_SUMMARY.md` | Append/rewrite Sessions 2-27 (23 missing sessions) — use git log + OPEN_ISSUES.md as source | L |
| 4 | `IMPLEMENTATION_ROADMAP.md` | Append Phases 18-27 with completion dates + define Phase 28 | M |
| 5 | `SPRINT_ACTION_PLAN.md` | Full rewrite — currently describes Phase 3 state from Feb 2026 (24 phases obsolete) | S |

### Priority 2 — HIGH (outdated content causing confusion)

| # | Doc | Action | Effort |
|---|-----|--------|--------|
| 6 | `IMPLEMENTATION_STATUS.md` | Append Sessions 23-27 deliverables, update test counts table | M |
| 7 | `TEST_REGISTRY.md` | Full rewrite — replace all "Planned" rows with actual counts, add all Sessions 25-27 test files | L |
| 8 | `API_CONTRACTS_GRAPHQL_FEDERATION.md` | Append Section 21: Phase 25-27 types (LiveSession, SkillTree, UserSkillMastery, MasteryLevel enum, AdminActivityFeed, KG courseId context) | M |
| 9 | `README.md` | Fix demo passwords table, add test count badge, add Features for Design System/LiveSessions/Offline/SkillTree/i18n, update WCAG badge to AAA | S |
| 10 | `docs/INDEX.md` | Add DOC_MANAGER_AUDIT_SESSION27.md, fix phase-27-security-audit filename, add archive/ table | S |

### Priority 3 — MEDIUM (gaps and improvements)

| # | Doc | Action | Effort |
|---|-----|--------|--------|
| 11 | `docs/security/SECURITY_CHECKLIST.md` | Add Phase 27 security checks (LiveSession encryption, offline data isolation) | S |
| 12 | `docs/testing/E2E_TESTING.md` | Add Sessions 25-27 E2E spec files with descriptions | S |
| 13 | `docs/development/` — ADD new | Create `DESIGN_SYSTEM.md` documenting Indigo tokens, ThemeProvider, CSS vars, FOUC prevention | M |
| 14 | `docs/plans/features/ACCESSIBILITY_AND_THEMING_IMPLEMENTATION_SPEC.md` | Move to archive/ (superseded by Session 25 implementation) | S |
| 15 | Merge: `SUBPROCESSORS.md` + `SUBPROCESSOR_REGISTER.md` | Merge duplicate files in docs/security/ | S |
| 16 | Merge: `phase-27-security-audit.md` + `PHASE_27_SECURITY_AUDIT.md` | Merge lowercase duplicate in docs/security/ | S |

### Priority 4 — LOW (polish and nice-to-have)

| # | Doc | Action | Effort |
|---|-----|--------|--------|
| 17 | `OPEN_ISSUES.md` — header | Replace 1,200+ character header line with structured summary table | S |
| 18 | `docs/plans/features/PHASE_28_SPEC.md` | Create Phase 28 definition based on known next priorities | M |
| 19 | `docs/project/SESSIONS_23_27_SUMMARY.md` | Detailed session summaries for archival (spin off from SESSION_SUMMARY.md rewrite) | M |
| 20 | `docs/security/SESSION_27_SECURITY_AUDIT.md` | Create Session 27 security audit (currently only Session 26 and Phase 27 audits exist; no unified Session 27 audit) | S |

---

### Execution Plan (parallel agents)

**Agent-D1:** Priority 1 items #1 (CHANGELOG) + #4 (IMPLEMENTATION_ROADMAP Phases 18-27)
- Source: `git log --oneline -100`, OPEN_ISSUES.md, docs/plans/archive/
- Effort: ~90 min parallel

**Agent-D2:** Priority 1 items #2 (PROJECT_STATUS) + #3 (SESSION_SUMMARY) + #5 (SPRINT_ACTION_PLAN)
- Source: IMPLEMENTATION_STATUS.md, OPEN_ISSUES.md, git log
- Effort: ~75 min parallel

**Agent-D3:** Priority 2 items #6 (IMPLEMENTATION_STATUS append) + #7 (TEST_REGISTRY rewrite)
- Source: OPEN_ISSUES.md test counts, git status new test files list
- Effort: ~60 min parallel

**Agent-D4:** Priority 2 items #8 (API_CONTRACTS append) + #9 (README updates) + #10 (INDEX.md)
- Source: apps/subgraph-knowledge/src/graph/*.graphql, apps/subgraph-agent/src/live-sessions/, packages/db/src/schema/
- Effort: ~60 min parallel

**Agent-D5:** Priority 3 + 4 items #11-16 (security, testing, merges, archive)
- Source: existing files to merge/update
- Effort: ~45 min parallel

All 5 agents run in parallel after dependency analysis. No agent depends on another's output.

### Estimated total effort: 20 documents, approximately 5-7 hours total (1.5-2 hours with 5 parallel agents)

---

## Section 5: Audit Methodology Notes

### Files Audited

Total files reviewed in this audit: 120+ documents across:
- Root: 6 files
- docs/project/: 4 files
- docs/security/: 21 files
- docs/testing/: 9 files
- docs/plans/bugs/: 2 files
- docs/plans/features/: 5 files
- docs/plans/archive/: 10 files
- docs/architecture/: 2 files
- docs/deployment/: 14 files
- docs/development/: 7 files
- docs/ai/: 2 files
- docs/api/: 2 files
- docs/compliance/: 2 files
- docs/database/: 1 file
- docs/legal/: 2 files
- docs/policies/: 10 files
- docs/product/: 9 files
- docs/reference/: 5 files (+ 4 PDF/docx files)
- docs/reports/: 2 files
- docs/research/: 1 file

### Key Source Documents Used

- `OPEN_ISSUES.md` (6,774 lines, current to 06 Mar 2026) — primary source of truth for actual completion status
- `docs/project/IMPLEMENTATION_STATUS.md` (Session 22, 2026-03-05) — reference for completed phase breakdown
- `docs/security/SESSION_26_SECURITY_AUDIT.md` — confirms Session 26 security coverage
- `git log --oneline -20` — confirms master HEAD = `c0e4810` (Phase 27 commit)
- `CLAUDE.md` memory section — confirms Session 25 Phase 5 as last completed session

### Critical Inconsistency Found: Demo User Passwords

`README.md` line 62 states: "All demo users have password: **Demo123!**"

`CLAUDE.md` Keycloak section states:
- super.admin@edusphere.dev: SuperAdmin123!
- instructor@example.com: Instructor123!
- org.admin@example.com: OrgAdmin123!
- researcher@example.com: Researcher123!
- student@example.com: Student123!

The authoritative source is `scripts/reset-keycloak-passwords.cjs`. README must be updated to remove "Demo123!" and point to the reset script.

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Total docs audited | 120+ |
| Critical gaps found | 5 (CHANGELOG stub, SESSION_SUMMARY, PROJECT_STATUS, IMPLEMENTATION_ROADMAP missing 10 phases, TEST_REGISTRY all-planned) |
| High gaps found | 4 (IMPLEMENTATION_STATUS 5 sessions behind, API_CONTRACTS missing 10 types, README stale, INDEX cross-linking) |
| Medium gaps found | 6 (SECURITY_CHECKLIST, E2E_TESTING, missing DESIGN_SYSTEM.md, ACCESSIBILITY spec superseded, 2 duplicate files) |
| Low priority items | 4 (OPEN_ISSUES header, Phase 28 spec, session summaries archival, Session 27 security audit) |
| Docs to delete | 1 (lowercase duplicate phase-27-security-audit.md) |
| Docs to merge | 2 pairs |
| Docs to create from scratch | 3 new (CHANGELOG content, DESIGN_SYSTEM.md, PHASE_28_SPEC.md) |
| Work plan items total | 20 |
| Parallel agents planned | 5 |
| Estimated wall-clock time | 1.5-2 hours (parallel) |
