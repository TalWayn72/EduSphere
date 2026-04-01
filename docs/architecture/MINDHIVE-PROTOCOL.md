# MindHive Protocol — Orchestrator-Only Model

> **Effective:** 2026-03-23
> **Previous model:** All-agents mandatory (deprecated — excessive overhead)
> **Current model:** Orchestrator-only — Leads and Specialists work without MindHive

## Overview

MindHive provides persistent semantic memory for the EduSphere agent hierarchy. As of 2026-03-23, only the **Orchestrator (L0)** interacts with MindHive MCP servers. Division Leads (L1) and Specialists (L2) work without any MindHive overhead, receiving prior intelligence as plain text in their briefs.

### Why Orchestrator-Only

| Metric                | All-Agents Model                               | Orchestrator-Only                          |
| --------------------- | ---------------------------------------------- | ------------------------------------------ |
| MCP calls per session | ~420                                           | ~10                                        |
| Agent warm-up time    | 30-60s each                                    | 0s (Leads/Specialists)                     |
| % time on real work   | ~40-50%                                        | ~80%+                                      |
| Cross-session memory  | Yes (but low quality — too many small entries) | Yes (consolidated, high-quality decisions) |

## Infrastructure (unchanged)

| Server                | Tool Prefix                      | Backend           | Port             |
| --------------------- | -------------------------------- | ----------------- | ---------------- |
| `coordination-bridge` | `mcp__coordination-bridge__cb_*` | SQLite (WAL mode) | N/A (local file) |
| `vector-memory`       | `mcp__vector-memory__vm_*`       | ChromaDB          | 8100             |

**Tool names use HYPHENS:** `mcp__coordination-bridge__cb_*` and `mcp__vector-memory__vm_*`

The MCP servers, Docker containers, and `.mcp.json` configuration remain unchanged. Only the usage protocol changed.

## Orchestrator Protocol

### Session Start

1. Verify ChromaDB healthy: `docker ps | grep hivemind-chromadb`
2. If down: `docker-compose -f tools/docker-compose.hivemind.yml up -d`
3. `mcp__vector-memory__vm_health` — must return ok
4. Search prior intelligence:
   - `vm_search({ query: "<task keywords>" })`
   - `vm_search_decisions({ query: "<domain>" })`
   - `vm_search_bugs({ query: "<domain>" })`

### Before Spawning Leads

Include prior intelligence findings as plain text "Prior Intelligence" section in each Lead brief:

```
## Prior Intelligence (from MindHive)
- Decision: [title] — [rationale summary]
- Bug pattern: [description] — [solution summary]
- Code pattern: [description] — [where used]
```

This replaces the previous model where Leads called `vm_search_*` themselves.

### After Leads Complete

For each major decision reported by Leads:

- `vm_store_decision({ title, rationale, alternatives, chosen, tags })`

For each bug fix reported by Leads:

- `vm_store_bug_pattern({ pattern, root_cause, solution, files_affected, tags })`

### Session End

- `vm_get_recent({ n: 10 })` — verify decisions were stored this session
- This check replaces the previous Row 11 multi-tool audit

## What Leads Do NOT Do (explicit list)

| Previous Requirement                     | Now     | Why Removed                                 |
| ---------------------------------------- | ------- | ------------------------------------------- |
| `cb_register_agent` in first 3 calls     | Removed | Orchestrator tracks via Agent tool          |
| `cb_update_status("running"/"complete")` | Removed | Agent tool returns status directly          |
| `vm_search_*` before work                | Removed | Orchestrator provides findings in brief     |
| `vm_store_decision` after work           | Removed | Orchestrator consolidates from Lead reports |
| `vm_store_agent_perf` per specialist     | Removed | Not providing actionable value              |
| `cb_publish` milestones                  | Removed | Leads report to Orchestrator directly       |
| `cb_get_pending_help`                    | Removed | Leads communicate via Orchestrator          |

## What Specialists Do NOT Do (explicit list)

| Previous Requirement                             | Now     | Why Removed                             |
| ------------------------------------------------ | ------- | --------------------------------------- |
| `cb_register_agent`                              | Removed | Unnecessary overhead                    |
| `cb_lock_file` / `cb_unlock_file`                | Removed | Divisions separate file ownership       |
| `vm_search_patterns` before coding               | Removed | Lead provides relevant context          |
| `vm_store_code_pattern` / `vm_store_bug_pattern` | Removed | Lead reports to Orchestrator who stores |
| `cb_update_status`                               | Removed | Agent tool handles lifecycle            |

## Deprecated Iron Rules

The following MH rules from the all-agents model are **deprecated**:

| Rule                            | Status     | Replacement                              |
| ------------------------------- | ---------- | ---------------------------------------- |
| MH-1 (all agents register)      | Deprecated | Only Orchestrator uses MindHive          |
| MH-2 (all agents search VM)     | Deprecated | Orchestrator searches, injects in briefs |
| MH-3 (file locking)             | Deprecated | Division separation prevents conflicts   |
| MH-4 (all agents update status) | Deprecated | Agent tool tracks lifecycle              |
| MH-5 (bug pattern storage)      | Modified   | Orchestrator stores from Lead reports    |
| MH-6 (decision storage)         | Modified   | Orchestrator stores from Lead reports    |
| MH-7 (code pattern storage)     | Deprecated | Low value vs overhead                    |
| MH-8 (agent perf tracking)      | Deprecated | Low value vs overhead                    |
| MH-9 (cross-div help requests)  | Deprecated | Leads communicate via Orchestrator       |
| MH-10 (Orchestrator audit)      | Simplified | `vm_get_recent` only                     |

## Session Completion Gate — Row 11

**Previous:** `cb_get_agents` + `vm_get_recent` + `cb_get_violations` — verify 0 stale agents, decisions stored, 0 violations

**Current:** `vm_get_recent({ n: 10 })` — verify at least 1 decision stored this session

## Rollback

To revert to all-agents model:

1. Restore Lead prompt templates from git (re-add SHARED MEMORY PROTOCOL sections)
2. Restore CLAUDE.md HIVEMIND sections from git
3. Restore this file from git
4. No infrastructure changes needed — MCP servers are unchanged
