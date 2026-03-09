/**
 * PeerReviewService unit tests — Phase 45: Social Learning
 * Covers rubric CRUD, assignment creation, review submission (including IDOR guard),
 * tenant isolation, and completion detection.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PeerReviewService } from './peer-review.service.js';

// ---------------------------------------------------------------------------
// Hoist mock factories
// ---------------------------------------------------------------------------
const {
  mockCloseAllPools,
  mockWithTenantContext,
} = vi.hoisted(() => ({
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
  mockWithTenantContext: vi.fn(),
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: mockCloseAllPools,
  withTenantContext: mockWithTenantContext,
  schema: {
    peerReviewRubrics: { id: 'id', contentItemId: 'contentItemId', tenantId: 'tenantId' },
    peerReviewAssignments: {
      id: 'id',
      contentItemId: 'contentItemId',
      tenantId: 'tenantId',
      submitterId: 'submitterId',
      reviewerId: 'reviewerId',
      status: 'status',
    },
    userCourses: { userId: 'userId', status: 'status' },
  },
  eq: vi.fn((col, val) => ({ col, val, type: 'eq' })),
  and: vi.fn((...args) => ({ args, type: 'and' })),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    publish: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({
    encode: (s: string) => Buffer.from(s),
    decode: (b: Uint8Array) => Buffer.from(b).toString(),
  })),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const TENANT_ID = 'tenant-aaa';
const USER_ID = 'user-111';
const REVIEWER_ID = 'user-222';
const CONTENT_ITEM_ID = 'content-xyz';
const ASSIGNMENT_ID = 'assign-001';

const baseCtx = { tenantId: TENANT_ID, userId: USER_ID, userRole: 'STUDENT' as const };

const makeAssignment = (overrides = {}) => ({
  id: ASSIGNMENT_ID,
  tenantId: TENANT_ID,
  contentItemId: CONTENT_ITEM_ID,
  submitterId: USER_ID,
  reviewerId: REVIEWER_ID,
  status: 'PENDING',
  submissionText: 'My submission',
  feedback: null,
  score: null,
  submittedAt: null,
  createdAt: new Date(),
  ...overrides,
});

const makeRubric = (overrides = {}) => ({
  id: 'rubric-001',
  tenantId: TENANT_ID,
  contentItemId: CONTENT_ITEM_ID,
  criteria: [{ id: 'c1', label: 'Clarity', description: 'Is it clear?', maxScore: 5 }],
  minReviewers: 3,
  isAnonymous: false,
  createdAt: new Date(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PeerReviewService', () => {
  let svc: PeerReviewService;

  beforeEach(async () => {
    vi.clearAllMocks();
    svc = new PeerReviewService();
    // Skip real NATS connect in unit tests
    await svc.onModuleInit().catch(() => undefined);
  });

  // ── 1. getMyAssignmentsToReview ──────────────────────────────────────────

  it('returns only PENDING assignments for the given reviewer', async () => {
    const pending = makeAssignment({ reviewerId: REVIEWER_ID, status: 'PENDING' });
    mockWithTenantContext.mockResolvedValueOnce([pending]);

    const result = await svc.getMyAssignmentsToReview(REVIEWER_ID, { ...baseCtx, userId: REVIEWER_ID });

    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe('PENDING');
    expect(result[0]!.reviewerId).toBe(REVIEWER_ID);
  });

  it('returns empty array when reviewer has no PENDING assignments', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    const result = await svc.getMyAssignmentsToReview(REVIEWER_ID, { ...baseCtx, userId: REVIEWER_ID });

    expect(result).toEqual([]);
  });

  // ── 2. submitReview IDOR guard ────────────────────────────────────────────

  it('throws UnauthorizedException if reviewerId does not match assignment.reviewerId', async () => {
    const assignment = makeAssignment({ reviewerId: 'other-user-999' });
    // First call = fetch assignment, second = fetch all (completion check skipped by throw)
    mockWithTenantContext.mockResolvedValueOnce([assignment]);

    await expect(
      svc.submitReview(ASSIGNMENT_ID, REVIEWER_ID, '{"c1":4}', 'Good work', baseCtx),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws NotFoundException when assignment does not exist', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]); // empty rows

    await expect(
      svc.submitReview('nonexistent', REVIEWER_ID, '{"c1":4}', 'feedback', baseCtx),
    ).rejects.toThrow(NotFoundException);
  });

  // ── 3. submitReview success path ─────────────────────────────────────────

  it('updates status to SUBMITTED when reviewerId matches', async () => {
    const assignment = makeAssignment({ reviewerId: REVIEWER_ID });
    mockWithTenantContext
      .mockResolvedValueOnce([assignment])         // fetch assignment
      .mockResolvedValueOnce([])                   // update (returning nothing)
      .mockResolvedValueOnce([{ ...assignment, status: 'SUBMITTED' }]); // completion check

    const result = await svc.submitReview(
      ASSIGNMENT_ID,
      REVIEWER_ID,
      '{"c1":4}',
      'Well done',
      { ...baseCtx, userId: REVIEWER_ID },
    );

    expect(result).toBe(true);
  });

  // ── 4. getRubric ──────────────────────────────────────────────────────────

  it('returns null when no rubric is configured for the content item', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    const result = await svc.getRubric(CONTENT_ITEM_ID, baseCtx);

    expect(result).toBeNull();
  });

  it('returns rubric when configured', async () => {
    const rubric = makeRubric();
    mockWithTenantContext.mockResolvedValueOnce([rubric]);

    const result = await svc.getRubric(CONTENT_ITEM_ID, baseCtx);

    expect(result).not.toBeNull();
    expect(result!.id).toBe('rubric-001');
    expect(result!.minReviewers).toBe(3);
  });

  // ── 5. createRubric — default minReviewers ────────────────────────────────

  it('creates rubric with default minReviewers=3 when not provided', async () => {
    const rubric = makeRubric({ minReviewers: 3 });
    mockWithTenantContext.mockResolvedValueOnce([rubric]);

    const input = {
      contentItemId: CONTENT_ITEM_ID,
      criteria: JSON.stringify([{ id: 'c1', label: 'Clarity', description: 'desc', maxScore: 5 }]),
    };
    const result = await svc.createRubric(input, baseCtx);

    expect(result.minReviewers).toBe(3);
  });

  it('creates rubric with custom minReviewers when provided', async () => {
    const rubric = makeRubric({ minReviewers: 5 });
    mockWithTenantContext.mockResolvedValueOnce([rubric]);

    const input = {
      contentItemId: CONTENT_ITEM_ID,
      criteria: JSON.stringify([]),
      minReviewers: 5,
    };
    const result = await svc.createRubric(input, baseCtx);

    expect(result.minReviewers).toBe(5);
  });

  // ── 6. Tenant isolation ───────────────────────────────────────────────────

  it('passes correct tenantId to withTenantContext for getMyAssignmentsToReview', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    await svc.getMyAssignmentsToReview(USER_ID, baseCtx);

    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: TENANT_ID }),
      expect.any(Function),
    );
  });

  it('passes correct tenantId to withTenantContext for createRubric', async () => {
    const rubric = makeRubric();
    mockWithTenantContext.mockResolvedValueOnce([rubric]);

    await svc.createRubric(
      { contentItemId: CONTENT_ITEM_ID, criteria: '[]' },
      baseCtx,
    );

    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: TENANT_ID }),
      expect.any(Function),
    );
  });

  // ── 7. getMySubmissions ───────────────────────────────────────────────────

  it('returns all assignments where submitterId matches the caller', async () => {
    const submitted = makeAssignment({ status: 'SUBMITTED' });
    const pending = makeAssignment({ id: 'a2', status: 'PENDING' });
    mockWithTenantContext.mockResolvedValueOnce([submitted, pending]);

    const result = await svc.getMySubmissions(USER_ID, baseCtx);

    expect(result).toHaveLength(2);
  });

  it('returns empty array when submitter has no submissions', async () => {
    mockWithTenantContext.mockResolvedValueOnce([]);

    const result = await svc.getMySubmissions(USER_ID, baseCtx);

    expect(result).toEqual([]);
  });

  // ── 8. createAssignment — no candidates ──────────────────────────────────

  it('returns empty array when no eligible peer reviewers are found', async () => {
    // getRubric
    mockWithTenantContext.mockResolvedValueOnce([]);
    // userCourses enrollment query — only submitter
    mockWithTenantContext.mockResolvedValueOnce([{ userId: USER_ID }]);

    const result = await svc.createAssignment(CONTENT_ITEM_ID, USER_ID, 'text', baseCtx);

    expect(result).toEqual([]);
  });
});
