import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
}));

import { LiveSessionResolver } from './live-session.resolver.js';
import type { GraphQLContext } from '../auth/auth.middleware';

// ---------------------------------------------------------------------------
// Mock service
// ---------------------------------------------------------------------------

const mockLiveSessionService = {
  getByContentItem: vi.fn(),
  createLiveSession: vi.fn(),
  listSessions: vi.fn(),
  getById: vi.fn(),
};

// ---------------------------------------------------------------------------
// Context helpers — uses the NEW authContext pattern
// ---------------------------------------------------------------------------

function makeCtx(
  opts: {
    tenantId?: string;
    userId?: string;
    headerTenantId?: string;
  } = {}
): GraphQLContext {
  return {
    req: {
      headers: {
        ...(opts.headerTenantId ? { 'x-tenant-id': opts.headerTenantId } : {}),
      },
    },
    authContext:
      opts.tenantId || opts.userId
        ? {
            tenantId: opts.tenantId,
            userId: opts.userId ?? 'test-user-id',
            email: 'test@example.com',
            username: 'testuser',
            roles: [],
            scopes: [],
            isSuperAdmin: false,
          }
        : undefined,
  } as unknown as GraphQLContext;
}

/** Context using the OLD broken pattern — proves it would NOT work. */
function makeOldCtx(tenantId: string): Record<string, unknown> {
  return {
    req: {
      user: { tenant_id: tenantId },
      headers: {},
    },
  };
}

// ---------------------------------------------------------------------------
// extractTenantId (tested indirectly through resolver methods)
// ---------------------------------------------------------------------------

