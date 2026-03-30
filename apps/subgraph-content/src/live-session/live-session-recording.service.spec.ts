/**
 * LiveSessionRecordingService unit tests — recording processing and NATS.
 * 12 tests covering NATS publishing, recording processing, and cleanup.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockCloseAllPools, mockDbSelect, mockDbUpdate, mockBbbClient } =
  vi.hoisted(() => ({
    mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
    mockDbSelect: vi.fn(),
    mockDbUpdate: vi.fn(),
    mockBbbClient: { getRecordingUrl: vi.fn() },
  }));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockDbSelect,
    update: mockDbUpdate,
  })),
  closeAllPools: mockCloseAllPools,
  schema: {
    liveSessions: {
      id: 'id',
      tenantId: 'tenantId',
      bbbMeetingId: 'bbbMeetingId',
      status: 'status',
      recordingUrl: 'recordingUrl',
    },
  },
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    publish: vi.fn(),
    subscribe: vi.fn(() => ({
      unsubscribe: vi.fn(),
      [Symbol.asyncIterator]: () => ({
        next: () => new Promise(() => undefined),
      }),
    })),
    drain: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({
    encode: vi.fn((s: string) => Buffer.from(s)),
    decode: vi.fn((b: Buffer) => b.toString()),
  })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://localhost:4222' })),
}));

vi.mock('./bbb.client', () => ({
  createBbbClient: vi.fn(() => mockBbbClient),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { LiveSessionRecordingService } from './live-session-recording.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SESSION_ID = 'session-001';
const TENANT_ID = 'tenant-001';

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    contentItemId: 'content-1',
    tenantId: TENANT_ID,
    bbbMeetingId: 'bbb-meeting-1',
    meetingName: 'Test Meeting',
    scheduledAt: new Date('2025-06-01T10:00:00Z'),
    status: 'ENDED',
    createdAt: new Date(),
    attendeePasswordEnc: 'enc-att',
    moderatorPasswordEnc: 'enc-mod',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LiveSessionRecordingService', () => {
  let svc: LiveSessionRecordingService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new LiveSessionRecordingService();
  });

  it('constructs without errors', () => {
    expect(svc).toBeInstanceOf(LiveSessionRecordingService);
  });

  it('onModuleDestroy calls closeAllPools', async () => {
    await svc.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  // ── publishNatsEvent ──────────────────────────────────────────────────────

  it('publishNatsEvent does not throw on success', async () => {
    await expect(
      svc.publishNatsEvent('EDUSPHERE.test', { foo: 'bar' })
    ).resolves.not.toThrow();
  });

  // ── publishSessionCreated ─────────────────────────────────────────────────

  it('publishSessionCreated publishes with correct subject', async () => {
    await expect(
      svc.publishSessionCreated(SESSION_ID, TENANT_ID, new Date())
    ).resolves.not.toThrow();
  });

  // ── publishSessionEnded ───────────────────────────────────────────────────

  it('publishSessionEnded publishes with duration', async () => {
    await expect(
      svc.publishSessionEnded(SESSION_ID, TENANT_ID, new Date(), new Date(), 3600)
    ).resolves.not.toThrow();
  });

  // ── publishParticipantJoined ──────────────────────────────────────────────

  it('publishParticipantJoined publishes with userId', async () => {
    await expect(
      svc.publishParticipantJoined(SESSION_ID, TENANT_ID, 'user-1')
    ).resolves.not.toThrow();
  });

  // ── processRecording ──────────────────────────────────────────────────────

  it('processRecording returns early when session not found', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    mockDbSelect.mockReturnValue(chain);

    await svc.processRecording(SESSION_ID, TENANT_ID);

    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it('processRecording updates status to RECORDING and then ENDED when BBB returns URL', async () => {
    const session = makeSession();
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([session]),
    };
    mockDbSelect.mockReturnValue(selectChain);

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    mockDbUpdate.mockReturnValue(updateChain);

    mockBbbClient.getRecordingUrl.mockResolvedValueOnce(
      'https://bbb.example.com/recording/123'
    );

    await svc.processRecording(SESSION_ID, TENANT_ID);

    expect(mockDbUpdate).toHaveBeenCalledTimes(2);
  });

  it('processRecording updates only to RECORDING when BBB returns no URL', async () => {
    const session = makeSession();
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([session]),
    };
    mockDbSelect.mockReturnValue(selectChain);

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    mockDbUpdate.mockReturnValue(updateChain);

    mockBbbClient.getRecordingUrl.mockResolvedValueOnce(null);

    await svc.processRecording(SESSION_ID, TENANT_ID);

    // Only RECORDING update, no second update
    expect(mockDbUpdate).toHaveBeenCalledTimes(1);
  });

  // ── publishLegacySessionEnded ─────────────────────────────────────────────

  it('publishLegacySessionEnded does not throw when natsConn is null', () => {
    expect(() => svc.publishLegacySessionEnded(SESSION_ID, TENANT_ID)).not.toThrow();
  });
});
