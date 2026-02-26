import { describe, it, expect, vi } from 'vitest';
import { ScenarioService } from './scenario.service';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {
    contentItems: {} as Record<string, unknown>,
    scenario_choices: {} as Record<string, unknown>,
  },
  eq: vi.fn(),
  and: vi.fn(),
  asc: vi.fn(),
  withTenantContext: vi.fn(),
}));

describe('ScenarioService -- memory safety', () => {
  it('onModuleDestroy calls closeAllPools to release DB connections', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    const service = new ScenarioService();
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });

  it('onModuleDestroy resolves without throwing when called multiple times', async () => {
    const service = new ScenarioService();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });

  it('does not hold open intervals or timers', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    new ScenarioService();
    expect(setIntervalSpy).not.toHaveBeenCalled();
    setIntervalSpy.mockRestore();
  });
});
