# Enterprise Execution Protocol

> **Parent document:** [CLAUDE.md](../../CLAUDE.md)
> **This section defines HOW Claude operates on every task. These are development workflow rules, not EduSphere app features.**
> Full reference: `C:\Users\P0039217\.claude\projects\c--Users-P0039217--claude-projects-EduSphere\memory\enterprise-execution.md`

## A. Autonomous Mode (Iron Rules)

- No confirmation requests, no execution pauses, no clarifying questions unless logically impossible
- **Logically impossible** = conflicting requirements / unavailable credentials / legal-security violation / undefined external resource
- When ambiguity is resolvable — make best engineering assumption and proceed
- CORRECT: Detect what needs to be done, execute, report results

## B. Enterprise Division Structure (11 Divisions)

Each task is decomposed and routed to the relevant division(s). Each division must internally approve before passing control.

| # | Division | Responsibility |
|---|----------|----------------|
| 1 | **Orchestrator** | Sole external communicator. Coordinates all divisions, tracks % completion, enforces quality gates, reports progress every 3 min |
| 2 | **Product & Requirements** | PRD delta, functional/non-functional reqs, risk matrix, acceptance criteria |
| 3 | **Software Architecture** | System impact, scalability, service boundaries, domain modeling, performance budgets |
| 4 | **UX/UI Design** | User flows, WCAG accessibility, design system compliance, mobile/desktop parity |
| 5 | **Frontend Engineering** | Component architecture, state management, rendering performance, responsive behavior |
| 6 | **Backend Engineering** | Business logic, API consistency, validation rules, error resilience |
| 7 | **Database & Data Eng.** | Schema changes, query optimization, migrations, rollback strategy |
| 8 | **Security & Compliance** | Threat modeling, vulnerability scan, auth validation, GDPR/privacy (SI-1 through SI-10) |
| 9 | **QA & Validation** | Unit + Integration + E2E + Load + Playwright visual regression. 100% pass required. No partial approval. |
| 10 | **Documentation** | Update all affected docs (README, API, runbooks, release notes) after QA approval |
| 11 | **DevOps & Release** | CI/CD validation, build, staging, prod readiness, rollback plan, post-deploy monitoring |

## C. Mandatory Execution Order — Wave-Based Parallel Model

**The sequential order defines APPROVAL dependency, NOT launch timing.**
Stages are grouped into parallel waves. Within each wave, all stages launch simultaneously.

```
Wave 1 (parallel):  Stage 1 (Product) + Stage 2 (Architecture) + Stage 3 (UX/UI)
Wave 2 (parallel):  Stage 4 (FE+BE+DB dev) + Stage 5 (Security prep) + Stage 6 (QA test writing)
Wave 3 (parallel):  Stage 7 (Documentation) + Stage 8 (DevOps validation)
Wave 4 (sequential): Stage 9 (Deploy to production)
Wave 5 (sequential): Stage 10 (Post-release verification)
```

**Wave launch rules:**
- Wave 1 launches ALL 3 stages in a single message (3 parallel agents)
- Wave 2 launches AFTER Wave 1 approvals — but ALL 5+ agents launch together (dev x 3 + security + QA prep)
- Wave 3 launches AFTER Wave 2 approvals — both agents in parallel
- Waves 4-5 are sequential (deploy then verify)

**Platform constraint:** Claude Code SDK supports max ~5 concurrent agents. Waves with >5 agents execute as **sub-waves** (5 agents, wait for first to finish, launch next batch). This is transparent to the user.

**If any stage fails:** fix then re-run all downstream stages from that wave onward.

## D. Agent Orchestration

- All division work performed by specialized sub-agents via the `Agent` tool
- **Wave-based execution:** max ~5 concurrent agents per sub-wave (SDK limit)
- Large waves (e.g., Wave 2 with 6 agents) split into sub-waves automatically: first 5 launch, as agents complete, remaining launch
- FE + BE + DB always run concurrently within Wave 2
- Security + QA prep launch WITH dev agents, not after them
- Progress reported every 3 minutes: `[Progress: XX%] Active: <Division>`
- **Never wait for a full wave to finish before preparing the next wave's inputs**

## E. Completion Gate (All required before declaring done)

- `pnpm turbo test` — 100% pass rate
- `pnpm turbo typecheck` — 0 TypeScript errors
- `pnpm turbo lint` — 0 lint errors
- All Playwright E2E tests pass
- `./scripts/health-check.sh` — all services healthy

## F. Final Output Format (after 100% completion only)

```
Change fully implemented.
Architecture validated.
UX/UI approved.
Security cleared.
QA fully passed.
Documentation fully updated.
Production deployed safely.
Post-release validation successful.
```

---

## Parallel Execution (Agents)

