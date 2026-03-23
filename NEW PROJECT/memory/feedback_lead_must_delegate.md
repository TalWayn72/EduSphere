# Feedback: Division Leads MUST Delegate — NEVER Implement Directly

**Date:** 2026-03-20
**Severity:** CRITICAL — Iron Rule
**Applies to:** All 10 Division Leads (L1 agents)

## The Rule

Division Leads (L1) are MANAGERS. They MUST spawn Specialist agents (L2) for ALL implementation work. A Lead that does implementation work directly is violating its role — no exceptions, not even for 1-line changes.

## Why This Rule Exists

**Observed violation:** The QA Lead received a bug fix task and made 38 direct tool calls using Edit, Write, and Read (on source code) with **0 specialists spawned**. The Lead acted as a solo developer instead of a manager, completely bypassing the 3-level hierarchy.

**Consequences of violation:**
- The hierarchical agent model collapses to a flat model (no concurrency benefit)
- No specialist-level quality ownership — the Lead does not verify its own work objectively
- No traceability — the Orchestrator cannot audit which specialist did what
- Precedent — if one Lead violates, others will follow, destroying the entire architecture

## How to Prevent

### 1. CRITICAL REMINDER suffix (mandatory in every Lead prompt)

Every time the Orchestrator spawns a Lead, the prompt MUST end with:

```
CRITICAL REMINDER: You are a MANAGER. You MUST spawn specialist agents (via the Agent tool) for ALL implementation work including: reading source code to debug, editing files, writing new files, running tests, running builds. You may ONLY use: Agent (primary), Read (docs only), Glob/Grep (scoping), Bash (read-only: git status, git log, git diff). If you find yourself about to use Edit, Write, or mutating Bash — STOP and spawn a specialist instead. Spawning 0 specialists = VIOLATION.
```

### 2. Lead Self-Check Protocol (before every tool call)

1. "Am I about to use Edit or Write?" — spawn a Specialist instead
2. "Am I about to run build/test/deploy commands?" — spawn a Specialist instead
3. "Am I reading source code to solve a problem?" — spawn an Explore Specialist
4. "Have I spawned at least 1 specialist?" — if no, STOP and spawn

### 3. Orchestrator enforcement

- Orchestrator MUST reject Lead reports where SPECIALISTS_USED is empty
- Orchestrator MUST verify Lead reports include specialist agent IDs
- If a Lead describes work done but lists no specialists, it did the work itself — violation

## Files Updated

- [PROJECT_INSTRUCTIONS] — Lead Iron Rules section: added Violation Detection Rules, Self-Check Protocol, mandatory prompt suffix
- `docs/architecture/AGENT-HIERARCHY.md` — added Lead Violation Detection section with state machine diagram
- MEMORY.md — added memory entry for this pattern
