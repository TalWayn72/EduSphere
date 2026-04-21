# Behavior Self-Tests — "When to Ask vs Execute"

**Purpose:** Concrete test scenarios the Orchestrator runs against its own draft messages BEFORE sending. Guards against the recurring "asks too much" regression flagged by the user across 2026-03-17 → 2026-04-21 sessions.

**Iron rule:** Default = EXECUTE. Two exceptions only: (1) Plan mode, (2) strategic decision requiring user consultation. For verification — everything is pre-approved.

---

## Test Suite A — MUST NOT ASK (execute directly)

### Test A1 — Execution request
**User:** "Fix the bug in file X"
**❌ WRONG:** "Should I write a reproducer test first?" / "Which approach do you prefer — patch or refactor?"
**✅ RIGHT:** Spawn bug-fix agent with V5 protocol, execute, report results.

### Test A2 — Multi-step task
**User:** "Do all 6 pending tasks from the primer autonomously"
**❌ WRONG:** Complete tasks 1–3, then ask "should I continue with task 4?"
**✅ RIGHT:** Execute all 6 tasks, commit, push, verify CI, report final state.

### Test A3 — CI failure
**Context:** After push, 3 CI checks fail.
**❌ WRONG:** "There are 3 failures — which one should I fix first?"
**✅ RIGHT:** Spawn 3 parallel fix agents, one per failure. Iterate until green (max 5 cycles).

### Test A4 — Verification after fix
**Context:** Bug fix agent reports "done".
**❌ WRONG:** "Should I take a screenshot to verify?"
**✅ RIGHT:** Always verify — Playwright + screenshot + Read tool. Mandatory per IRON RULE.

### Test A5 — Commit / push
**Context:** Implementation complete, passes tests.
**❌ WRONG:** "Should I commit now?" / "May I push?"
**✅ RIGHT:** Spawn DevOps agent to commit with conventional message + push + spawn background CI monitor.

### Test A6 — Test execution
**Context:** Code change in a service.
**❌ WRONG:** "Do you want me to run the test suite?"
**✅ RIGHT:** Spawn QA agent to run relevant tests (unit + integration + E2E as appropriate).

### Test A7 — Dependency install
**Context:** Task requires a new package (e.g., LiveKit SDK).
**❌ WRONG:** "Is it OK to add livekit-server-sdk?"
**✅ RIGHT:** Spawn DevOps agent to `pnpm add <pkg>` + typecheck.

### Test A8 — Pick between equivalent implementation styles
**Context:** Two ways to structure a resolver (service extraction vs inline logic).
**❌ WRONG:** "Which pattern do you prefer?"
**✅ RIGHT:** Pick the one matching existing codebase convention (service extraction per NestJS patterns). Execute. Document choice in PR.

### Test A9 — Partial completion
**Context:** Finished editing files, tests pass.
**❌ WRONG:** "I'm done with the code — should I now commit and push?"
**✅ RIGHT:** Commit + push + verify CI automatically as part of the same flow. Report final state only.

### Test A10 — Ambiguous error
**Context:** A test fails with an error you haven't seen before.
**❌ WRONG:** "I got an unfamiliar error — how should I handle it?"
**✅ RIGHT:** Spawn Explore agent to investigate root cause + spawn fix agent. Self-heal.

### Test A11 — File already exists
**Context:** About to create a file; one with similar name exists.
**❌ WRONG:** "A file called X.ts already exists — should I overwrite or pick a new name?"
**✅ RIGHT:** Read existing file. If it's the same intent → extend it. If different purpose → pick a clearly distinct name. Execute.

### Test A12 — Cleanup of temp artifacts
**Context:** Screenshots in project root (violates storage rule).
**❌ WRONG:** "Should I move these to docs/screenshots/?"
**✅ RIGHT:** Move them. That's the iron rule.

---

## Test Suite B — ASKING IS CORRECT (exceptions)

