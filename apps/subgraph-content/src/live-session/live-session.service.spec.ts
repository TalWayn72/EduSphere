import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

// Mock @edusphere/db before importing the service
// SI-3: encryptField / decryptField / deriveTenantKey mocks simulate AES-256-GCM
// without requiring ENCRYPTION_MASTER_KEY env var in unit tests.
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([
      {
        id: 'session-uuid-1',
        contentItemId: 'content-1',
        tenantId: 'tenant-1',
        bbbMeetingId: 'bbb-meeting-1',
        meetingName: 'Hebrew Philosophy 101',
        scheduledAt: new Date('2026-03-01T10:00:00Z'),
        startedAt: null,
        endedAt: null,
        recordingUrl: null,
        // SI-3: columns use *Enc suffix — store ciphertext, NOT plaintext
        attendeePasswordEnc: 'encrypted:att-pw',
        moderatorPasswordEnc: 'encrypted:mod-pw',
        status: 'SCHEDULED',
        createdAt: new Date(),
      },
    ]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    liveSessions: {
      id: 'id',
      contentItemId: 'contentItemId',
      tenantId: 'tenantId',
    },
  },
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  and: vi.fn((...args) => args),
  // SI-3: PII encryption helpers — mock without real AES key for unit tests
  encryptField: vi.fn((v: string) => `encrypted:${v}`),
  decryptField: vi.fn((v: string) => v.replace(/^encrypted:/, '')),
  deriveTenantKey: vi.fn(() => Buffer.alloc(32, 0)),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    subscribe: vi.fn().mockReturnValue({
      unsubscribe: vi.fn(),
      [Symbol.asyncIterator]: vi
        .fn()
        .mockReturnValue({ next: vi.fn().mockResolvedValue({ done: true }) }),
    }),
    drain: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({
    encode: vi.fn((s) => Buffer.from(s)),
    decode: vi.fn((b) => Buffer.from(b).toString()),
  })),
}));

vi.mock('./bbb.client', () => ({
  createBbbClient: vi.fn(() => null),
  BBB_DEMO_JOIN_URL: 'https://demo.bigbluebutton.org/gl/meeting-demo',
}));

import { LiveSessionService } from './live-session.service';
import { createBbbClient } from './bbb.client';

