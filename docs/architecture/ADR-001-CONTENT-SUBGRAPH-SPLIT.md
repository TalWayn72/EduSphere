# ADR-001: Content Subgraph Domain Decomposition

> **Status:** Proposed | **Date:** 2026-03-17 | **Deciders:** Architecture Division

## Context

`subgraph-content` currently owns 38+ domain concepts across 5 distinct bounded contexts:

- Course management (courses, modules, content items, files)
- Assessment (quizzes, quiz results, rubrics, assessment campaigns)
- Marketplace (listings, purchases, instructor payouts, revenue sharing)
- Compliance (compliance templates, training records, CPD tracking)
- SCORM/xAPI (SCORM packages, xAPI statements, cmi5 launches)

This violates the single-responsibility principle for Federation subgraphs and creates:

1. Large deployment blast radius (marketplace change can break course delivery)
2. Team ownership ambiguity (who owns what in content?)
3. Schema complexity (SDL file > 500 lines)

## Decision

Extract two new subgraphs from `subgraph-content`:

### `subgraph-assessment` (New)

- Quizzes, quiz results, rubric definitions, rubric assessments
- Assessment campaigns (360° multi-rater)
- Auto-grading service
- AI-powered question generation

### `subgraph-compliance` (New)

- Compliance library templates
- Training records and completion tracking
- CPD (Continuing Professional Development) settings
- SCORM 2004 package management and export
- xAPI statement storage and querying

### `subgraph-content` (Reduced)

- Courses, modules, content items, files
- Marketplace (listings, purchases, payouts)
- Media upload and processing

## Federation Entity Resolution

| Entity               | Owner      | Extended By                                                       |
| -------------------- | ---------- | ----------------------------------------------------------------- |
| `Course`             | content    | assessment (quiz → course), compliance (training record → course) |
| `Quiz`               | assessment | content (course → quizzes reference)                              |
| `ComplianceTemplate` | compliance | content (course → compliance reference)                           |
| `User`               | core       | assessment (quiz results), compliance (training records)          |

## Migration Steps

1. Create `apps/subgraph-assessment/` with NestJS scaffold
2. Move quiz/assessment resolvers + services + SDL from content
3. Add `@key` entity stubs in content for Quiz type
4. Create `apps/subgraph-compliance/` with NestJS scaffold
5. Move compliance resolvers + services + SDL from content
6. Update gateway `supergraph.graphql` and subgraph URLs
7. Run Federation composition test
8. Update all imports and references

## Consequences

### Positive

- Clear domain ownership per subgraph
- Independent deployment of assessment vs content vs compliance
- Smaller, focused SDL files
- Easier team assignment

### Negative

- More subgraphs to operate (6 → 8)
- Federation composition complexity increases
- Cross-subgraph queries may be slightly slower (entity resolution hop)

### Risks

- Migration may break existing E2E tests that query across domains
- SCORM export touches both content items and compliance — boundary must be clear

## Timeline

- **Not scheduled:** This ADR documents the future split plan
- **Trigger:** When content subgraph SDL exceeds 800 lines or team grows to 3+ developers on content

---

_ADR format: [Lightweight Architecture Decision Records](https://adr.github.io/)_