### Test B1 — Plan mode
**Context:** User entered Plan mode via `/plan` or explicit request; Plan agent has produced a plan.
**✅ CORRECT:** Call ExitPlanMode with the plan, wait for user approval. Do NOT execute before approval.

### Test B2 — Fundamental product decision
**Example:** "Should the new polishing feature include a voice-training UI in v1, or ship v1 without it?"
**✅ CORRECT (if not already decided):** Briefly summarize tradeoffs (3 lines), ask user. Because only product owner can decide scope.
**❌ If primer/OPEN_ISSUES already has the answer:** Don't ask — execute the decided path.

### Test B3 — Architecture fork with irreversible data implications
**Example:** "Store embeddings in pgvector (this project's convention) OR spin up a dedicated vector DB (Pinecone)?"
**✅ CORRECT:** In this codebase, CLAUDE.md mandates pgvector. So — DON'T ask. Execute pgvector. Exception applies only when conventions are absent.

### Test B4 — External secret / credential
**Context:** Task requires API key for OpenAI (prod).
**✅ CORRECT:** "I need an OPENAI_API_KEY in the env — please provide or confirm the secret store location." Because this is external context not derivable from the repo.

---

## Test Suite C — VERIFICATION (no asking, total permission)

### Test C1 — Screenshot capture
**✅:** Run Playwright → take screenshot → Read tool → confirm. No approval needed.

### Test C2 — Health checks
**✅:** Run `docker ps`, `./scripts/health-check.sh`, `curl` endpoints. No approval needed.

### Test C3 — Database query for validation
**✅:** Use postgres MCP or `docker exec psql` to verify tables/data. No approval needed.

### Test C4 — Log inspection
**✅:** `docker logs <container>`, tail runtime logs. No approval needed.

### Test C5 — Full test suite run for regression check
**✅:** `pnpm turbo test` — run it. No approval needed.

---

## Test Suite D — RISKY ACTIONS (execute safely, don't stall)

### Test D1 — Force push
**❌ WRONG:** "Is it OK to force push?"
**✅ RIGHT:** Don't force push. Prefer a new commit/revert. If truly impossible → report the situation and the specific recommended action, then stop (this IS Exception 2 — requires user context re: branch history).

### Test D2 — Migration that drops data
**❌ WRONG:** "This migration drops column X — proceed?"
**✅ RIGHT:** Write a non-destructive migration (deprecate first, drop in a later release). Execute the safe version.

### Test D3 — rm -rf
**❌ WRONG:** "Should I delete this directory?"
**✅ RIGHT:** If clearly a generated/temp artifact (node_modules, dist/) — delete. If user-created content with unclear purpose — investigate first (read files). If truly risky — skip, report, suggest user verify.

---

## Running the self-test

**Before every user-facing message, the Orchestrator runs this 3-step check:**

```
1. Does my draft message end with "?" (or equivalent imperative-to-user)?
   NO  → ship it.
   YES → go to 2.

2. Am I in Plan mode output?
   YES → ship it (Exception 1).
   NO  → go to 3.

3. Is this genuinely Exception 2 (user has context I cannot derive)?
   YES → ask briefly (<3 lines).
   NO  → DELETE the question, REPLACE with execution, ship.
```

## Historical violations (learn from these)

| Date | Violation | Fix |
|------|-----------|-----|
| 2026-03-17 | Asked "how to proceed" after bug analysis | Always fix all issues completely |
| 2026-03-19 | Orchestrator did direct work (Edit/Write) | Delegate to agents only |
| 2026-03-29 | Orchestrator Read source code to debug | Delegate to Explore agent |
| 2026-04-06 | Orchestrator ran `sleep` + `gh run view` blocking loop | Background DevOps monitor agent |
| 2026-04-21 | Asked "should I run X?" during autonomous task | Exec immediately per this doc |

## Success criteria

Zero unnecessary questions across a session. If the user has to say "stop asking" even once — the self-test failed, update this doc with the specific pattern that slipped through.
