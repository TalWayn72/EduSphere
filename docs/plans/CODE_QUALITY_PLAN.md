# Code Quality Comprehensive Plan

**Date:** 2026-03-16
**Branch:** feat/compliance-accessibility-security
**Skills Loaded:** code-review, code-review-checklist, code-review-excellence, refactoring-surgeon, code-architecture, simplify, react-composition-patterns, react-performance-optimizer, typescript-advanced-patterns, nestjs-best-practices, design-system-patterns

## Current State

| Metric | Value | Target |
|--------|-------|--------|
| TypeScript errors | 0 | 0 ✅ |
| ESLint errors | 11 | 0 |
| ESLint warnings | 67 | 0 |
| `console.log` in prod | 0 | 0 ✅ |
| `: any` in prod | 0 | 0 ✅ |
| TODO/FIXME | 3 | 0 |
| Files >500 lines (prod) | 15 | 0 |

## Execution Waves

### Wave 1 — Lint & Type Cleanup (Parallel Agents)
- **Agent-1:** Fix 11 ESLint errors (unused vars in collaboration + unsafe regex in knowledge)
- **Agent-2:** Fix 67 ESLint warnings (object-injection, non-literal-fs across subgraphs)
- **Agent-3:** Resolve 3 TODO/FIXME comments

### Wave 2 — File Splitting (Parallel Agents, max 5 concurrent)
Split all 15 production files >500 lines:

**Sub-wave 2a (5 agents):**
- `router.tsx` (1,292) → route groups by domain
- `KnowledgeGraph.tsx` (966) → graph components + hooks
- `SourceManager.tsx` (873) → manager + source components
- `Search.tsx` (665) → search components + hooks
- `ContentViewer.tsx` (637) → viewer sections

**Sub-wave 2b (5 agents):**
- `CourseDetailPage.tsx` (627) → detail sections
- `CourseEditPage.modules.tsx` (577) → module components
- `CourseList.tsx` (563) → list + filters
- `AgentsPage.tsx` (546) → agent components
- `CoursesDiscoveryPage.tsx` (537) → discovery sections

**Sub-wave 2c (4 agents):**
- `LiveSessionsPage.tsx` (533) → session components
- `LessonResultsPage.tsx` (526) → results sections
- `DashboardPage.tsx` (518) → dashboard widgets
- `nats-client/events.ts` (558) → event groups by domain

### Wave 3 — Deep Code Quality Audit (Skills-Based)
Load and apply these skills for comprehensive review:

| Skill | Focus Area |
|-------|------------|
| `code-review-excellence` | Overall code quality patterns |
| `react-composition-patterns` | Component architecture |
| `react-performance-optimizer` | Performance anti-patterns |
| `typescript-advanced-patterns` | Type safety improvements |
| `nestjs-best-practices` | Backend patterns |
| `design-system-patterns` | UI consistency |
| `refactoring-surgeon` | Surgical refactoring |
| `code-architecture` | Structural improvements |

Audit areas:
1. Component composition (prop drilling, context usage)
2. Performance (unnecessary re-renders, missing memoization)
3. Error handling patterns
4. Hook extraction opportunities
5. Magic numbers / string literals
6. Duplicate code patterns
7. Import organization
8. Naming consistency

### Wave 4 — Verification & Completion
1. `pnpm turbo typecheck` — 0 errors
2. `pnpm turbo lint` — 0 errors/warnings
3. `pnpm turbo test` — 100% pass
4. Docker health check
5. 5-user authentication
6. Git commit + CI verification
