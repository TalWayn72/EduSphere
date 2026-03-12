/**
 * PartnerService — B2B2C Partner Portal business logic.
 *
 * Security invariants:
 *   - Raw API keys are NEVER stored; only SHA-256 hash persisted (SI-3 key hygiene)
 *   - Raw key returned exactly ONCE at creation — caller must present it to the partner
 *   - All DB queries bypass tenant context (partners are cross-tenant — SUPER_ADMIN gate)
 *   - Memory safety: OnModuleDestroy closes all DB pools
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  desc,
} from '@edusphere/db';
import type { Database, PartnerType } from '@edusphere/db';

export interface RequestPartnershipInput {
  name: string;
  type: string;
  contactEmail: string;
  partnerType: PartnerType;
}

export interface RequestPartnershipResult {
  partnerId: string;
  /** Raw API key — returned ONCE. Never re-retrievable. */
  apiKey: string;
}

@Injectable()
export class PartnerService implements OnModuleDestroy {
  private readonly logger = new Logger(PartnerService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  private hashKey(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  /** Create a pending partner application and return a one-time raw API key. */
  async requestPartnership(
    input: RequestPartnershipInput
  ): Promise<RequestPartnershipResult> {
    const apiKey = randomBytes(32).toString('hex');
    const apiKeyHash = this.hashKey(apiKey);

    const rows = await this.db
      .insert(schema.partners)
      .values({
        name: input.name,
        type: input.partnerType,
        contactEmail: input.contactEmail,
        apiKeyHash,
        status: 'pending',
      })
      .returning({ id: schema.partners.id });

    const row = rows[0];
    if (!row) throw new Error('Failed to create partner application');

    this.logger.log(
      { partnerId: row.id, contactEmail: input.contactEmail },
      '[PartnerService] Partnership application created'
    );
    return { partnerId: row.id, apiKey };
  }

  /** List partners, optionally filtered by status. */
  async getPartners(status?: string): Promise<typeof schema.partners.$inferSelect[]> {
    if (status) {
      return this.db
        .select()
        .from(schema.partners)
        .where(eq(schema.partners.status, status));
    }
    return this.db.select().from(schema.partners);
  }

  /** Approve a pending partner — sets status to 'active'. */
  async approvePartner(partnerId: string, notes?: string): Promise<void> {
    await this.db
      .update(schema.partners)
      .set({ status: 'active', notes: notes ?? null, updatedAt: new Date() })
      .where(eq(schema.partners.id, partnerId));

    this.logger.log({ partnerId }, '[PartnerService] Partner approved');
  }

  /** Suspend an active partner with a reason stored in notes. */
  async suspendPartner(partnerId: string, reason: string): Promise<void> {
    await this.db
      .update(schema.partners)
      .set({ status: 'suspended', notes: reason, updatedAt: new Date() })
      .where(eq(schema.partners.id, partnerId));

    this.logger.log({ partnerId }, '[PartnerService] Partner suspended');
  }

  /** Fetch the last 12 months of revenue records for a partner. */
  async getRevenueReport(
    partnerId: string
  ): Promise<typeof schema.partnerRevenue.$inferSelect[]> {
    return this.db
      .select()
      .from(schema.partnerRevenue)
      .where(eq(schema.partnerRevenue.partnerId, partnerId))
      .orderBy(desc(schema.partnerRevenue.month))
      .limit(12);
  }
}
