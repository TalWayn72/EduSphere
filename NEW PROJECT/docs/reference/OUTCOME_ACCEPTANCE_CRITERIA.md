# Outcome-Focused Acceptance Criteria Template

> **Purpose:** Replace execution-focused criteria with user-outcome criteria.

---

## Problem

Current acceptance criteria focus on technical execution:
- "API returns 200 with correct payload" ✅
- "Database migration applies without error" ✅

But miss user outcomes:
- "Student can find and start the course they need within 30 seconds" ❌
- "Instructor sees their upload progress and can retry on failure" ❌

## Template

### Feature: [Feature Name]

#### User Outcome Criteria (mandatory)

| # | As a... | I can... | So that... | Measured by |
|---|---------|----------|------------|-------------|
| UO-1 | [Role] | [Action] | [Benefit] | [Measurable condition] |
| UO-2 | [Role] | [Action] | [Benefit] | [Measurable condition] |
| UO-3 | [Role] | [Action] | [Benefit] | [Measurable condition] |

#### Technical Criteria (supporting)

| # | Check | Command/Test | Pass Condition |
|---|-------|-------------|----------------|
| TC-1 | API returns data | `curl /api` | 200 + valid JSON |
| TC-2 | Migration applies | `{PACKAGE_MANAGER} db migrate` | Exit 0 |
| TC-3 | TypeScript clean | `{PACKAGE_MANAGER} {BUILD_ORCHESTRATOR} typecheck` | 0 errors |

#### Quality Criteria (non-negotiable)

- [ ] E2E test covers the user journey end-to-end
- [ ] Error states show user-friendly messages (no raw errors)
- [ ] Loading states show skeleton/spinner (no blank screen)
- [ ] Accessible: keyboard navigable, screen reader labels
- [ ] Mobile: works at 768px breakpoint

## Rules

1. **Every feature MUST have at least 2 User Outcome Criteria** (UO-*)
2. UO criteria are tested with E2E specs, not unit tests
3. Technical criteria support UO criteria but never replace them
4. "API works" is NOT an acceptance criterion — "User can accomplish [task]" IS
5. Acceptance criteria are written at Wave 1 (planning), not Wave 2 (implementation)

---

*Template version: 1.0*
