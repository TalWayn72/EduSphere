# Bug-to-PRD Feedback Loop Protocol

> **Purpose:** When a bug class affects 3+ files, auto-update the relevant PRD section.
> **Item:** #93 from master work plan | **Effective:** 2026-03-17

---

## Problem

Same bug classes recur across features because the Product Requirements Document (PRD) doesn't
capture lessons learned from bug fixes. Bug fixes happen in code, but the requirements that would
have prevented the bug are never formalized.

## Protocol

### Trigger Condition

A bug-to-PRD update is triggered when:
- A bug fix's **Discovery Wave 2** finds the same pattern in **3 or more files**
- The bug class represents a **missing non-functional requirement** (not just a coding error)

### Examples of Bug Classes → PRD Updates

| Bug Class | PRD Section to Add/Update |
|-----------|--------------------------|
| Missing upload retry | NFR: "All uploads must implement retry with exponential backoff" |
| Missing error boundary | NFR: "All route-level components must catch and display errors gracefully" |
| Missing tenant_id on table | Security: "All new tables must include tenant_id with RLS policy" |
| Missing cleanup on unmount | NFR: "All timers/subscriptions must be cleaned up on component unmount" |
| Missing Zod validation | Security: "All mutation inputs must be validated with Zod schemas" |

### Process

1. **During Stage 8 (RCA):** If Discovery Wave 2 found 3+ files with the same pattern:
   - Identify the missing requirement
   - Draft a one-line NFR statement

2. **Update PRD:**
   - Add the NFR to `docs/product/PRODUCT_REQUIREMENTS.md` under the relevant section
   - Reference the bug ID that triggered the update
   - Mark as `[Auto-added from BUG-XXX]`

3. **Update CI:**
   - If the bug class can be caught by a lint rule or static check, create one
   - Add the rule to `packages/eslint-config/` or `tests/security/`
   - Reference the PRD section in the rule's description

### Template

```markdown
### NFR-XXX: [Requirement Title]
> Auto-added from BUG-XXX (Discovery Wave 2: N files affected)

**Requirement:** [One-line statement]
**Rationale:** [Bug class description — why this keeps happening]
**Enforcement:** [ESLint rule / CI check / code review checklist item]
**Test:** [Test file that guards this requirement]
```

---

*Created: March 2026 — Enterprise Audit Wave 8*
