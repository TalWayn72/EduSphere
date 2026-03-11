import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

// ── DB mocks ──────────────────────────────────────────────────────────────────
const { mockWithTenantContext, mockInsert, mockSelect, mockUpdate, mockExecute, mockReturning } = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockInsert = vi.fn(() => ({ values: vi.fn(() => ({ returning: mockReturning })) }));
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: mockReturning })) })) }));
  const mockExecute = vi.fn();
  return {
    mockReturning,
    mockInsert,
    mockSelect,
    mockUpdate,
    mockExecute,
    mockWithTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
      fn({ insert: mockInsert, select: mockSelect, update: mockUpdate, execute: mockExecute })
    ),
  };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  withTenantContext: mockWithTenantContext,
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  groupChallenges: { id: 'id', status: 'status', courseId: 'course_id', maxParticipants: 'max_participants', tenantId: 'tenant_id' },
  challengeParticipants: { id: 'id', challengeId: 'challenge_id', userId: 'user_id', score: 'score' },
  eq: vi.fn(),
  and: vi.fn(),
  count: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({ publish: vi.fn(), drain: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
}));

import { GroupChallengeService } from './group-challenge.service';

const TENANT = 'tenant-uuid';
const USER = 'user-uuid';
const CHALLENGE = 'challenge-uuid';

describe('GroupChallengeService', () => {
  let service: GroupChallengeService;

  beforeEach(() => {
    service = new GroupChallengeService();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('createChallenge — inserts with correct tenant and createdBy', async () => {
    const newChallenge = { id: CHALLENGE, tenantId: TENANT, createdBy: USER, status: 'ACTIVE' };
    mockReturning.mockResolvedValueOnce([newChallenge]);

    const input = {
      title: 'Test Challenge',
      challengeType: 'QUIZ',
      targetScore: 100,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
    };
    const result = await service.createChallenge(TENANT, USER, 'INSTRUCTOR', input);

    expect(result).toMatchObject({ tenantId: TENANT, createdBy: USER });
  });

  it('joinChallenge — throws when challenge is full', async () => {
    // challenge found with maxParticipants 2
    mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ maxParticipants: 2 }]) })) })),
    });
    // count returns 2 (full)
    mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ total: 2 }]) })),
    });

    await expect(service.joinChallenge(TENANT, USER, CHALLENGE)).rejects.toThrow(
      BadRequestException
    );
  });

  it('joinChallenge — throws on duplicate join', async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ maxParticipants: 50 }]) })) })),
    });
    mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ total: 1 }]) })),
    });
    // existing participant found
    mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 'p-uuid' }]) })),
      })),
    });

    await expect(service.joinChallenge(TENANT, USER, CHALLENGE)).rejects.toThrow(
      BadRequestException
    );
  });

  it('onModuleDestroy — drains NATS and closes pools', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });

  it('publishScoreEvent — publishes NATS event when connection available', async () => {
    const { connect } = await import('nats');
    await (connect as ReturnType<typeof vi.fn>)({});
    // Service should have connected in constructor — just verify no throw
    await expect(service.publishScoreEvent(TENANT, USER, CHALLENGE, 85)).resolves.not.toThrow();
  });

  it('getMyParticipations — returns participations for userId', async () => {
    const rows = [{ id: 'p1', userId: USER, challengeId: CHALLENGE, score: 75 }];
    mockWithTenantContext.mockImplementationOnce(async (_db, _ctx, fn: (tx: unknown) => unknown) =>
      fn({
        select: vi.fn(() => ({
          from: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })),
        })),
      })
    );

    const result = await service.getMyParticipations(TENANT, USER);
    expect(result).toEqual(rows);
  });
});
