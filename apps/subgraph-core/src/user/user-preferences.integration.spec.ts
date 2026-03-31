/**
 * Gap 2: Resolver-to-Service integration test
 *
 * Tests the full chain: resolver receives GraphQL context → calls service → returns result.
 * The service is NOT mocked — only the DB layer is mocked.
 * Verifies error propagation: DB error → service throws → resolver surfaces GraphQL error.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserResolver } from './user.resolver';
import { UserPreferencesService } from './user-preferences.service';
import { UserService } from './user.service';
import { UserStatsService } from './user-stats.service';
import { PublicProfileService } from './public-profile.service';
import { ActivityFeedService } from './activity-feed.service';
import { InProgressCoursesService } from './in-progress-courses.service';
import { RecommendedCoursesService } from './recommended-courses.service';
import type { AuthContext } from '@edusphere/auth';

// ─── DB-layer mock only ───────────────────────────────────────────────────────

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

// Mock services that are NOT under test (UserService etc.) so resolver can construct
vi.mock('./user.service');
vi.mock('./user-stats.service');
vi.mock('./public-profile.service');
vi.mock('./activity-feed.service');
vi.mock('./in-progress-courses.service');
vi.mock('./recommended-courses.service');

// ─── Fixtures ────────────────────────────────────────────────────────────────

const STORED_PREFS = {
  locale: 'en',
  theme: 'system',
  emailNotifications: true,
  pushNotifications: true,
  isPublicProfile: false,
};

const MOCK_USER_ROW = {
  id: 'user-1',
  tenant_id: 'tenant-1',
  email: 'user@example.com',
  preferences: STORED_PREFS,
};

const AUTH_CTX: AuthContext = {
  userId: 'user-1',
  email: 'user@example.com',
  username: 'user',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: ['read'],
  isSuperAdmin: false,
};

function makeContext(auth?: AuthContext) {
  return { req: {}, authContext: auth };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UserResolver → UserPreferencesService (resolver-to-service chain)', () => {
  let resolver: UserResolver;
  let preferencesService: UserPreferencesService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLimit.mockResolvedValue([{ preferences: STORED_PREFS }]);
    mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockReturning.mockResolvedValue([MOCK_USER_ROW]);
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });

    // Instantiate real service — DB layer is mocked above
    preferencesService = new UserPreferencesService();

    resolver = new UserResolver(
      new UserService() as unknown as UserService,
      new UserStatsService() as unknown as UserStatsService,
      preferencesService,
      new PublicProfileService() as unknown as PublicProfileService,
      new ActivityFeedService() as unknown as ActivityFeedService,
      new InProgressCoursesService() as unknown as InProgressCoursesService,
      new RecommendedCoursesService() as unknown as RecommendedCoursesService
    );
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('resolver returns updated user row from real service on success', async () => {
    const result = await resolver.updateUserPreferences(
      { locale: 'he' },
      makeContext(AUTH_CTX)
    );
    expect(result).toEqual(MOCK_USER_ROW);
  });

  it('resolver passes authContext.userId to service (not input)', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    await resolver.updateUserPreferences({ locale: 'fr' }, makeContext(AUTH_CTX));
    expect(vi.mocked(withTenantContext)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'user-1', tenantId: 'tenant-1' }),
      expect.any(Function)
    );
  });

  // ── Auth guard ────────────────────────────────────────────────────────────

  it('resolver throws UnauthorizedException when authContext is missing', async () => {
    await expect(
      resolver.updateUserPreferences({ locale: 'he' }, makeContext(undefined))
    ).rejects.toThrow(UnauthorizedException);
  });

  // ── DB error propagation ──────────────────────────────────────────────────

  it('DB NotFoundException propagates through resolver', async () => {
    mockLimit.mockResolvedValueOnce([]);

    await expect(
      resolver.updateUserPreferences({ locale: 'he' }, makeContext(AUTH_CTX))
    ).rejects.toThrow(NotFoundException);
  });

  it('DB connection error propagates through resolver as-is', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    const connErr = new Error('connect ECONNREFUSED 127.0.0.1:5432');
    vi.mocked(withTenantContext).mockRejectedValueOnce(connErr);

    await expect(
      resolver.updateUserPreferences({ locale: 'he' }, makeContext(AUTH_CTX))
    ).rejects.toThrow(/ECONNREFUSED/);
  });

  it('DB timeout error propagates through resolver as-is', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    vi.mocked(withTenantContext).mockRejectedValueOnce(
      new Error('Query read timeout')
    );

    await expect(
      resolver.updateUserPreferences({ locale: 'fr' }, makeContext(AUTH_CTX))
    ).rejects.toThrow(/timeout/i);
  });

  // ── Input validation ──────────────────────────────────────────────────────

  it('resolver rejects input that fails Zod schema validation', async () => {
    // UpdateUserPreferencesSchema enforces enum values for locale/theme
    // Pass an object with an invalid theme enum value — Zod should reject it
    const { withTenantContext } = await import('@edusphere/db');

    await expect(
      resolver.updateUserPreferences(
        { theme: 'not-a-valid-theme-value-xyz' },
        makeContext(AUTH_CTX)
      )
    ).rejects.toThrow(); // ZodError thrown before service is called

    // withTenantContext must NOT have been called (service never reached)
    expect(vi.mocked(withTenantContext)).not.toHaveBeenCalled();
  });

  it('empty input object is accepted (PATCH semantics — no fields required)', async () => {
    await expect(
      resolver.updateUserPreferences({}, makeContext(AUTH_CTX))
    ).resolves.toBeDefined();
  });
});
