import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// ── Shared mock db builder ────────────────────────────────────────────────────

function makeMockDb(overrides: Record<string, unknown> = {}) {
  const self: Record<string, unknown> = {
    insert: vi.fn(),
    values: vi.fn(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
    set: vi.fn(),
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  (self['insert'] as ReturnType<typeof vi.fn>).mockReturnValue(self);
  (self['values'] as ReturnType<typeof vi.fn>).mockReturnValue(self);
  (self['update'] as ReturnType<typeof vi.fn>).mockReturnValue(self);
  (self['set'] as ReturnType<typeof vi.fn>).mockReturnValue(self);
  (self['select'] as ReturnType<typeof vi.fn>).mockReturnValue(self);
  (self['from'] as ReturnType<typeof vi.fn>).mockReturnValue(self);
  (self['where'] as ReturnType<typeof vi.fn>).mockReturnValue(self);
  return self;
}

// ── Module-level state (accessible across mock factory and tests) ─────────────

let _mockDb = makeMockDb();
let _mockSendBreakoutRooms = vi.fn().mockResolvedValue(undefined);

// vi.mock hoisted — inline factories only; capture state via module-level lets

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => _mockDb),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    breakoutRooms: {},
    liveSessions: {},
  },
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  withTenantContext: vi.fn(
    (_db: unknown, _ctx: unknown, fn: (db: unknown) => Promise<unknown>) => fn(_mockDb),
  ),
}));

vi.mock('./bbb.client', () => ({
  createBbbClient: vi.fn(() => ({
    sendBreakoutRooms: (...args: unknown[]) => _mockSendBreakoutRooms(...args),
  })),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { BreakoutService } from './breakout.service';
import { closeAllPools } from '@edusphere/db';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TENANT = 'tenant-abc';
const USER = 'instructor-1';
const SESSION = 'session-uuid-1';

function makeRoom(i = 1) {
  return {
    id: `room-${i}`,
    sessionId: SESSION,
    tenantId: TENANT,
    roomName: `Group ${i}`,
    bbbBreakoutId: `${SESSION}-br-${i}`,
    capacity: 10,
    assignedUserIds: [],
    createdAt: new Date(),
  };
}

const mockLiveSession = { id: SESSION, tenantId: TENANT, bbbMeetingId: 'bbb-meeting-1' };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BreakoutService', () => {
  let service: BreakoutService;

  beforeEach(() => {
    _mockSendBreakoutRooms = vi.fn().mockResolvedValue(undefined);
    _mockDb = makeMockDb();
    // Default: insert+values+returning stores rooms; limit returns live session
    _mockDb['returning'] = vi.fn().mockResolvedValue([makeRoom(1), makeRoom(2)]);
    _mockDb['limit'] = vi.fn().mockResolvedValue([mockLiveSession]);
    service = new BreakoutService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  // 1. createBreakoutRooms stores rooms in DB
  it('stores breakout rooms in the database', async () => {
    const rooms = await service.createBreakoutRooms(
      SESSION,
      [{ roomName: 'Group 1', capacity: 10 }, { roomName: 'Group 2', capacity: 8 }],
      TENANT,
      USER,
    );
    expect(rooms).toHaveLength(2);
    expect(rooms[0].roomName).toBe('Group 1');
    expect(_mockDb['insert']).toHaveBeenCalled();
  });

  // 2. createBreakoutRooms calls BBB API
  it('calls BBB sendBreakoutRooms API', async () => {
    await service.createBreakoutRooms(
      SESSION,
      [{ roomName: 'Group 1', capacity: 10 }],
      TENANT,
      USER,
    );
    expect(_mockSendBreakoutRooms).toHaveBeenCalledWith(
      mockLiveSession.bbbMeetingId,
      expect.arrayContaining([expect.objectContaining({ name: 'Group 1' })]),
    );
  });

  // 3. assignUsersToRoom updates assigned_user_ids
  it('assignUsersToRoom updates the assigned_user_ids array', async () => {
    _mockDb['returning'] = vi.fn().mockResolvedValue([]);
    await service.assignUsersToRoom('room-1', ['user-a', 'user-b'], TENANT, USER);
    expect(_mockDb['update']).toHaveBeenCalled();
    expect(_mockDb['set']).toHaveBeenCalledWith({ assignedUserIds: ['user-a', 'user-b'] });
  });

  // 4. listRooms returns rooms for session
  it('listRooms returns all breakout rooms for the session', async () => {
    // listRooms ends the chain with .where() — no .limit()
    _mockDb['where'] = vi.fn().mockResolvedValue([makeRoom(1), makeRoom(2)]);
    const rooms = await service.listRooms(SESSION, TENANT, USER);
    expect(rooms).toHaveLength(2);
    expect(rooms[0].sessionId).toBe(SESSION);
  });

  // 5. createBreakoutRooms enforces tenant isolation (session not found for tenant)
  it('throws NotFoundException when live session not found for tenant', async () => {
    // Insert succeeds (withTenantContext), but direct DB select for session returns []
    _mockDb['returning'] = vi.fn().mockResolvedValue([makeRoom(1)]);
    _mockDb['limit'] = vi.fn().mockResolvedValue([]); // session not found

    await expect(
      service.createBreakoutRooms(SESSION, [{ roomName: 'Room', capacity: 5 }], TENANT, USER),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  // 6. onModuleDestroy calls closeAllPools
  it('onModuleDestroy calls closeAllPools', async () => {
    await service.onModuleDestroy();
    expect(vi.mocked(closeAllPools)).toHaveBeenCalled();
  });
});
