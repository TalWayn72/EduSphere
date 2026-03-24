# Contributing to EduSphere

Thank you for your interest in contributing to EduSphere! This guide covers our development workflow, code standards, and review expectations.

## Getting Started

1. **Prerequisites:** Node.js 20+, pnpm 10+, Docker Desktop
2. **Setup:** See [README.md](README.md) for quick-start instructions and [docs/development/SETUP_INSTRUCTIONS.md](docs/development/SETUP_INSTRUCTIONS.md) for full environment setup.
3. **Architecture:** Review [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) for the 6-subgraph federation overview.

## Branching Strategy

- **`master`** — production-ready code, protected branch
- **Feature branches** — branch off `master`, named `feat/<scope>-<short-description>` (e.g., `feat/agent-debate-template`)
- **Bug-fix branches** — `fix/<scope>-<short-description>` (e.g., `fix/db-rls-annotation-leak`)
- **Refactor branches** — `refactor/<scope>-<short-description>`
- Rebase onto `master` before opening a PR.

## Commit Message Format

```
<type>(<scope>): <description>

[optional body]

Co-Authored-By: <name> <email>
```

**Types:** `feat` | `fix` | `refactor` | `docs` | `test` | `chore` | `perf` | `ci`

**Scopes:** `core` | `content` | `annotation` | `collab` | `agent` | `knowledge` | `gateway` | `web` | `mobile` | `db` | `infra`

**Examples:**
- `feat(agent): add Chavruta debate agent template`
- `fix(db): RLS policy for annotations layer filtering`
- `refactor(knowledge): optimize HybridRAG fusion algorithm`

## Pull Request Process

1. Open a PR against `master` with a clear title and description.
2. Link related issues or OPEN_ISSUES.md entries.
3. Ensure all CI checks pass (lint, typecheck, unit tests, federation composition, security scan).
4. At least one code review approval is required before merge.
5. Squash-merge is preferred for feature branches.

## Testing Requirements

Every change must include appropriate tests:

| Change Type | Required Tests |
|-------------|---------------|
| New GraphQL type/field | Unit test for resolvers + integration test |
| New mutation | Unit + RLS validation + E2E test |
| Bug fix | Regression test + root cause in OPEN_ISSUES.md |
| Database schema change | Migration test + RLS policy test |
| New subgraph | Federation composition + health check test |
| UI component | Unit test + Playwright E2E + visual regression |

**Coverage targets:** Backend >90%, Frontend >80%, RLS policies 100%.

Run the full suite before pushing:

```bash
pnpm turbo test            # Unit + integration
pnpm turbo typecheck       # TypeScript strict
pnpm turbo lint            # ESLint (zero warnings)
pnpm test:security         # Security invariant tests
```

## Code Conventions

- **TypeScript strict mode** — `strict: true`, no `any` types
- **Logging** — Use Pino logger only (`Logger` from `@nestjs/common`), never `console.log`
- **File size** — Target max 150 lines per file; split with barrel files (`index.ts`) when needed
- **Database** — All queries via Drizzle ORM; never raw SQL (except Apache AGE Cypher via graph helpers)
- **Validation** — Zod schemas for all GraphQL mutation inputs
- **Multi-tenancy** — Always use `withTenantContext()` for database queries
- **Path aliases** — `@/*` maps to `src/*` in frontend code

## Adding a New Subgraph

1. Create `apps/subgraph-<name>/` following the structure of existing subgraphs.
2. Define SDL schema in the subgraph, following Federation v2.7 conventions.
3. Register the subgraph URL in `apps/gateway/.env`.
4. Run `pnpm --filter @edusphere/gateway compose` to verify supergraph composition.
5. Add health check endpoint and federation composition test.
6. Update `API_CONTRACTS_GRAPHQL_FEDERATION.md` with new types/operations.

## Adding a New Package

1. Create `packages/<name>/` with `package.json` (name: `@edusphere/<name>`).
2. Add shared TypeScript config via `"extends": "@edusphere/tsconfig/base.json"`.
3. Register in the root `pnpm-workspace.yaml` if not already covered by `packages/*` glob.
4. Add to Turborepo pipeline in `turbo.json` if it has build/test/lint tasks.

## Security Rules (Summary)

All contributions must comply with these invariants (see [CLAUDE.md](CLAUDE.md) for full details):

| # | Rule |
|---|------|
| SI-1 | RLS session variable: `current_setting('app.current_user_id', TRUE)` |
| SI-2 | No wildcard CORS (`origin: '*'`) in production |
| SI-3 | PII fields encrypted with `encryptField()` before write |
| SI-4 | Keycloak brute-force protection enabled |
| SI-5 | No `--insecure` or SSL bypass in Docker |
| SI-6 | mTLS or HTTPS for inter-service communication in production |
| SI-7 | NATS connections require TLS + auth |
| SI-8 | Database access only via `getOrCreatePool()` from `@edusphere/db` |
| SI-9 | All tenant-scoped queries wrapped in `withTenantContext()` |
| SI-10 | Third-party LLM calls require user consent check |

**Pre-commit hooks** run ESLint auto-fix and TypeScript type checking automatically.

## Documentation

- Update `OPEN_ISSUES.md` when starting or completing any task/bug.
- Update `API_CONTRACTS_GRAPHQL_FEDERATION.md` for any GraphQL schema change.
- Add Mermaid diagrams to architecture/flow documentation (see [docs/reference/MERMAID_STYLE_GUIDE.md](docs/reference/MERMAID_STYLE_GUIDE.md)).
- Place documents in the correct `docs/` subfolder per [docs/INDEX.md](docs/INDEX.md).

## Questions?

Check [docs/INDEX.md](docs/INDEX.md) for the full documentation map, or review [docs/development/QUICKSTART.md](docs/development/QUICKSTART.md) for onboarding guidance.
