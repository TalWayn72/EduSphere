import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
}));

vi.mock('./cat-math.js', () => ({
  fisherInformation3PL: vi.fn(() => 1),
  passingProbability: vi.fn(() => 0.5),
}));

vi.mock('./cat-eap-estimator.js', () => ({
  estimateAbilityEAP: vi.fn(() => ({ theta: 0, se: 1 })),
}));

vi.mock('../psychometrics/irt-math.js', () => ({
  estimateAbilityMLE: vi.fn(() => ({ theta: 0, se: 1 })),
}));

import { closeAllPools } from '@edusphere/db';
import { CatEngineService } from './cat-engine.service';

describe('CatEngineService — memory safety', () => {
  let service: CatEngineService;

  beforeEach(() => {
    vi.mocked(closeAllPools).mockReset();
    service = new CatEngineService();
  });

  it('onModuleDestroy calls closeAllPools', async () => {
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy is idempotent', async () => {
    await service.onModuleDestroy();
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledTimes(2);
  });
});
