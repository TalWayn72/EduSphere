/**
 * security.service.spec.ts — Unit tests for SecurityService.
 * Covers: getSettings (DEFAULTS fallback, mapped row), ipAllowlist array, updateSettings.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@edusphere/db', () => ({
  db: mockDb,
  securitySettings: {
    tenantId: {},
    mfaRequired: {},
    mfaRequiredForAdmins: {},
    sessionTimeoutMinutes: {},
    maxConcurrentSessions: {},
    loginAttemptLockoutThreshold: {},
    passwordMinLength: {},
    passwordRequireSpecialChars: {},
    passwordExpiryDays: {},
    ipAllowlist: {},
    updatedAt: {},
  },
  eq: vi.fn(),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { SecurityService } from './security.service.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const FULL_ROW = {
  tenantId: 'tenant-1',
  mfaRequired: true,
  mfaRequiredForAdmins: true,
  sessionTimeoutMinutes: 60,
  maxConcurrentSessions: 3,
  loginAttemptLockoutThreshold: 10,
  passwordMinLength: 12,
  passwordRequireSpecialChars: true,
  passwordExpiryDays: 90,
  ipAllowlist: ['10.0.0.1', '192.168.1.0/24'],
  updatedAt: new Date(),
};

/**
 * Chain: db.select().from().where().limit() → resolves rows
 * Also: db.insert().values().onConflictDoNothing().returning() → resolves rows
 */
function selectChain(rows: unknown[]) {
  const end = () => Promise.resolve(rows);
  return {
    from: () => ({
      where: () => ({
        limit: end,
      }),
    }),
  };
}

function insertChain(rows: unknown[]) {
  return {
    values: () => ({
      onConflictDoNothing: () => ({
        returning: () => Promise.resolve(rows),
      }),
      onConflictDoUpdate: () => ({
        returning: () => Promise.resolve(rows),
      }),
    }),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SecurityService', () => {
  let service: SecurityService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SecurityService();
  });

  // 1. Service instantiates without error
  it('instantiates without throwing', () => {
    expect(() => new SecurityService()).not.toThrow();
  });

  // 2. onModuleDestroy is a no-op
  it('onModuleDestroy does not throw', () => {
    expect(() => service.onModuleDestroy()).not.toThrow();
  });

  // 3. getSettings returns DEFAULTS when no row and insert returns nothing
  it('getSettings returns DEFAULTS when no DB row exists and insert returns empty', async () => {
    mockDb.select.mockReturnValue(selectChain([]));
    mockDb.insert.mockReturnValue(insertChain([]));
    const result = await service.getSettings('tenant-new');
    expect(result.mfaRequired).toBe(false);
    expect(result.mfaRequiredForAdmins).toBe(true);
    expect(result.sessionTimeoutMinutes).toBe(480);
    expect(result.ipAllowlist).toEqual([]);
  });

  // 4. getSettings returns mapped row when DB row exists
  it('getSettings returns mapped row when a DB row exists', async () => {
    mockDb.select.mockReturnValue(selectChain([FULL_ROW]));
    const result = await service.getSettings('tenant-1');
    expect(result.mfaRequired).toBe(true);
    expect(result.sessionTimeoutMinutes).toBe(60);
    expect(result.passwordMinLength).toBe(12);
    expect(result.passwordExpiryDays).toBe(90);
  });

  // 5. mapRow handles ipAllowlist as an array
  it('getSettings preserves ipAllowlist as an array from DB row', async () => {
    mockDb.select.mockReturnValue(selectChain([FULL_ROW]));
    const result = await service.getSettings('tenant-1');
    expect(result.ipAllowlist).toEqual(['10.0.0.1', '192.168.1.0/24']);
  });

  // 6. mapRow converts non-array ipAllowlist to empty array
  it('getSettings converts non-array ipAllowlist to empty array', async () => {
    mockDb.select.mockReturnValue(
      selectChain([{ ...FULL_ROW, ipAllowlist: null }]),
    );
    const result = await service.getSettings('tenant-1');
    expect(result.ipAllowlist).toEqual([]);
  });

  // 7. updateSettings calls DB insert with onConflictDoUpdate
  it('updateSettings calls DB insert and returns mapped settings', async () => {
    const updatedRow = { ...FULL_ROW, mfaRequired: false };
    mockDb.insert.mockReturnValue({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: () => Promise.resolve([updatedRow]),
        }),
      }),
    });
    const result = await service.updateSettings('tenant-1', { mfaRequired: false });
    expect(result.mfaRequired).toBe(false);
    expect(mockDb.insert).toHaveBeenCalled();
  });
});
