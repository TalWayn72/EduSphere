import { describe, it, expect, vi } from 'vitest';
import { MicrolearningService } from './microlearning.service';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: { microlearningPaths: {} },
  eq: vi.fn(),
  and: vi.fn(),
  withTenantContext: vi.fn(),
}));

describe('MicrolearningService — memory safety', () => {
  it('onModuleDestroy calls closeAllPools to release DB connections', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    const service = new MicrolearningService();
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });

  it('onModuleDestroy resolves without throwing when called multiple times', async () => {
    const service = new MicrolearningService();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });

  it('does not hold open intervals or timers', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    new MicrolearningService();
    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });
});
