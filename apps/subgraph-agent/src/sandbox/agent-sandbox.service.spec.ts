import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentSandboxService } from './agent-sandbox.service';
import {
  mockFork,
  createMockChild,
  resetLastChild,
  lastChild as state,
  BASE_CONFIG,
  emitSuccess,
} from './sandbox-test.helpers';

vi.mock('child_process', () => ({
  fork: (...args: unknown[]) => mockFork(...args),
}));

describe('AgentSandboxService — execution', () => {
  let service: AgentSandboxService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    resetLastChild();
    mockFork.mockImplementation(() => createMockChild());
    service = new AgentSandboxService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    vi.useRealTimers();
  });

  describe('successful execution', () => {
    it('resolves with result when child sends success', async () => {
      const promise = service.execute('exec-1', BASE_CONFIG);
      const data = { text: 'Summary result', usage: {} };
      state.lastChild!.emit('message', {
        type: 'result',
        response: { success: true, data },
      });
      const result = await promise;
      expect(result).toEqual({ success: true, data });
    });

    it('sends start message to child with config', async () => {
      const promise = service.execute('exec-2', {
        ...BASE_CONFIG,
        maxMemoryMb: 512,
        timeoutMs: 60_000,
      });
      expect(state.lastChild!.send).toHaveBeenCalledWith({
        type: 'start',
        config: expect.objectContaining({
          agent: { template: 'SUMMARIZE' },
          maxMemoryMb: 512,
          timeoutMs: 60_000,
          tenantId: 'tenant-1',
        }),
      });
      emitSuccess(state.lastChild!);
      await promise;
    });

    it('applies default memory and timeout when not specified', async () => {
      const promise = service.execute('exec-3', BASE_CONFIG);
      expect(state.lastChild!.send).toHaveBeenCalledWith({
        type: 'start',
        config: expect.objectContaining({
          maxMemoryMb: 256,
          timeoutMs: 900_000,
        }),
      });
      emitSuccess(state.lastChild!);
      await promise;
    });
  });

  describe('timeout enforcement', () => {
    it('returns TIMEOUT error when execution exceeds timeoutMs', async () => {
      const promise = service.execute('exec-timeout', {
        ...BASE_CONFIG,
        timeoutMs: 5_000,
      });
      vi.advanceTimersByTime(6_000);
      const result = await promise;
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('timed out'),
        code: 'TIMEOUT',
      });
    });

    it('kills the child process on timeout', async () => {
      const promise = service.execute('exec-kill', {
        ...BASE_CONFIG,
        timeoutMs: 1_000,
      });
      const child = state.lastChild!;
      vi.advanceTimersByTime(2_000);
      await promise;
      expect(child.kill).toHaveBeenCalledWith('SIGKILL');
    });
  });

  describe('memory limit (OOM)', () => {
    it('returns OOM error when child exits with SIGKILL', async () => {
      const promise = service.execute('exec-oom', BASE_CONFIG);
      state.lastChild!.emit('exit', null, 'SIGKILL');
      const result = await promise;
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('memory limit'),
        code: 'OOM',
      });
    });

    it('returns OOM error when child exits with code 134', async () => {
      const promise = service.execute('exec-oom2', BASE_CONFIG);
      state.lastChild!.emit('exit', 134, null);
      const result = await promise;
      expect(result.success).toBe(false);
      if (!result.success) expect(result.code).toBe('OOM');
    });

    it('forks with --max-old-space-size in NODE_OPTIONS', async () => {
      const promise = service.execute('exec-mem', {
        ...BASE_CONFIG,
        maxMemoryMb: 128,
      });
      expect(mockFork).toHaveBeenCalledWith(
        expect.any(String),
        [],
        expect.objectContaining({
          env: expect.objectContaining({
            NODE_OPTIONS: '--max-old-space-size=128',
          }),
        })
      );
      emitSuccess(state.lastChild!);
      await promise;
    });
  });

  describe('error handling', () => {
    it('returns CRASH on unexpected child exit', async () => {
      const promise = service.execute('exec-crash', BASE_CONFIG);
      state.lastChild!.emit('exit', 1, null);
      const result = await promise;
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('exited unexpectedly'),
        code: 'CRASH',
      });
    });

    it('returns UNKNOWN on spawn error', async () => {
      const promise = service.execute('exec-err', BASE_CONFIG);
      state.lastChild!.emit('error', new Error('spawn ENOENT'));
      const result = await promise;
      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('spawn ENOENT'),
        code: 'UNKNOWN',
      });
    });

    it('handles cpu messages without resolving prematurely', async () => {
      const promise = service.execute('exec-cpu', BASE_CONFIG);
      state.lastChild!.emit('message', {
        type: 'cpu',
        userMs: 100,
        systemMs: 50,
      });
      emitSuccess(state.lastChild!, { text: 'done' });
      const result = await promise;
      expect(result).toEqual({ success: true, data: { text: 'done' } });
    });
  });
});
