/**
 * MarketplaceOrgService — Organization marketplace listing management.
 *
 * Extends existing marketplace with:
 *   - Publish course to cross-org marketplace
 *   - Unpublish from marketplace
 *   - Browse marketplace listings (no auth required for read)
 *   - Pricing models: FREE, PER_SEAT, FLAT_RATE
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface PublishToMarketplaceInput {
  courseId: string;
  title: string;
  description?: string;
  pricingModel: string;
  pricePerSeat?: number;
  flatRatePrice?: number;
  currency?: string;
  categories?: string[];
  previewUrl?: string;
}

export interface MarketplaceListing {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  pricingModel: string;
  pricePerSeat: number | null;
  flatRatePrice: number | null;
  currency: string;
  isPublished: boolean;
  categories: string[];
  previewUrl: string | null;
  publisherName: string;
}

@Injectable()
export class MarketplaceOrgService implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceOrgService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[MarketplaceOrgService] onModuleDestroy: cleaned up');
  }

  async publishToMarketplace(
    input: PublishToMarketplaceInput,
    ctx: TenantContext
  ): Promise<MarketplaceListing> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const result = await tx.execute<{
        id: string;
        course_id: string;
        title: string;
        description: string | null;
        pricing_model: string;
        price_per_seat: string | null;
        flat_rate_price: string | null;
        currency: string;
        is_published: boolean;
        categories: string[];
        preview_url: string | null;
      }>(sql`
        INSERT INTO marketplace_listings (
          course_id, tenant_id, title, description,
          pricing_model, price_per_seat, flat_rate_price,
          currency, is_published, categories, preview_url
        ) VALUES (
          ${input.courseId}::uuid,
          ${ctx.tenantId}::uuid,
          ${input.title},
          ${input.description ?? null},
          ${input.pricingModel},
          ${input.pricePerSeat ?? null},
          ${input.flatRatePrice ?? null},
          ${input.currency ?? 'USD'},
          true,
          ${sql.raw(`ARRAY[${(input.categories ?? []).map((c) => `'${c}'`).join(',') || "'general'"}]::text[]`)},
          ${input.previewUrl ?? null}
        )
        ON CONFLICT (course_id, tenant_id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          pricing_model = EXCLUDED.pricing_model,
          price_per_seat = EXCLUDED.price_per_seat,
          flat_rate_price = EXCLUDED.flat_rate_price,
          currency = EXCLUDED.currency,
          is_published = true,
          categories = EXCLUDED.categories,
          preview_url = EXCLUDED.preview_url,
          updated_at = NOW()
        RETURNING id, course_id, title, description,
                  pricing_model, price_per_seat::text, flat_rate_price::text,
                  currency, is_published, categories, preview_url
      `);

      const row = result.rows[0];
      if (!row) throw new BadRequestException('Failed to publish listing');

      // Get publisher name from tenant
      const tenantResult = await tx.execute<{ name: string }>(sql`
        SELECT name FROM tenants WHERE id = ${ctx.tenantId}::uuid
      `);
      const publisherName = tenantResult.rows[0]?.name ?? 'Unknown';

      this.logger.log(
        { tenantId: ctx.tenantId, courseId: input.courseId },
        '[MarketplaceOrgService] Course published to marketplace'
      );

      return {
        id: row.id,
        courseId: row.course_id,
        title: row.title,
        description: row.description,
        pricingModel: row.pricing_model,
        pricePerSeat: row.price_per_seat ? Number(row.price_per_seat) : null,
        flatRatePrice: row.flat_rate_price ? Number(row.flat_rate_price) : null,
        currency: row.currency,
        isPublished: row.is_published,
        categories: row.categories,
        previewUrl: row.preview_url,
        publisherName,
      };
    });
  }

  async unpublishFromMarketplace(
    listingId: string,
    ctx: TenantContext
  ): Promise<boolean> {
    await withTenantContext(this.db, ctx, async (tx) => {
      await tx.execute(sql`
        UPDATE marketplace_listings
        SET is_published = false, updated_at = NOW()
        WHERE id = ${listingId}::uuid
          AND tenant_id = ${ctx.tenantId}::uuid
      `);
    });

    this.logger.log(
      { tenantId: ctx.tenantId, listingId },
      '[MarketplaceOrgService] Listing unpublished'
    );
    return true;
  }

  async getMarketplaceListings(
    category?: string,
    pricingModel?: string,
    search?: string,
    limit = 20,
    offset = 0
  ): Promise<MarketplaceListing[]> {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safeOffset = Math.max(0, offset);

    const conditions: string[] = ['ml.is_published = true'];
    if (category) conditions.push(`'${category}' = ANY(ml.categories)`);
    if (pricingModel) conditions.push(`ml.pricing_model = '${pricingModel}'`);
    if (search) conditions.push(`ml.title ILIKE '%${search}%'`);

    const whereClause = conditions.join(' AND ');

    const result = await this.db.execute<{
      id: string;
      course_id: string;
      title: string;
      description: string | null;
      pricing_model: string;
      price_per_seat: string | null;
      flat_rate_price: string | null;
      currency: string;
      is_published: boolean;
      categories: string[];
      preview_url: string | null;
      publisher_name: string;
    }>(sql.raw(`
      SELECT ml.id, ml.course_id, ml.title, ml.description,
             ml.pricing_model, ml.price_per_seat::text, ml.flat_rate_price::text,
             ml.currency, ml.is_published, ml.categories, ml.preview_url,
             t.name AS publisher_name
      FROM marketplace_listings ml
      JOIN tenants t ON t.id = ml.tenant_id
      WHERE ${whereClause}
      ORDER BY ml.created_at DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `));

    return result.rows.map((r) => ({
      id: r.id,
      courseId: r.course_id,
      title: r.title,
      description: r.description,
      pricingModel: r.pricing_model,
      pricePerSeat: r.price_per_seat ? Number(r.price_per_seat) : null,
      flatRatePrice: r.flat_rate_price ? Number(r.flat_rate_price) : null,
      currency: r.currency,
      isPublished: r.is_published,
      categories: r.categories,
      previewUrl: r.preview_url,
      publisherName: r.publisher_name,
    }));
  }

  async getMarketplaceListing(id: string): Promise<MarketplaceListing | null> {
    const result = await this.db.execute<{
      id: string;
      course_id: string;
      title: string;
      description: string | null;
      pricing_model: string;
      price_per_seat: string | null;
      flat_rate_price: string | null;
      currency: string;
      is_published: boolean;
      categories: string[];
      preview_url: string | null;
      publisher_name: string;
    }>(sql`
      SELECT ml.id, ml.course_id, ml.title, ml.description,
             ml.pricing_model, ml.price_per_seat::text, ml.flat_rate_price::text,
             ml.currency, ml.is_published, ml.categories, ml.preview_url,
             t.name AS publisher_name
      FROM marketplace_listings ml
      JOIN tenants t ON t.id = ml.tenant_id
      WHERE ml.id = ${id}::uuid
    `);

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      description: row.description,
      pricingModel: row.pricing_model,
      pricePerSeat: row.price_per_seat ? Number(row.price_per_seat) : null,
      flatRatePrice: row.flat_rate_price ? Number(row.flat_rate_price) : null,
      currency: row.currency,
      isPublished: row.is_published,
      categories: row.categories,
      previewUrl: row.preview_url,
      publisherName: row.publisher_name,
    };
  }
}
