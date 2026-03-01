import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// All variables referenced inside vi.mock() factory functions must be hoisted.

const {
  mockCloseAllPools,
  mockWithTenantContext,
  mockDrain,
  mockPublish,
  mockFlush,
  mockClose,
} = vi.hoisted(() => ({
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
  mockWithTenantContext: vi.fn(),
  mockDrain: vi.fn().mockResolvedValue(undefined),
  mockPublish: vi.fn(),
  mockFlush: vi.fn().mockResolvedValue(undefined),
  mockClose: vi.fn().mockResolvedValue(undefined),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: mockCloseAllPools,
  schema: {
    textSubmissions: {},
    submissionEmbeddings: {},
  },
  withTenantContext: mockWithTenantContext,
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn(),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    drain: mockDrain,
    publish: mockPublish,
    flush: mockFlush,
    close: mockClose,
  }),
  StringCodec: vi.fn(() => ({ encode: (s: string) => s })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
}));

import { SubmissionService } from './submission.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT_CTX = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  userRole: 'STUDENT' as const,
};

const MOCK_SUBMISSION_ROW = {
  id: 'sub-uuid-1',
  contentItemId: 'ci-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  courseId: 'course-1',
  textContent: 'Hello World submission text',
  wordCount: 4,
  isFlagged: false,
  submittedAt: new Date('2026-03-01T10:00:00.000Z'),
};

// Helper: mock withTenantContext to invoke the callback with a fake tx
function mockTxOnce(txImpl: unknown): void {
  mockWithTenantContext.mockImplementationOnce(
    async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
      fn(txImpl)
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SubmissionService', () => {
  let service: SubmissionService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCloseAllPools.mockResolvedValue(undefined);
    mockDrain.mockResolvedValue(undefined);
    service = new SubmissionService();
  });

  // Test 1: onModuleDestroy calls closeAllPools (memory safety)
  it('onModuleDestroy — calls closeAllPools', async () => {
    await service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledOnce();
  });

  // Test 2: onModuleDestroy resolves without throwing
  it('onModuleDestroy — resolves without throwing', async () => {
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
  });

  // Test 3: submitAssignment calls withTenantContext with correct tenantId
  it('submitAssignment — calls withTenantContext with correct tenantId', async () => {
    mockTxOnce({
      insert: () => ({
        values: () => ({
          returning: () => Promise.resolve([MOCK_SUBMISSION_ROW]),
        }),
      }),
    });

    await service.submitAssignment('ci-1', 'user-1', 'tenant-1', 'course-1', 'Hello World', TENANT_CTX);

    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: 'tenant-1' }),
      expect.any(Function)
    );
  });

  // Test 4: submitAssignment returns TextSubmissionResult shape
  it('submitAssignment — returns a TextSubmissionResult with expected fields', async () => {
    mockTxOnce({
      insert: () => ({
        values: () => ({
          returning: () => Promise.resolve([MOCK_SUBMISSION_ROW]),
        }),
      }),
    });

    const result = await service.submitAssignment(
      'ci-1',
      'user-1',
      'tenant-1',
      'course-1',
      'Hello World submission text',
      TENANT_CTX
    );

    expect(result.id).toBe('sub-uuid-1');
    expect(result.contentItemId).toBe('ci-1');
    expect(typeof result.submittedAt).toBe('string');
    expect(result.wordCount).toBe(4);
    expect(result.plagiarismReport).toBeNull();
  });

  // Test 5: submitAssignment returns wordCount derived from textContent
  it('submitAssignment — wordCount reflects word count of textContent', async () => {
    const submissionRow = { ...MOCK_SUBMISSION_ROW, wordCount: 3 };
    mockTxOnce({
      insert: () => ({
        values: () => ({
          returning: () => Promise.resolve([submissionRow]),
        }),
      }),
    });

    const result = await service.submitAssignment(
      'ci-1', 'user-1', 'tenant-1', 'course-1', 'three word text', TENANT_CTX
    );

    expect(result.wordCount).toBe(3);
  });

  // Test 6: getMySubmissions delegates to withTenantContext
  it('getMySubmissions — calls withTenantContext and returns mapped results', async () => {
    mockTxOnce({
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([MOCK_SUBMISSION_ROW]),
        }),
      }),
    });

    const results = await service.getMySubmissions('ci-1', 'user-1', TENANT_CTX);

    expect(mockWithTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: 'tenant-1' }),
      expect.any(Function)
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('sub-uuid-1');
  });

  // Test 7: getMySubmissions returns empty array when no submissions found
  it('getMySubmissions — returns empty array when no rows returned', async () => {
    mockTxOnce({
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([]),
        }),
      }),
    });

    const results = await service.getMySubmissions('ci-1', 'user-1', TENANT_CTX);

    expect(results).toEqual([]);
  });

  // Test 8: getPlagiarismReport throws NotFoundException when submission not found
  it('getPlagiarismReport — throws NotFoundException when submission is missing', async () => {
    const { NotFoundException } = await import('@nestjs/common');

    // First withTenantContext call returns empty (submission not found)
    mockTxOnce({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    });

    await expect(
      service.getPlagiarismReport('missing-id', 'user-1', TENANT_CTX)
    ).rejects.toThrow(NotFoundException);
  });
});
