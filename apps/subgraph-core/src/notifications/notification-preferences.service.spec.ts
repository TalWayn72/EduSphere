/**
 * notification-preferences.service.spec.ts — Unit tests for NotificationPreferencesService.
 * Covers: getPreferences, updatePreference, isChannelEnabled, onModuleDestroy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);

function makeChain(rows: unknown[] = []) {
  const p = Promise.resolve(rows) as Promise<unknown[]> &
    Record<string, unknown>;
  const self = () => p;
  p.from = self;
  p.where = self;
  p.values = self;
  p.onConflictDoUpdate = self;
  p.returning = self;
  return p;
}

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: (...args: unknown[]) => mockCloseAllPools(...args),
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
      fn({ select: mockSelect, insert: mockInsert })
  ),
  schema: {
    notificationPreferences: {
      userId: 'userId',
      notificationType: 'notificationType',
      channel: 'channel',
      enabled: 'enabled',
    },
    tenantNotificationDefaults: {
      tenantId: 'tenantId',
      notificationType: 'notificationType',
      channel: 'channel',
      enabled: 'enabled',
    },
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
}));

import { NotificationPreferencesService } from './notification-preferences.service';

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationPreferencesService();
  });

  describe('getPreferences', () => {
    it('should return mapped user preferences', async () => {
      mockSelect.mockReturnValue(
        makeChain([
          {
            id: 'p1',
            notificationType: 'badge',
            channel: 'email',
            enabled: true,
          },
          {
            id: 'p2',
            notificationType: 'course',
            channel: 'push',
            enabled: false,
          },
        ])
      );

      const result = await service.getPreferences('u1', 't1');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'p1',
        notificationType: 'badge',
        channel: 'email',
        enabled: true,
      });
    });

    it('should return empty array when no preferences', async () => {
      mockSelect.mockReturnValue(makeChain([]));
      const result = await service.getPreferences('u1', 't1');
      expect(result).toEqual([]);
    });
  });

  describe('updatePreference', () => {
    it('should upsert and return preference', async () => {
      mockInsert.mockReturnValue(
        makeChain([
          {
            id: 'p1',
            notificationType: 'badge',
            channel: 'email',
            enabled: false,
          },
        ])
      );

      const result = await service.updatePreference(
        'u1',
        't1',
        'badge',
        'email',
        false
      );
      expect(result.enabled).toBe(false);
      expect(result.notificationType).toBe('badge');
    });
  });

  describe('isChannelEnabled', () => {
    it('should return true when user preference says enabled', async () => {
      mockSelect.mockReturnValue(makeChain([{ enabled: true }]));
      const result = await service.isChannelEnabled(
        'u1',
        't1',
        'badge',
        'email'
      );
      expect(result).toBe(true);
    });

    it('should return false when user preference says disabled', async () => {
      mockSelect.mockReturnValue(makeChain([{ enabled: false }]));
      const result = await service.isChannelEnabled(
        'u1',
        't1',
        'badge',
        'email'
      );
      expect(result).toBe(false);
    });

    it('should fall back to tenant default when no user preference', async () => {
      // First call (user prefs) returns empty, second call (tenant defaults) returns enabled
      mockSelect
        .mockReturnValueOnce(makeChain([]))
        .mockReturnValueOnce(makeChain([{ enabled: true }]));

      const result = await service.isChannelEnabled(
        'u1',
        't1',
        'badge',
        'push'
      );
      expect(result).toBe(true);
    });

    it('should default to true when no user or tenant preference', async () => {
      mockSelect
        .mockReturnValueOnce(makeChain([]))
        .mockReturnValueOnce(makeChain([]));

      const result = await service.isChannelEnabled('u1', 't1', 'badge', 'sms');
      expect(result).toBe(true);
    });
  });

  describe('onModuleDestroy', () => {
    it('should close all DB pools', async () => {
      await service.onModuleDestroy();
      expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
    });
  });
});
