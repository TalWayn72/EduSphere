import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockWithTenantContext = vi.fn(async (_db, _ctx, fn: (tx: unknown) => unknown) => fn(mockTx));
const mockReturning = vi.fn();
const mockTx = {
  select: vi.fn(),
  update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: mockReturning })) })) })),
};

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: mockWithTenantContext,
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  groupChallenges: { id: 'id' },
  challengeParticipants: { id: 'id', challengeId: 'challenge_id', userId: 'user_id', score: 'score', joinedAt: 'joined_at' },
  eq: vi.fn((col, _val) => ({ col })),
  and: vi.fn((...args) => args),
  desc: vi.fn((col) => col),
  asc: vi.fn((col) => col),
}));

import { GroupChallengeLeaderboardService } from './group-challenge-leaderboard.service';

const TENANT = 'tenant-uuid';
const USER = 'user-uuid';
const OTHER = 'other-uuid';
const CHALLENGE = 'challenge-uuid';

function makeService() {
  const mockChallengeService = {
    publishScoreEvent: vi.fn().mockResolvedValue(undefined),
  };
  return new GroupChallengeLeaderboardService(mockChallengeService as never);
}

describe('GroupChallengeLeaderboardService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getChallengeLeaderboard — throws NotFoundException when challenge missing', async () => {
    mockTx.select.mockReturnValueOnce({
      from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })),
    });

    const service = makeService();
    await expect(service.getChallengeLeaderboard(TENANT, USER, CHALLENGE)).rejects.toThrow(
      NotFoundException
    );
  });

  it('getChallengeLeaderboard — returns participants sorted by score desc', async () => {
    const participants = [
      { id: 'p1', userId: USER, challengeId: CHALLENGE, score: 90, rank: null, joinedAt: new Date(), completedAt: null },
      { id: 'p2', userId: OTHER, challengeId: CHALLENGE, score: 70, rank: null, joinedAt: new Date(), completedAt: null },
    ];
    mockTx.select
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: CHALLENGE }]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue(participants) })) })) })) });

    const service = makeService();
    const result = await service.getChallengeLeaderboard(TENANT, USER, CHALLENGE);
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(2);
  });

  it('submitChallengeScore — IDOR: rejects if user is not a participant', async () => {
    // challenge exists, but user not a participant
    mockTx.select
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) });

    const service = makeService();
    await expect(service.submitChallengeScore(TENANT, USER, CHALLENGE, 80)).rejects.toThrow(
      BadRequestException
    );
  });

  it('submitChallengeScore — updates score and triggers NATS event', async () => {
    const participant = { id: 'p1', userId: USER, challengeId: CHALLENGE, score: 0 };
    const updatedParticipant = { ...participant, score: 90, completedAt: new Date() };

    mockReturning.mockResolvedValueOnce([updatedParticipant]);
    // participant found, then rank recompute select
    mockTx.select
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([participant]) })) })) })
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([{ id: 'p1' }]) })) })) });

    const mockChallengeService = { publishScoreEvent: vi.fn().mockResolvedValue(undefined) };
    const service = new GroupChallengeLeaderboardService(mockChallengeService as never);

    await service.submitChallengeScore(TENANT, USER, CHALLENGE, 90);
    expect(mockChallengeService.publishScoreEvent).toHaveBeenCalledWith(TENANT, USER, CHALLENGE, 90);
  });
});
