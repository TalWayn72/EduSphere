# Document Naming Standards — EduSphere

## Standard Established: February 2026

All documentation files in this project follow `SCREAMING_SNAKE_CASE` naming convention.

## Rules

| Dimension | Rule |
|-----------|------|
| Case | `SCREAMING_SNAKE_CASE` — uppercase ASCII letters separated by underscores |
| Extension | Always `.md` |
| Separator | Underscore `_` only — never hyphens |
| Word count | 2–5 meaningful words |
| Acronyms | Allowed when primary noun (DPA, LIA, DPIA, GDPR). Expand when used as vague qualifier |
| Type suffixes | Plans: `_PLAN`, Templates: `_TEMPLATE`, Registers: `_REGISTER`, Reports: `_REPORT`, Checklists: `_CHECKLIST`, Logs: `_LOG` |

## Exceptions (do not rename)

| File | Reason |
|------|--------|
| `README.md` | Universal convention enforced by GitHub, npm, all toolchains |
| `CLAUDE.md` | Claude Code CLI recognizes this exact filename — renaming breaks the tool |
| `OPEN_ISSUES.md` | Widely referenced in 20+ cross-references; name is clear and stable |

## File Type Patterns

| Document Type | Pattern | Example |
|---------------|---------|---------|
| Implementation Plans | `[TOPIC]_PLAN.md` | `MEMORY_SAFETY_PLAN.md` |
| Policies | `[TOPIC]_POLICY.md` | `GDPR_COMPLIANCE_POLICY.md` |
| Reference Docs | `[TOPIC].md` | `ARCHITECTURE.md` |
| Checklists | `[TOPIC]_CHECKLIST.md` | `SECURITY_CHECKLIST.md` |
| Status Reports | `[STATUS_TYPE]_STATUS.md` | `PROJECT_STATUS.md` |
| Product Docs | `[PRODUCT_TOPIC].md` | `PRODUCT_REQUIREMENTS.md` |
| API References | `[API_TYPE]_OPERATIONS.md` | `GRAPHQL_OPERATIONS.md` |
| Deployment Guides | `[DEPLOYMENT_TYPE]_DEPLOYMENT.md` | `KUBERNETES_DEPLOYMENT.md` |
| Legal Templates | `[DOCUMENT_TYPE]_TEMPLATE.md` | `DATA_PROCESSING_AGREEMENT_TEMPLATE.md` |
| Execution Logs | `[PHASE]_[TYPE]_LOG.md` | `PHASE_3_PROGRESS_LOG.md` |

## Enforcement

New files violating this standard will be renamed during code review.
Plan mode outputs (`.claude/plans/*.md`) use auto-generated random names by the Claude Code system —
their content must be migrated to `docs/plans/` with a proper name before or immediately after the session.

## Applied In

This standard was applied in February 2026, renaming 21 files and updating cross-references in 21 files.
See git history on branch `docs/normalize-file-naming` for the complete change set.
