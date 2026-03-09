/**
 * PeerReviewResolver unit tests — Phase 45: Social Learning
 * Verifies resolver delegates correctly to service and enforces IDOR protection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { PeerReviewResolver } from './peer-review.resolver.js';
import type { PeerReviewService } from './peer-review.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    authContext: {
      userId: 'user-abc',
      tenantId: 'tenant-xyz',
      userRole: 'STUDENT',
      ...overrides,
    },
  } as Parameters<typeof PeerReviewResolver.prototype.myReviewAssignments>[0];
}

function makeAssignment(overrides = {}) {
  return {
    id: 'a1',
    tenantId: 'tenant-xyz',
    contentItemId: 'c1',
    submitterId: 'user-abc',
    reviewerId: 'user-abc',
    status: 'PENDING',
    submissionText: null,
    feedback: null,
    score: null,
    submittedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PeerReviewResolver', () => {
  let resolver: PeerReviewResolver;
  let mockSvc: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockSvc = {
      getMyAssignmentsToReview: vi.fn().mockResolvedValue([]),
      getMySubmissions: vi.fn().mockResolvedValue([]),
      getRubric: vi.fn().mockResolvedValue(null),
      createRubric: vi.fn(),
      createAssignment: vi.fn().mockResolvedValue([]),
      submitReview: vi.fn().mockResolvedValue(true),
    };
    resolver = new PeerReviewResolver(mockSvc as unknown as PeerReviewService);
  });

  // ── 1. myReviewAssignments delegates with ctx.userId ────────────────────

  it('calls service.getMyAssignmentsToReview with ctx.userId', async () => {
    mockSvc['getMyAssignmentsToReview']!.mockResolvedValueOnce([makeAssignment()]);
    const ctx = makeCtx();

    await resolver.myReviewAssignments(ctx);

    expect(mockSvc['getMyAssignmentsToReview']).toHaveBeenCalledWith(
      'user-abc',
      expect.objectContaining({ tenantId: 'tenant-xyz', userId: 'user-abc' }),
    );
  });

  it('throws UnauthorizedException when userId is missing from context', async () => {
    const ctx = makeCtx({ userId: undefined });
    await expect(resolver.myReviewAssignments(ctx)).rejects.toThrow(UnauthorizedException);
  });

  // ── 2. submitPeerReview IDOR protection ──────────────────────────────────

  it('passes ctx.userId (not a raw arg) to service.submitReview', async () => {
    const ctx = makeCtx({ userId: 'ctx-user-id' });

    await resolver.submitPeerReview('assign-1', '{"c1":4}', 'feedback', ctx);

    expect(mockSvc['submitReview']).toHaveBeenCalledWith(
      'assign-1',
      'ctx-user-id',           // MUST be ctx.userId — never a GraphQL arg
      '{"c1":4}',
      'feedback',
      expect.objectContaining({ userId: 'ctx-user-id' }),
    );
  });

  it('returns boolean result from service.submitReview', async () => {
    mockSvc['submitReview']!.mockResolvedValueOnce(true);
    const ctx = makeCtx();

    const result = await resolver.submitPeerReview('assign-1', '{"c1":5}', 'great', ctx);

    expect(result).toBe(true);
  });

  // ── 3. submitForPeerReview ────────────────────────────────────────────────

  it('calls createAssignment with ctx.userId as submitterId', async () => {
    const ctx = makeCtx({ userId: 'submitter-id' });

    await resolver.submitForPeerReview('content-1', 'my text', ctx);

    expect(mockSvc['createAssignment']).toHaveBeenCalledWith(
      'content-1',
      'submitter-id',
      'my text',
      expect.objectContaining({ userId: 'submitter-id' }),
    );
  });
});
