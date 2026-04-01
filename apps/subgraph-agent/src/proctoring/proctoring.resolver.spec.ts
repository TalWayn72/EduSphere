/**
 * ProctoringResolver unit tests — PRD §7.2 G-4.
 *
 * Verifies:
 * - proctoringSession delegates to service.getSession
 * - proctoringReport delegates to service.getReport
 * - startProctoringSession delegates to service.startSession
 * - flagProctoringEvent delegates to service.flagEvent
 * - endProctoringSession delegates to service.endSession
 * - All methods throw UnauthorizedException when authContext missing
 * - tenantId defaults to empty string when null
 * - detail defaults to null when undefined
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ── Mock service ─────────────────────────────────────────────────────────────

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetReport = vi.hoisted(() => vi.fn());
const mockStartSession = vi.hoisted(() => vi.fn());
const mockFlagEvent = vi.hoisted(() => vi.fn());
const mockEndSession = vi.hoisted(() => vi.fn());

vi.mock('./proctoring.service', () => {
  class MockProctoringService {
    getSession(...args: unknown[]) {
      return mockGetSession(...args);
    }
    getReport(...args: unknown[]) {
      return mockGetReport(...args);
    }
    startSession(...args: unknown[]) {
      return mockStartSession(...args);
    }
    flagEvent(...args: unknown[]) {
      return mockFlagEvent(...args);
    }
    endSession(...args: unknown[]) {
      return mockEndSession(...args);
    }
  }
  return { ProctoringService: MockProctoringService };
});

import { ProctoringResolver } from './proctoring.resolver';
import { ProctoringService } from './proctoring.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeContext(
  overrides: Partial<{
    userId: string;
    tenantId: string | null;
  }> = {}
) {
  return {
    authContext: {
      userId: overrides.userId ?? 'user-1',
      tenantId: 'tenantId' in overrides ? overrides.tenantId : 'tenant-1',
      role: 'STUDENT',
      scopes: [],
    },
  };
}

function noAuthContext() {
  return {};
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ProctoringResolver', () => {
  let resolver: ProctoringResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    const service = new ProctoringService() as unknown as ProctoringService;
    resolver = new ProctoringResolver(service);
  });

  // ── proctoringSession ─────────────────────────────────────────────────────

  it('proctoringSession delegates to service.getSession', async () => {
    mockGetSession.mockResolvedValueOnce({ id: 'sess-1' });

    const result = await resolver.proctoringSession('sess-1', makeContext());

    expect(mockGetSession).toHaveBeenCalledWith('sess-1', 'tenant-1');
    expect(result).toEqual({ id: 'sess-1' });
  });

  it('proctoringSession throws UnauthorizedException without auth', async () => {
    await expect(
      resolver.proctoringSession('sess-1', noAuthContext())
    ).rejects.toThrow(UnauthorizedException);
  });

  // ── proctoringReport ──────────────────────────────────────────────────────

  it('proctoringReport delegates to service.getReport', async () => {
    mockGetReport.mockResolvedValueOnce([{ id: 'sess-1' }]);

    const result = await resolver.proctoringReport('assess-1', makeContext());

    expect(mockGetReport).toHaveBeenCalledWith('assess-1', 'tenant-1');
    expect(result).toEqual([{ id: 'sess-1' }]);
  });

  it('proctoringReport throws UnauthorizedException without auth', async () => {
    await expect(
      resolver.proctoringReport('assess-1', noAuthContext())
    ).rejects.toThrow(UnauthorizedException);
  });

  // ── startProctoringSession ────────────────────────────────────────────────

  it('startProctoringSession delegates to service.startSession', async () => {
    mockStartSession.mockResolvedValueOnce({
      id: 'sess-new',
      status: 'PENDING',
    });

    const result = await resolver.startProctoringSession(
      'assess-1',
      makeContext()
    );

    expect(mockStartSession).toHaveBeenCalledWith(
      'assess-1',
      'tenant-1',
      'user-1'
    );
    expect(result.status).toBe('PENDING');
  });

  it('startProctoringSession throws without auth', async () => {
    await expect(
      resolver.startProctoringSession('assess-1', noAuthContext())
    ).rejects.toThrow(UnauthorizedException);
  });

  // ── flagProctoringEvent ───────────────────────────────────────────────────

  it('flagProctoringEvent delegates to service.flagEvent', async () => {
    mockFlagEvent.mockResolvedValueOnce({
      id: 'sess-1',
      status: 'FLAGGED',
    });

    const result = await resolver.flagProctoringEvent(
      'sess-1',
      'TAB_SWITCH',
      'switched to another tab',
      makeContext()
    );

    expect(mockFlagEvent).toHaveBeenCalledWith(
      'sess-1',
      'TAB_SWITCH',
      'switched to another tab',
      'tenant-1'
    );
    expect(result.status).toBe('FLAGGED');
  });

  it('flagProctoringEvent passes null when detail is undefined', async () => {
    mockFlagEvent.mockResolvedValueOnce({ id: 'sess-1' });

    await resolver.flagProctoringEvent(
      'sess-1',
      'GAZE_AWAY',
      undefined,
      makeContext()
    );

    expect(mockFlagEvent).toHaveBeenCalledWith(
      'sess-1',
      'GAZE_AWAY',
      null,
      'tenant-1'
    );
  });

  it('flagProctoringEvent throws without auth', async () => {
    await expect(
      resolver.flagProctoringEvent(
        'sess-1',
        'TAB_SWITCH',
        undefined,
        noAuthContext()
      )
    ).rejects.toThrow(UnauthorizedException);
  });

  // ── endProctoringSession ──────────────────────────────────────────────────

  it('endProctoringSession delegates to service.endSession', async () => {
    mockEndSession.mockResolvedValueOnce({
      id: 'sess-1',
      status: 'COMPLETED',
    });

    const result = await resolver.endProctoringSession('sess-1', makeContext());

    expect(mockEndSession).toHaveBeenCalledWith('sess-1', 'tenant-1');
    expect(result.status).toBe('COMPLETED');
  });

  it('endProctoringSession throws without auth', async () => {
    await expect(
      resolver.endProctoringSession('sess-1', noAuthContext())
    ).rejects.toThrow(UnauthorizedException);
  });

  // ── tenantId fallback ─────────────────────────────────────────────────────

  it('uses empty string for tenantId when null', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    await resolver.proctoringSession('sess-1', makeContext({ tenantId: null }));

    expect(mockGetSession).toHaveBeenCalledWith('sess-1', '');
  });
});
