/**
 * Circuit Breaker pattern for external dependency resilience.
 *
 * States:
 *  - CLOSED:    Normal operation — requests pass through.
 *  - OPEN:      Too many failures — requests are rejected immediately.
 *  - HALF_OPEN: After resetTimeout, one probe request is allowed through.
 *
 * Usage:
 *   const breaker = new CircuitBreaker({ name: 'MinIO', failureThreshold: 5 });
 *   const result = await breaker.execute(() => minioClient.putObject(...));
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Human-readable name for logging (e.g. 'MinIO', 'JWKS', 'Ollama'). */
  name: string;
  /** Number of consecutive failures before opening the circuit. Default: 5. */
  failureThreshold?: number;
  /** Milliseconds to wait before transitioning from OPEN → HALF_OPEN. Default: 30 000. */
  resetTimeout?: number;
  /** Optional Pino-compatible logger. Falls back to console if not provided. */
  logger?: CircuitBreakerLogger;
}

export interface CircuitBreakerLogger {
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
}

export class CircuitBreakerOpenError extends Error {
  constructor(name: string) {
    super(`Circuit breaker "${name}" is OPEN — request rejected`);
    this.name = 'CircuitBreakerOpenError';
  }
}

const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_RESET_TIMEOUT_MS = 30_000;

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;

  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly log: CircuitBreakerLogger;

  constructor(opts: CircuitBreakerOptions) {
    this.name = opts.name;
    this.failureThreshold = opts.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
    this.resetTimeout = opts.resetTimeout ?? DEFAULT_RESET_TIMEOUT_MS;
    this.log = opts.logger ?? console;
  }

  /** Current circuit state (read-only). */
  getState(): CircuitState {
    this.evaluateState();
    return this.state;
  }

  /** Number of consecutive failures recorded. */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Execute an async function through the circuit breaker.
   * Throws `CircuitBreakerOpenError` when the circuit is OPEN.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.evaluateState();

    if (this.state === CircuitState.OPEN) {
      this.log.warn(
        `[CircuitBreaker:${this.name}] Circuit OPEN — rejecting request ` +
          `(failures=${this.failureCount}, resets in ${this.msUntilReset()}ms)`
      );
      throw new CircuitBreakerOpenError(this.name);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /** Force-reset the circuit to CLOSED (useful in tests or manual recovery). */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.log.info(`[CircuitBreaker:${this.name}] Manually reset to CLOSED`);
  }

  // ── Internal helpers ──────────────────────────────────────────

  private evaluateState(): void {
    if (
      this.state === CircuitState.OPEN &&
      Date.now() - this.lastFailureTime >= this.resetTimeout
    ) {
      this.state = CircuitState.HALF_OPEN;
      this.log.info(
        `[CircuitBreaker:${this.name}] Transitioning OPEN → HALF_OPEN (probe allowed)`
      );
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.log.info(
        `[CircuitBreaker:${this.name}] Probe succeeded — circuit CLOSED`
      );
    }
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure(error: unknown): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    const errMsg = error instanceof Error ? error.message : String(error);

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.log.error(
        `[CircuitBreaker:${this.name}] Probe FAILED — circuit re-opened: ${errMsg}`
      );
      return;
    }

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.log.error(
        `[CircuitBreaker:${this.name}] Failure threshold reached ` +
          `(${this.failureCount}/${this.failureThreshold}) — circuit OPEN: ${errMsg}`
      );
    } else {
      this.log.warn(
        `[CircuitBreaker:${this.name}] Failure ${this.failureCount}/${this.failureThreshold}: ${errMsg}`
      );
    }
  }

  private msUntilReset(): number {
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.resetTimeout - elapsed);
  }
}
