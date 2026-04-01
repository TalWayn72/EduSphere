/**
 * CertExamGenResolver unit tests.
 *
 * Verifies:
 * - generateCertExamItems delegates to service.generateItems
 * - Returns executionId, status, itemCount from service result
 * - Throws UNAUTHORIZED when authContext.userId is missing
 * - Uses default tenantId when authContext.tenantId is null
 * - Passes locale and all input fields to service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';

// ── Mock service ─────────────────────────────────────────────────────────────

const mockGenerateItems = vi.hoisted(() => vi.fn());

vi.mock('./cert-exam-gen.service.js', () => {
  class MockCertExamGenService {
    generateItems(...args: unknown[]) {
      return mockGenerateItems(...args);
    }
  }
  return { CertExamGenService: MockCertExamGenService };
});

import { CertExamGenResolver } from './cert-exam-gen.resolver';
import { CertExamGenService } from './cert-exam-gen.service.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeContext(
  overrides: Partial<{
    userId: string | null;
    tenantId: string | null;
  }> = {}
) {
  return {
    authContext: {
      userId: 'userId' in overrides ? overrides.userId : 'user-1',
      tenantId: 'tenantId' in overrides ? overrides.tenantId : 'tenant-1',
      role: 'INSTRUCTOR',
      scopes: [],
    },
  };
}

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    moduleId: 'mod-1',
    targetBloomLevels: ['REMEMBER', 'APPLY'],
    targetCount: 5,
    targetDifficulty: 'MEDIUM',
    locale: 'en',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CertExamGenResolver', () => {
  let resolver: CertExamGenResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    const service = new CertExamGenService() as unknown as CertExamGenService;
    resolver = new CertExamGenResolver(service);
  });

  it('delegates to service.generateItems and returns result', async () => {
    mockGenerateItems.mockResolvedValueOnce({
      executionId: 'exec-1',
      status: 'COMPLETED',
      itemCount: 5,
    });

    const result = await resolver.generateCertExamItems(
      makeInput(),
      makeContext() as never
    );

    expect(mockGenerateItems).toHaveBeenCalledWith(
      {
        moduleId: 'mod-1',
        targetBloomLevels: ['REMEMBER', 'APPLY'],
        targetCount: 5,
        targetDifficulty: 'MEDIUM',
        locale: 'en',
      },
      'user-1',
      'tenant-1'
    );
    expect(result).toEqual({
      executionId: 'exec-1',
      status: 'COMPLETED',
      itemCount: 5,
    });
  });

  it('throws UNAUTHORIZED when userId is missing', async () => {
    const ctx = { authContext: { tenantId: 'tenant-1' } };

    await expect(
      resolver.generateCertExamItems(makeInput(), ctx as never)
    ).rejects.toThrow(GraphQLError);

    await expect(
      resolver.generateCertExamItems(makeInput(), ctx as never)
    ).rejects.toThrow('Unauthorized');
  });

  it('throws UNAUTHORIZED when authContext is null', async () => {
    const ctx = { authContext: null };

    await expect(
      resolver.generateCertExamItems(makeInput(), ctx as never)
    ).rejects.toThrow('Unauthorized');
  });

  it('uses default tenantId when tenantId is null', async () => {
    mockGenerateItems.mockResolvedValueOnce({
      executionId: 'exec-2',
      status: 'PENDING',
      itemCount: 0,
    });

    await resolver.generateCertExamItems(
      makeInput(),
      makeContext({ tenantId: null }) as never
    );

    expect(mockGenerateItems).toHaveBeenCalledWith(
      expect.any(Object),
      'user-1',
      'default'
    );
  });

  it('passes all input fields including locale', async () => {
    mockGenerateItems.mockResolvedValueOnce({
      executionId: 'exec-3',
      status: 'COMPLETED',
      itemCount: 3,
    });

    await resolver.generateCertExamItems(
      makeInput({ locale: 'he', targetCount: 10, targetDifficulty: 'HARD' }),
      makeContext() as never
    );

    expect(mockGenerateItems).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'he',
        targetCount: 10,
        targetDifficulty: 'HARD',
      }),
      'user-1',
      'tenant-1'
    );
  });

  it('propagates service errors', async () => {
    mockGenerateItems.mockRejectedValueOnce(new Error('Service failure'));

    await expect(
      resolver.generateCertExamItems(makeInput(), makeContext() as never)
    ).rejects.toThrow('Service failure');
  });
});
