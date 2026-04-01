import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── withRetry tests ────────────────────────────────────────────

describe('withRetry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('succeeds on first attempt without retrying', async () => {
    vi.doMock('../src/collections.js', () => ({
      getClient: vi.fn().mockReturnValue({ heartbeat: vi.fn() }),
    }));
    const { withRetry } = await import('../src/resilience.js');
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('retries and succeeds on the 2nd attempt', async () => {
    vi.doMock('../src/collections.js', () => ({
      getClient: vi.fn().mockReturnValue({ heartbeat: vi.fn() }),
    }));
    const { withRetry } = await import('../src/resilience.js');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('recovered');
    const result = await withRetry(fn, { initialDelayMs: 1, maxAttempts: 3 });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('exhausts all retries and throws the last error', async () => {
    vi.doMock('../src/collections.js', () => ({
      getClient: vi.fn().mockReturnValue({ heartbeat: vi.fn() }),
    }));
    const { withRetry } = await import('../src/resilience.js');
    const fn = vi.fn().mockRejectedValue(new Error('persistent'));
    await expect(
      withRetry(fn, { maxAttempts: 2, initialDelayMs: 1 })
    ).rejects.toThrow('persistent');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('respects custom maxAttempts option', async () => {
    vi.doMock('../src/collections.js', () => ({
      getClient: vi.fn().mockReturnValue({ heartbeat: vi.fn() }),
    }));
    const { withRetry } = await import('../src/resilience.js');
    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    await expect(
      withRetry(fn, { maxAttempts: 5, initialDelayMs: 1 })
    ).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(5);
  });
});

// ─── isChromaAvailable tests ────────────────────────────────────

describe('isChromaAvailable', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns true when heartbeat succeeds', async () => {
    vi.doMock('../src/collections.js', () => ({
      getClient: vi.fn().mockReturnValue({
        heartbeat: vi.fn().mockResolvedValue(1000),
      }),
    }));
    const { isChromaAvailable } = await import('../src/resilience.js');
    expect(await isChromaAvailable()).toBe(true);
  });

  it('returns false when heartbeat fails', async () => {
    vi.doMock('../src/collections.js', () => ({
      getClient: vi.fn().mockReturnValue({
        heartbeat: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      }),
    }));
    const { isChromaAvailable } = await import('../src/resilience.js');
    expect(await isChromaAvailable()).toBe(false);
  });

  it('returns false when heartbeat times out', async () => {
    vi.doMock('../src/collections.js', () => ({
      getClient: vi.fn().mockReturnValue({
        heartbeat: vi.fn().mockImplementation(
          () =>
            new Promise(() => {
              /* never resolves */
            })
        ),
      }),
    }));
    const { isChromaAvailable } = await import('../src/resilience.js');
    expect(await isChromaAvailable(50)).toBe(false);
  });
});

// ─── logError tests ─────────────────────────────────────────────

describe('logError', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('writes to stderr with correct format', async () => {
    vi.doMock('../src/collections.js', () => ({
      getClient: vi.fn().mockReturnValue({ heartbeat: vi.fn() }),
    }));
    const { logError } = await import('../src/resilience.js');
    const writeSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    logError('testContext', new Error('test error'));
    expect(writeSpy).toHaveBeenCalledOnce();
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain('[vector-memory][testContext]');
    expect(output).toContain('ERROR: test error');
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}T/); // ISO timestamp
    writeSpy.mockRestore();
  });

  it('handles non-Error objects', async () => {
    vi.doMock('../src/collections.js', () => ({
      getClient: vi.fn().mockReturnValue({ heartbeat: vi.fn() }),
    }));
    const { logError } = await import('../src/resilience.js');
    const writeSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    logError('ctx', 'plain string error');
    const output = writeSpy.mock.calls[0][0] as string;
    expect(output).toContain('ERROR: plain string error');
    writeSpy.mockRestore();
  });
});

// ─── getCollectionSafe tests ────────────────────────────────────

describe('getCollectionSafe', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns null when getCollection throws', async () => {
    // Test the safe wrapper logic directly: if getCollection rejects, getCollectionSafe returns null
    vi.doMock('../src/resilience.js', () => ({
      withRetry: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      logError: vi.fn(),
      isChromaAvailable: vi.fn().mockResolvedValue(false),
    }));
    vi.doMock('../src/collections.js', async (importOriginal) => {
      const actual =
        await importOriginal<typeof import('../src/collections.js')>();
      return {
        ...actual,
        getCollection: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      };
    });
    const { getCollectionSafe } = await import('../src/collections.js');
    const result = await getCollectionSafe('edusphere_decisions');
    expect(result).toBeNull();
  });
});

// ─── Store handler pre-check tests ─────────────────────────────

describe('storeDecision with ChromaDB unavailable', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns error when ChromaDB is unreachable', async () => {
    vi.doMock('../src/resilience.js', () => ({
      isChromaAvailable: vi.fn().mockResolvedValue(false),
      logError: vi.fn(),
    }));
    vi.doMock('../src/collections.js', () => ({
      getCollection: vi.fn(),
      COLLECTION_NAMES: ['edusphere_decisions'],
      listCollectionsWithCounts: vi.fn(),
      getClient: vi.fn(),
    }));
    const { storeDecision } = await import('../src/handlers.js');
    const result = await storeDecision({
      title: 'Test',
      rationale: 'R',
      alternatives: 'A',
      chosen: 'C',
      tags: ['t'],
    });
    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain('unreachable');
  });
});

// ─── healthCheck degraded status tests ──────────────────────────

describe('healthCheck with ChromaDB unavailable', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns degraded status when ChromaDB is unreachable', async () => {
    vi.doMock('../src/resilience.js', () => ({
      isChromaAvailable: vi.fn().mockResolvedValue(false),
      logError: vi.fn(),
    }));
    vi.doMock('../src/collections.js', () => ({
      getCollection: vi.fn(),
      getClient: vi.fn().mockReturnValue({ heartbeat: vi.fn() }),
      COLLECTION_NAMES: [],
      listCollectionsWithCounts: vi.fn().mockResolvedValue([]),
    }));
    const { healthCheck } = await import('../src/search-handlers.js');
    const result = await healthCheck();
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe('degraded');
    expect(data.message).toContain('unreachable');
  });
});
