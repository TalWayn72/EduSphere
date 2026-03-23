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
- [ ] Route lazy-loaded
- [ ] Route wrapped in auth guard with appropriate `requiredRoles`
- [ ] Breadcrumb updated (if applicable)

### 2. Backend Implementation

- [ ] {API_SCHEMA} types/queries/mutations defined
- [ ] Resolver/controller implemented with {SECURITY_CONTEXT}
- [ ] {VALIDATION_LIB} validation on all mutation inputs
- [ ] Service layer with business logic
- [ ] {EVENT_BUS} events published (if async workflows)
- [ ] {LOGGER} logging with `[ServiceName]` prefix

### 3. Frontend Implementation

- [ ] Page component created
- [ ] Loading state ({LOADING_STATES})
- [ ] Empty state (no data)
- [ ] Error state (ErrorBoundary catches)
- [ ] Success state (data loaded)
- [ ] Mobile responsive (tested at 768px, 1024px)

### 4. Testing

- [ ] Backend unit tests (resolver + service)
- [ ] Frontend unit tests (component renders all states)
- [ ] E2E {E2E_FRAMEWORK} spec with `data-testid` selectors
- [ ] Visual regression screenshot (`toHaveScreenshot()`)
- [ ] {ROW_SECURITY} test (cross-tenant isolation verified)
- [ ] Security test (role-based access verified)

### 5. Documentation

- [ ] API contracts updated (if new API types)
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

*Template version: 1.0*
