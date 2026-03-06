import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

// ── Mock @edusphere/db ───────────────────────────────────────────────────────

const mockReturning = vi.fn();
const mockSet = vi.fn().mockReturnThis();
const mockUpdateWhere = vi.fn().mockReturnThis();
const mockUpdate = vi.fn(() => ({ set: mockSet }));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    update: mockUpdate,
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    liveSessions: {
      id: 'id',
      tenantId: 'tenantId',
      status: 'status',
      startedAt: 'startedAt',
    },
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ field: a, value: b })),
  and: vi.fn((...args: unknown[]) => args),
}));

// ── Mock nats ────────────────────────────────────────────────────────────────

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    publish: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({
    encode: vi.fn((s: string) => Buffer.from(s)),
    decode: vi.fn((b: Buffer) => Buffer.from(b).toString()),
  })),
}));

// ── Import service after mocks ───────────────────────────────────────────────

import { LiveSessionsService } from './live-sessions.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildService(): LiveSessionsService {
  return new LiveSessionsService();
}

function setUpdateResult(rows: object[]): void {
  mockReturning.mockResolvedValueOnce(rows);
  mockUpdateWhere.mockReturnValue({ returning: mockReturning });
  mockSet.mockReturnValue({ where: mockUpdateWhere });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('LiveSessionsService', () => {
  let service: LiveSessionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = buildService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  // ── startLiveSession ───────────────────────────────────────────────────────

  describe('startLiveSession', () => {
    it('returns StartLiveSessionResult with status LIVE', async () => {
      setUpdateResult([
        {
          id: 'session-1',
          tenantId: 'tenant-1',
          status: 'LIVE',
          startedAt: new Date('2026-03-06T12:00:00Z'),
        },
      ]);

      const result = await service.startLiveSession(
        'session-1',
        'tenant-1',
        'user-1',
        'INSTRUCTOR'
      );

      expect(result.sessionId).toBe('session-1');
      expect(result.status).toBe('LIVE');
      expect(result.startedAt).toBeDefined();
    });

    it('throws NotFoundException when session does not exist', async () => {
      setUpdateResult([]);

      await expect(
        service.startLiveSession('missing', 'tenant-1', 'user-1', 'INSTRUCTOR')
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException for STUDENT role', async () => {
      await expect(
        service.startLiveSession('session-1', 'tenant-1', 'user-1', 'STUDENT')
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows ORG_ADMIN to start a session', async () => {
      setUpdateResult([
        {
          id: 'session-1',
          tenantId: 'tenant-1',
          status: 'LIVE',
          startedAt: new Date(),
        },
      ]);

      const result = await service.startLiveSession(
        'session-1',
        'tenant-1',
        'admin-1',
        'ORG_ADMIN'
      );
      expect(result.status).toBe('LIVE');
    });

    it('allows SUPER_ADMIN to start a session', async () => {
      setUpdateResult([
        {
          id: 'session-2',
          tenantId: 'tenant-1',
          status: 'LIVE',
          startedAt: new Date(),
        },
      ]);

      const result = await service.startLiveSession(
        'session-2',
        'tenant-1',
        'super-1',
        'SUPER_ADMIN'
      );
      expect(result.status).toBe('LIVE');
    });
  });

  // ── NATS event publishing ──────────────────────────────────────────────────

  describe('publishSessionCreated', () => {
    it('publishes created event without throwing', async () => {
      await expect(
        service.publishSessionCreated(
          'session-1',
          'tenant-1',
          'instructor-1',
          new Date()
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('publishSessionEnded', () => {
    it('publishes ended event with duration when startedAt provided', async () => {
      const startedAt = new Date('2026-03-06T10:00:00Z');
      const endedAt = new Date('2026-03-06T11:30:00Z');

      await expect(
        service.publishSessionEnded('session-1', 'tenant-1', endedAt, startedAt)
      ).resolves.toBeUndefined();
    });

    it('publishes ended event with null duration when startedAt is null', async () => {
      await expect(
        service.publishSessionEnded(
          'session-1',
          'tenant-1',
          new Date(),
          null
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('publishParticipantJoined', () => {
    it('publishes participant joined event', async () => {
      await expect(
        service.publishParticipantJoined('session-1', 'tenant-1', 'user-42')
      ).resolves.toBeUndefined();
    });
  });

  // ── onModuleDestroy ────────────────────────────────────────────────────────

  describe('onModuleDestroy', () => {
    it('calls closeAllPools on destroy', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
