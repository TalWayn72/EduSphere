/**
 * Gap 1: UserPreferencesService — integration tests with realistic DB mock
 *
 * Tests infrastructure-level failure scenarios that unit tests miss:
 * - DB connection failure (ECONNREFUSED)
 * - Query timeout
 * - Constraint violation
 * - RLS policy rejection (wrong tenant)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UserPreferencesService } from './user-preferences.service';
import type { AuthContext } from '@edusphere/auth';

// ─── Realistic DB error factories ────────────────────────────────────────────

function makeConnectionError(): Error {
  const err = new Error('connect ECONNREFUSED 127.0.0.1:5432');
  (err as NodeJS.ErrnoException).code = 'ECONNREFUSED';
  return err;
}

function makeTimeoutError(): Error {
  const err = new Error('Query read timeout');
  (err as NodeJS.ErrnoException).code = 'ETIMEDOUT';
  return err;
}

function makeConstraintError(): Error {
  const err = new Error(
    'duplicate key value violates unique constraint "users_pkey"'
  ) as Error & { code: string; constraint: string };
  (err as Error & { code: string }).code = '23505';
  (err as Error & { constraint: string }).constraint = 'users_pkey';
  return err;
}

function makeRlsError(): Error {
  const err = new Error(
    'new row violates row-level security policy for table "users"'
  ) as Error & { code: string };
  (err as Error & { code: string }).code = '42501';
  return err;
}

// ─── Mock state ──────────────────────────────────────────────────────────────

const mockLimit = vi.fn();
const mockWhere = vi.fn();
const mockFrom = vi.fn();
const mockReturning = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();

const mockTx = {
  select: () => ({ from: mockFrom }),
  update: mockUpdate,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: { users: { id: 'id', preferences: 'preferences' } },
  eq: vi.fn((col, val) => ({ col, val })),
  withTenantContext: vi.fn(async (_db, _ctx, cb) => cb(mockTx)),
  closeAllPools: vi.fn(),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_AUTH: AuthContext = {
  userId: 'user-abc',
  email: 'user@tenant-a.com',
  username: 'user',
  tenantId: 'tenant-a',
  roles: ['STUDENT'],
  scopes: ['read'],
  isSuperAdmin: false,
};

const WRONG_TENANT_AUTH: AuthContext = {
  ...VALID_AUTH,
  userId: 'user-xyz',
  tenantId: 'tenant-b',
};

const STORED_PREFS = {
  locale: 'en',
  theme: 'system',
  emailNotifications: true,
  pushNotifications: true,
  isPublicProfile: false,
};

const MOCK_USER = {
  id: 'user-abc',
  tenant_id: 'tenant-a',
  email: 'user@tenant-a.com',
  preferences: STORED_PREFS,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UserPreferencesService — infrastructure failure integration', () => {
  let service: UserPreferencesService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLimit.mockResolvedValue([{ preferences: STORED_PREFS }]);
    mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockReturning.mockResolvedValue([MOCK_USER]);
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });

    service = new UserPreferencesService();
  });

  // ── DB connection failure ─────────────────────────────────────────────────

  it('propagates ECONNREFUSED when select fails on DB outage', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    vi.mocked(withTenantContext).mockRejectedValueOnce(makeConnectionError());

    await expect(
      service.updatePreferences('user-abc', { locale: 'he' }, VALID_AUTH)
    ).rejects.toThrow('ECONNREFUSED');
  });

  it('propagates ECONNREFUSED on update step (select succeeds, update fails)', async () => {
    mockReturning.mockRejectedValueOnce(makeConnectionError());

    await expect(
      service.updatePreferences('user-abc', { locale: 'he' }, VALID_AUTH)
    ).rejects.toThrow(/ECONNREFUSED/);
  });

  // ── Query timeout ─────────────────────────────────────────────────────────

  it('propagates timeout error from select step', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    vi.mocked(withTenantContext).mockRejectedValueOnce(makeTimeoutError());

    await expect(
      service.updatePreferences('user-abc', { locale: 'fr' }, VALID_AUTH)
    ).rejects.toThrow(/timeout/i);
  });

  it('propagates timeout error from update step', async () => {
    mockReturning.mockRejectedValueOnce(makeTimeoutError());

    await expect(
      service.updatePreferences('user-abc', { locale: 'fr' }, VALID_AUTH)
    ).rejects.toThrow(/timeout/i);
  });

  // ── Constraint violation ──────────────────────────────────────────────────

  it('propagates constraint violation error (23505)', async () => {
    mockReturning.mockRejectedValueOnce(makeConstraintError());

    const err = await service
      .updatePreferences('user-abc', { locale: 'de' }, VALID_AUTH)
      .catch((e: unknown) => e as Error & { code?: string });

    expect(err).toBeInstanceOf(Error);
    expect((err as Error & { code?: string }).code ?? err.message).toMatch(
      /23505|duplicate key/
    );
  });

  // ── RLS policy rejection ──────────────────────────────────────────────────

  it('propagates RLS rejection (42501) for wrong-tenant context', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    vi.mocked(withTenantContext).mockRejectedValueOnce(makeRlsError());

    await expect(
      service.updatePreferences('user-abc', { locale: 'he' }, WRONG_TENANT_AUTH)
    ).rejects.toThrow(/row-level security|42501/i);
  });

  it('RLS rejection does NOT return a partial update', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    vi.mocked(withTenantContext).mockRejectedValueOnce(makeRlsError());

    let result: unknown;
    try {
      result = await service.updatePreferences(
        'user-abc',
        { locale: 'he' },
        WRONG_TENANT_AUTH
      );
    } catch {
      result = undefined;
    }
    expect(result).toBeUndefined();
  });

  // ── NotFoundException paths ───────────────────────────────────────────────

  it('throws NotFoundException when user not found (select returns empty)', async () => {
    mockLimit.mockResolvedValueOnce([]);

    await expect(
      service.updatePreferences('ghost-id', { locale: 'he' }, VALID_AUTH)
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when update returns empty (race condition)', async () => {
    mockReturning.mockResolvedValueOnce([]);

    await expect(
      service.updatePreferences('user-abc', { locale: 'he' }, VALID_AUTH)
    ).rejects.toThrow(NotFoundException);
  });
});
