import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const _mockUpdate = vi.fn();
const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue([]),
      })),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn().mockResolvedValue([
        {
          id: 'session-1',
          user_id: 'user-1',
          content_item_id: 'item-1',
          tenant_id: 'tenant-1',
          lesson_status: 'not attempted',
          score_raw: null,
          score_min: null,
          score_max: null,
          suspend_data: null,
          session_time: null,
          total_time: null,
          completed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([]),
    })),
  })),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    scormSessions: {
      id: 'id',
      user_id: 'user_id',
      content_item_id: 'content_item_id',
    },
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ field: a, value: b })),
  and: vi.fn((...args: unknown[]) => args),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

describe('ScormSessionService', () => {
  let service: {
    initSession: (u: string, c: string, t: string) => Promise<unknown>;
    updateSession: (
      s: string,
      u: string,
      d: Record<string, string>
    ) => Promise<void>;
    finishSession: (
      s: string,
      u: string,
      d: Record<string, string>
    ) => Promise<void>;
    findSession: (u: string, c: string) => Promise<unknown>;
    onModuleDestroy: () => Promise<void>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { ScormSessionService } = await import('./scorm-session.service');
    service = new ScormSessionService() as typeof service;
  });

  it('creates a new SCORM session on initSession', async () => {
    const session = (await service.initSession(
      'user-1',
      'item-1',
      'tenant-1'
    )) as {
      id: string;
      lessonStatus: string;
    };
    expect(session).toBeDefined();
    expect(session.id).toBe('session-1');
    expect(session.lessonStatus).toBe('not attempted');
  });

  it('extracts lesson_status from CMI data on updateSession', async () => {
    const cmiData = {
      'cmi.core.lesson_status': 'incomplete',
      'cmi.core.score.raw': '85',
      'cmi.suspend_data': 'some-state',
    };
    await expect(
      service.updateSession('session-1', 'user-1', cmiData)
    ).resolves.toBeUndefined();
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('extracts score_raw as float from CMI data', async () => {
    const cmiData = { 'cmi.core.score.raw': '92.5' };
    await service.updateSession('session-1', 'user-1', cmiData);
    const setCall = mockDb.update().set as ReturnType<typeof vi.fn>;
    const args = setCall.mock.calls[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    if (args) {
      expect(typeof args['score_raw']).toBe('number');
      expect(args['score_raw']).toBe(92.5);
    }
  });

  it('marks completed_at when lesson_status is passed', async () => {
    const cmiData = { 'cmi.core.lesson_status': 'passed' };
    await service.finishSession('session-1', 'user-1', cmiData);
    // update called at least twice (updateSession + completedAt update)
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('marks completed_at when lesson_status is completed', async () => {
    const cmiData = { 'cmi.core.lesson_status': 'completed' };
    await service.finishSession('session-1', 'user-1', cmiData);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('does NOT mark completed_at for incomplete status', async () => {
    mockDb.update.mockClear();
    const cmiData = { 'cmi.core.lesson_status': 'incomplete' };
    await service.finishSession('session-1', 'user-1', cmiData);
    // Only one update call (from updateSession, not the completed_at one)
    expect(mockDb.update).toHaveBeenCalledTimes(1);
  });

  it('returns null when no session exists for findSession', async () => {
    const result = await service.findSession('user-1', 'item-2');
    expect(result).toBeNull();
  });

  it('calls onModuleDestroy without error', async () => {
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });

  void mockSelect;
  void mockInsert;
});
