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
