import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { LiveSessionsResolver } from './live-sessions.resolver';
import type { LiveSessionsService } from './live-sessions.service';

// ── Mock service factory ────────────────────────────────────────────────────

function createMockService(): Record<keyof LiveSessionsService, ReturnType<typeof vi.fn>> {
  return {
    startLiveSession: vi.fn(),
    endLiveSession: vi.fn(),
    joinLiveSession: vi.fn(),
    cancelLiveSession: vi.fn(),
    getSessionAttendees: vi.fn(),
    publishSessionCreated: vi.fn(),
    publishSessionEnded: vi.fn(),
    publishParticipantJoined: vi.fn(),
    onModuleDestroy: vi.fn(),
  };
}

function makeAuthContext(overrides: Record<string, unknown> = {}) {
  return {
    authContext: {
      userId: 'user-1',
      tenantId: 'tenant-1',
      roles: ['INSTRUCTOR'],
      scopes: [],
      ...overrides,
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('LiveSessionsResolver', () => {
  let resolver: LiveSessionsResolver;
  let mockService: ReturnType<typeof createMockService>;

  beforeEach(() => {
    mockService = createMockService();
    resolver = new LiveSessionsResolver(
      mockService as unknown as LiveSessionsService
    );
  });

  // ── startLiveSession ──────────────────────────────────────────────────────

  describe('startLiveSession', () => {
    it('delegates to service with correct args', async () => {
      const expected = { sessionId: 'ses-1', status: 'LIVE', startedAt: new Date() };
      mockService.startLiveSession.mockResolvedValue(expected);

      const result = await resolver.startLiveSession('ses-1', makeAuthContext());

      expect(mockService.startLiveSession).toHaveBeenCalledWith(
        'ses-1',
        'tenant-1',
        'user-1',
        'INSTRUCTOR'
      );
      expect(result).toEqual(expected);
    });

    it('throws UnauthorizedException when authContext is missing', async () => {
      await expect(
        resolver.startLiveSession('ses-1', {})
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('uses first role from roles array', async () => {
      mockService.startLiveSession.mockResolvedValue({});
      await resolver.startLiveSession(
        'ses-1',
        makeAuthContext({ roles: ['ORG_ADMIN', 'INSTRUCTOR'] })
      );

      expect(mockService.startLiveSession).toHaveBeenCalledWith(
        'ses-1',
        'tenant-1',
        'user-1',
        'ORG_ADMIN'
      );
    });

    it('defaults to STUDENT when roles array is empty', async () => {
      mockService.startLiveSession.mockResolvedValue({});
      await resolver.startLiveSession(
        'ses-1',
        makeAuthContext({ roles: [] })
      );

      expect(mockService.startLiveSession).toHaveBeenCalledWith(
        'ses-1',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
    });
  });

  // ── endLiveSession ────────────────────────────────────────────────────────

  describe('endLiveSession', () => {
    it('delegates to service with sessionId, userId, tenantId', async () => {
      const expected = { id: 'ses-1', status: 'ENDED' };
      mockService.endLiveSession.mockResolvedValue(expected);

      const result = await resolver.endLiveSession('ses-1', makeAuthContext());

      expect(mockService.endLiveSession).toHaveBeenCalledWith(
        'ses-1',
        'user-1',
        'tenant-1'
      );
      expect(result).toEqual(expected);
    });

    it('throws UnauthorizedException without auth', async () => {
      await expect(
        resolver.endLiveSession('ses-1', {})
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ── joinLiveSession ───────────────────────────────────────────────────────

  describe('joinLiveSession', () => {
    it('delegates to service correctly', async () => {
      const expected = { roomUrl: 'https://meet.edusphere.dev/ses-1' };
      mockService.joinLiveSession.mockResolvedValue(expected);

      const result = await resolver.joinLiveSession('ses-1', makeAuthContext());

      expect(mockService.joinLiveSession).toHaveBeenCalledWith(
        'ses-1',
        'user-1',
        'tenant-1'
      );
      expect(result).toEqual(expected);
    });

    it('defaults tenantId to empty string when missing', async () => {
      mockService.joinLiveSession.mockResolvedValue({});
      await resolver.joinLiveSession(
        'ses-1',
        makeAuthContext({ tenantId: undefined })
      );

      expect(mockService.joinLiveSession).toHaveBeenCalledWith(
        'ses-1',
        'user-1',
        ''
      );
    });
  });

  // ── cancelLiveSession ─────────────────────────────────────────────────────

  describe('cancelLiveSession', () => {
    it('delegates to service correctly', async () => {
      const expected = { id: 'ses-1', status: 'CANCELLED' };
      mockService.cancelLiveSession.mockResolvedValue(expected);

      const result = await resolver.cancelLiveSession(
        'ses-1',
        makeAuthContext()
      );

      expect(mockService.cancelLiveSession).toHaveBeenCalledWith(
        'ses-1',
        'user-1',
        'tenant-1'
      );
      expect(result).toEqual(expected);
    });
  });

  // ── sessionAttendees ──────────────────────────────────────────────────────

  describe('sessionAttendees', () => {
    it('passes pagination args to service', async () => {
      const expected = { edges: [], pageInfo: { hasNextPage: false } };
      mockService.getSessionAttendees.mockResolvedValue(expected);

      const result = await resolver.sessionAttendees(
        'ses-1',
        10,
        'cursor-abc',
        makeAuthContext()
      );

      expect(mockService.getSessionAttendees).toHaveBeenCalledWith(
        'ses-1',
        'user-1',
        'tenant-1',
        { first: 10, after: 'cursor-abc' }
      );
      expect(result).toEqual(expected);
    });

    it('passes undefined pagination when not provided', async () => {
      mockService.getSessionAttendees.mockResolvedValue({ edges: [] });

      await resolver.sessionAttendees(
        'ses-1',
        undefined,
        undefined,
        makeAuthContext()
      );

      expect(mockService.getSessionAttendees).toHaveBeenCalledWith(
        'ses-1',
        'user-1',
        'tenant-1',
        { first: undefined, after: undefined }
      );
    });
  });
});
