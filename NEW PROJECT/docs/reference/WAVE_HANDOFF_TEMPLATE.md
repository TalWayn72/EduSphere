# Inter-Wave Handoff Document Template

> **Purpose:** Every Wave 1 agent must produce this document before Wave 2 agents launch.
> Prevents Wave 2 agents from guessing Wave 1 decisions.

---

## Wave [N] → Wave [N+1] Handoff

**Feature:** [Feature Name] | **Date:** [YYYY-MM-DD] | **Author:** [Division]

---

### 1. Decisions Made

| # | Decision | Rationale | Alternatives Considered |
|---|----------|-----------|------------------------|
| 1 | [Decision] | [Why] | [What else was considered] |

### 2. Entity Boundaries

| Entity | Owning Service | Extended By | Key Fields |
|--------|----------------|-------------|------------|
| [Type] | [service-*] | [service-*] | [id, ...] |

### 3. Schema Changes Required

| Table/Type | Change | Migration Needed | Breaking |
|-----------|--------|-----------------|----------|
| [table] | [add column X] | Yes | No |

### 4. Threat Model Stub

| Threat | STRIDE Category | Mitigation | Owner |
|--------|----------------|-----------|-------|
| [Threat] | [S/T/R/I/D/E] | [Mitigation] | [Division] |

### 5. Testability Contract

- Required `data-testid` attributes: [list]
- Required error codes: [list]
- Mock seams: [list]
- See full contract: [link to testability contract]

### 6. UX Specification

- User flow: [link to UX spec]
- WCAG requirements: [specific items]
- Responsive breakpoints: [list]

### 7. Open Questions for Wave [N+1]

| # | Question | Context | Suggested Answer |
|---|----------|---------|-----------------|
| 1 | [Question] | [Why it matters] | [Suggested answer] |

### 8. Dependencies

| Dependency | Status | Blocker? |
|-----------|--------|----------|
| [Package/service] | [Available/Pending] | [Yes/No] |

---

### Sign-off

| Wave 1 Division | Approved | Date |
|-----------------|----------|------|
| Product | [ ] | |
| Architecture | [ ] | |
| UX/UI | [ ] | |

---

*Template version: 1.0*
