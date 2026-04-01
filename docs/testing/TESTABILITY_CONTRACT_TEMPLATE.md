# Testability Contract Template

> **Purpose:** Defines testing requirements BEFORE implementation begins (shift-left).
> Every new feature must have a testability contract approved at Wave 1 (Planning).

---

## Feature: [Feature Name]

**Phase:** [Phase N] | **QA Owner:** [Name] | **Date:** [YYYY-MM-DD]

---

### 1. Required `data-testid` Attributes

Every interactive element must have a `data-testid` for Playwright selectors.

| Element               | `data-testid`       | Purpose                  |
| --------------------- | ------------------- | ------------------------ |
| Page container        | `page-[feature]`    | E2E page identification  |
| Primary action button | `btn-[action]`      | Click target             |
| Form inputs           | `input-[field]`     | Form fill                |
| List items            | `item-[type]-{id}`  | Item interaction         |
| Error message         | `error-[context]`   | Error state verification |
| Loading indicator     | `loading-[context]` | Loading state check      |
| Empty state           | `empty-[context]`   | Empty state verification |

### 2. Required Error Codes

Backend must return structured error codes (not just HTTP status).

| Scenario               | Error Code         | GraphQL Extension                            |
| ---------------------- | ------------------ | -------------------------------------------- |
| Unauthorized           | `UNAUTHORIZED`     | `{ code: 'UNAUTHORIZED' }`                   |
| Forbidden (wrong role) | `FORBIDDEN`        | `{ code: 'FORBIDDEN' }`                      |
| Not found              | `NOT_FOUND`        | `{ code: 'NOT_FOUND' }`                      |
| Validation error       | `VALIDATION_ERROR` | `{ code: 'VALIDATION_ERROR', field: '...' }` |
| Rate limited           | `RATE_LIMITED`     | `{ code: 'RATE_LIMITED', retryAfter: N }`    |

### 3. Required Mock Seams

Points where tests can inject mocks via `page.route()` or dependency injection.

| Seam                | URL Pattern                | Mock Response           |
| ------------------- | -------------------------- | ----------------------- |
| GraphQL query       | `/graphql` + operationName | `{ data: {...} }`       |
| File upload presign | `/api/presign`             | `{ url: 'mock://...' }` |
| External API        | `https://external.api/...` | `{ status: 200 }`       |

### 4. Test Matrix

| Test Type         | Count | Location                           | Runs In CI |
| ----------------- | ----- | ---------------------------------- | ---------- |
| Unit (component)  | [N]   | `apps/web/src/**/*.test.tsx`       | Yes        |
| Unit (service)    | [N]   | `apps/subgraph-*/src/**/*.spec.ts` | Yes        |
| E2E (Playwright)  | [N]   | `apps/web/e2e/*.spec.ts`           | Yes        |
| Visual regression | [N]   | `toHaveScreenshot()` in E2E        | Yes        |
| RLS isolation     | [N]   | `packages/db/src/rls/*.test.ts`    | Yes        |
| Security (RBAC)   | [N]   | `tests/security/*.spec.ts`         | Yes        |
| Load test         | [N]   | `infrastructure/load-testing/`     | Nightly    |

### 5. Acceptance Test Scenarios

| #   | Scenario        | Given                    | When              | Then                          |
| --- | --------------- | ------------------------ | ----------------- | ----------------------------- |
| 1   | Happy path      | User is authenticated    | Performs [action] | Sees [result]                 |
| 2   | Empty state     | No data exists           | Loads page        | Sees empty illustration + CTA |
| 3   | Error state     | API returns error        | Loads page        | Sees error card with retry    |
| 4   | Unauthorized    | User lacks required role | Navigates to page | Redirected to /               |
| 5   | Concurrent edit | Two users edit same item | Both save         | Conflict resolution shown     |

### 6. Performance Test Requirements

| Metric             | Threshold | Tool            |
| ------------------ | --------- | --------------- |
| Page load (LCP)    | < 2.5s    | Lighthouse CI   |
| API response (p95) | < 500ms   | k6              |
| Bundle size delta  | < 10KB    | Bundle analyzer |

---

### QA Sign-off

- [ ] All `data-testid` attributes verified in implementation
- [ ] All error codes match contract
- [ ] Mock seams tested and working
- [ ] All acceptance scenarios have passing E2E tests
- [ ] Visual regression baselines captured

**QA Approved:** [ ] Yes / [ ] Needs revision

---

_Template version: 1.0 — March 2026_
