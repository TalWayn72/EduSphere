import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { parsePreferences, UserPreferencesService } from './user-preferences.service';
import type { AuthContext } from '@edusphere/auth';

const mockLimit     = vi.fn();
const mockWhere     = vi.fn();
const mockFrom      = vi.fn();
const mockReturning = vi.fn();
const mockSet       = vi.fn();
const mockUpdate    = vi.fn();
const mockTx  = { select: () => ({ from: mockFrom }), update: mockUpdate };
const mockDb  = { select: () => ({ from: mockFrom }), update: mockUpdate };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: { users: { id: 'id', preferences: 'preferences' } },
  eq: vi.fn((col, val) => ({ col, val })),
  withTenantContext: vi.fn(async (_db, _ctx, cb) => cb(mockTx)),
}));

import { withTenantContext } from '@edusphere/db';

const MOCK_AUTH: AuthContext = {
  userId: 'user-1', email: 'student@example.com', username: 'student',
  tenantId: 'tenant-1', roles: ['STUDENT'], scopes: ['read'], isSuperAdmin: false,
};
const STORED_PREFS = { locale: 'fr', theme: 'dark', emailNotifications: false, pushNotifications: true, isPublicProfile: false };
const MOCK_USER = { id: 'user-1', tenant_id: 'tenant-1', email: 'test@example.com', preferences: STORED_PREFS };

// ─── parsePreferences ────────────────────────────────────────────────────────

describe('parsePreferences()', () => {
  const DEFAULTS = { locale: 'en', theme: 'system', emailNotifications: true, pushNotifications: true, isPublicProfile: false };

  it('returns defaults for null', () => expect(parsePreferences(null)).toEqual(DEFAULTS));
  it('returns defaults for undefined', () => expect(parsePreferences(undefined)).toEqual(DEFAULTS));
  it('returns defaults for a non-object scalar', () => expect(parsePreferences('bad')).toEqual(DEFAULTS));

  it('parses a fully specified valid JSONB object', () => {
    expect(parsePreferences(STORED_PREFS)).toEqual(STORED_PREFS);
  });

  it('returns defaults for empty object', () => {
    expect(parsePreferences({})).toEqual(DEFAULTS);
  });

  it('falls back to defaults for missing fields (partial input)', () => {
    const result = parsePreferences({ locale: 'hi' });
    expect(result).toEqual({ locale: 'hi', theme: 'system', emailNotifications: true, pushNotifications: true, isPublicProfile: false });
  });

  it('correctly parses explicit emailNotifications and pushNotifications false', () => {
    const result = parsePreferences({ emailNotifications: false, pushNotifications: false });
    expect(result).toEqual({
      locale: 'en',
      theme: 'system',
      emailNotifications: false,
      pushNotifications: false,
      isPublicProfile: false,
    });
  });

  it('correctly parses locale and theme fields', () => {
    const result = parsePreferences({ locale: 'fr', theme: 'dark' });
    expect(result).toEqual({
      locale: 'fr',
      theme: 'dark',
      emailNotifications: true,
      pushNotifications: true,
      isPublicProfile: false,
    });
  });

  it('handles a number scalar (malformed JSONB) by returning defaults', () => {
    expect(parsePreferences(42)).toEqual(DEFAULTS);
  });

  it('handles a boolean scalar (malformed JSONB) by returning defaults', () => {
    expect(parsePreferences(true)).toEqual(DEFAULTS);
  });

  it('handles an array (malformed JSONB) by returning locale default', () => {
    // Arrays are objects in JS; fields like locale will be undefined → fallback to 'en'
    const result = parsePreferences([]);
    expect(result.locale).toBe('en');
    expect(result.theme).toBe('system');
  });
});

// ─── UserPreferencesService ──────────────────────────────────────────────────

describe('UserPreferencesService', () => {
  let service: UserPreferencesService;

  beforeEach(() => {
    vi.clearAllMocks();
    // select chain: tx.select().from().where().limit()
    mockLimit.mockResolvedValue([{ preferences: STORED_PREFS }]);
    mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
    mockFrom.mockReturnValue({ where: mockWhere });
    // update chain: tx.update().set().where().returning()
    mockReturning.mockResolvedValue([MOCK_USER]);
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });
    service = new UserPreferencesService();
  });

  describe('updatePreferences()', () => {
    it('calls withTenantContext with correct tenantId and userId', async () => {
      await service.updatePreferences('user-1', { locale: 'fr' }, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
        expect.any(Function),
      );
    });

    it('extracts first role as userRole', async () => {
      await service.updatePreferences('user-1', {}, { ...MOCK_AUTH, roles: ['ORG_ADMIN'] });
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb, expect.objectContaining({ userRole: 'ORG_ADMIN' }), expect.any(Function),
      );
    });

    it('defaults userRole to STUDENT when roles array is empty', async () => {
      await service.updatePreferences('user-1', {}, { ...MOCK_AUTH, roles: [] });
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb, expect.objectContaining({ userRole: 'STUDENT' }), expect.any(Function),
      );
    });

    it('merges only the provided fields (PATCH semantics)', async () => {
      let capturedSet: Record<string, unknown> | undefined;
      mockSet.mockImplementation((v: Record<string, unknown>) => { capturedSet = v; return { where: mockWhere }; });

      await service.updatePreferences('user-1', { locale: 'es' }, MOCK_AUTH);

      expect(capturedSet).toEqual({
        preferences: { locale: 'es', theme: 'dark', emailNotifications: false, pushNotifications: true, isPublicProfile: false },
      });
    });

    it('returns the updated user row from DB', async () => {
      const result = await service.updatePreferences('user-1', { theme: 'light' }, MOCK_AUTH);
      expect(result).toEqual(MOCK_USER);
    });

    it('throws NotFoundException when select returns no user', async () => {
      mockLimit.mockResolvedValue([]);
      await expect(service.updatePreferences('ghost', {}, MOCK_AUTH)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when update returning is empty', async () => {
      mockReturning.mockResolvedValue([]);
      await expect(service.updatePreferences('user-1', {}, MOCK_AUTH)).rejects.toThrow(NotFoundException);
    });

    it('passes empty string as tenantId when authContext.tenantId is undefined-like', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: '' };
      await service.updatePreferences('user-1', {}, noTenantAuth);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ tenantId: '' }),
        expect.any(Function),
      );
    });

    it('performs a full PATCH merge — all fields supplied', async () => {
      let capturedSet: Record<string, unknown> | undefined;
      mockSet.mockImplementation((v: Record<string, unknown>) => { capturedSet = v; return { where: mockWhere }; });

      await service.updatePreferences('user-1', {
        locale: 'zh-CN',
        theme: 'light',
        emailNotifications: true,
        pushNotifications: false,
      }, MOCK_AUTH);

      // STORED_PREFS = { locale: 'fr', theme: 'dark', emailNotifications: false, pushNotifications: true }
      // All fields overridden by input
      expect(capturedSet).toEqual({
        preferences: { locale: 'zh-CN', theme: 'light', emailNotifications: true, pushNotifications: false, isPublicProfile: false },
      });
    });

    it('calls withTenantContext exactly once per invocation', async () => {
      await service.updatePreferences('user-1', { locale: 'pt' }, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledOnce();
    });

    it('accepts Hebrew locale (he) without throwing', async () => {
      await expect(
        service.updatePreferences('user-1', { locale: 'he' }, MOCK_AUTH),
      ).resolves.toBeDefined();
    });
  });
});
