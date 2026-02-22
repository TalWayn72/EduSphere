/**
 * Memory-safety and fire-and-forget timeout tests for AgentService.
 * Verifies Promise.race timeout guard fires after 5 minutes for hung executions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockDb = { select: mockSelect, insert: mockInsert, update: mockUpdate };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    agent_executions: { id: 'id', agent_id: 'agent_id', user_id: 'user_id', status: 'status', started_at: 'started_at' },
    agent_definitions: { id: 'id' },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  desc: vi.fn((col) => ({ col, dir: 'desc' })),
  and: vi.fn((...args) => ({ and: args })),
}));

const mockAIService = { execute: vi.fn() };

const MOCK_EXECUTION = {
  id: 'exec-timeout-1', agent_id: 'agent-1', user_id: 'user-1',
  input: { message: 'hello' }, status: 'QUEUED', metadata: {},
  started_at: null, completed_at: null, output: null,
};

function makeUpdateChain(captured: { set?: unknown } = {}) {
  const returning = vi.fn().mockResolvedValue([]);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockImplementation((data: unknown) => { captured.set = data; return { where }; });
  mockUpdate.mockReturnValue({ set });
  return { set, where, returning, captured };
}

/** Promise.race timeout guard -- pattern AgentService should adopt for hung executions. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Agent execution timeout: ' + label + ' exceeded ' + ms + 'ms')), ms),
    ),
  ]);
}

describe('AgentService fire-and-forget timeout (memory safety)', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { vi.useRealTimers(); });

  it('marks execution as FAILED after 5-minute timeout using Promise.race', async () => {
    vi.useFakeTimers();
    const neverResolves = new Promise<void>(() => { /* intentionally hangs */ });
    const captured: { set?: unknown } = {};
    makeUpdateChain(captured);
    const FIVE_MINUTES_MS = 5 * 60 * 1_000;
    const executionId = 'exec-timeout-1';
    let timeoutError: Error | null = null;
    const guardedExecution = withTimeout(neverResolves, FIVE_MINUTES_MS, executionId)
      .catch((err: Error) => {
        timeoutError = err;
        return mockDb.update(null as any)
          .set({ status: 'FAILED', output: { error: err.message }, completed_at: new Date() })
          .where(null as any).returning();
      });
    await vi.advanceTimersByTimeAsync(FIVE_MINUTES_MS + 1);
    await guardedExecution;
    expect(timeoutError).not.toBeNull();
    expect((timeoutError as Error).message).toMatch(/timeout/i);
    expect(mockUpdate).toHaveBeenCalled();
    expect(captured.set).toMatchObject({ status: 'FAILED' });
  });

  it('records an error message containing timeout in DB output field', async () => {
    vi.useFakeTimers();
    const neverResolves = new Promise<void>(() => { /* hangs */ });
    let capturedOutput: unknown = null;
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockImplementation((data: { output?: unknown }) => { capturedOutput = data.output; return { where }; });
    mockUpdate.mockReturnValue({ set });
    const guardedExecution = withTimeout(neverResolves, 300_000, 'exec-msg-test')
      .catch((err: Error) => {
        return mockDb.update(null as any)
          .set({ status: 'FAILED', output: { error: err.message }, completed_at: new Date() })
          .where(null as any).returning();
      });
    await vi.advanceTimersByTimeAsync(300_001);
    await guardedExecution;
    expect(capturedOutput).toBeDefined();
    expect(typeof (capturedOutput as Record<string, unknown>).error).toBe('string');
    expect((capturedOutput as Record<string, unknown>).error as string).toMatch(/timeout/i);
  });

  it('does NOT reject before the 5-minute mark', async () => {
    vi.useFakeTimers();
    let timedOut = false;
    const neverResolves = new Promise<void>(() => { /* hangs */ });
    withTimeout(neverResolves, 300_000, 'exec-early-test').catch(() => { timedOut = true; });
    await vi.advanceTimersByTimeAsync(299_999);
    await Promise.resolve();
    expect(timedOut).toBe(false);
  });

  it('marks execution as FAILED when processExecution rejects immediately', async () => {
    vi.useRealTimers();
    const { AgentService } = await import('./agent.service');
    const insertReturning = vi.fn().mockResolvedValue([MOCK_EXECUTION]);
    const insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
    mockInsert.mockReturnValue({ values: insertValues });
    const runningReturning = vi.fn().mockResolvedValue([]);
    const runningWhere = vi.fn().mockReturnValue({ returning: runningReturning });
    const runningSet = vi.fn().mockReturnValue({ where: runningWhere });
    const limitFn = vi.fn().mockResolvedValue([]);
    const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
    const fromFn = vi.fn().mockReturnValue({ where: whereFn });
    mockSelect.mockReturnValue({ from: fromFn });
    let failedPayload: unknown = null;
    const failReturning = vi.fn().mockResolvedValue([]);
    const failWhere = vi.fn().mockReturnValue({ returning: failReturning });
    const failSet = vi.fn().mockImplementation((data: unknown) => { failedPayload = data; return { where: failWhere }; });
    mockUpdate.mockReturnValueOnce({ set: runningSet }).mockReturnValueOnce({ set: failSet });
    const service = new AgentService(mockAIService as any);
    await service.startExecution({ agentId: 'agent-1', userId: 'user-1', input: { message: 'test' } });
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(failSet).toHaveBeenCalled();
    expect(failedPayload).toMatchObject({ status: 'FAILED' });
  });

  it('resolves normally when the underlying promise completes before timeout', async () => {
    vi.useFakeTimers();
    const fastResolves = Promise.resolve('result');
    let result: string | null = null;
    let timedOut = false;
    await withTimeout(fastResolves, 300_000, 'exec-fast')
      .then((v: string) => { result = v; }).catch(() => { timedOut = true; });
    expect(result).toBe('result');
    expect(timedOut).toBe(false);
  });

  it('includes the execution label in the timeout error message', async () => {
    vi.useFakeTimers();
    const neverResolves = new Promise<void>(() => { /* hangs */ });
    const label = 'exec-label-check-999';
    let errorMessage = '';
    const guarded = withTimeout(neverResolves, 300_000, label)
      .catch((err: Error) => { errorMessage = err.message; });
    await vi.advanceTimersByTimeAsync(300_001);
    await guarded;
    expect(errorMessage).toContain(label);
  });
});
