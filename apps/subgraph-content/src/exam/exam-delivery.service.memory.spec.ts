import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: { examSessions: {} },
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
  withTenantContext: vi.fn(),
}));

import { closeAllPools } from '@edusphere/db';
import { ExamDeliveryService } from './exam-delivery.service';

describe('ExamDeliveryService — memory safety', () => {
  let service: ExamDeliveryService;

  beforeEach(() => {
    vi.mocked(closeAllPools).mockReset();
    const mockGrading = {} as never;
    const mockAssembly = {} as never;
    service = new ExamDeliveryService(mockGrading, mockAssembly);
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
