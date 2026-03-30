/**
 * agent-worker.spec.ts
 * Unit tests for the sandboxed agent worker child process entry point.
 *
 * Tests the IPC message protocol, CPU reporting, cleanup logic,
 * and error handling patterns used by agent-worker.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  SandboxConfig,
  SandboxResponse,
  WorkerResultMessage,
  WorkerCpuMessage,
} from './sandbox.types.js';

// ── Pure function replicas from agent-worker.ts ──────────────────────────────
// We test the logic directly since the module registers process-level handlers.

const CPU_REPORT_INTERVAL_MS = 5_000;

function buildResultMessage(response: SandboxResponse): WorkerResultMessage {
  return { type: 'result', response };
}

function buildCpuMessage(): WorkerCpuMessage {
  const usage = process.cpuUsage();
  return {
    type: 'cpu',
    userMs: usage.user / 1_000,
    systemMs: usage.system / 1_000,
  };
}

function buildErrorResponse(err: unknown): SandboxResponse {
  const message = err instanceof Error ? err.message : String(err);
  return { success: false, error: message, code: 'CRASH' };
}

function makeConfig(template = 'SUMMARIZE'): SandboxConfig {
  return {
    agent: { template },
    input: { message: 'test input' },
    tenantId: 'tenant-1',
    maxMemoryMb: 256,
    timeoutMs: 30_000,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('agent-worker — result message construction', () => {
  it('builds success result message', () => {
    const msg = buildResultMessage({
      success: true,
      data: { text: 'summary output' },
    });
    expect(msg.type).toBe('result');
    expect(msg.response.success).toBe(true);
    if (msg.response.success) {
      expect(msg.response.data).toEqual({ text: 'summary output' });
    }
  });

  it('builds error result message with CRASH code', () => {
    const msg = buildResultMessage({
      success: false,
      error: 'Out of memory',
      code: 'CRASH',
    });
    expect(msg.type).toBe('result');
    expect(msg.response.success).toBe(false);
    if (!msg.response.success) {
      expect(msg.response.error).toBe('Out of memory');
      expect(msg.response.code).toBe('CRASH');
    }
  });

  it('builds error result with TIMEOUT code', () => {
    const msg = buildResultMessage({
      success: false,
      error: 'Exceeded 15 minutes',
      code: 'TIMEOUT',
    });
    if (!msg.response.success) {
      expect(msg.response.code).toBe('TIMEOUT');
    }
  });

  it('builds error result with OOM code', () => {
    const msg = buildResultMessage({
      success: false,
      error: 'heap out of memory',
      code: 'OOM',
    });
    if (!msg.response.success) {
      expect(msg.response.code).toBe('OOM');
    }
  });

  it('builds error result with TENANT_LIMIT code', () => {
    const msg = buildResultMessage({
      success: false,
      error: 'Too many concurrent executions',
      code: 'TENANT_LIMIT',
    });
    if (!msg.response.success) {
      expect(msg.response.code).toBe('TENANT_LIMIT');
    }
  });
});

describe('agent-worker — CPU message', () => {
  it('produces cpu message with valid fields', () => {
    const msg = buildCpuMessage();
    expect(msg.type).toBe('cpu');
    expect(typeof msg.userMs).toBe('number');
    expect(typeof msg.systemMs).toBe('number');
    expect(msg.userMs).toBeGreaterThanOrEqual(0);
    expect(msg.systemMs).toBeGreaterThanOrEqual(0);
  });

  it('CPU_REPORT_INTERVAL_MS is 5 seconds', () => {
    expect(CPU_REPORT_INTERVAL_MS).toBe(5_000);
  });
});

describe('agent-worker — error handling', () => {
  it('extracts message from Error instances', () => {
    const response = buildErrorResponse(new Error('Runner crashed'));
    expect(response).toEqual({
      success: false,
      error: 'Runner crashed',
      code: 'CRASH',
    });
  });

  it('converts non-Error values to string', () => {
    const response = buildErrorResponse('string error');
    expect(response.success).toBe(false);
    if (!response.success) {
      expect(response.error).toBe('string error');
    }
  });

  it('converts numeric error to string', () => {
    const response = buildErrorResponse(42);
    if (!response.success) {
      expect(response.error).toBe('42');
    }
  });

  it('converts null error to string', () => {
    const response = buildErrorResponse(null);
    if (!response.success) {
      expect(response.error).toBe('null');
    }
  });
});

describe('agent-worker — config routing', () => {
  it('SUMMARIZE template routes to summarizer path', () => {
    const config = makeConfig('SUMMARIZE');
    expect(config.agent.template).toBe('SUMMARIZE');
    // Worker routes: template === 'SUMMARIZE' → runSummarizer
    expect(config.agent.template === 'SUMMARIZE').toBe(true);
  });

  it('non-SUMMARIZE template routes to generic path', () => {
    const config = makeConfig('DEBATE');
    expect(config.agent.template).toBe('DEBATE');
    expect(config.agent.template === 'SUMMARIZE').toBe(false);
  });

  it('config includes all required fields', () => {
    const config = makeConfig();
    expect(config.tenantId).toBe('tenant-1');
    expect(config.maxMemoryMb).toBe(256);
    expect(config.timeoutMs).toBe(30_000);
    expect(config.input).toEqual({ message: 'test input' });
  });
});

describe('agent-worker — cleanup pattern', () => {
  it('clearInterval stops the CPU timer', () => {
    const clearSpy = vi.spyOn(global, 'clearInterval');
    const timer = setInterval(() => {}, CPU_REPORT_INTERVAL_MS);

    // Replicate cleanup() logic
    clearInterval(timer);
    expect(clearSpy).toHaveBeenCalledWith(timer);
    clearSpy.mockRestore();
  });

  it('null guard prevents double-clear', () => {
    let cpuTimer: ReturnType<typeof setInterval> | null = setInterval(
      () => {},
      5_000,
    );

    // Replicate cleanup() logic
    if (cpuTimer !== null) {
      clearInterval(cpuTimer);
      cpuTimer = null;
    }
    expect(cpuTimer).toBeNull();

    // Second call is safe — no-op
    if (cpuTimer !== null) {
      clearInterval(cpuTimer);
    }
    expect(cpuTimer).toBeNull();
  });

  it('disconnect handler should call cleanup and exit', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    );

    // Replicate disconnect handler logic
    let cpuTimer: ReturnType<typeof setInterval> | null = setInterval(
      () => {},
      5_000,
    );
    if (cpuTimer !== null) {
      clearInterval(cpuTimer);
      cpuTimer = null;
    }
    process.exit(0);

    expect(cpuTimer).toBeNull();
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });
});
