import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DB mocks ───────────────────────────────────────────────────────────────────
// Use wrapper functions to avoid vi.mock hoisting issues with external variables

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

// ── Import AFTER mocks ────────────────────────────────────────────────────────

import { GapAnalysisService } from './gap-analysis.service.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SAMPLE_MASTERY_ROWS = [
  {
    tenantId: 'tenant-1',
    conceptId: 'concept-aaa',
    masteryLevel: 'NONE',
    userId: 'u1',
    updatedAt: new Date(),
  },
  {
    tenantId: 'tenant-1',
    conceptId: 'concept-bbb',
    masteryLevel: 'ATTEMPTED',
    userId: 'u2',
    updatedAt: new Date(),
  },
  {
    tenantId: 'tenant-1',
    conceptId: 'concept-ccc',
    masteryLevel: 'MASTERED',
    userId: 'u3',
    updatedAt: new Date(),
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GapAnalysisService', () => {
  let service: GapAnalysisService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCloseAllPoolsFn.mockResolvedValue(undefined);
    mockSelectWhereFn.mockResolvedValue(SAMPLE_MASTERY_ROWS);
    mockSelectFromFn.mockReturnValue({ where: mockSelectWhereFn });
    mockSelectFn.mockReturnValue({ from: mockSelectFromFn });
    service = new GapAnalysisService();
  });

  it('analyzeGaps returns GapReport with correct tenantId', async () => {
    const report = await service.analyzeGaps('tenant-1');

    expect(report.tenantId).toBe('tenant-1');
    expect(report).toHaveProperty('totalGaps');
    expect(report).toHaveProperty('criticalGaps');
    expect(report).toHaveProperty('allGaps');
    expect(report).toHaveProperty('summary');
    expect(Array.isArray(report.allGaps)).toBe(true);
    expect(Array.isArray(report.criticalGaps)).toBe(true);
  });

  it('analyzeGaps returns GapReport with generatedAt date', async () => {
    const before = new Date();
    const report = await service.analyzeGaps('tenant-1');
    const after = new Date();

    expect(report.generatedAt).toBeInstanceOf(Date);
    expect(report.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(report.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('analyzeGaps excludes MASTERED concepts from gaps', async () => {
    const report = await service.analyzeGaps('tenant-1');

    // MASTERED row should not appear in gaps
    const masteredGap = report.allGaps.find((g) => g.topicId === 'concept-ccc');
    expect(masteredGap).toBeUndefined();

    // NONE and ATTEMPTED rows should appear as gaps
    expect(report.totalGaps).toBe(2);
  });

  it('analyzeGaps returns stub gaps when DB returns empty array', async () => {
    mockSelectWhereFn.mockResolvedValue([]);

    const report = await service.analyzeGaps('tenant-empty');

    expect(report.tenantId).toBe('tenant-empty');
    expect(report.totalGaps).toBeGreaterThan(0);
    expect(report.allGaps.length).toBeGreaterThan(0);
    // Stub gaps have gapType NOT_STARTED
    expect(report.allGaps.every((g) => g.gapType === 'NOT_STARTED')).toBe(true);
  });

  it('getTopGaps returns array with length <= limit', async () => {
    const gaps1 = await service.getTopGaps('tenant-1', 1);
    expect(gaps1.length).toBeLessThanOrEqual(1);

    const gaps3 = await service.getTopGaps('tenant-1', 3);
    expect(gaps3.length).toBeLessThanOrEqual(3);
  });

  it('onModuleDestroy calls closeAllPools', async () => {
    await service.onModuleDestroy();
    expect(mockCloseAllPoolsFn).toHaveBeenCalledOnce();
  });
});
