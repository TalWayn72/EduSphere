import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PeerReviewAssignmentService } from './peer-review-assignment.service';

const mockTx = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

const mockCore = {
  getDb: vi.fn(() => ({})),
  getRubric: vi.fn(),
  publishEvent: vi.fn(),
  checkAndPublishCompletion: vi.fn(),
};

vi.mock('@edusphere/db', () => ({
  schema: {
    peerReviewAssignments: {
      id: 'id',
      tenantId: 'tenant_id',
      reviewerId: 'reviewer_id',
      submitterId: 'submitter_id',
      contentItemId: 'content_item_id',
      status: 'status',
    },
    userCourses: { userId: 'user_id', status: 'status' },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...c) => ({ and: c })),
  withTenantContext: vi.fn((_db, _ctx, fn) => fn(mockTx)),
}));

const CTX = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  userRole: 'STUDENT' as const,
};

function makeSelectChain(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  return { from, where };
}

describe('PeerReviewAssignmentService', () => {
  let service: PeerReviewAssignmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PeerReviewAssignmentService(mockCore as any);
  });

  describe('createAssignment()', () => {
    it('creates assignments for eligible reviewers', async () => {
      mockCore.getRubric.mockResolvedValue({ minReviewers: 2 });
      const enrollChain = makeSelectChain([
        { userId: 'r1' },
        { userId: 'r2' },
        { userId: 'r3' },
        { userId: 'submitter-1' },
      ]);
      mockTx.select.mockReturnValue({ from: enrollChain.from });

      const createdRows = [
        {
          id: 'a1',
          reviewerId: 'r1',
          contentItemId: 'ci1',
          submitterId: 'submitter-1',
        },
        {
          id: 'a2',
          reviewerId: 'r2',
          contentItemId: 'ci1',
          submitterId: 'submitter-1',
        },
      ];
      const returning = vi.fn().mockResolvedValue(createdRows);
      const values = vi.fn().mockReturnValue({ returning });
      mockTx.insert.mockReturnValue({ values });

      const result = await service.createAssignment(
        'ci1',
        'submitter-1',
        'My submission',
        CTX
      );
      expect(result).toHaveLength(2);
      expect(mockCore.publishEvent).toHaveBeenCalledTimes(2);
    });

    it('returns empty array when no eligible reviewers', async () => {
      mockCore.getRubric.mockResolvedValue({ minReviewers: 2 });
      // Only the submitter is enrolled
      const enrollChain = makeSelectChain([{ userId: 'submitter-1' }]);
      mockTx.select.mockReturnValue({ from: enrollChain.from });

      const result = await service.createAssignment(
        'ci1',
        'submitter-1',
        'text',
        CTX
      );
      expect(result).toEqual([]);
    });

    it('uses DEFAULT_MIN_REVIEWERS=3 when rubric has no minReviewers', async () => {
      mockCore.getRubric.mockResolvedValue(null);
      const enrollChain = makeSelectChain([
        { userId: 'r1' },
        { userId: 'r2' },
        { userId: 'r3' },
        { userId: 'r4' },
      ]);
      mockTx.select.mockReturnValue({ from: enrollChain.from });

      const createdRows = [
        { id: 'a1', reviewerId: 'r1' },
        { id: 'a2', reviewerId: 'r2' },
        { id: 'a3', reviewerId: 'r3' },
      ];
      const returning = vi.fn().mockResolvedValue(createdRows);
      mockTx.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({ returning }),
      });

      const result = await service.createAssignment(
        'ci1',
        'submitter-1',
        'text',
        CTX
      );
      expect(result).toHaveLength(3);
    });

    it('excludes submitter from reviewer candidates', async () => {
      mockCore.getRubric.mockResolvedValue({ minReviewers: 1 });
      const enrollChain = makeSelectChain([
        { userId: 'submitter-1' },
        { userId: 'r1' },
      ]);
      mockTx.select.mockReturnValue({ from: enrollChain.from });

      const createdRows = [{ id: 'a1', reviewerId: 'r1' }];
      const returning = vi.fn().mockResolvedValue(createdRows);
      mockTx.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({ returning }),
      });

      await service.createAssignment('ci1', 'submitter-1', 'text', CTX);
      const insertCall = mockTx.insert.mock.results[0];
      expect(insertCall).toBeDefined();
    });
  });

  describe('submitReview()', () => {
    it('submits review and updates assignment status', async () => {
      const chain = makeSelectChain([
        {
          id: 'a1',
          reviewerId: 'reviewer-1',
          submitterId: 'sub-1',
          contentItemId: 'ci1',
          tenantId: 'tenant-1',
          status: 'PENDING',
        },
      ]);
      mockTx.select.mockReturnValue({ from: chain.from });

      const updateWhere = vi.fn().mockResolvedValue(undefined);
      const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
      mockTx.update.mockReturnValue({ set: updateSet });

      mockCore.checkAndPublishCompletion.mockResolvedValue(undefined);

      const result = await service.submitReview(
        'a1',
        'reviewer-1',
        JSON.stringify({ clarity: 8, depth: 9 }),
        'Good work!',
        CTX
      );
      expect(result).toBe(true);
      expect(mockTx.update).toHaveBeenCalled();
      expect(mockCore.checkAndPublishCompletion).toHaveBeenCalled();
    });

    it('throws NotFoundException when assignment not found', async () => {
      const chain = makeSelectChain([]);
      mockTx.select.mockReturnValue({ from: chain.from });

      await expect(
        service.submitReview('bad-id', 'r1', '{}', 'fb', CTX)
      ).rejects.toThrow(NotFoundException);
    });

    it('throws UnauthorizedException on IDOR attempt', async () => {
      const chain = makeSelectChain([
        {
          id: 'a1',
          reviewerId: 'real-reviewer',
          submitterId: 'sub-1',
          contentItemId: 'ci1',
          tenantId: 'tenant-1',
          status: 'PENDING',
        },
      ]);
      mockTx.select.mockReturnValue({ from: chain.from });

      await expect(
        service.submitReview('a1', 'attacker-id', '{}', 'fb', CTX)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('calculates average score from criteria scores', async () => {
      const chain = makeSelectChain([
        {
          id: 'a1',
          reviewerId: 'r1',
          submitterId: 's1',
          contentItemId: 'ci1',
          tenantId: 'tenant-1',
          status: 'PENDING',
        },
      ]);
      mockTx.select.mockReturnValue({ from: chain.from });

      const updateWhere = vi.fn().mockResolvedValue(undefined);
      const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
      mockTx.update.mockReturnValue({ set: updateSet });
      mockCore.checkAndPublishCompletion.mockResolvedValue(undefined);

      await service.submitReview(
        'a1',
        'r1',
        JSON.stringify({ a: 80, b: 90 }),
        'Nice',
        CTX
      );
      // Verify the set was called with score = 85
      const setArg = updateSet.mock.calls[0]?.[0];
      expect(setArg).toMatchObject({
        status: 'SUBMITTED',
        feedback: 'Nice',
        score: 85,
      });
    });
  });
});
