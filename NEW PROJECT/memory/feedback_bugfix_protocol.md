---
name: Bug-Fix Protocol V4 — Test-First Reproducer
description: 12-stage bug-fix protocol with delegation model — Orchestrator spawns QA Lead Agent who runs entire protocol. Reproduce FIRST (write failing test before any investigation), then discovery waves, root cause, fix rounds (invert reproducer), visual verification, rollback, container deployment, CI/CD, RCA documentation. Auto-commit after all checks pass.
type: feedback
---

## DELEGATION MODEL — Orchestrator spawns QA Lead, does NOT execute protocol

**Why:** The Orchestrator was executing bug fix stages directly (reading code, running greps, investigating root causes) instead of delegating to a QA Lead Agent. This violates the Orchestrator's role as a pure coordinator.

**How to apply:**
1. When a bug is reported, the Orchestrator spawns ONE agent: **QA & Validation Lead Agent**
2. The QA Lead receives full context (bug description, affected area, severity estimate)
3. The QA Lead autonomously runs Stages 0–11, spawning sub-agents as needed
4. The Orchestrator ONLY monitors and relays progress — it does NOT read source code, search for patterns, or make fix decisions
5. The Orchestrator's tools during a bug fix: `Agent` (spawn QA Lead), `Read` ({ISSUE_TRACKER} only), text output (relay to user)

---

## Bug-Fix Protocol V4 — Test-First Reproducer — Mandatory for EVERY bug fix

**Full reference:** `docs/reference/BUG_FIX_PROTOCOL.md`

**Why:** The very first action in any bug fix must be writing a test that reproduces the failure. This ensures we never fix a bug without proving it exists, and the same test becomes the regression guard after inversion.

**How to apply:** Follow ALL stages in order. The reproducer test is Stage 1 — before discovery, before root cause, before any fix code.

### Stages (mandatory order):
0. **Triage** — Severity P0/P1/P2/P3, log in {ISSUE_TRACKER}
1. **Reproduce First** — Write a test that PROVES the bug exists (must be GREEN). UI→E2E test, Logic→unit test, Auth→integration test
2. **Discovery** — 3 waves (exact match, similarity in all dirs, pattern class) → numbered Discovery List
2.5. **Containment** — P0/P1 only: feature flag / rollback / circuit breaker
3. **Root Cause Analysis** — debugger, document file:line + explanation
4. **Fix Rounds** — Round per wave group. **INVERT the reproducer test** (assert correct behavior). Round Gate after each.
5. **Visual Verification** — UI bugs: E2E test + screenshot + 10x flake check
6. **Full Verification** — test + typecheck + lint + security + E2E + grep + audit
7. **Rollback Readiness** — Document rollback command, DB impact, recovery time. 30-min decision gate.
8. **Container Deploy** — Blue-Green build → health check → all services → gateway → frontend → test user auth → reproduce bug live
9. **CI/CD** — Auto-commit (NO asking) → push → wait for green CI → fix if red
10. **Documentation** — {ISSUE_TRACKER} structured RCA (root cause, reproducer test path, prevention, discovery list)
11. **Final Report** — Summary with reproducer lifecycle (GREEN→inverted→GREEN)

### Key rules:
- **Test-First:** Reproducer test MUST be GREEN (proving bug exists) before ANY other work
- **Inversion:** After fix, invert the reproducer test assertions → must be GREEN (proving bug is gone)
- **NEVER ask "should I commit?"** — commit automatically in Stage 9
- **NEVER declare fixed without Stage 8** — container must be deployed and verified
- **NEVER skip Discovery waves** — numbered list before any fix code
- **NEVER write fix code before reproducer proves the bug exists**