describe('LiveSessionService', () => {
  let service: LiveSessionService;

  beforeEach(async () => {
    service = new LiveSessionService();
    // Allow NATS subscription to settle
    await new Promise((r) => setTimeout(r, 10));
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    vi.clearAllMocks();
  });

  describe('createLiveSession', () => {
    it('inserts a session record and returns mapped result', async () => {
      const result = await service.createLiveSession(
        'content-1',
        'tenant-1',
        new Date('2026-03-01T10:00:00Z'),
        'Hebrew Philosophy 101'
      );

      expect(result.id).toBe('session-uuid-1');
      expect(result.contentItemId).toBe('content-1');
      expect(result.meetingName).toBe('Hebrew Philosophy 101');
      expect(result.status).toBe('SCHEDULED');
      expect(result.recordingUrl).toBeNull();
    });

    it('works in demo mode (BBB not configured)', async () => {
      vi.mocked(createBbbClient).mockReturnValue(null);
      const result = await service.createLiveSession(
        'content-1',
        'tenant-1',
        new Date(),
        'Test'
      );
      expect(result.id).toBeTruthy();
    });
  });

  describe('getJoinUrl', () => {
    it('returns demo URL when BBB is not configured', async () => {
      vi.mocked(createBbbClient).mockReturnValue(null);

      // Mock DB to return a live session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = (service as any).db;
      db.limit = vi.fn().mockResolvedValue([
        {
          id: 'session-1',
          contentItemId: 'content-1',
          tenantId: 'tenant-1',
          bbbMeetingId: 'bbb-1',
          meetingName: 'Test',
          scheduledAt: new Date(),
          status: 'LIVE',
          // SI-3: *Enc columns store ciphertext; decryptField mock strips 'encrypted:' prefix
          attendeePasswordEnc: 'encrypted:att-pw',
          moderatorPasswordEnc: 'encrypted:mod-pw',
          recordingUrl: null,
        },
      ]);

      const url = await service.getJoinUrl(
        'session-1',
        'tenant-1',
        'Alice',
        'LEARNER'
      );
      expect(url).toBe('https://demo.bigbluebutton.org/gl/meeting-demo');
    });

    it('returns moderator join URL for INSTRUCTOR role when BBB is configured', async () => {
      const mockBuildJoinUrl = vi
        .fn()
        .mockReturnValue('https://bbb.example.com/join?pw=mod-pw');
      vi.mocked(createBbbClient).mockReturnValue({
        buildJoinUrl: mockBuildJoinUrl,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = (service as any).db;
      db.limit = vi.fn().mockResolvedValue([
        {
          id: 'session-1',
          contentItemId: 'content-1',
          tenantId: 'tenant-1',
          bbbMeetingId: 'bbb-1',
          meetingName: 'Test',
          scheduledAt: new Date(),
          status: 'LIVE',
          // SI-3: *Enc columns — decryptField mock yields 'mod-pw' for INSTRUCTOR
          attendeePasswordEnc: 'encrypted:att-pw',
          moderatorPasswordEnc: 'encrypted:mod-pw',
          recordingUrl: null,
        },
      ]);

      await service.getJoinUrl(
        'session-1',
        'tenant-1',
        'Prof. Cohen',
        'INSTRUCTOR'
      );
      expect(mockBuildJoinUrl).toHaveBeenCalledWith(
        'bbb-1',
        'Prof. Cohen',
        'mod-pw'
      );
    });

    it('returns attendee join URL for LEARNER role', async () => {
      const mockBuildJoinUrl = vi
        .fn()
        .mockReturnValue('https://bbb.example.com/join?pw=att-pw');
      vi.mocked(createBbbClient).mockReturnValue({
        buildJoinUrl: mockBuildJoinUrl,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = (service as any).db;
      db.limit = vi.fn().mockResolvedValue([
        {
          id: 'session-1',
          bbbMeetingId: 'bbb-1',
          status: 'LIVE',
          // SI-3: *Enc columns — decryptField mock yields 'att-pw' for LEARNER
          attendeePasswordEnc: 'encrypted:att-pw',
          moderatorPasswordEnc: 'encrypted:mod-pw',
        },
      ]);

      await service.getJoinUrl('session-1', 'tenant-1', 'Student', 'LEARNER');
      expect(mockBuildJoinUrl).toHaveBeenCalledWith(
        'bbb-1',
        'Student',
        'att-pw'
      );
    });

    it('throws NotFoundException for non-existent session', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = (service as any).db;
      db.limit = vi.fn().mockResolvedValue([]);

      await expect(
        service.getJoinUrl('missing', 'tenant-1', 'Alice', 'LEARNER')
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException for ended sessions', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = (service as any).db;
      db.limit = vi.fn().mockResolvedValue([
        {
          id: 'session-1',
          status: 'ENDED',
          attendeePasswordEnc: 'encrypted:att',
          moderatorPasswordEnc: 'encrypted:mod',
        },
      ]);

      await expect(
        service.getJoinUrl('session-1', 'tenant-1', 'Alice', 'LEARNER')
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('onModuleDestroy', () => {
    it('calls closeAllPools and unsubscribes NATS', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });

  // ── SI-3 Regression — AES-256-GCM PII encryption ─────────────────────────
  // These tests guard against plaintext passwords being written to the DB.
  // If any of these fail, it means encryptField() is no longer being called
  // before INSERT, which is a critical security regression (SI-3).
  describe('SI-3 regression — passwords must be encrypted before DB write', () => {
    it('does NOT store raw plaintext passwords in the DB values() call', async () => {
      const { encryptField, deriveTenantKey } = await import('@edusphere/db');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = (service as any).db;
      const capturedValues: Record<string, unknown>[] = [];
      db.values = vi.fn((v: Record<string, unknown>) => {
        capturedValues.push(v);
        return db;
      });
      db.returning = vi.fn().mockResolvedValue([
        {
          id: 'si3-test',
          contentItemId: 'c-1',
          tenantId: 'tenant-si3',
          bbbMeetingId: 'bbb-si3',
          meetingName: 'SI-3 Test',
          scheduledAt: new Date(),
          attendeePasswordEnc: 'encrypted:dummy',
          moderatorPasswordEnc: 'encrypted:dummy',
          status: 'SCHEDULED',
          recordingUrl: null,
          createdAt: new Date(),
        },
      ]);

      await service.createLiveSession('c-1', 'tenant-si3', new Date(), 'SI-3 Test');

      expect(encryptField).toHaveBeenCalled();
      expect(deriveTenantKey).toHaveBeenCalledWith('tenant-si3');

      // The values passed to DB must NOT be plaintext 32-char hex passwords.
      // encryptField mock returns 'encrypted:<plaintext>' so capturedValues
      // must contain the prefixed form, not the raw hex.
      if (capturedValues.length > 0) {
        const vals = capturedValues[0];
        expect(vals).not.toHaveProperty('attendeePassword');
        expect(vals).not.toHaveProperty('moderatorPassword');
        // The *Enc values must pass through encryptField (mock returns 'encrypted:...')
        const attEnc = vals?.['attendeePasswordEnc'] as string | undefined;
        const modEnc = vals?.['moderatorPasswordEnc'] as string | undefined;
        if (attEnc) expect(attEnc).toMatch(/^encrypted:/);
        if (modEnc) expect(modEnc).toMatch(/^encrypted:/);
      }
    });

    it('decryptField is called when building join URL', async () => {
      const { decryptField } = await import('@edusphere/db');
      vi.mocked(createBbbClient).mockReturnValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = (service as any).db;
      db.limit = vi.fn().mockResolvedValue([
        {
          id: 'session-si3',
          bbbMeetingId: 'bbb-si3',
          status: 'LIVE',
          attendeePasswordEnc: 'encrypted:att-secret',
          moderatorPasswordEnc: 'encrypted:mod-secret',
        },
      ]);

      await service.getJoinUrl('session-si3', 'tenant-si3', 'Leila', 'LEARNER');

      // decryptField MUST have been called — never pass ciphertext directly to BBB
      expect(decryptField).toHaveBeenCalledWith('encrypted:att-secret', expect.anything());
    });
  });
});
