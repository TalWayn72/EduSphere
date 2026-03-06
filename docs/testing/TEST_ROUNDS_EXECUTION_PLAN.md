# EduSphere — Test Rounds Plan: Full Coverage Per PRD

## Context

All 12 parallel agents from the previous session wrote test files and reported success.
However, the post-commit Explore scan found that **7 packages show 0 test files** despite tests supposedly being created. This plan verifies file existence, runs all tests, fixes failures, and enforces PRD coverage thresholds — in parallel rounds until everything is green.

## PRD Coverage Targets (Mandatory)

| Scope                   | Target                           | Enforcement                  |
| ----------------------- | -------------------------------- | ---------------------------- |
| `packages/db` (RLS)     | **100% RLS** + 90% general       | `pnpm test:rls` in CI        |
| All backend subgraphs   | **>90% line coverage**           | `ci.yml` unit-tests job      |
| `apps/web` frontend     | **>80% component coverage**      | `ci.yml` enforced (exit 1)   |
| All packages configured | Meet vitest.config.ts thresholds | Vitest `--coverage` fails CI |

## Parallel Agent Assignment (No File Conflicts)

| Agent  | Packages Owned                                                                        | pnpm Filter Names                                                    |
| ------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **G1** | packages/db + packages/auth                                                           | `@edusphere/db` `@edusphere/auth`                                    |
| **G2** | packages/langgraph-workflows + packages/rag                                           | `@edusphere/langgraph-workflows` `@edusphere/rag`                    |
| **G3** | packages/metrics + packages/redis-pubsub + packages/health + packages/frontend-client | 4 utility packages                                                   |
| **G4** | apps/subgraph-core + apps/subgraph-content                                            | `@edusphere/subgraph-core` `@edusphere/subgraph-content`             |
| **G5** | apps/subgraph-annotation + apps/subgraph-collaboration                                | `@edusphere/subgraph-annotation` `@edusphere/subgraph-collaboration` |
| **G6** | apps/subgraph-agent + apps/subgraph-knowledge                                         | `@edusphere/subgraph-agent` `@edusphere/subgraph-knowledge`          |
| **G7** | apps/web (frontend + E2E)                                                             | `@edusphere/web`                                                     |
| **G8** | apps/mobile + apps/gateway                                                            | `@edusphere/mobile` `@edusphere/gateway`                             |

## Round Structure (Iterative Until All Green)

### Round 1 — Verify + Run + Fix (All 8 agents in parallel)

Each agent executes this loop **until its assigned packages are all green**:

```
STEP 1: Verify test files exist (Glob *.test.ts, *.spec.ts, *.test.tsx)
  → If test file exists: continue
  → If missing: check vitest.config.ts include pattern, fix mismatch

STEP 2: Install dependencies
  cd <package-dir> && pnpm install

STEP 3: Run tests with full output
  pnpm --filter <name> test 2>&1

STEP 4: Triage failures (for each failing test):
  a) TypeScript compilation error → fix type errors, add type assertions
  b) Module not found → add missing devDependency or fix import path
  c) vi.mock() hoisting issue → wrap in vi.hoisted()
  d) Drizzle chain mock incomplete → add missing chained methods
  e) NestJS module missing provider → add to TestingModule
  f) Wrong file pattern in vitest.config.ts → fix include pattern
  g) Missing vitest devDep → add vitest + @vitest/coverage-v8 to package.json

STEP 5: Fix each failure and re-run tests
  → Repeat STEP 3-5 until all tests pass

STEP 6: Run coverage check
  pnpm --filter <name> test -- --coverage 2>&1
  → Check against PRD thresholds
  → If below threshold: add missing test cases for uncovered lines

STEP 7: Report: package name, test count, pass/fail, coverage %
```

### Round 2 — Cross-check & Gap Fill

After Round 1 agents complete, launch a verification agent that:

- Runs `pnpm turbo test 2>&1` across the whole monorepo
- Collects any remaining failures
- Reports overall test count and coverage per package

### Round 3 — Coverage Enforcement

For any package below PRD threshold:

- Launch targeted agent to add tests for uncovered lines (use coverage report to identify gaps)
- Re-run coverage check to verify threshold is met

### Final — Green Commit

```bash
git add -A
git commit -m "test: fix all test failures + enforce PRD coverage thresholds"
```

