import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerOpenError,
} from './circuit-breaker.js';

function createLogger() {
  return {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  };
}

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;
  let logger: ReturnType<typeof createLogger>;

  beforeEach(() => {
    logger = createLogger();
    breaker = new CircuitBreaker({
      name: 'TestService',
      failureThreshold: 3,
      resetTimeout: 1000,
      logger,
    });
  });

  it('starts in CLOSED state', () => {
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    expect(breaker.getFailureCount()).toBe(0);
  });

  it('passes through successful calls in CLOSED state', async () => {
    const result = await breaker.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('counts failures and stays CLOSED below threshold', async () => {
    const fail = () => Promise.reject(new Error('boom'));

    await expect(breaker.execute(fail)).rejects.toThrow('boom');
    expect(breaker.getFailureCount()).toBe(1);
    expect(breaker.getState()).toBe(CircuitState.CLOSED);

    await expect(breaker.execute(fail)).rejects.toThrow('boom');
    expect(breaker.getFailureCount()).toBe(2);
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('opens circuit after reaching failure threshold', async () => {
    const fail = () => Promise.reject(new Error('boom'));

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fail)).rejects.toThrow('boom');
    }

    expect(breaker.getState()).toBe(CircuitState.OPEN);
    expect(breaker.getFailureCount()).toBe(3);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('circuit OPEN')
    );
  });

  it('rejects requests immediately when OPEN', async () => {
    const fail = () => Promise.reject(new Error('boom'));
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fail)).rejects.toThrow('boom');
    }

    await expect(
      breaker.execute(() => Promise.resolve('should not run'))
    ).rejects.toThrow(CircuitBreakerOpenError);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('rejecting request')
    );
  });

  it('transitions to HALF_OPEN after resetTimeout elapses', async () => {
    vi.useFakeTimers();
    try {
      const fail = () => Promise.reject(new Error('boom'));
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fail)).rejects.toThrow('boom');
      }
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      vi.advanceTimersByTime(1000);
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    } finally {
      vi.useRealTimers();
    }
  });

  it('closes circuit on successful probe in HALF_OPEN state', async () => {
    vi.useFakeTimers();
    try {
      const fail = () => Promise.reject(new Error('boom'));
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fail)).rejects.toThrow('boom');
      }

      vi.advanceTimersByTime(1000);
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      const result = await breaker.execute(() => Promise.resolve('recovered'));
      expect(result).toBe('recovered');
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getFailureCount()).toBe(0);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Probe succeeded')
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-opens circuit on failed probe in HALF_OPEN state', async () => {
    vi.useFakeTimers();
    try {
      const fail = () => Promise.reject(new Error('boom'));
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(fail)).rejects.toThrow('boom');
      }

      vi.advanceTimersByTime(1000);
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      await expect(breaker.execute(fail)).rejects.toThrow('boom');
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Probe FAILED')
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('resets failure count after a successful call', async () => {
    const fail = () => Promise.reject(new Error('boom'));

    await expect(breaker.execute(fail)).rejects.toThrow('boom');
    await expect(breaker.execute(fail)).rejects.toThrow('boom');
    expect(breaker.getFailureCount()).toBe(2);

    await breaker.execute(() => Promise.resolve('ok'));
    expect(breaker.getFailureCount()).toBe(0);
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('manual reset() restores CLOSED state', async () => {
    const fail = () => Promise.reject(new Error('boom'));
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fail)).rejects.toThrow('boom');
    }
    expect(breaker.getState()).toBe(CircuitState.OPEN);

    breaker.reset();
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    expect(breaker.getFailureCount()).toBe(0);
  });

  it('uses default thresholds when options are omitted', () => {
    const defaultBreaker = new CircuitBreaker({ name: 'Default' });
    expect(defaultBreaker.getState()).toBe(CircuitState.CLOSED);
    // Defaults: failureThreshold=5, resetTimeout=30000
  });

  it('logs warnings for each failure below threshold', async () => {
    const fail = () => Promise.reject(new Error('oops'));

    await expect(breaker.execute(fail)).rejects.toThrow('oops');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failure 1/3')
    );

    await expect(breaker.execute(fail)).rejects.toThrow('oops');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failure 2/3')
    );
  });

  it('handles non-Error rejection values', async () => {
    // eslint-disable-next-line prefer-promise-reject-errors
    const fail = () => Promise.reject('string-error');

    await expect(breaker.execute(fail)).rejects.toBe('string-error');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('string-error')
    );
  });
});
