import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DB mock ────────────────────────────────────────────────────────────────
let selectReturns: unknown[][] = [];
let selectCalls = 0;

const mockDb: Record<string, unknown> = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  limit: vi.fn(async () => selectReturns[selectCalls++] ?? []),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  onConflictDoUpdate: vi.fn(() => Promise.resolve()),
  update: vi.fn(() => mockDb),
  set: vi.fn(() => mockDb),
};

// Override select to return rows array (not paginated)
const _mockSelectFull = vi.fn(async () => selectReturns[selectCalls++] ?? []);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    live_session_presence: {
      session_id: 'session_id',
      user_id: 'user_id',
      tenant_id: 'tenant_id',
      is_active: 'is_active',
      joined_at: 'joined_at',
      left_at: 'left_at',
    },
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

import { PresenceService } from './presence.service.js';

const SESSION_ID = 'sess-1';
const TENANT_ID = 'tenant-1';
const USER_ID = 'user-1';

const now = new Date('2026-01-01T10:00:00Z');

function makePresenceRow(userId: string, isActive = true) {
  return {
    user_id: userId,
    is_active: isActive,
    joined_at: now,
    tenant_id: TENANT_ID,
    session_id: SESSION_ID,
  };
}

function _resetDb(...sequences: unknown[][]): void {
  selectCalls = 0;
  selectReturns = sequences;
  // The select chain for getActiveViewers resolves without .limit()
  vi.mocked(mockDb.where as ReturnType<typeof vi.fn>).mockImplementation(() => {
    const current = selectReturns[selectCalls++] ?? [];
    return Object.assign(Promise.resolve(current), mockDb);
  });
  vi.mocked(mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  vi.mocked(mockDb.values as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  vi.mocked(
    mockDb.onConflictDoUpdate as ReturnType<typeof vi.fn>
  ).mockResolvedValue(undefined);
  vi.mocked(mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
  vi.mocked(mockDb.set as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);
}

describe('PresenceService', () => {
  let service: PresenceService;

  beforeEach(() => {
    vi.clearAllMocks();
    selectCalls = 0;
    selectReturns = [];
    service = new PresenceService();
  });

  describe('join', () => {
    it('inserts presence record and returns active viewer count', async () => {
      // join calls: insert + upsert (via onConflictDoUpdate), then getActiveViewers
      vi.mocked(mockDb.where as ReturnType<typeof vi.fn>).mockResolvedValue([
        makePresenceRow(USER_ID),
      ]);
      vi.mocked(mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDb
      );
      vi.mocked(mockDb.values as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDb
      );
      vi.mocked(
        mockDb.onConflictDoUpdate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(undefined);

      const result = await service.join(SESSION_ID, TENANT_ID, USER_ID);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(result.activeViewers).toBe(1);
      expect(result.viewers[0].userId).toBe(USER_ID);
    });

    it('upserts on re-join (second join returns updated record)', async () => {
      vi.mocked(mockDb.where as ReturnType<typeof vi.fn>).mockResolvedValue([
        makePresenceRow(USER_ID),
        makePresenceRow('user-2'),
      ]);
      vi.mocked(mockDb.insert as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDb
      );
      vi.mocked(mockDb.values as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDb
      );
      vi.mocked(
        mockDb.onConflictDoUpdate as ReturnType<typeof vi.fn>
      ).mockResolvedValue(undefined);

      const result = await service.join(SESSION_ID, TENANT_ID, USER_ID);
      expect(result.activeViewers).toBe(2);
    });
  });

  describe('leave', () => {
    it('marks presence is_active=false and updates left_at', async () => {
      vi.mocked(mockDb.where as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      vi.mocked(mockDb.update as ReturnType<typeof vi.fn>).mockReturnValue(
        mockDb
      );
      vi.mocked(mockDb.set as ReturnType<typeof vi.fn>).mockReturnValue(mockDb);

      await expect(
        service.leave(SESSION_ID, TENANT_ID, USER_ID)
      ).resolves.toBeUndefined();
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('getActiveViewers', () => {
    it('returns correct count of active viewers', async () => {
      vi.mocked(mockDb.where as ReturnType<typeof vi.fn>).mockResolvedValue([
        makePresenceRow('user-1'),
        makePresenceRow('user-2'),
        makePresenceRow('user-3'),
      ]);

      const result = await service.getActiveViewers(SESSION_ID, TENANT_ID);
      expect(result.activeViewers).toBe(3);
      expect(result.viewers).toHaveLength(3);
    });

    it('returns empty list when no active viewers', async () => {
      vi.mocked(mockDb.where as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const result = await service.getActiveViewers(SESSION_ID, TENANT_ID);
      expect(result.activeViewers).toBe(0);
      expect(result.viewers).toHaveLength(0);
    });

    it('maps joined_at to ISO string', async () => {
      vi.mocked(mockDb.where as ReturnType<typeof vi.fn>).mockResolvedValue([
        makePresenceRow(USER_ID),
      ]);
      const result = await service.getActiveViewers(SESSION_ID, TENANT_ID);
      expect(result.viewers[0].joinedAt).toBe(now.toISOString());
    });
  });
});
