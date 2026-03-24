/**
 * Tests for GapAnalysisService error propagation.
 * Verifies:
 *   1. DB errors are propagated as InternalServerErrorException (not swallowed)
 *   2. Empty mastery rows return empty gap list (no fake stubs)
 *   3. Error logging includes tenantId context
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';

const mockSelectWhereFn = vi.fn();
const mockSelectFromFn = vi.fn(() => ({ where: mockSelectWhereFn }));
const mockSelectFn = vi.fn(() => ({ from: mockSelectFromFn }));
const mockCloseAllPoolsFn = vi.fn().mockResolvedValue(undefined);

const mockDb = { select: (...args: unknown[]) => mockSelectFn(...args) };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: (...args: unknown[]) => mockCloseAllPoolsFn(...args),
  eq: vi.fn((_col: unknown, _val: unknown) => ({ eq: true })),
  schema: {
    userSkillMastery: {
      tenantId: 'tenant_id',
      conceptId: 'concept_id',
      masteryLevel: 'mastery_level',
    },
  },
}));

import { GapAnalysisService } from './gap-analysis.service.js';

describe('GapAnalysisService — error propagation', () => {
  let service: GapAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCloseAllPoolsFn.mockResolvedValue(undefined);
    mockSelectWhereFn.mockResolvedValue([]);
    mockSelectFromFn.mockReturnValue({ where: mockSelectWhereFn });
    mockSelectFn.mockReturnValue({ from: mockSelectFromFn });
    service = new GapAnalysisService();
  });

  it('throws InternalServerErrorException on DB error', async () => {
    mockSelectWhereFn.mockRejectedValueOnce(new Error('connection refused'));

    await expect(service.analyzeGaps('tenant-1')).rejects.toThrow(
      InternalServerErrorException
    );
  });

  it('error message includes tenant context', async () => {
    mockSelectWhereFn.mockRejectedValueOnce(new Error('timeout'));

    await expect(service.analyzeGaps('tenant-abc')).rejects.toThrow(
      /tenant-abc/
    );
  });

  it('does NOT return fake stub data on DB error', async () => {
    mockSelectWhereFn.mockRejectedValueOnce(new Error('db down'));

    let caught = false;
    try {
      await service.analyzeGaps('tenant-1');
    } catch {
      caught = true;
    }
    expect(caught).toBe(true);
  });

  it('returns empty gap list when DB returns no mastery rows', async () => {
    mockSelectWhereFn.mockResolvedValueOnce([]);

    const report = await service.analyzeGaps('tenant-empty');

    expect(report.totalGaps).toBe(0);
    expect(report.allGaps).toEqual([]);
    expect(report.criticalGaps).toEqual([]);
  });

  it('getTopGaps propagates DB errors', async () => {
    mockSelectWhereFn.mockRejectedValueOnce(new Error('connection lost'));

    await expect(service.getTopGaps('tenant-1')).rejects.toThrow(
      InternalServerErrorException
    );
  });
});
