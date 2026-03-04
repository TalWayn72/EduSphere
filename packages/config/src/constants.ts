export const RATE_LIMIT = {
  WINDOW_MS: 60_000,
  MAX_REQUESTS: 100,
  MAX_REQUESTS_AUTHENTICATED: 500,
} as const;

export const SESSION = {
  AGE_SECONDS: 86_400,
  REFRESH_INTERVAL_MS: 5 * 60 * 1000,
} as const;

export const GRAPH = {
  MAX_DEPTH: 5,
  DEFAULT_DEPTH: 2,
  MAX_VECTOR_RESULTS: 50,
  MAX_GRAPH_RESULTS: 100,
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const AI = {
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
  MAX_WORKFLOW_HISTORY: 20,
  EXECUTION_TIMEOUT_MS: 5 * 60 * 1000,
} as const;

export const MEMORY = {
  TENANT_CACHE_MAX: 1000,
  KV_MAX_BUCKETS: 500,
} as const;
