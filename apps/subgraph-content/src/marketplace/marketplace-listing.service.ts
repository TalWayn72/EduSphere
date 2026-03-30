/**
 * MarketplaceListingService — Course listing CRUD operations.
 *
 * Handles creating and publishing course listings in the marketplace.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext, Database } from '@edusphere/db';

@Injectable()
export class MarketplaceListingService {
  private readonly logger = new Logger(MarketplaceListingService.name);

  async createListing(
    db: Database,
    courseId: string,
    priceCents: number,
    currency: string,
    revenueSplitPercent: number,
    tenantId: string
  ): Promise<typeof schema.courseListings.$inferSelect> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };
    const validCurrency = (currency as 'USD' | 'EUR' | 'ILS') ?? 'USD';
    const split = Math.min(100, Math.max(0, revenueSplitPercent));

    const [listing] = await withTenantContext(db, ctx, async (tx) =>
      tx
        .insert(schema.courseListings)
        .values({
          courseId,
          tenantId,
          priceCents,
          currency: validCurrency,
          revenueSplitPercent: split,
        })
        .returning()
    );
    this.logger.log(
      { courseId, priceCents, currency, tenantId },
      'Course listing created'
    );
    return listing!;
  }

  async publishListing(
    db: Database,
    courseId: string,
    tenantId: string
  ): Promise<void> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };
    await withTenantContext(db, ctx, async (tx) =>
      tx
        .update(schema.courseListings)
        .set({ isPublished: true })
        .where(
          and(
            eq(schema.courseListings.courseId, courseId),
            eq(schema.courseListings.tenantId, tenantId)
          )
        )
    );
    this.logger.log({ courseId, tenantId }, 'Course listing published');
  }
}
