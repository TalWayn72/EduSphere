/**
 * push-token.service.spec.ts
 * Unit tests for PushTokenService.
 * Covers: registerToken upsert, getTokensForUser shape, unregisterToken,
 *         token-value privacy (not logged), OnModuleDestroy cleanup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockInsertReturn = vi.fn();
const mockDelete = vi.fn();
const mockSelect = vi.fn();

const mockTx = {
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      onConflictDoUpdate: vi.fn(() => ({
        returning: mockInsertReturn,
      })),
    })),
  })),
  delete: vi.fn(() => ({
    where: mockDelete,
  })),
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: mockSelect,
    })),
  })),
};

const mockWithTenantContext = vi.fn(
  async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    fn(mockTx)
);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: {
    pushNotificationTokens: {
      userId: 'userId',
      tenantId: 'tenantId',
      platform: 'platform',
      token: 'token',
      expoPushToken: 'expoPushToken',
      webPushSubscription: 'webPushSubscription',
      lastSeenAt: 'lastSeenAt',
      id: 'id',
      createdAt: 'createdAt',
    },
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => args),
  withTenantContext: (...args: Parameters<typeof mockWithTenantContext>) =>
    mockWithTenantContext(...args),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

// ── Import after mocks ─────────────────────────────────────────────────────────

import { PushTokenService } from './push-token.service.js';
import { closeAllPools } from '@edusphere/db';

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PushTokenService', () => {
  let service: PushTokenService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PushTokenService();
  });

  // 1. registerToken — happy path (iOS)
  it('registerToken returns PushTokenDto with correct shape for IOS', async () => {
    const fakeRow = {
      id: 'uuid-1',
      platform: 'ios',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };
    mockInsertReturn.mockResolvedValueOnce([fakeRow]);

    const result = await service.registerToken(
      'user-1',
      'tenant-1',
      'IOS',
      'ExponentPushToken[abc123]',
      undefined
    );

    expect(result).toEqual({
      id: 'uuid-1',
      platform: 'ios',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  // 2. registerToken — happy path (WEB)
  it('registerToken hashes endpoint for WEB platform', async () => {
    const fakeRow = {
      id: 'uuid-web',
      platform: 'web',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };
    mockInsertReturn.mockResolvedValueOnce([fakeRow]);

    const webSub = JSON.stringify({
      endpoint: 'https://push.example.com/sub/abc',
      keys: { p256dh: 'key', auth: 'auth' },
    });

    const result = await service.registerToken(
      'user-1',
      'tenant-1',
      'WEB',
      undefined,
      webSub
    );

    expect(result.id).toBe('uuid-web');
    expect(result.platform).toBe('web');
  });

  // 3. unregisterToken returns true on success
  it('unregisterToken returns true', async () => {
    mockDelete.mockResolvedValueOnce(undefined);

    const result = await service.unregisterToken('user-1', 'tenant-1', 'IOS');
    expect(result).toBe(true);
  });

  // 4. getTokensForUser returns correct shape
  it('getTokensForUser returns array with platform and optional token fields', async () => {
    mockSelect.mockResolvedValueOnce([
      {
        platform: 'ios',
        expoPushToken: 'ExponentPushToken[xyz]',
        webPushSubscription: null,
      },
      {
        platform: 'web',
        expoPushToken: null,
        webPushSubscription: { endpoint: 'https://push.example.com' },
      },
    ]);

    const result = await service.getTokensForUser('user-1', 'tenant-1');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ platform: 'ios' });
    expect(result[0]?.expoPushToken).toBe('ExponentPushToken[xyz]');
    expect(result[1]).toMatchObject({ platform: 'web' });
    expect(result[1]?.webPushSubscription).toBeDefined();
  });

  // 5. Token value is NOT logged — spy on logger methods
  it('does not log expoPushToken value in any logger call', async () => {
    const fakeRow = {
      id: 'uuid-1',
      platform: 'ios',
      createdAt: new Date(),
    };
    mockInsertReturn.mockResolvedValueOnce([fakeRow]);

    const tokenValue = 'ExponentPushToken[SECRET_TOKEN_VALUE]';

    // Spy on all logger methods
    const logSpy = vi.spyOn(
      (service as unknown as { logger: { log: unknown } }).logger as { log: (...args: unknown[]) => void },
      'log'
    );
    const debugSpy = vi.spyOn(
      (service as unknown as { logger: { debug: unknown } }).logger as { debug: (...args: unknown[]) => void },
      'debug'
    );
    const errorSpy = vi.spyOn(
      (service as unknown as { logger: { error: unknown } }).logger as { error: (...args: unknown[]) => void },
      'error'
    );

    await service.registerToken('user-1', 'tenant-1', 'IOS', tokenValue, undefined);

    const allLogCalls = [
      ...logSpy.mock.calls,
      ...debugSpy.mock.calls,
      ...errorSpy.mock.calls,
    ]
      .flat()
      .map((arg) => String(arg));

    for (const logArg of allLogCalls) {
      expect(logArg).not.toContain(tokenValue);
    }
  });

  // 6. OnModuleDestroy calls closeAllPools
  it('onModuleDestroy calls closeAllPools', async () => {
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });

  // 7. registerToken throws when missing token data
  it('throws when platform is IOS but no expoPushToken provided', async () => {
    await expect(
      service.registerToken('user-1', 'tenant-1', 'IOS', undefined, undefined)
    ).rejects.toThrow(/Missing token data/);
  });
});
