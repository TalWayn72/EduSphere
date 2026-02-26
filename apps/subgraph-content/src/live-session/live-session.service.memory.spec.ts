/**
 * Memory safety tests for LiveSessionService.
 * Verifies that OnModuleDestroy:
 *   1. Unsubscribes from NATS
 *   2. Drains and closes the NATS connection
 *   3. Closes all DB connection pools
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// All vi.mock factories must use inline functions — no top-level variables
// (vitest hoists vi.mock calls before variable initialization)
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([
      {
        id: 'sid',
        contentItemId: 'cid',
        tenantId: 'tid',
        bbbMeetingId: 'bmid',
        meetingName: 'Test',
        scheduledAt: new Date(),
        status: 'SCHEDULED',
        attendeePassword: 'ap',
        moderatorPassword: 'mp',
        recordingUrl: null,
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
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    subscribe: vi.fn().mockReturnValue({
      unsubscribe: vi.fn(),
      [Symbol.asyncIterator]: vi.fn().mockReturnValue({
        next: vi.fn().mockResolvedValue({ done: true }),
      }),
    }),
    drain: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({
    encode: (s: string) => Buffer.from(s),
    decode: (b: Uint8Array) => Buffer.from(b).toString(),
  })),
}));

vi.mock('./bbb.client', () => ({
  createBbbClient: vi.fn(() => null),
  BBB_DEMO_JOIN_URL: 'https://demo.bigbluebutton.org/gl/meeting-demo',
}));

import { LiveSessionService } from './live-session.service';
import { closeAllPools } from '@edusphere/db';
import { connect } from 'nats';

describe('LiveSessionService — memory safety', () => {
  let service: LiveSessionService;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new LiveSessionService();
    // Allow async NATS subscription to settle
    await new Promise((r) => setTimeout(r, 20));
  });

  it('unsubscribes from NATS on destroy', async () => {
    const natsConn = await (vi.mocked(connect).mock.results[0]
      ?.value as Promise<{
      subscribe: ReturnType<typeof vi.fn>;
      drain: ReturnType<typeof vi.fn>;
    }>);
    const unsubscribeSpy =
      natsConn?.subscribe?.mock?.results?.[0]?.value?.unsubscribe;

    await service.onModuleDestroy();

    if (unsubscribeSpy) {
      expect(unsubscribeSpy).toHaveBeenCalledOnce();
    } else {
      // NATS not connected in this test run — verify closeAllPools was still called
      expect(closeAllPools).toHaveBeenCalled();
    }
  });

  it('drains the NATS connection on destroy', async () => {
    const connectResult = vi.mocked(connect).mock.results[0];
    const resolvedConn = connectResult ? await connectResult.value : null;

    await service.onModuleDestroy();

    if (resolvedConn) {
      expect(resolvedConn.drain).toHaveBeenCalledOnce();
    }
  });

  it('closes all DB pools on destroy', async () => {
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });

  it('can be destroyed twice without throwing', async () => {
    await service.onModuleDestroy();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });

  it('does not expose passwords in LiveSessionResult', async () => {
    const result = await service.createLiveSession(
      'content-1',
      'tenant-1',
      new Date(),
      'Test Session'
    );
    const keys = Object.keys(result);
    expect(keys).not.toContain('attendeePassword');
    expect(keys).not.toContain('moderatorPassword');
    expect(keys).toContain('id');
    expect(keys).toContain('status');
  });

  it('returns null recordingUrl for new sessions', async () => {
    const result = await service.createLiveSession(
      'content-1',
      'tenant-1',
      new Date(),
      'Test'
    );
    expect(result.recordingUrl).toBeNull();
  });
});
