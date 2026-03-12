/**
 * PartnerTierService — gamified partner tier progression (Phase 53)
 *
 * Tier progression based on gross revenue and learner count:
 * BRONZE   → < $10,000 gross / year
 * SILVER   → $10,000–$49,999 gross / year
 * GOLD     → $50,000–$199,999 gross / year
 * PLATINUM → $200,000+ gross / year
 *
 * Benefits per tier: higher revenue share, dedicated support, co-marketing.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  sql,
} from '@edusphere/db';
import type { Database } from '@edusphere/db';

export type PartnerTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface TierBenefits {
  tier: PartnerTier;
  revSharePct: number;
  supportLevel: 'COMMUNITY' | 'EMAIL' | 'PRIORITY' | 'DEDICATED';
  coMarketing: boolean;
  apiRateLimit: number;
}

export interface TierProgress {
  currentTier: PartnerTier;
  nextTier: PartnerTier | null;
  grossRevYtd: number;
  progressPct: number;
  benefits: TierBenefits;
}

const TIER_ORDER: PartnerTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

/** Revenue thresholds in USD cents (yearly gross) */
export const TIER_THRESHOLDS: Record<PartnerTier, number> = {
  BRONZE: 0,
  SILVER: 1_000_000,   // $10,000
  GOLD: 5_000_000,     // $50,000
  PLATINUM: 20_000_000, // $200,000
};

const TIER_BENEFITS: Record<PartnerTier, TierBenefits> = {
  BRONZE: {
    tier: 'BRONZE',
    revSharePct: 70,
    supportLevel: 'COMMUNITY',
    coMarketing: false,
    apiRateLimit: 60,
  },
  SILVER: {
    tier: 'SILVER',
    revSharePct: 72,
    supportLevel: 'EMAIL',
    coMarketing: false,
    apiRateLimit: 120,
  },
  GOLD: {
    tier: 'GOLD',
    revSharePct: 75,
    supportLevel: 'PRIORITY',
    coMarketing: true,
    apiRateLimit: 300,
  },
  PLATINUM: {
    tier: 'PLATINUM',
    revSharePct: 80,
    supportLevel: 'DEDICATED',
    coMarketing: true,
    apiRateLimit: 1000,
  },
};

@Injectable()
export class PartnerTierService implements OnModuleDestroy {
  private readonly logger = new Logger(PartnerTierService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[PartnerTierService] onModuleDestroy: DB pools closed');
  }

  /** Determine partner tier from YTD gross revenue in cents. Pure function. */
  calculateTier(grossRevCentsYtd: number): PartnerTier {
    if (grossRevCentsYtd >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM';
    if (grossRevCentsYtd >= TIER_THRESHOLDS.GOLD) return 'GOLD';
    if (grossRevCentsYtd >= TIER_THRESHOLDS.SILVER) return 'SILVER';
    return 'BRONZE';
  }

  /** Return the benefits object for a given tier. */
  getTierBenefits(tier: PartnerTier): TierBenefits {
    // Explicit switch avoids generic object-injection sink warning (security/detect-object-injection)
    switch (tier) {
      case 'SILVER':   return TIER_BENEFITS.SILVER;
      case 'GOLD':     return TIER_BENEFITS.GOLD;
      case 'PLATINUM': return TIER_BENEFITS.PLATINUM;
      default:         return TIER_BENEFITS.BRONZE;
    }
  }

  /** Resolve threshold in cents for a known tier. */
  private tierThreshold(tier: PartnerTier): number {
    switch (tier) {
      case 'SILVER':   return TIER_THRESHOLDS.SILVER;
      case 'GOLD':     return TIER_THRESHOLDS.GOLD;
      case 'PLATINUM': return TIER_THRESHOLDS.PLATINUM;
      default:         return TIER_THRESHOLDS.BRONZE;
    }
  }

  /**
   * Compute a partner's current tier and progress toward the next tier.
   * Queries the partner_revenue table for YTD gross revenue.
   */
  async getProgress(partnerId: string): Promise<TierProgress> {
    const currentYear = new Date().getFullYear();
    const yearPrefix = `${currentYear}-`;

    const rows = await this.db
      .select({ grossRevUsd: schema.partnerRevenue.grossRevUsd })
      .from(schema.partnerRevenue)
      .where(
        sql`${schema.partnerRevenue.partnerId} = ${partnerId}
          AND ${schema.partnerRevenue.month} LIKE ${yearPrefix + '%'}`
      );

    const grossRevYtd = rows.reduce(
      (sum, r) => sum + (r.grossRevUsd ?? 0),
      0
    );

    const currentTier = this.calculateTier(grossRevYtd);
    const tierIndex = TIER_ORDER.indexOf(currentTier);
    const nextTier: PartnerTier | null =
      tierIndex < TIER_ORDER.length - 1 ? TIER_ORDER[tierIndex + 1]! : null;

    let progressPct = 100;
    if (nextTier) {
      const lo = this.tierThreshold(currentTier);
      const hi = this.tierThreshold(nextTier);
      progressPct = Math.min(100, Math.round(((grossRevYtd - lo) / (hi - lo)) * 100));
    }

    this.logger.log(
      { partnerId, grossRevYtd, currentTier },
      '[PartnerTierService] getProgress computed'
    );

    return {
      currentTier,
      nextTier,
      grossRevYtd,
      progressPct,
      benefits: this.getTierBenefits(currentTier),
    };
  }
}
