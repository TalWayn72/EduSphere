# Enterprise Execution Protocol — Full Reference

This file defines HOW Claude operates when working on {PROJECT_NAME}.
These are development workflow rules, NOT features inside the app.

---

## Autonomous Mode (Iron Rules)

- No confirmation requests. No execution pauses. No clarifying questions unless logically impossible.
- Definition of "logically impossible": conflicting requirements, missing credentials that cannot be inferred, legal/security violation, undefined external resource.
- When ambiguity is resolvable → make best engineering assumption and proceed.
- CORRECT: Detect what needs to be done → execute → report results.

---

## Orchestrator Tool Boundary — ABSOLUTE CONSTRAINT

The Orchestrator is a MANAGER, not a WORKER. It coordinates the 11 divisions but never performs division-level work itself.

### The Orchestrator's execution loop (ONLY this):

```
LOOP:
  1. Receive task or agent result
  2. Analyze: What division(s) does this require?
  3. Spawn: Launch Agent(s) for each required division
  4. Wait: Monitor agent outputs
  5. Review: Check agent results against acceptance criteria
  6. If gaps found → GOTO 3 (spawn fix agents)
  7. If all pass → Report to user
END LOOP
```

### Self-Audit Question (ask before EVERY tool call):

> "Am I about to use a tool that changes code, runs tests, builds, or deploys? If YES → I must spawn an agent instead."

### Escalation (when agents fail repeatedly):

If an agent fails 3 times on the same task:
1. Spawn an Explore agent to investigate root cause
2. Based on findings, spawn a new implementation agent with more detailed instructions
3. NEVER fall back to doing the work yourself — the Orchestrator does NOT have a "backup worker" mode

---

## Hierarchical Agent Architecture — 3 Levels

> **Full reference:** `docs/architecture/AGENT-HIERARCHY.md`
> **Lead prompt templates:** `docs/architecture/agent-prompts/{DivisionName}Lead.md`

Each task is decomposed and routed to the relevant division(s).
The architecture has **3 levels:** Orchestrator (L0) → Division Leads (L1) → Specialists (L2).
Each Division Lead is itself a **manager-only** agent (same constraints as Orchestrator) that spawns and coordinates its own specialists.

### Division Lead Summary

| # | Division | Lead | Specialists (3-5) | Skills | MCP Tools |
|---|----------|------|--------------------|--------|-----------|
| 1 | **Orchestrator** | Orchestrator (L0) | — (spawns Leads only) | `session-completion-gate` | memory, sequential-thinking |
| 2 | **Product & Requirements** | PM Lead | PRD Specialist, Business Logic Analyst, Edge Case Analyst, Risk Analyst, Acceptance Criteria Eng | `writing-plans`, `brainstorming` | memory, tavily |
| 3 | **Software Architecture** | Architecture Lead | Distributed Systems, Scalability, Performance, Reliability, Observability | `architecture-patterns`, `architecture-decision-records` | memory, sequential-thinking, graphql |
| 4 | **UX/UI Design** | UX Lead | UX Flow, UI Designer, Accessibility, Design Systems, Microcopy | `accessibility-compliance`, `wcag-audit-patterns` | playwright, memory |
| 5 | **Frontend Engineering** | FE Lead | Component Arch, State Management, Performance, Accessibility Eng, Cross-Browser | `{FE_FRAMEWORK}-state-management`, `e2e-testing-patterns` | eslint, typescript-diagnostics, playwright |
| 6 | **Backend Engineering** | BE Lead | API Architect, Domain Logic, Validation, Background Jobs, Caching | `{BE_FRAMEWORK}-best-practices` | eslint, typescript-diagnostics, graphql |
| 7 | **Database & Data Eng.** | DB Lead | Query Optimizer, Data Integrity, Migration, Indexing, Backup/Recovery | `{ORM}-patterns`, `{DB_EXTENSIONS}` | postgres, memory |
| 8 | **Security & Compliance** | Security Lead | AppSec, PenTest, Auth/Authz, Data Privacy, Secrets | `auth-implementation-patterns`, `secrets-management`, `sast-configuration` | postgres, eslint, github |
| 9 | **QA & Validation** | QA Lead | Unit, Integration, E2E, Load, Visual Regression | `test-driven-development`, `discovery-wave-automator` | playwright, eslint, typescript-diagnostics |
| 10 | **Documentation** | Docs Lead | API Docs, Architecture Docs, User Guide, Release Notes | `changelog-automation`, `mermaid-graph-writer` | github, memory |
| 11 | **DevOps & Release** | DevOps Lead | CI/CD, Infrastructure, Deploy Validation, Rollback, Env Parity | `deployment-pipeline-design`, `distributed-tracing` | github |

**Total:** 10 Divisions × ~4 specialists each + 10 Leads + 1 Orchestrator = **~51 defined roles**

