import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
}));

import { LiveSessionResolver } from './live-session.resolver.js';

// ---------------------------------------------------------------------------
// Mock service
// ---------------------------------------------------------------------------

const mockLiveSessionService = {
  getByContentItem: vi.fn(),
  createLiveSession: vi.fn(),
  getJoinUrl: vi.fn(),
  endSession: vi.fn(),
};

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

const makeCtx = (
  user: {
    tenant_id?: string;
    sub?: string;
    name?: string;
    preferred_username?: string;
    role?: string;
  } = {}
) => ({
  req: { user },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LiveSessionResolver', () => {
  let resolver: LiveSessionResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new LiveSessionResolver(mockLiveSessionService as never);
  });

  // ── getLiveSession ────────────────────────────────────────────────────────

  it('getLiveSession — passes contentItemId and tenant_id to service', async () => {
    mockLiveSessionService.getByContentItem.mockResolvedValue({
      id: 'session-1',
    });

    const result = await resolver.getLiveSession(
      'content-1',
      makeCtx({ tenant_id: 'tenant-abc' })
    );

    expect(mockLiveSessionService.getByContentItem).toHaveBeenCalledWith(
      'content-1',
      'tenant-abc'
    );
    expect(result).toEqual({ id: 'session-1' });
  });

  it('getLiveSession — uses empty string for tenant_id when user is absent', async () => {
    mockLiveSessionService.getByContentItem.mockResolvedValue(null);

    await resolver.getLiveSession('content-2', makeCtx());

    expect(mockLiveSessionService.getByContentItem).toHaveBeenCalledWith(
      'content-2',
      ''
    );
  });

  // ── createLiveSession ─────────────────────────────────────────────────────

  it('createLiveSession — converts scheduledAt string to Date and delegates', async () => {
    const created = { id: 'live-1', scheduledAt: new Date() };
    mockLiveSessionService.createLiveSession.mockResolvedValue(created);

    await resolver.createLiveSession(
      'content-1',
      '2026-03-10T14:00:00.000Z',
      'Math Live',
      makeCtx({ tenant_id: 'tenant-abc' })
    );

    const [, tenantId, scheduledAt, meetingName] = mockLiveSessionService
      .createLiveSession.mock.calls[0] as [string, string, Date, string];

    expect(tenantId).toBe('tenant-abc');
    expect(scheduledAt).toBeInstanceOf(Date);
    expect(scheduledAt.getFullYear()).toBe(2026);
    expect(meetingName).toBe('Math Live');
  });

});
