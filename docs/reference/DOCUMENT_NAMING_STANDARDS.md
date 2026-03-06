# Document Naming Standards — EduSphere

## Standard Established: February 2026 | Last Updated: March 2026

All documentation files in this project follow `SCREAMING_SNAKE_CASE` naming convention.

## Rules

| Dimension     | Rule                                                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Case          | `SCREAMING_SNAKE_CASE` — uppercase ASCII letters separated by underscores                                                  |
| Extension     | Always `.md`                                                                                                               |
| Separator     | Underscore `_` only — never hyphens                                                                                        |
| Word count    | 2–5 meaningful words                                                                                                       |
| Acronyms      | Allowed when primary noun (DPA, LIA, DPIA, GDPR). Expand when used as vague qualifier                                      |
| Type suffixes | Plans: `_PLAN`, Templates: `_TEMPLATE`, Registers: `_REGISTER`, Reports: `_REPORT`, Checklists: `_CHECKLIST`, Logs: `_LOG` |

## Exceptions (do not rename)

| File             | Reason                                                                    |
| ---------------- | ------------------------------------------------------------------------- |
| `README.md`      | Universal convention enforced by GitHub, npm, all toolchains              |
| `CLAUDE.md`      | Claude Code CLI recognizes this exact filename — renaming breaks the tool |
| `OPEN_ISSUES.md` | Widely referenced in 20+ cross-references; name is clear and stable       |

## File Type Patterns

| Document Type        | Pattern                           | Example                                 |
| -------------------- | --------------------------------- | --------------------------------------- |
| Implementation Plans | `[TOPIC]_PLAN.md`                 | `MEMORY_SAFETY_PLAN.md`                 |
| Policies             | `[TOPIC]_POLICY.md`               | `GDPR_COMPLIANCE_POLICY.md`             |
| Reference Docs       | `[TOPIC].md`                      | `ARCHITECTURE.md`                       |
| Checklists           | `[TOPIC]_CHECKLIST.md`            | `SECURITY_CHECKLIST.md`                 |
| Status Reports       | `[STATUS_TYPE]_STATUS.md`         | `PROJECT_STATUS.md`                     |
| Product Docs         | `[PRODUCT_TOPIC].md`              | `PRODUCT_REQUIREMENTS.md`               |
| API References       | `[API_TYPE]_OPERATIONS.md`        | `GRAPHQL_OPERATIONS.md`                 |
| Deployment Guides    | `[DEPLOYMENT_TYPE]_DEPLOYMENT.md` | `KUBERNETES_DEPLOYMENT.md`              |
| Legal Templates      | `[DOCUMENT_TYPE]_TEMPLATE.md`     | `DATA_PROCESSING_AGREEMENT_TEMPLATE.md` |
| Execution Logs       | `[PHASE]_[TYPE]_LOG.md`           | `PHASE_3_PROGRESS_LOG.md`               |

## Folder Structure (Mandatory)

| Artifact Type | Location |
|---------------|----------|
| Active implementation plans | `docs/plans/` |
| Bug fix documents | `docs/plans/bugs/` — named `BUG-NNN-description.md` |
| Feature plans | `docs/plans/features/` |
| Completed/old sprint plans | `docs/plans/archive/` |
| Security & compliance docs | `docs/security/` |
| Architecture decisions | `docs/architecture/` |
| **Screenshots (PNG)** | `docs/screenshots/` — **NEVER in project root** |
| CI/build log files | `docs/logs/` |
| Reference docs (naming, MCP, tech audit) | `docs/reference/` |
| Testing plans and checklists | `docs/testing/` |
| Product plans (admin, i18n, tiers) | `docs/product/` |
| Deployment & ops guides | `docs/deployment/` |
| Developer guides | `docs/development/` |
| API reference | `docs/api/` |
| AI/ML documentation | `docs/ai/` |
| Legal documents | `docs/legal/` |
| Policies | `docs/policies/` |
| Project status & logs | `docs/project/` |
| Performance & test reports | `docs/reports/` |
| Research & analysis | `docs/research/` |
| Compliance certifications | `docs/compliance/` |
| Database schema docs | `docs/database/` |

**Iron Rule:** No PNG, TXT, or non-config file may exist in the project root.
Only these files belong in root: `README.md`, `CLAUDE.md`, `OPEN_ISSUES.md`, `IMPLEMENTATION_ROADMAP.md`,
`API_CONTRACTS_GRAPHQL_FEDERATION.md`, `CHANGELOG.md`, and project config files (`package.json`, `tsconfig*.json`, `turbo.json`, `pnpm-*.yaml`, `docker-compose*.yml`, `renovate.json`).

## Enforcement

New files violating this standard will be renamed during code review.
Plan mode outputs (`.claude/plans/*.md`) use auto-generated random names by the Claude Code system —
their content must be migrated to `docs/plans/` with a proper name before or immediately after the session.

## Applied In

- **February 2026:** First application — renamed 21 files, updated 21 cross-references
- **March 2026:** Second application — moved 60 files (55 PNGs → docs/screenshots/, 29 plan docs redistributed, 4 naming violations fixed, 2 duplicates removed)