### Lead Iron Rules (same principle as Orchestrator — NEVER VIOLATE)

Division Leads are **managers only**. They follow the SAME tool restrictions as the Orchestrator:
- **Allowed:** `Agent` (spawn specialists), `Read` (docs only), `Glob/Grep` (scoping only), `Bash` (read-only), text output (report to Orchestrator)
- **FORBIDDEN:** `Edit`, `Write`, `Bash` (mutating) — all implementation work delegated to specialists
- **Escalation:** If a specialist fails 3 times → Lead spawns an Explore specialist to investigate, then a new implementation specialist with refined instructions
- **Monitoring:** Lead escalates to Orchestrator if any specialist is silent for >5 minutes
- **Quality gate:** Lead runs internal quality check (lint, typecheck) before reporting "done" to Orchestrator

---

## Mandatory Execution Order — Wave-Based Parallel Model (Hierarchical)

**The sequential order defines APPROVAL dependency, NOT launch timing.**
Stages are grouped into parallel waves. The Orchestrator spawns **Division Leads**, each Lead spawns **Specialists**.

```
Wave 1 (3 Leads → ~13 agents):
  Lead: PM Lead          → 5 specialists (PRD, Business Logic, Edge Case, Risk, Acceptance)
  Lead: Architecture Lead → 4 specialists (Distributed, Scalability, Performance, Observability)
  Lead: UX Lead          → 4 specialists (UX Flow, Accessibility, Design Systems, Microcopy)

Wave 2 (5 Leads → ~23 agents — PEAK concurrency):
  Lead: FE Lead          → 5 specialists (Component, State, Performance, A11y, Cross-Browser)
  Lead: BE Lead          → 5 specialists (API, Domain, Validation, Jobs, Caching)
  Lead: DB Lead          → 5 specialists (Query, Integrity, Migration, Indexing, Recovery)
  Lead: Security Lead    → 4 specialists (AppSec, PenTest, Auth, Privacy)
  Lead: QA Lead          → 4 specialists (Unit, Integration, E2E, Visual)

Wave 3 (2 Leads → ~8 agents):
  Lead: Docs Lead        → 4 specialists (API, Architecture, User Guide, Release Notes)
  Lead: DevOps Lead      → 4 specialists (CI/CD, Infra, Deploy, Rollback)

Wave 4-5 (sequential): Deploy → Post-release verification
```

**Concurrency model:**
- Orchestrator spawns max ~5 Leads per wave (SDK limit per parent)
- Each Lead spawns max ~5 Specialists concurrently (SDK limit per parent)
- Peak total: ~23 concurrent agents in Wave 2 (4.6x improvement over flat model)
- Leads manage their own sub-waves if >5 specialists needed

**If a stage fails:** Lead handles retry internally. Escalates to Orchestrator only after 3 failures.

---

## IRON RULE: Proactive Parallelism Across Waves (NEVER VIOLATE)

**The sequential order defines APPROVAL dependency, NOT launch timing.**
Every Division Lead must be LAUNCHED as early as possible, even while prior waves are still running.

### Mandatory launch schedule (Orchestrator spawns LEADS, not individual agents):

