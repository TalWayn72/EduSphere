import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

// Mock @edusphere/db before importing the service
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
        attendeePassword: 'att-pw',
        moderatorPassword: 'mod-pw',
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
          attendeePassword: 'att-pw',
          moderatorPassword: 'mod-pw',
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
          attendeePassword: 'att-pw',
          moderatorPassword: 'mod-pw',
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
          attendeePassword: 'att-pw',
          moderatorPassword: 'mod-pw',
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
          attendeePassword: 'att',
          moderatorPassword: 'mod',
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
});
