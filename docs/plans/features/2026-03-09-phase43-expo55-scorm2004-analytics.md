# Phase 43 — Expo SDK 55 + SCORM 2004/cmi5 + Instructor Analytics

> **Document Storage:** `docs/plans/features/2026-03-09-phase43-expo55-scorm2004-analytics.md`
> **Research date:** 2026-03-09 | **Current phase:** 42 ✅ Complete

---

## Executive Summary

Three parallel sprints (18–20 days total):
- **Sprint A** — Expo SDK 55 + RN 0.83 migration (mandatory, blocks all future mobile work)
- **Sprint B** — SCORM 2004 + cmi5 compliance (enterprise procurement unblock)
- **Sprint C** — Instructor Analytics Dashboard (high impact, low complexity)

**Phase 44 (deferred):** Skills-Based Learning Paths — highest TAM differentiator, deserves full dedicated sprint with AGE graph expansion + AI coaching integration.

---

## Research Findings

### Market Context (March 2026)
- EdTech market: $182–200B, growing 13–17% CAGR
- Skills-first LMS is the defining differentiator in 2026 enterprise procurement
- SCORM appears in >80% of enterprise RFPs — without it EduSphere is disqualified from regulated-industry deals
- Instructor analytics: "actionable dashboards critical for edTech buyers" (BackpackInteractive 2026)
- Social learning + cohort-based learning replacing self-paced MOOCs (360Learning, Disco)

### Codebase Gap Analysis (March 2026)

| Area | Status | Gap |
|------|--------|-----|
| Mobile SDK | Expo 54 + RN 0.76 | Must upgrade to SDK 55 + RN 0.83 |
| expo-av | Installed | Must migrate to `expo-video` (expo-av removed in SDK 55) |
| Legacy Architecture | Unknown state | Must confirm New Architecture enabled |
| SCORM 1.2 | ✅ Complete (Phase 8+) | Need SCORM 2004 + cmi5 |
| xAPI LRS | ✅ Complete (Phase 41) | Bridge to cmi5 statements |
| Instructor analytics | ✅ Data exists | Need visualization + heatmap UI |
| Learning paths | ✅ Backend exists | Missing 3 GraphQL resolvers |

---

## Sprint A — Expo SDK 55 + React Native 0.83 (Days 1–6)

### Why Mandatory
- SDK 55 drops Legacy Architecture permanently (frozen June 2025)
- `expo-av` removed — VideoPlayerWithCurriculum must migrate to `expo-video`
- `react-native-reanimated` v4 requires New Architecture
- Hermes v1: OTA updates 75% smaller via bytecode diffing
- Edge-to-edge mandatory on Android 16+ (enforced law)
- SDK 54 exits active support Q3 2026 — security exposure

### Breaking Changes (SDK 54 → SDK 55)
| Change | Impact on EduSphere |
|--------|---------------------|
| `newArchEnabled` removed from `app.json` | Remove config guard |
| `expo-av` removed | Rewrite VideoPlayerWithCurriculum → `expo-video` |
| `expo-video-thumbnails` deprecated | Remove or replace |
| Edge-to-edge mandatory Android 16+ | Layout adjustments for status/nav bars |
| `react-native-reanimated` must be v4 | Update all animation hooks |
| RN 0.76 → 0.83 | New JSI module paths |

### Migration Steps
**Day 1:** Enable New Architecture on SDK 54 → validate dev build
```json
// app.json / app.config.ts
{
  "expo": {
    "plugins": [["expo-build-properties", { "ios": { "newArchEnabled": true }, "android": { "newArchEnabled": true } }]]
  }
}
```

**Day 2–3:** Fix New Architecture regressions
- Audit all native modules with `npx expo-doctor`
- Update `react-native-reanimated` → v4
- Update `@shopify/flash-list` → v4 (if used)
- Test on iOS simulator + Android emulator

**Day 4:** Bump SDK 55
```bash
npx expo install expo@^55 react-native@0.83
npx expo-doctor
```
- Remove `newArchEnabled` from app.json (no longer needed)
- Migrate `expo-av` → `expo-video`