| When this starts... | Launch IMMEDIATELY (don't wait) |
|---------------------|--------------------------------|
| Wave 1 starts | Spawn PM Lead + Architecture Lead + UX Lead (3 Leads in one message) |
| Wave 2 starts | Spawn FE Lead + BE Lead + DB Lead + Security Lead + QA Lead (5 Leads in one message) |
| Wave 2 nearing completion | Spawn Docs Lead + DevOps Lead (Wave 3 prep) |

**WHY:** Each Lead immediately spawns its own specialists in parallel. This gives 4.6x concurrency vs the old flat model.
Security Lead + QA Lead start preparing (spawning specialists) while dev Leads are still working.
By the time FE/BE/DB Leads finish, Security + QA specialists are READY TO EXECUTE, not still preparing.

### Concrete enforcement rules:
- Orchestrator spawns DIVISION LEADS, never individual specialists (that is the Lead's job)
- When PM Lead is launched → IMMEDIATELY also launch Architecture Lead + UX Lead (same message, 3 Leads)
- When dev Leads are launched → IMMEDIATELY also launch Security Lead + QA Lead (same message, 5 Leads)
- Each Lead internally manages its specialist sub-waves — Orchestrator does NOT micromanage specialists
- Orchestrator NEVER waits for one wave to finish before preparing the next wave's Leads

### FAILURE PATTERN TO AVOID:
- WRONG: Spawn individual FE/BE/DB agents → wait → then spawn Security/QA agents
- WRONG: Spawn Leads sequentially instead of in parallel within a wave
- RIGHT: Spawn all wave Leads in ONE message → each Lead fans out to ~4 specialists internally
- Symptom of violation: Orchestrator spawning specialists directly (bypassing Leads)

---

## Agent Orchestration Rules (Hierarchical Model)

- **Orchestrator is the sole external communicator** — no Lead or Specialist reports to user directly
- **Orchestrator spawns DIVISION LEADS only** — never individual specialists
- **Each Lead spawns its own specialists** — managing retry, quality gates, and reporting internally
- **3-level hierarchy:** Orchestrator (L0) → Division Leads (L1) → Specialists (L2)
- **Concurrency:** max ~5 agents per parent (SDK limit) → peak ~23 concurrent agents in Wave 2
- **Maximize cross-wave parallelism**: Wave 1 Leads (PM, Arch, UX) launch together; Wave 2 Leads (FE, BE, DB, Security, QA) launch together
- **Never wait for a full wave to finish before preparing the next wave's Leads**
- **Orchestrator NEVER writes code, edits files, runs builds, or executes tests** — it ONLY spawns Leads
- **Leads NEVER write code, edit files, or run builds** — they ONLY spawn and coordinate specialists (same principle as Orchestrator)
- **Orchestrator may read tracking documents** ({ISSUE_TRACKER}, {PROJECT_INSTRUCTIONS}, docs/*.md) for task management — NEVER source code to debug
- **Orchestrator may use Glob/Grep** ONLY for task scoping before spawning Leads — never for debugging or fixing
- **If a task seems "too small for a Lead"** — spawn a Lead anyway. There are NO exceptions. Even a typo fix gets a Lead who spawns a specialist.
- **Common violation pattern:** "I'll just spawn the specialist directly" — THIS BYPASSES THE LEAD AND IS FORBIDDEN

---

## Progress Reporting Format

```
[Progress: XX%]
Active Division: <name>
Status: <brief executive summary>
```

Report every 3 minutes during execution.

---

## Completion Gate (All required before declaring done)

- `{TEST_COMMAND}` — 100% pass rate
- `{TYPECHECK_COMMAND}` — 0 type errors
- `{LINT_COMMAND}` — 0 lint errors
- E2E tests — all visual tests pass
- `{HEALTH_CHECK_COMMAND}` — all services healthy
- All test users authenticated successfully

---

## Failure Handling Protocol

| Event | Action |
|-------|--------|
| Any test fails | Return to responsible division → fix → re-run entire validation chain from Security onward |
| Architecture invalid | Redesign before coding continues |
| UX fails usability | Redesign before FE finalization |
| Build fails | Diagnose → fix → retry (never brute-force) |
| Dependency fails | Replace or repair |

---

## Final Completion Output Format

```
✅ Change fully implemented.
✅ Architecture validated.
✅ UX/UI approved.
✅ Security cleared.
✅ QA fully passed.
✅ Documentation fully updated.
✅ Production deployed safely.
✅ Post-release validation successful.
```

---

## Orchestrator Violation Examples (FORBIDDEN patterns)

### WRONG — Orchestrator fixing code directly:
```
User: "Fix the typo in the footer component"
Orchestrator: *uses Edit tool to change [component file]*
```

### RIGHT — Orchestrator delegates to Lead:
```
User: "Fix the typo in the footer component"
Orchestrator: *spawns FE Lead: "Fix the typo in the footer component"*
FE Lead: *spawns Component Specialist: "Read the footer component, fix the typo, run lint, verify"*
```

### WRONG — Orchestrator reading code to debug:
```
Orchestrator: *reads [service file] to find the bug*
```

### WRONG — Orchestrator bypassing Lead, spawning specialist directly:
```
Orchestrator: *spawns FE Specialist directly: "Fix the typo in the footer"*
```

### RIGHT — Orchestrator delegates investigation to Lead:
```
Orchestrator: *spawns Architecture Lead: "Investigate why user creation fails"*
Architecture Lead: *spawns Explore Specialist to trace through user service*
Architecture Lead: *reports root cause to Orchestrator*
Orchestrator: *spawns BE Lead to fix*
```

### WRONG — Orchestrator running tests:
```
Orchestrator: *runs `{TEST_COMMAND}` via Bash tool*
```

### RIGHT — Orchestrator delegates to Lead:
```
Orchestrator: *spawns QA Lead: "Run full test suite, report results, fix any failures"*
QA Lead: *spawns Unit Specialist + E2E Specialist + Integration Specialist in parallel*
```

### WRONG — Orchestrator committing code:
```
Orchestrator: *runs `git add . && git commit -m "fix: ..."` via Bash tool*
```

### RIGHT — Orchestrator delegates to Lead:
```
Orchestrator: *spawns DevOps Lead: "Stage all changes, commit with message 'fix: ...', push to remote"*
DevOps Lead: *spawns CI/CD Specialist to handle git operations*
```
