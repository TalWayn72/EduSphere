/**
 * partner-tier.service.spec.ts — Unit tests for PartnerTierService (Phase 53).
 * Validates tier calculation, benefits lookup, and progress computation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DB mock ───────────────────────────────────────────────────────────────────
const mockSelect = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    partnerRevenue: {
      partnerId: 'partner_id',
      grossRevUsd: 'gross_rev_usd',
      month: 'month',
    },
  },
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
  sql: vi.fn((...args) => args),
}));

import {
  PartnerTierService,
  TIER_THRESHOLDS,
} from './partner-tier.service.js';

describe('PartnerTierService — calculateTier', () => {
  let service: PartnerTierService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PartnerTierService();
  });

  it('calculateTier(0) returns BRONZE', () => {
    expect(service.calculateTier(0)).toBe('BRONZE');
  });

  it('calculateTier(999_999) returns BRONZE (just below SILVER threshold)', () => {
    expect(service.calculateTier(999_999)).toBe('BRONZE');
  });

  it('calculateTier(1_000_000) returns SILVER ($10,000)', () => {
    expect(service.calculateTier(1_000_000)).toBe('SILVER');
  });

  it('calculateTier(4_999_999) returns SILVER (just below GOLD)', () => {
    expect(service.calculateTier(4_999_999)).toBe('SILVER');
  });

  it('calculateTier(5_000_000) returns GOLD ($50,000)', () => {
    expect(service.calculateTier(5_000_000)).toBe('GOLD');
  });

  it('calculateTier(19_999_999) returns GOLD (just below PLATINUM)', () => {
    expect(service.calculateTier(19_999_999)).toBe('GOLD');
  });

  it('calculateTier(20_000_000) returns PLATINUM ($200,000)', () => {
    expect(service.calculateTier(20_000_000)).toBe('PLATINUM');
  });

  it('calculateTier(50_000_000) returns PLATINUM (well above threshold)', () => {
    expect(service.calculateTier(50_000_000)).toBe('PLATINUM');
  });
});

describe('PartnerTierService — getTierBenefits', () => {
  let service: PartnerTierService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PartnerTierService();
  });

  it('getTierBenefits(BRONZE).supportLevel is COMMUNITY', () => {
    expect(service.getTierBenefits('BRONZE').supportLevel).toBe('COMMUNITY');
  });

  it('getTierBenefits(BRONZE).revSharePct is 70', () => {
    expect(service.getTierBenefits('BRONZE').revSharePct).toBe(70);
  });

  it('getTierBenefits(BRONZE).coMarketing is false', () => {
    expect(service.getTierBenefits('BRONZE').coMarketing).toBe(false);
  });

  it('getTierBenefits(SILVER).supportLevel is EMAIL', () => {
    expect(service.getTierBenefits('SILVER').supportLevel).toBe('EMAIL');
  });

  it('getTierBenefits(GOLD).coMarketing is true', () => {
    expect(service.getTierBenefits('GOLD').coMarketing).toBe(true);
  });

  it('getTierBenefits(GOLD).revSharePct is 75', () => {
    expect(service.getTierBenefits('GOLD').revSharePct).toBe(75);
  });

  it('getTierBenefits(PLATINUM).revSharePct is 80', () => {
    expect(service.getTierBenefits('PLATINUM').revSharePct).toBe(80);
  });

  it('getTierBenefits(PLATINUM).supportLevel is DEDICATED', () => {
    expect(service.getTierBenefits('PLATINUM').supportLevel).toBe('DEDICATED');
  });

  it('getTierBenefits(PLATINUM).coMarketing is true', () => {
    expect(service.getTierBenefits('PLATINUM').coMarketing).toBe(true);
  });
});

describe('PartnerTierService — TIER_THRESHOLDS', () => {
  it('TIER_THRESHOLDS.BRONZE is 0', () => {
    expect(TIER_THRESHOLDS.BRONZE).toBe(0);
  });

  it('TIER_THRESHOLDS.SILVER is 1_000_000 cents', () => {
    expect(TIER_THRESHOLDS.SILVER).toBe(1_000_000);
  });

  it('TIER_THRESHOLDS.GOLD is 5_000_000 cents', () => {
    expect(TIER_THRESHOLDS.GOLD).toBe(5_000_000);
  });

  it('TIER_THRESHOLDS.PLATINUM is 20_000_000 cents', () => {
    expect(TIER_THRESHOLDS.PLATINUM).toBe(20_000_000);
  });
});

describe('PartnerTierService — getProgress', () => {
  let service: PartnerTierService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PartnerTierService();
  });

  it('getProgress returns TierProgress shape with BRONZE for zero revenue', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const result = await service.getProgress('partner-1');

    expect(result).toHaveProperty('currentTier', 'BRONZE');
    expect(result).toHaveProperty('nextTier', 'SILVER');
    expect(result).toHaveProperty('grossRevYtd', 0);
    expect(result).toHaveProperty('progressPct');
    expect(result).toHaveProperty('benefits');
    expect(result.benefits.tier).toBe('BRONZE');
  });

  it('getProgress returns PLATINUM with null nextTier at top tier', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { grossRevUsd: 25_000_000 },
        ]),
      }),
    });

    const result = await service.getProgress('partner-2');

    expect(result.currentTier).toBe('PLATINUM');
    expect(result.nextTier).toBeNull();
    expect(result.progressPct).toBe(100);
  });

  it('getProgress computes YTD by summing all monthly rows', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { grossRevUsd: 500_000 },
          { grossRevUsd: 600_000 },
        ]),
      }),
    });

    const result = await service.getProgress('partner-3');

    expect(result.grossRevYtd).toBe(1_100_000);
    expect(result.currentTier).toBe('SILVER');
  });

  it('onModuleDestroy resolves without throwing', async () => {
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });
});
