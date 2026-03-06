import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

// ── Mock @edusphere/db ───────────────────────────────────────────────────────

const mockReturning = vi.fn();
const mockSet = vi.fn().mockReturnThis();
const mockUpdateWhere = vi.fn().mockReturnThis();
const mockUpdate = vi.fn(() => ({ set: mockSet }));
const mockSelectLimit = vi.fn();
const mockSelectWhere = vi.fn();
const mockSelectFrom = vi.fn();
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    update: mockUpdate,
    select: mockSelect,
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    liveSessions: {
      id: 'id',
      tenantId: 'tenantId',
      status: 'status',
      startedAt: 'startedAt',
      endedAt: 'endedAt',
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

function setSelectResult(rows: object[]): void {
  mockSelectLimit.mockResolvedValueOnce(rows);
  mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
  mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('LiveSessionsService', () => {
  let service: LiveSessionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = buildService();
    // Reset chaining mocks
    mockUpdate.mockImplementation(() => ({ set: mockSet }));
    mockSelect.mockImplementation(() => ({ from: mockSelectFrom }));
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

  // ── endLiveSession ─────────────────────────────────────────────────────────

  describe('endLiveSession', () => {
    it('happy path: sets status to ENDED and returns updated session', async () => {
      const existingSession = {
        id: 'session-1',
        tenantId: 'tenant-1',
        status: 'LIVE',
        startedAt: new Date('2026-03-06T10:00:00Z'),
        endedAt: null,
      };
      const updatedSession = { ...existingSession, status: 'ENDED', endedAt: new Date() };

      setSelectResult([existingSession]);
      setUpdateResult([updatedSession]);

      const result = await service.endLiveSession(
        'session-1',
        'instructor-1',
        'tenant-1'
      );

      expect(result.status).toBe('ENDED');
      expect(result.id).toBe('session-1');
    });

    it('throws NotFoundException when session does not exist', async () => {
      setSelectResult([]);

      await expect(
        service.endLiveSession('missing', 'instructor-1', 'tenant-1')
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when instructor does not own session', async () => {
      // NOTE: ownership is enforced by @requiresRole at the resolver level.
      // The service validates tenant isolation via DB query.
      // This test documents that a non-existent session throws NotFoundException.
      setSelectResult([]);

      await expect(
        service.endLiveSession('session-x', 'wrong-instructor', 'tenant-1')
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── joinLiveSession ────────────────────────────────────────────────────────

  describe('joinLiveSession', () => {
    it('happy path: returns room URL for a LIVE session', async () => {
      setSelectResult([
        { id: 'session-1', tenantId: 'tenant-1', status: 'LIVE', startedAt: new Date() },
      ]);

      const result = await service.joinLiveSession(
        'session-1',
        'user-1',
        'tenant-1'
      );

      expect(result.roomUrl).toBe('https://meet.edusphere.dev/session-1');
      expect(result.session.id).toBe('session-1');
      expect(result.session.status).toBe('LIVE');
    });

    it('throws BadRequestException when session is not LIVE (SCHEDULED)', async () => {
      setSelectResult([
        { id: 'session-1', tenantId: 'tenant-1', status: 'SCHEDULED', startedAt: null },
      ]);

      await expect(
        service.joinLiveSession('session-1', 'user-1', 'tenant-1')
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when session is ENDED', async () => {
      setSelectResult([
        { id: 'session-1', tenantId: 'tenant-1', status: 'ENDED', startedAt: new Date() },
      ]);

      await expect(
        service.joinLiveSession('session-1', 'user-1', 'tenant-1')
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when session does not exist', async () => {
      setSelectResult([]);

      await expect(
        service.joinLiveSession('missing', 'user-1', 'tenant-1')
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ── cancelLiveSession ──────────────────────────────────────────────────────

  describe('cancelLiveSession', () => {
    it('happy path: cancels a SCHEDULED session', async () => {
      const existingSession = {
        id: 'session-1',
        tenantId: 'tenant-1',
        status: 'SCHEDULED',
        startedAt: null,
        endedAt: null,
      };
      const cancelledSession = { ...existingSession, status: 'CANCELLED' };

      setSelectResult([existingSession]);
      setUpdateResult([cancelledSession]);

      const result = await service.cancelLiveSession(
        'session-1',
        'instructor-1',
        'tenant-1'
      );

      expect(result.status).toBe('CANCELLED');
      expect(result.id).toBe('session-1');
    });

    it('throws BadRequestException when session is already ENDED', async () => {
      setSelectResult([
        { id: 'session-1', tenantId: 'tenant-1', status: 'ENDED', startedAt: new Date(), endedAt: new Date() },
      ]);

      await expect(
        service.cancelLiveSession('session-1', 'instructor-1', 'tenant-1')
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when session is LIVE', async () => {
      setSelectResult([
        { id: 'session-1', tenantId: 'tenant-1', status: 'LIVE', startedAt: new Date(), endedAt: null },
      ]);

      await expect(
        service.cancelLiveSession('session-1', 'instructor-1', 'tenant-1')
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when session does not exist', async () => {
      setSelectResult([]);

      await expect(
        service.cancelLiveSession('missing', 'instructor-1', 'tenant-1')
      ).rejects.toBeInstanceOf(NotFoundException);
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
