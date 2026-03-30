import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentSandboxService } from './agent-sandbox.service';
import {
  mockFork,
  createMockChild,
  resetLastChild,
  lastChild as state,
  BASE_CONFIG,
  emitSuccess,
  type MockChild,
} from './sandbox-test.helpers';

vi.mock('child_process', () => ({
  fork: (...args: unknown[]) => mockFork(...args),
}));

describe('AgentSandboxService — tenant limits & lifecycle', () => {
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

  describe('tenant concurrency limit', () => {
    it('allows up to 3 concurrent executions per tenant', async () => {
      const p1 = service.execute('e1', BASE_CONFIG);
      const p2 = service.execute('e2', BASE_CONFIG);
      const p3 = service.execute('e3', BASE_CONFIG);

      expect(service.getTenantCount('tenant-1')).toBe(3);

      const p4 = service.execute('e4', BASE_CONFIG);
      const result4 = await p4;
      expect(result4).toEqual({
        success: false,
        error: expect.stringContaining('concurrency limit'),
        code: 'TENANT_LIMIT',
      });

      const calls = mockFork.mock.results;
      for (const call of calls) {
        emitSuccess(call.value as MockChild);
      }
      await Promise.all([p1, p2, p3]);
    });

    it('allows different tenants to run independently', async () => {
      const p1 = service.execute('e1', {
        ...BASE_CONFIG,
        tenantId: 'tenant-a',
      });
      const p2 = service.execute('e2', {
        ...BASE_CONFIG,
        tenantId: 'tenant-b',
      });

      expect(service.getTenantCount('tenant-a')).toBe(1);
      expect(service.getTenantCount('tenant-b')).toBe(1);

      const calls = mockFork.mock.results;
      for (const call of calls) {
        emitSuccess(call.value as MockChild);
      }
      await Promise.all([p1, p2]);
    });

    it('decrements tenant count after execution completes', async () => {
      const promise = service.execute('e1', BASE_CONFIG);
      expect(service.getTenantCount('tenant-1')).toBe(1);

      emitSuccess(state.lastChild!);
      await promise;

      expect(service.getTenantCount('tenant-1')).toBe(0);
    });
  });

  describe('onModuleDestroy', () => {
    it('kills all active child processes', async () => {
      service.execute('d1', BASE_CONFIG);
      service.execute('d2', { ...BASE_CONFIG, tenantId: 'tenant-2' });

      const children = mockFork.mock.results.map(
        (r: { value: MockChild }) => r.value
      );
      expect(children).toHaveLength(2);

      await service.onModuleDestroy();

      for (const child of children) {
        expect(child.killed).toBe(true);
      }
    });

    it('clears active execution tracking', async () => {
      service.execute('d3', BASE_CONFIG);
      expect(service.activeCount).toBe(1);

      await service.onModuleDestroy();
      expect(service.activeCount).toBe(0);
    });

    it('resets tenant counts', async () => {
      service.execute('d4', BASE_CONFIG);
      expect(service.getTenantCount('tenant-1')).toBe(1);

      await service.onModuleDestroy();
      expect(service.getTenantCount('tenant-1')).toBe(0);
    });
  });
});
