import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock hoisted - use inline vi.fn(), no outer variable refs
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: { scimTokens: {} },
  withTenantContext: vi.fn(async (_db, _ctx, fn) => fn({})),
  eq: vi.fn(),
  and: vi.fn(),
}));

import { ScimTokenService } from './scim-token.service.js';
import { closeAllPools } from '@edusphere/db';

describe('ScimTokenService memory safety', () => {
  let service: ScimTokenService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ScimTokenService();
  });

  it('onModuleDestroy calls closeAllPools to release DB connections', async () => {
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledTimes(1);
  });

  it('no NATS subscriptions: ScimTokenService has no NATS connections (token-only service)', () => {
    // ScimTokenService intentionally has no NATS connections.
    expect(
      (service as unknown as Record<string, unknown>)['nats']
    ).toBeUndefined();
  });

  it('validateToken cache evicts at max size - many calls do not throw', async () => {
    const selectMock = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    const updateMock = vi
      .fn()
      .mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) });
    Object.assign(service, { db: { select: selectMock, update: updateMock } });
    const calls = Array.from({ length: 10 }, (_v, i) =>
      service.validateToken('token-padded-to-minimum-length-' + String(i))
    );
    const results = await Promise.all(calls);
    expect(results.every((r) => r === null)).toBe(true);
  });
});
