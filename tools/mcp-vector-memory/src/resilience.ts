import { getClient } from './collections.js';

// ─── Types ──────────────────────────────────────────────────────

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  maxDelayMs?: number;
}

const DEFAULT_RETRY: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 500,
  backoffFactor: 2,
  maxDelayMs: 5000,
};

// ─── Logging ────────────────────────────────────────────────────

/**
 * Log an error to stderr with timestamp and context.
 */
export function logError(context: string, error: unknown): void {
  const ts = new Date().toISOString();
  const msg = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[vector-memory][${context}] ${ts} ERROR: ${msg}\n`);
}

// ─── Retry with Exponential Backoff ─────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async function with exponential backoff.
 * Throws the last error if all attempts fail.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions
): Promise<T> {
  const { maxAttempts, initialDelayMs, backoffFactor, maxDelayMs } = {
    ...DEFAULT_RETRY,
    ...opts,
  };

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < maxAttempts) {
        logError(
          'retry',
          `Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms`
        );
        await sleep(delay);
        delay = Math.min(delay * backoffFactor, maxDelayMs);
      }
    }
  }

  throw lastError;
}

// ─── ChromaDB Availability Check ────────────────────────────────

/**
 * Check if ChromaDB is reachable by sending a heartbeat with a timeout.
 * Returns true if reachable, false otherwise.
 */
export async function isChromaAvailable(timeoutMs = 2000): Promise<boolean> {
  try {
    const client = getClient();
    const heartbeat = client.heartbeat();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('ChromaDB heartbeat timeout')),
        timeoutMs
      )
    );
    await Promise.race([heartbeat, timeout]);
    return true;
  } catch {
    return false;
  }
}