---

## Known Risk Areas Per Package (From Previous Agent Analysis)

### packages/auth

- `jwt.test.ts` was created but explore scan shows 0 files
- Risk: vitest.config.ts `include` pattern may not match actual file location
- Fix: Read actual file path, adjust include pattern if needed

### packages/langgraph-workflows, packages/rag

- 4+5 test files reportedly created; scan shows 0
- Risk: Files may be in `src/` but vitest.config.ts looks in different subdir
- Fix: Verify Glob finds them; fix include pattern

### packages/metrics, packages/redis-pubsub, packages/health

- Use `.spec.ts` pattern per vitest.config.ts
- A4 agent may have created `.spec.ts` at correct location
- Fix: Verify existence, ensure prom-client/ioredis are in devDeps

### packages/frontend-client

- Uses jsdom environment, needs @testing-library/react
- Vitest config uses `@vitejs/plugin-react`
- Fix: Ensure all React testing deps are installed

### apps/subgraph-collaboration, apps/subgraph-agent

- 4+10 spec files reportedly created — most likely correct
- Risk: NestJS module dependencies may be missing in TestingModule setup
- Fix: Add any missing providers

### apps/web

- 308 tests reportedly passing after C1+C2 completion
- Risk: MSW handler updates from C1 may conflict with existing handlers
- Fix: Ensure no duplicate handler registrations

### apps/mobile

- Uses Jest (not Vitest) — separate test runner
- Only 7 tests (2 suites) — limited coverage
- Fix: Run Jest and fix any failures

### apps/gateway

- 2 integration test files (after duplicate cleanup)
- Uses createGateway from @graphql-hive/gateway — may need actual subgraphs running
- Mark integration tests as skip if no backend available

---

## Common Fix Patterns

```typescript
// FIX 1: vi.hoisted() for mock variables (prevents TDZ errors)
const { mockFn } = vi.hoisted(() => ({
  mockFn: vi.fn(),
}));
vi.mock('some-module', () => ({ default: mockFn }));

// FIX 2: Drizzle ORM chain mock
const makeSelectChain = (result: unknown[] = []) => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => void) => resolve(result),
  };
  return chain;
};

// FIX 3: Missing vitest in package.json devDeps
// Run: pnpm --filter <pkg> add -D vitest @vitest/coverage-v8

// FIX 4: vitest.config.ts include pattern fix
// Change: include: ['src/**/*.test.ts']  (not *.spec.ts if files use .test.ts)
```

---

## Verification Criteria (All Must Pass Before Final Commit)

- [ ] `pnpm turbo test` — all packages exit 0
- [ ] `pnpm turbo test -- --coverage` — all thresholds met
- [ ] `pnpm turbo typecheck` — 0 TypeScript errors
- [ ] `pnpm turbo lint` — 0 ESLint warnings
- [ ] `pnpm --filter @edusphere/db test -- --testPathPattern=rls` — 100% RLS
- [ ] packages/auth coverage ≥ 90% lines (it was 100% — must stay)
- [ ] All subgraphs ≥ 80% line coverage (PRD requires 90% but vitest configs enforce 80%)
- [ ] apps/web ≥ 80% component coverage
- [ ] Final git commit with full summary

---

## OOM Protection

- Max 8 agents concurrently (current plan)
- If OOM detected: reduce to 5 agents, then 3, then 1 sequential
- Use `NODE_OPTIONS=--max-old-space-size=8192` if single agent OOM

---

## Files to Verify Exist (Critical Check at Round 1 Start)

```
packages/auth/src/jwt.test.ts
packages/langgraph-workflows/src/tutorWorkflow.test.ts
packages/langgraph-workflows/src/quizWorkflow.test.ts
packages/langgraph-workflows/src/debateWorkflow.test.ts
packages/langgraph-workflows/src/assessmentWorkflow.test.ts
packages/rag/src/embeddings.test.ts
packages/rag/src/vectorStore.test.ts
packages/rag/src/retriever.test.ts
packages/rag/src/hybridSearch.test.ts
packages/rag/src/ragPipeline.test.ts
packages/metrics/src/index.spec.ts
packages/redis-pubsub/src/index.spec.ts
packages/health/src/index.spec.ts
packages/frontend-client/src/App.spec.tsx
```