**Day 5–6:** Fix edge-to-edge + run full test suite

### Agents
- **Agent-A1:** New Architecture enablement + native module audit
- **Agent-A2:** `expo-av` → `expo-video` migration (VideoPlayerWithCurriculum + ModelViewerScreen)
- **Agent-A3:** Edge-to-edge layout fixes + test suite update

---

## Sprint B — SCORM 2004 + cmi5 Runtime (Days 1–10)

### What Exists (Phase 8)
- SCORM 1.2 fully implemented: runtime API, CMI data model, iframe sandbox, session tracking, GraphQL resolvers
- DB schema: `scorm_packages` + `scorm_sessions` tables (both support version: '1.2' | '2004' | 'cmi5')
- xAPI LRS from Phase 41 — cmi5 sends xAPI statements to this LRS

### What's Needed

**SCORM 2004:**
- Sequencing engine (IMS SS specification, linear + choice navigation)
- Expanded CMI data model: `cmi.sequencing.*`, `cmi.adl.*` namespaces
- `imsmanifest.xml` v1.3 parser (vs 1.2 parser already present)
- `cmi.interactions` unlimited entries (vs SCORM 1.2's 64K suspend_data limit)
- Multi-attempt tracking with mastery threshold

**cmi5:**
- AU (Assignable Unit) launch parameters: `activityId`, `actor`, `registration`, `returnURL`
- 9 required xAPI verb statements: launched, initialized, terminated, passed, failed, completed, satisfied, waived, abandoned
- `MoveOn` criteria: Passed, Completed, CompletedAndPassed, CompletedOrPassed, NotApplicable
- Session management: fetch auth token from LRS before launch

### New Files
| File | Description |
|------|-------------|
| `apps/subgraph-content/src/scorm/scorm2004-api.ts` | SCORM 2004 runtime JavaScript API |
| `apps/subgraph-content/src/scorm/cmi5-launcher.service.ts` | cmi5 AU launch + xAPI statement emitter |
| `apps/subgraph-content/src/scorm/cmi5-sequencing.service.ts` | MoveOn criteria evaluator |
| `apps/web/src/components/scorm/Scorm2004Player.tsx` | SCORM 2004 iframe player |
| `apps/web/src/components/scorm/Cmi5Player.tsx` | cmi5 AU launcher |
| `apps/web/src/lib/scorm/scorm2004-data-model.ts` | CMI data model v2004 |

### Agents
- **Agent-B1:** SCORM 2004 CMI data model + manifest parser
- **Agent-B2:** cmi5 launcher service + xAPI statement emitter (connects to Phase 41 LRS)
- **Agent-B3:** Scorm2004Player + Cmi5Player React components
- **Agent-B4:** Tests (unit + E2E)

---

## Sprint C — Instructor Analytics Dashboard (Days 1–8)

### What Exists
- `CourseAnalyticsPage.tsx` — enrollment, completion rate, drop-off funnel, content metrics
- `analytics.service.ts` — all metrics computed from DB
- `tenant-analytics.service.ts` + export service (Phase 35)
- xAPI statements from Phase 41 (engagement data)
- `learning_velocity` snapshots from Phase 35 (migration 0019)

### What's Missing
1. **Learner engagement heatmap** — which minute of a video loses learners
2. **AI agent usage analytics** — tutor requests, LangGraph execution time, token costs per course
3. **Student self-analytics** — personal progress dashboard (not instructor-facing)
4. **Predictive retention model UI** — at-risk flags already computed, need visual display
5. **Microlearning path resolvers** — 3 missing GraphQL resolvers (dailyMicrolesson, microlearningPaths, createMicrolearningPath)

### New Files
| File | Description |
|------|-------------|
| `apps/web/src/pages/InstructorAnalyticsDashboard.tsx` | Main analytics hub |
| `apps/web/src/components/analytics/LearnerHeatmapChart.tsx` | Video engagement heatmap |
| `apps/web/src/components/analytics/DropOffFunnelChart.tsx` | Module drop-off visualization |
| `apps/web/src/components/analytics/AtRiskLearnersPanel.tsx` | Risk flags + interventions |
| `apps/web/src/components/analytics/AiUsageMetricsPanel.tsx` | Agent usage + token cost |
| `apps/web/src/pages/MyProgressPage.tsx` | Student self-analytics |
| `apps/subgraph-content/src/analytics/microlearning.resolver.ts` | 3 missing resolvers |
| `apps/subgraph-content/src/analytics/ai-usage.service.ts` | Token cost aggregation |

### Agents
- **Agent-C1:** InstructorAnalyticsDashboard + LearnerHeatmapChart + DropOffFunnelChart
- **Agent-C2:** AtRiskLearnersPanel + AiUsageMetricsPanel
- **Agent-C3:** MyProgressPage (student self-analytics)
- **Agent-C4:** Microlearning resolvers + backend AI usage service

---

## Phase 44 Preview — Skills-Based Learning Paths (Deferred)

**Why Phase 44:**
- Highest long-term TAM differentiator ($2.8B skills management market)
- EduSphere's knowledge graph (Apache AGE) is uniquely positioned — no competitor has graph-powered skills paths
- Requires careful data model design: skills, skill_levels, learner_skill_progress, skill_prerequisites + AGE graph expansion (HAS_SKILL edges between Concept → Skill nodes)
- 10–14 day track deserves undivided attention
- Peer review from Social Learning (Phase 45) generates natural skill evidence for the skills layer

**Preview Scope:**
- DB: `skills`, `skill_levels`, `learner_skill_progress`, `skill_prerequisites` tables
- AGE: `HAS_SKILL` edges from Concept nodes to Skill nodes
- Backend: SkillService, SkillGapAnalyzer, SkillPathRecommender (via existing Agent subgraph)
- Frontend: SkillPathPage, SkillGapDashboard, LearnerSkillProfile

---

## Phase 45 Preview — Social Learning (Deferred)

Cohorts + Study Groups + Peer Review — builds naturally on top of Phase 44 Skills layer.
Peer review submissions generate xAPI `evaluated` statements → skill evidence.
Uses Phase 27 Live Sessions as synchronous backbone.

---

## Execution Plan

```
Day 1 (all parallel):
  Sprint A: Agent-A1 (New Architecture enablement)
  Sprint B: Agent-B1 (SCORM 2004 data model)
  Sprint C: Agent-C1 (InstructorAnalyticsDashboard shell)

Day 2–3 (parallel):
  Sprint A: Agent-A2 (expo-av → expo-video)
  Sprint B: Agent-B2 (cmi5 launcher)
  Sprint C: Agent-C2 (AtRiskLearnersPanel + AiUsage)

Day 4–6 (parallel):
  Sprint A: Agent-A3 (edge-to-edge + SDK 55 bump)
  Sprint B: Agent-B3 (Scorm2004Player + Cmi5Player)
  Sprint C: Agent-C3 (MyProgressPage)

Day 7–8 (parallel):
  Sprint B: Agent-B4 (SCORM tests)
  Sprint C: Agent-C4 (Microlearning resolvers)

Day 9–10 (QA):
  All: E2E specs + security tests + TypeScript check + health gate
```

---

## Verification Checklist

- [ ] `npx expo-doctor` — 0 warnings in `apps/mobile`
- [ ] `expo-video` replaces all `expo-av` usage (no import of `expo-av` remaining)
- [ ] New Architecture confirmed in EAS Build (Fabric + JSI active)
- [ ] SCORM 2004 package imports without error
- [ ] cmi5 AU launch sends 9 required xAPI statements to LRS
- [ ] InstructorAnalyticsDashboard renders with real course data
- [ ] `pnpm turbo test` — 100% pass
- [ ] `pnpm turbo typecheck` — 0 errors

---

## Expected Test Delta

| Package | Before | After Phase 43 | Delta |
|---------|--------|----------------|-------|
| Web unit | ~3,947 | ~4,050+ | +103 |
| Mobile unit | existing | +30 | +30 (SDK 55 + video migration) |
| E2E | existing | +15 | +15 (SCORM 2004, analytics, cmi5) |
| Security | ~970 | ~977 | +7 |
