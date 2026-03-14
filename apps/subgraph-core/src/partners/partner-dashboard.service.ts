/**
 * PartnerDashboardService — F-07 dashboard + API key regeneration.
 *
 * Security: raw API keys are NEVER stored; only SHA-256 hash persisted (SI-3).
 * Raw key returned exactly ONCE on regeneration — caller must deliver securely.
 * Memory safety: OnModuleDestroy closes all DB pools.
 */
import { Injectable, Logger, OnModuleDestroy, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  desc,
} from '@edusphere/db';
import type { Database } from '@edusphere/db';

interface RevenueByMonth {
  month: string;
  amount: number;
}

export interface PartnerDashboardResult {
  status: string;
  apiKeyMasked: string;
  totalRevenue: number;
  revenueByMonth: RevenueByMonth[];
}

export interface RegeneratedApiKeyResult {
  newApiKey: string;
}

@Injectable()
export class PartnerDashboardService implements OnModuleDestroy {
  private readonly logger = new Logger(PartnerDashboardService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getDashboard(partnerId: string): Promise<PartnerDashboardResult> {
    const [partner] = await this.db
      .select()
      .from(schema.partners)
      .where(eq(schema.partners.id, partnerId))
      .limit(1);

    if (!partner) throw new NotFoundException('Partner not found');

    const revenueRows = await this.db
      .select()
      .from(schema.partnerRevenue)
      .where(eq(schema.partnerRevenue.partnerId, partnerId))
      .orderBy(desc(schema.partnerRevenue.month))
      .limit(12);

    const totalRevenue = revenueRows.reduce(
      (sum, r) => sum + r.partnerPayoutUsd,
      0
    );

    const maskedHash = partner.apiKeyHash.slice(0, 8) + '****';

    return {
      status: partner.status,
      apiKeyMasked: maskedHash,
      totalRevenue,
      revenueByMonth: revenueRows.map((r) => ({
        month: r.month,
        amount: r.partnerPayoutUsd,
      })),
    };
  }

  async regenerateApiKey(
    partnerId: string
  ): Promise<RegeneratedApiKeyResult> {
    const rawKey = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(rawKey).digest('hex');

    const updated = await this.db
      .update(schema.partners)
      .set({ apiKeyHash: hash, updatedAt: new Date() })
      .where(eq(schema.partners.id, partnerId))
      .returning({ id: schema.partners.id });

    if (!updated[0]) throw new NotFoundException('Partner not found');

    this.logger.log(
      { partnerId },
      '[PartnerDashboardService] API key regenerated'
    );

    return { newApiKey: rawKey };
  }
}
