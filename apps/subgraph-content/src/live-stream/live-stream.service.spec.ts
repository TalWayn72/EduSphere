import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// ── DB mock ────────────────────────────────────────────────────────────────
const _mockInsert = vi.fn();
const _mockUpdate = vi.fn();
const _mockSelectChain = {
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    live_session_configs: {
      id: 'id',
      session_id: 'session_id',
      tenant_id: 'tenant_id',
      lesson_id: 'lesson_id',
      instructor_id: 'instructor_id',
      stream_type: 'stream_type',
      viewer_count: 'viewer_count',
      max_viewers: 'max_viewers',
      is_screen_sharing: 'is_screen_sharing',
      auto_record: 'auto_record',
    },
    liveSessions: { id: 'id', status: 'status' },
  },
  eq: vi.fn((_a, _b) => 'eq-cond'),
  and: vi.fn((...args: unknown[]) => args),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    publish: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({
    encode: vi.fn((v: string) => v),
    decode: vi.fn(),
  })),
}));

// Build a chainable mock DB that can return different values per call
let selectCalls = 0;
let selectReturns: unknown[][] = [];

const mockDb: Record<string, unknown> = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  limit: vi.fn(async () => selectReturns[selectCalls++] ?? []),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  update: vi.fn(() => mockDb),
  set: vi.fn(() => mockDb),
};

import { LiveStreamService } from './live-stream.service.js';

const SESSION_ID = 'sess-1';
const TENANT_ID = 'tenant-1';
const INSTRUCTOR_ID = 'instructor-1';

const sampleCfg = {
  id: 'cfg-1',
  session_id: SESSION_ID,
  tenant_id: TENANT_ID,
  lesson_id: 'lesson-1',
  instructor_id: INSTRUCTOR_ID,
  stream_type: 'BBB',
  viewer_count: 0,
  max_viewers: 100,
  is_screen_sharing: false,
  auto_record: true,
};

const sampleSess = {
  id: SESSION_ID,
  status: 'SCHEDULED',
  meetingName: 'Test Meeting',
  scheduledAt: new Date('2026-01-01'),
};

function resetDb(...sequence: unknown[][]): void {
  selectCalls = 0;
  selectReturns = sequence;
  vi.mocked(mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  vi.mocked(mockDb.values as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  vi.mocked(mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  vi.mocked(mockDb.set as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
}

describe('LiveStreamService', () => {
  let service: LiveStreamService;

  beforeEach(() => {
    vi.clearAllMocks();
    selectCalls = 0;
    selectReturns = [];
    service = new LiveStreamService();
  });

  describe('createConfig', () => {
    it('inserts config record and returns session', async () => {
      resetDb([sampleCfg], [sampleSess]);
      const result = await service.createConfig(
        SESSION_ID,
        TENANT_ID,
        INSTRUCTOR_ID,
        {
          streamType: 'BBB',
          maxViewers: 100,
        }
      );
      expect(mockDb.insert).toHaveBeenCalled();
      expect(result.sessionId).toBe(SESSION_ID);
      expect(result.status).toBe('PRE_LIVE'); // SCHEDULED → PRE_LIVE
    });

    it('throws NotFoundException when fetchJoined returns null', async () => {
      resetDb([], []); // empty results → cfg not found
      await expect(
        service.createConfig(SESSION_ID, TENANT_ID, INSTRUCTOR_ID, {})
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('transition — start', () => {
    it('transitions SCHEDULED → LIVE and returns updated session', async () => {
      // transition reads sess first, then fetchJoined reads cfg + sess
      resetDb([sampleSess], [sampleCfg], [{ ...sampleSess, status: 'LIVE' }]);
      const result = await service.transition(
        SESSION_ID,
        TENANT_ID,
        INSTRUCTOR_ID,
        'start'
      );
      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws BadRequestException on invalid transition ENDED → start', async () => {
      resetDb([{ ...sampleSess, status: 'ENDED' }]);
      await expect(
        service.transition(SESSION_ID, TENANT_ID, INSTRUCTOR_ID, 'start')
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when session not found', async () => {
      resetDb([]);
      await expect(
        service.transition(SESSION_ID, TENANT_ID, INSTRUCTOR_ID, 'start')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('transition — pause', () => {
    it('transitions LIVE → PAUSED', async () => {
      const liveSess = { ...sampleSess, status: 'LIVE' };
      resetDb([liveSess], [sampleCfg], [{ ...liveSess, status: 'PAUSED' }]);
      const result = await service.transition(
        SESSION_ID,
        TENANT_ID,
        INSTRUCTOR_ID,
        'pause'
      );
      expect(result).toBeDefined();
    });

    it('throws BadRequestException pausing a PAUSED session', async () => {
      resetDb([{ ...sampleSess, status: 'PAUSED' }]);
      await expect(
        service.transition(SESSION_ID, TENANT_ID, INSTRUCTOR_ID, 'pause')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('transition — end', () => {
    it('transitions LIVE → ENDED', async () => {
      const liveSess = { ...sampleSess, status: 'LIVE' };
      resetDb([liveSess], [sampleCfg], [{ ...liveSess, status: 'ENDED' }]);
      const result = await service.transition(
        SESSION_ID,
        TENANT_ID,
        INSTRUCTOR_ID,
        'end'
      );
      expect(result).toBeDefined();
    });

    it('throws BadRequestException ending an ENDED session', async () => {
      resetDb([{ ...sampleSess, status: 'ENDED' }]);
      await expect(
        service.transition(SESSION_ID, TENANT_ID, INSTRUCTOR_ID, 'end')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSession', () => {
    it('returns null when config not found', async () => {
      resetDb([], []);
      const result = await service.getSession(SESSION_ID, TENANT_ID);
      expect(result).toBeNull();
    });

    it('returns session data when found', async () => {
      resetDb([sampleCfg], [sampleSess]);
      const result = await service.getSession(SESSION_ID, TENANT_ID);
      expect(result?.sessionId).toBe(SESSION_ID);
      expect(result?.meetingName).toBe('Test Meeting');
      expect(result?.viewerCount).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('updates max_viewers and returns session', async () => {
      resetDb([sampleCfg], [sampleSess]);
      const result = await service.updateConfig(SESSION_ID, TENANT_ID, {
        maxViewers: 200,
      });
      expect(mockDb.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws NotFoundException when session gone after update', async () => {
      resetDb([], []);
      await expect(
        service.updateConfig(SESSION_ID, TENANT_ID, { maxViewers: 50 })
      ).rejects.toThrow(NotFoundException);
    });
  });
});
