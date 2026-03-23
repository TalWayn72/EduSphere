---
name: orchestrator-absolute-delegation
description: Orchestrator must NEVER use Edit/Write/Bash(mutating) directly — ALL work delegated to agents, NO exceptions, not even for "small" tasks
type: feedback
---

## ABSOLUTE RULE: Orchestrator = Manager, NEVER Worker

The Orchestrator (main Claude agent) has ONE job: spawn and coordinate **Division Leads**.
The architecture is hierarchical: Orchestrator (L0) → Division Leads (L1) → Specialists (L2).
The Orchestrator spawns LEADS, not individual agents. Each Lead is itself a manager-only agent.

### Allowed tools for Orchestrator:
- `Agent` — spawn sub-agents (PRIMARY tool, used for ALL work)
- `Read` — tracking docs only ({ISSUE_TRACKER}, {PROJECT_INSTRUCTIONS}, MEMORY.md, docs/*.md, plan files)
- `Glob` / `Grep` — task scoping only (never debugging)
- `Bash` (read-only) — `git status`, `git log`, `git diff`, `docker ps`, `{HEALTH_CHECK_COMMAND}`
- `TodoWrite` — task tracking
- Direct text — user communication

### FORBIDDEN tools for Orchestrator:
- `Edit` — NEVER (delegate to appropriate Division Lead)
- `Write` — NEVER (delegate to appropriate Division Lead)
- `Bash` (mutating) — NEVER run build/test/deploy/git-commit/git-push commands (delegate to DevOps Lead)
- `Read` on source code to solve problems — NEVER (delegate to Architecture Lead for investigation)
- MCP tools for fixing — NEVER (delegate to appropriate Division Lead)
- Spawning specialists directly — NEVER (spawn the Division Lead, who manages specialists)

### Why this rule exists:

**Why:** When the Orchestrator does work itself instead of delegating:
1. It runs sequentially instead of leveraging parallel agents
2. It loses the big picture and gets buried in implementation details
3. It skips quality gates (lint, typecheck, tests)
4. It forgets to write tests or runs incomplete test suites
5. It doesn't follow the 3-wave discovery protocol properly during bug fixes
6. It defeats the entire purpose of the 11-division Enterprise Execution Protocol

**How to apply:**
- Before EVERY tool call, ask: "Does this tool change code, run a build, or execute tests? → SPAWN A DIVISION LEAD INSTEAD"
- Map every work type to its Lead: UI → FE Lead, API → BE Lead, DB → DB Lead, tests → QA Lead, Docker/git → DevOps Lead, investigation → Architecture Lead
- Even "small fixes" get delegated to the appropriate Lead — the Lead spawns a specialist who lints, tests, and verifies.
- If a Lead reports failure, spawn the Lead again with more context — NEVER fall back to doing it yourself
- NEVER spawn specialists directly — always go through the Division Lead

### Orchestrator Brief = PROBLEM description, NOT solution

**Rule:** When spawning a Division Lead, the Orchestrator provides:
- The **problem** (what the user reported, what's broken, the screenshot/evidence)
- The **bug ID** and any prior context from {ISSUE_TRACKER}
- The **scope hint** (which area of the app — e.g., "explore page", "course filters")
- NOT specific files to edit (the Lead discovers those)
- NOT which keys/values to add (the Lead's specialists figure that out)
- NOT a solution or implementation plan (the Lead creates its own)

**Why:** When the Orchestrator pre-investigates (Grep for patterns, reads source code, identifies specific files), it:
1. Crosses from "scoping" into "debugging" — a role violation
2. Turns the Lead into a dumb executor instead of an autonomous manager
3. Biases the Lead toward the Orchestrator's solution, potentially missing the real root cause
4. Makes the Orchestrator the bottleneck — it does sequential investigation instead of delegating

**How to detect violation:** If the Orchestrator's Lead prompt contains specific filenames from Grep results, specific line numbers, or code snippets — it has over-investigated. The prompt should describe the SYMPTOM, not the DIAGNOSIS.

**Correct Grep/Glob usage (scoping only):**
- "How many services are affected?" → Glob to count affected areas → decides how many Leads to spawn
- "Is this a frontend or backend issue?" → quick Grep to route to correct Division
- "Which exact file has the hardcoded string?" → that's debugging, delegate to Lead
- "What configuration keys exist?" → that's investigation, delegate to Lead

### "But it's just one line" — NO EXCEPTIONS

Even a one-character fix gets delegated to a Division Lead. Why? Because the Lead will:
1. Spawn a specialist to read the file and understand context
2. The specialist makes the fix
3. The specialist runs lint
4. The specialist runs affected tests
5. The Lead verifies no regressions before reporting back

The Orchestrator doing it "quickly" would skip steps 3-5. Bypassing the Lead to spawn a specialist directly skips internal quality gates. That's why the full chain (Orchestrator → Lead → Specialist) is mandatory for ALL sizes of work.

### Division Lead = Manager ONLY

Division Leads follow the SAME constraints as the Orchestrator:
- **Allowed:** `Agent` (spawn specialists), `Read` (docs only), `Glob/Grep` (scoping), `Bash` (read-only), text output
- **FORBIDDEN:** `Edit`, `Write`, `Bash` (mutating) — all implementation delegated to specialists
- The Lead manages retry (up to 3 attempts), internal quality gates, and reporting to Orchestrator
- Lead escalates specialist silence after 5 minutes
- See `docs/architecture/AGENT-HIERARCHY.md` for full hierarchy reference
- Lead prompt templates: `docs/architecture/agent-prompts/{DivisionName}Lead.md`
