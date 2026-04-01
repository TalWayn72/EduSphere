import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock nats ─────────────────────────────────────────────────────────────────

const mockPublish = vi.fn();
const mockDrain = vi.fn().mockResolvedValue(undefined);
const mockConnect = vi.fn().mockResolvedValue({
  publish: mockPublish,
  drain: mockDrain,
});

vi.mock('nats', () => ({
  connect: (...args: unknown[]) => mockConnect(...args),
  StringCodec: vi.fn(() => ({
    encode: vi.fn((s: string) => Buffer.from(s)),
  })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://localhost:4222' })),
}));

// ── Import after mocks ───────────────────────────────────────────────────────

import { LiveSessionsEventsService } from './live-sessions-events.service';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('LiveSessionsEventsService', () => {
  let service: LiveSessionsEventsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LiveSessionsEventsService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  // ── publishSessionStarted ─────────────────────────────────────────────────

  describe('publishSessionStarted', () => {
    it('publishes event with correct subject and payload', async () => {
      const startedAt = new Date('2026-03-15T10:00:00Z');

      await service.publishSessionStarted('ses-1', 'tenant-1', startedAt);

      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockPublish).toHaveBeenCalledTimes(1);
      expect(mockPublish.mock.calls[0][0]).toBe('EDUSPHERE.sessions.started');
    });

    it('encodes sessionId, tenantId, and ISO startedAt in payload', async () => {
      const startedAt = new Date('2026-03-15T10:00:00Z');

      await service.publishSessionStarted('ses-1', 'tenant-1', startedAt);

      const encoded = mockPublish.mock.calls[0][1] as Buffer;
      const payload = JSON.parse(Buffer.from(encoded).toString());
      expect(payload).toEqual({
        sessionId: 'ses-1',
        tenantId: 'tenant-1',
        startedAt: '2026-03-15T10:00:00.000Z',
      });
    });

    it('reuses existing NATS connection on second call', async () => {
      await service.publishSessionStarted('s1', 't1', new Date());
      await service.publishSessionStarted('s2', 't1', new Date());

      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockPublish).toHaveBeenCalledTimes(2);
    });
  });

  // ── publishSessionCreated ─────────────────────────────────────────────────

  describe('publishSessionCreated', () => {
    it('publishes with correct subject', async () => {
      await service.publishSessionCreated(
        'ses-1',
        'tenant-1',
        'instructor-1',
        new Date('2026-04-01T09:00:00Z')
      );

      expect(mockPublish.mock.calls[0][0]).toBe('EDUSPHERE.sessions.created');
    });

    it('includes instructorId and scheduledAt in payload', async () => {
      const scheduledAt = new Date('2026-04-01T09:00:00Z');

      await service.publishSessionCreated(
        'ses-2',
        'tenant-1',
        'instr-5',
        scheduledAt
      );

      const encoded = mockPublish.mock.calls[0][1] as Buffer;
      const payload = JSON.parse(Buffer.from(encoded).toString());
      expect(payload.instructorId).toBe('instr-5');
      expect(payload.scheduledAt).toBe('2026-04-01T09:00:00.000Z');
    });
  });

  // ── publishSessionEnded ───────────────────────────────────────────────────

  describe('publishSessionEnded', () => {
    it('calculates durationSeconds when startedAt is provided', async () => {
      const startedAt = new Date('2026-03-15T10:00:00Z');
      const endedAt = new Date('2026-03-15T11:30:00Z');

      await service.publishSessionEnded(
        'ses-1',
        'tenant-1',
        endedAt,
        startedAt
      );

      const encoded = mockPublish.mock.calls[0][1] as Buffer;
      const payload = JSON.parse(Buffer.from(encoded).toString());
      expect(payload.durationSeconds).toBe(5400); // 1.5h
    });

    it('sets durationSeconds to null when startedAt is null', async () => {
      await service.publishSessionEnded('ses-1', 'tenant-1', new Date(), null);

      const encoded = mockPublish.mock.calls[0][1] as Buffer;
      const payload = JSON.parse(Buffer.from(encoded).toString());
      expect(payload.durationSeconds).toBeNull();
    });

    it('publishes to EDUSPHERE.sessions.ended subject', async () => {
      await service.publishSessionEnded('ses-1', 'tenant-1', new Date(), null);
      expect(mockPublish.mock.calls[0][0]).toBe('EDUSPHERE.sessions.ended');
    });
  });

  // ── publishParticipantJoined ──────────────────────────────────────────────

  describe('publishParticipantJoined', () => {
    it('publishes with correct subject and userId', async () => {
      await service.publishParticipantJoined('ses-1', 'tenant-1', 'user-42');

      expect(mockPublish.mock.calls[0][0]).toBe(
        'EDUSPHERE.sessions.participant.joined'
      );
      const encoded = mockPublish.mock.calls[0][1] as Buffer;
      const payload = JSON.parse(Buffer.from(encoded).toString());
      expect(payload.userId).toBe('user-42');
    });
  });

  // ── NATS connection failure ───────────────────────────────────────────────

  describe('NATS connection failure', () => {
    it('does not throw when NATS connect fails (non-fatal)', async () => {
      mockConnect.mockRejectedValueOnce(new Error('NATS down'));

      // publishEvent catches errors internally
      await expect(
        service.publishSessionStarted('ses-1', 'tenant-1', new Date())
      ).resolves.toBeUndefined();
    });
  });

  // ── onModuleDestroy ───────────────────────────────────────────────────────

  describe('onModuleDestroy', () => {
    it('drains NATS connection on destroy', async () => {
      // Establish connection first
      await service.publishSessionStarted('s', 't', new Date());
      await service.onModuleDestroy();

      expect(mockDrain).toHaveBeenCalledTimes(1);
    });

    it('handles drain failure gracefully', async () => {
      mockDrain.mockRejectedValueOnce(new Error('drain failed'));
      await service.publishSessionStarted('s', 't', new Date());

      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('does nothing when no connection was opened', async () => {
      await service.onModuleDestroy();
      expect(mockDrain).not.toHaveBeenCalled();
    });
  });
});