describe('LiveSessionResolver', () => {
  let resolver: LiveSessionResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new LiveSessionResolver(mockLiveSessionService as never);
  });

  // ── extractTenantId — authContext preferred ───────────────────────────────

  describe('extractTenantId — authContext.tenantId (preferred path)', () => {
    it('uses authContext.tenantId when present', async () => {
      mockLiveSessionService.getByContentItem.mockResolvedValue({ id: 's1' });

      await resolver.getLiveSession(
        'content-1',
        makeCtx({ tenantId: 'tenant-abc' })
      );

      expect(mockLiveSessionService.getByContentItem).toHaveBeenCalledWith(
        'content-1',
        'tenant-abc'
      );
    });

    it('prefers authContext.tenantId over x-tenant-id header', async () => {
      mockLiveSessionService.getByContentItem.mockResolvedValue(null);

      await resolver.getLiveSession(
        'content-1',
        makeCtx({ tenantId: 'from-auth', headerTenantId: 'from-header' })
      );

      expect(mockLiveSessionService.getByContentItem).toHaveBeenCalledWith(
        'content-1',
        'from-auth'
      );
    });
  });

  // ── extractTenantId — header fallback ─────────────────────────────────────

  describe('extractTenantId — x-tenant-id header fallback', () => {
    it('falls back to x-tenant-id header when authContext is missing', async () => {
      mockLiveSessionService.getById.mockResolvedValue(null);

      // Use getLiveSessionById which does not require authContext.userId
      await resolver.getLiveSessionById(
        'session-1',
        makeCtx({ headerTenantId: 'header-tenant' })
      );

      expect(mockLiveSessionService.getById).toHaveBeenCalledWith(
        'session-1',
        'header-tenant'
      );
    });

    it('handles array header values (picks first element)', async () => {
      mockLiveSessionService.getById.mockResolvedValue(null);

      const ctx = {
        req: {
          headers: { 'x-tenant-id': ['first-tenant', 'second-tenant'] },
        },
      } as unknown as GraphQLContext;

      await resolver.getLiveSessionById('session-1', ctx);

      expect(mockLiveSessionService.getById).toHaveBeenCalledWith(
        'session-1',
        'first-tenant'
      );
    });
  });

  // ── extractTenantId — empty string when both missing ──────────────────────

  describe('extractTenantId — returns empty string when both sources missing', () => {
    it('returns empty string when authContext and header are both absent', async () => {
      mockLiveSessionService.getById.mockResolvedValue(null);

      // Use getLiveSessionById which does not require authContext.userId
      await resolver.getLiveSessionById('session-1', makeCtx());

      expect(mockLiveSessionService.getById).toHaveBeenCalledWith(
        'session-1',
        ''
      );
    });
  });

  // ── Regression guard — OLD pattern must NOT work ──────────────────────────

  describe('regression guard — old ctx.req.user?.tenant_id pattern', () => {
    it('old pattern ctx.req.user.tenant_id does NOT extract tenantId', async () => {
      mockLiveSessionService.getById.mockResolvedValue(null);

      // Pass context that only has the OLD pattern — tenantId should be empty
      // Use getLiveSessionById which does not require authContext.userId
      await resolver.getLiveSessionById(
        'session-1',
        makeOldCtx('old-tenant') as never
      );

      expect(mockLiveSessionService.getById).toHaveBeenCalledWith(
        'session-1',
        '' // NOT 'old-tenant' — old pattern does not work
      );
    });
  });

  // ── getLiveSession ────────────────────────────────────────────────────────

  it('getLiveSession — passes contentItemId and tenantId to service', async () => {
    mockLiveSessionService.getByContentItem.mockResolvedValue({
      id: 'session-1',
    });

    const result = await resolver.getLiveSession(
      'content-1',
      makeCtx({ tenantId: 'tenant-abc' })
    );

    expect(mockLiveSessionService.getByContentItem).toHaveBeenCalledWith(
      'content-1',
      'tenant-abc'
    );
    expect(result).toEqual({ id: 'session-1' });
  });

  // ── createLiveSession ─────────────────────────────────────────────────────

  it('createLiveSession — converts scheduledAt to Date and delegates with tenantId', async () => {
    const created = { id: 'live-1', scheduledAt: new Date() };
    mockLiveSessionService.createLiveSession.mockResolvedValue(created);

    await resolver.createLiveSession(
      'content-1',
      '2026-03-10T14:00:00.000Z',
      'Math Live',
      makeCtx({ tenantId: 'tenant-abc' })
    );

    const [contentItemId, tenantId, scheduledAt, meetingName] =
      mockLiveSessionService.createLiveSession.mock.calls[0] as [
        string,
        string,
        Date,
        string,
      ];

    expect(contentItemId).toBe('content-1');
    expect(tenantId).toBe('tenant-abc');
    expect(scheduledAt).toBeInstanceOf(Date);
    expect(scheduledAt.getFullYear()).toBe(2026);
    expect(meetingName).toBe('Math Live');
  });

  // ── listSessions ──────────────────────────────────────────────────────────

  it('listSessions — passes tenantId, status, limit, offset to service', async () => {
    mockLiveSessionService.listSessions.mockResolvedValue([]);

    await resolver.listSessions(
      'LIVE',
      10,
      5,
      makeCtx({ tenantId: 'tenant-xyz' })
    );

    expect(mockLiveSessionService.listSessions).toHaveBeenCalledWith(
      'tenant-xyz',
      'LIVE',
      10,
      5
    );
  });

  it('listSessions — defaults limit to 20 and offset to 0 when undefined', async () => {
    mockLiveSessionService.listSessions.mockResolvedValue([]);

    await resolver.listSessions(
      undefined,
      undefined,
      undefined,
      makeCtx({ tenantId: 'tenant-xyz' })
    );

    expect(mockLiveSessionService.listSessions).toHaveBeenCalledWith(
      'tenant-xyz',
      undefined,
      20,
      0
    );
  });

  // ── getLiveSessionById ────────────────────────────────────────────────────

  it('getLiveSessionById — passes sessionId and tenantId to service', async () => {
    mockLiveSessionService.getById.mockResolvedValue({ id: 'session-42' });

    const result = await resolver.getLiveSessionById(
      'session-42',
      makeCtx({ tenantId: 'tenant-abc' })
    );

    expect(mockLiveSessionService.getById).toHaveBeenCalledWith(
      'session-42',
      'tenant-abc'
    );
    expect(result).toEqual({ id: 'session-42' });
  });

  it('getLiveSessionById — uses header fallback when authContext missing', async () => {
    mockLiveSessionService.getById.mockResolvedValue(null);

    await resolver.getLiveSessionById(
      'session-42',
      makeCtx({ headerTenantId: 'header-tenant' })
    );

    expect(mockLiveSessionService.getById).toHaveBeenCalledWith(
      'session-42',
      'header-tenant'
    );
  });
});
