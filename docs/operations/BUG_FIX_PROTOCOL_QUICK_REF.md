# Bug Fix Protocol — Quick Reference

> **Parent document:** [CLAUDE.md](../../CLAUDE.md)
> **Full protocol reference:** [docs/reference/BUG_FIX_PROTOCOL.md](../reference/BUG_FIX_PROTOCOL.md)

## Delegation Model (IRON RULE)

> **The Orchestrator does NOT execute any part of the Bug Fix Protocol.**
> When a bug is reported, the Orchestrator spawns a **QA & Validation Lead Agent** who owns the entire protocol (Stages 0-11).
> The QA Lead spawns sub-agents (FE, BE, DB, Security, Playwright, DevOps) as needed within each stage.
> The Orchestrator only monitors progress and relays the QA Lead's reports to the user.
>
> **Orchestrator's allowed actions during a bug fix:**
>
> - `Agent` — spawn the QA Lead Agent (with full bug context)
> - `Read` — check OPEN_ISSUES.md status only
> - Text output — relay progress to user in Hebrew
>
> **Orchestrator MUST NOT:** read source code, search patterns, run tests, edit files, make root cause decisions, or run any build/deploy commands during a bug fix.

## Interactive Debugger — `dap` CLI (MANDATORY tool for all debugging)

**NEVER use `console.log` / `this.logger.debug` for debugging runtime state. Use the `dap` interactive debugger instead.**

The `debugging-code` skill + `dap` CLI are globally installed. `dap` wraps the Debug Adapter Protocol and lets you pause execution, inspect live variables, step through code, and evaluate expressions — without restarting the process.

**Supported languages:** Python, Go, Node.js/TypeScript, Rust/C/C++ (backend auto-detected from file extension)

**Quick reference:**

```bash
# Stop at a specific line and inspect
dap debug apps/subgraph-core/src/main.ts --break user.service.ts:55

# Evaluate a live expression at the stopped line
dap eval "this.tenantId"
dap eval "result"

# Navigate
dap step          # step over
dap step in       # step into a function
dap continue      # jump to next breakpoint
dap output        # drain stdout/stderr since last stop

# End session
dap stop
```

**Debugging mindset (mandatory):**

1. Form a hypothesis: "I believe X fails because Y"
2. Set breakpoint _where the problem begins_, not where it manifests
3. Stop, read locals + call stack, confirm or disprove hypothesis
4. Repeat until root cause confirmed

**When `dap` is unavailable** (e.g. remote container, CI): fall back to structured Pino logging with `tenantId`+`userId` context — never raw `console.log`.

---

## Phase 0 — Reproduce First (TEST-FIRST)

> **Iron principle:** Never investigate a bug you can't prove exists. Write the test FIRST.

1. **Read logs** - Subgraph logs, Gateway logs, PostgreSQL logs, NATS logs, Frontend console
2. **Write a reproducer test** that demonstrates the bug **as it exists right now**. The test must **PASS** (GREEN) because it asserts the broken behavior
3. **Run the test** — it MUST be **GREEN** (proving the bug is real). If RED, investigate further.
4. **Mark the test:** `// BUG-NNN: reproducer — asserts BROKEN state, will be INVERTED after fix`

## Phase 1 — Discovery (3 Waves — MANDATORY before any fix code)

**Wave 1 — Exact match:** Grep for the exact code pattern across the entire codebase.

**Wave 2 — MANDATORY SIMILARITY SEARCH (NEVER SKIP):**

MANDATORY CHECKLIST (mark each as you complete it):

- Every file in `apps/web/src/pages/` — checked for same anti-pattern
- Every file in `apps/web/src/hooks/` — checked for same anti-pattern
- Every file in `apps/web/src/components/` — checked for same anti-pattern
- Every screen in `apps/mobile/src/` — checked for same anti-pattern
- Every service in ALL 6 backend subgraphs — checked if bug is server-side
- All resolver files across all subgraphs — checked for same pattern
- Mobile equivalent of affected web component — explicitly checked

Build a numbered **DISCOVERY LIST** before writing a single line of fix code.

**Wave 3 — Class of bug:** Search for all usages of the same API or pattern class.

## Phase 2 — Root Cause Analysis

6. **Use `dap` debugger** — set breakpoint at the location indicated by the reproducer test
7. **Inspect live state** — locals, call stack, variable values at the point of failure
8. **Document root cause** — file:line where the bug originates + why it happens

## Phase 3 — Fix Rounds (one round per Wave group)

**Round structure:**

- **Round 1**: Fix the original bug + add Pino logging + **INVERT the reproducer test from Phase 0**
- **Round 2**: Fix all similar issues found in Wave 2 (other pages/components with variations)
- **Round 3**: Fix all class-of-bug issues found in Wave 3 (if different from Round 2 items)
- **Round N**: Continue until the Discovery List is 100% empty

**Round Completion Gate (MANDATORY after EVERY fix round):** 0. Docker infrastructure UP — `docker ps` shows postgres, keycloak, nats, minio, jaeger healthy

1. `pnpm turbo test` passes 100% for ALL affected packages
2. `pnpm turbo typecheck` — zero TypeScript errors
3. **Reproducer test INVERTED and GREEN** — proves the fix actually works
4. Additional regression test: asserts the BAD string/state is GONE
5. Console.error/Pino log added so bug is observable if it recurs
6. `./scripts/health-check.sh` — all services PASS
7. All 5 test users can authenticate successfully

**Required output per round (non-negotiable):**

- Inverted reproducer test (from Phase 0) now GREEN
- Unit test asserting the BAD behavior is GONE (regression guard)
- **Playwright E2E test** with `page.route()` interception or mock
- Screenshot assertion (`expect(page).toHaveScreenshot(...)`) for visual regressions
- Console.error/Pino log call so the bug is observable if it recurs

## Phase 4 — Verification

9. **Full test suite** - `pnpm turbo test -- --coverage` must pass 100%
10. **Logging verification** - Confirm recurrence would appear in logs
11. **Visual check (MANDATORY for UI bugs)** - Open browser, reproduce scenario, confirm UI
12. **Health check** - `./scripts/health-check.sh` passes
13. **Pattern clean** - grep for the bug pattern returns zero matches outside test files
14. **E2E visual regression test** - Playwright test simulating failure condition

## Phase 5 — Documentation

15. **Document** in `OPEN_ISSUES.md`: Status, Severity, Reproducer test path, Files affected per round, Root cause chain, Solution per round, Tests added, Anti-recurrence note, Discovery List

## IRON RULES (never violate)

- **Never write fix code before a reproducer test proves the bug exists**
- **Every reproducer test must be GREEN before fixing and GREEN (inverted) after fixing**
- Never declare a bug fixed until the entire Discovery List is empty (all 3 waves exhausted)
- Never close a bug without a regression test that would catch it if it returns
- Never leave logging gaps — the bug must be observable in logs if it recurs
- **UI bugs must have a Playwright E2E test that simulates the failure and asserts the UI is clean**
- **Never report completion after fixing only the original file.** Always complete all 3 discovery waves
- **Every Pino/console.error logging MUST include structured context**
- **Round Completion Gate is mandatory after EVERY round**
- **ALWAYS restore services after ANY disruption**
