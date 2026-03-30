/**
 * Agent subgraph session and LangGraph constants.
 * Source values extracted from ai/langgraph.service.ts and agent-session/session-cleanup.service.ts.
 */

/**
 * Maximum number of sessions kept in MemorySaver before LRU trimming.
 * Source: MAX_MEMORY_SAVER_SESSIONS = 1000 (langgraph.service.ts:8)
 */
export const LANGGRAPH_MAX_MEMORY_SESSIONS = 1000;

/**
 * How often the MemorySaver trim timer runs.
 * Source: CLEANUP_INTERVAL_MS = 5 * 60 * 1000 (langgraph.service.ts:9)
 */
export const LANGGRAPH_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * How often the SessionCleanupService deletes stale DB sessions.
 * Source: CLEANUP_INTERVAL_MS = 30 * 60 * 1000 (session-cleanup.service.ts:5)
 */
export const SESSION_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Age threshold after which a DB agent session is considered stale.
 * Source: STALE_SESSION_AGE_MS = 24 * 60 * 60 * 1000 (session-cleanup.service.ts:6)
 */
export const STALE_SESSION_AGE_MS = 24 * 60 * 60 * 1000;

// ── Agent Sandbox Defaults ──────────────────────────────────────────────────

/** Default max heap size per sandboxed agent execution (MB). Env: AGENT_MAX_MEMORY_MB */
export const AGENT_DEFAULT_MAX_MEMORY_MB = 256;

/** Default execution timeout per sandboxed agent (ms). Env: AGENT_TIMEOUT_MS */
export const AGENT_DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/** Max concurrent sandboxed agent executions per tenant. Env: AGENT_MAX_CONCURRENT_PER_TENANT */
export const AGENT_MAX_CONCURRENT_PER_TENANT = 3;
