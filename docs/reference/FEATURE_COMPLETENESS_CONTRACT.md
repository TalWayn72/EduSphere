# Feature Completeness Contract Template

> **Purpose:** A feature is NOT "done" until every item in this contract is checked.
> Copy this template for each new feature and fill in the specifics.

---

## Feature: [Feature Name]

**Phase:** [Phase N] | **Owner:** [Division] | **Date:** [YYYY-MM-DD]

---

### 1. Navigation Entry

- [ ] Sidebar/nav item added (or existing item updated)
- [ ] Route registered in router config
- [ ] Route lazy-loaded with `React.lazy()`
- [ ] Route wrapped in `guarded()` with appropriate `requiredRoles`
- [ ] Breadcrumb updated (if applicable)

### 2. Backend Implementation

- [ ] GraphQL SDL types/queries/mutations defined
- [ ] Resolver implemented with RLS context
- [ ] Zod validation on all mutation inputs
- [ ] Service layer with business logic
- [ ] NATS events published (if async workflows)
- [ ] Pino logging with `[ServiceName]` prefix

### 3. Frontend Implementation

- [ ] Page component created
- [ ] Loading state (Skeleton/Spinner)
- [ ] Empty state (no data)
- [ ] Error state (ErrorBoundary catches)
- [ ] Success state (data loaded)
- [ ] Mobile responsive (tested at 768px, 1024px)

### 4. Testing

- [ ] Backend unit tests (resolver + service)
- [ ] Frontend unit tests (component renders all states)
- [ ] E2E Playwright spec with `data-testid` selectors
- [ ] Visual regression screenshot (`toHaveScreenshot()`)
- [ ] RLS test (cross-tenant isolation verified)
- [ ] Security test (role-based access verified)

### 5. Documentation

- [ ] API_CONTRACTS updated (if new GraphQL types)
- [ ] OPEN_ISSUES.md entry (if fixing a tracked issue)
- [ ] Feature documented in CHANGELOG.md

### 6. QA Sign-off

- [ ] QA division reviewed all states (loading, empty, error, success)
- [ ] Visual QA screenshot taken and stored in `docs/screenshots/`
- [ ] Cross-browser tested (Chrome, Firefox minimum)
- [ ] Accessibility: axe-core 0 violations

---

### Sign-off

| Division | Approved | Date |
|----------|----------|------|
| Product | [ ] | |
| Frontend | [ ] | |
| Backend | [ ] | |
| QA | [ ] | |
| Security | [ ] | |

---

*Template version: 1.0 — March 2026*