**MANDATORY RULE:** Split every task into sub-tasks and run Agents/Workers in parallel whenever possible.

### Task Decomposition Protocol

Before starting any task:

1. **Analyze dependencies** - Identify which sub-tasks can run independently
2. **Create execution plan** - Map out parallel vs sequential sub-tasks
3. **Launch agents** - Spawn multiple agents using Task tool with clear responsibilities
4. **Track progress** - Use Agent Tracking Table to monitor all parallel workers
5. **Synchronize results** - Merge outputs only after all agents complete

### Parallelization Opportunities

- **Multiple subgraphs** - Each subgraph can be built/tested by separate agent
- **Multiple tables** - Database schema creation can be split across agents
- **Multiple test suites** - Backend, Frontend, E2E, RLS tests run in parallel
- **Multiple files** - Code generation, linting, type checking across agents
- **Multiple GraphQL types** - Resolver implementation split by domain

### Agent Tracking Table (required when running parallel)

**Format:** `Agent-N` = per-task sequence index (temporary). `Division` = one of the 11 Enterprise Divisions (mandatory). `Mission` = specific deliverable for this run (mandatory).

| ID      | Division          | Mission                       | Status     |
| ------- | ----------------- | ----------------------------- | ---------- |
| Agent-1 | Architecture      | Building docker-compose.yml   | Running    |
| Agent-2 | Database & Data   | Generating Drizzle migrations | Waiting    |
| Agent-3 | QA & Validation   | Writing health-check tests    | Done       |

### OOM Protection

| Event              | Action                                   |
| ------------------ | ---------------------------------------- |
| First OOM          | Reduce agents by 20%                     |
| Repeated OOM       | Continue reducing until 1 agent          |
| Single agent + OOM | `NODE_OPTIONS=--max-old-space-size=8192` |

---

## Phase Execution Protocol

**CRITICAL:** This project follows IMPLEMENTATION_ROADMAP.md strictly.

### Phase Rules

1. **Never skip phases** - Each phase builds on the previous one
2. **Run acceptance criteria before proceeding** - Green output = permission to advance
3. **Reference API-CONTRACTS and DATABASE_SCHEMA** - Single source of truth
4. **Report progress every 3 minutes** - Use Agent Orchestration Protocol format
5. **No deviation from locked tech stack** - Update IMPLEMENTATION_ROADMAP.md if changes needed

### Quality Gates (Enforced at every phase boundary)

```bash
# 1. TypeScript compilation (zero errors)
pnpm turbo build --filter='./apps/*' --filter='./packages/*'

# 2. Linting (zero warnings in CI mode)
pnpm turbo lint

# 3. Unit tests (100% pass, coverage thresholds met)
pnpm turbo test -- --coverage

# 4. Schema validation (supergraph composes without errors)
pnpm --filter @edusphere/gateway compose

# 5. Docker health (all containers healthy)
./scripts/health-check.sh

# 6. Security scan
pnpm audit --audit-level=high
```

### Phase Progress Reporting Format

```
PROGRESS REPORT — Phase X.Y — [timestamp]
Active Agents:
   Agent-1 [Database & Data | Migrations]: Generating Drizzle migrations — 80% complete
   Agent-2 [QA & Validation | RLS Tests]: Writing RLS validation tests — running

Completed this cycle:
   - All 16 tables created with RLS enabled
   - Apache AGE graph ontology initialized

Next actions:
   - Apply migrations to database
   - Run health-check.sh

Phase progress: 65% — estimated 8 min remaining
```

## Autonomous Execution Rules

### 1. Phase Completion Announcement (MANDATORY)
After EVERY phase or major milestone completes, Claude MUST proactively announce what was built, test counts, what is next, and then proceed autonomously without waiting for user approval.

### 2. No Inter-Phase Pauses
- NEVER ask "should I continue to the next phase?" between phases
- NEVER wait for user confirmation between phases
- Proceed directly from phase to phase
- Only stop for: logical contradiction, security violation, missing credentials

### 3. Maximum Parallelism — Wave Execution Model
- Always spawn the MAXIMUM number of parallel agents the task allows
- Frontend + Backend + DB agents ALWAYS run in parallel
- Never run sequentially what can run in parallel
- **Platform limit:** max ~5 concurrent agents (Claude Code SDK constraint)
- **Wave model:** stages grouped into waves; within each wave all agents launch together
- **Sub-waves:** if a wave has >5 agents, split into batches of 5; as agents complete, launch remaining
- **Cross-wave preparation:** downstream stages begin prep work while upstream stages execute
- The total agent count per task may reach 10-15+, but they execute in waves of 5, not all at once

### 4. Protocol Compliance
- Run Session Completion Gate after EVERY phase (not just at session end)
- Every new feature = E2E Playwright spec (no exceptions)
- Every UI change = visual regression screenshot
