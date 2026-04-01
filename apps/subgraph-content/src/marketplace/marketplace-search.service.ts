/**
 * MarketplaceSearchService — Listing search and filtering.
 *
 * Handles fetching published course listings with search, price, and
 * instructor filters, plus enrollment count aggregation.
 */
import { Injectable, Logger } from '@nestjs/common';
import { schema, eq, and, ilike, lte, withTenantContext } from '@edusphere/db';
import type { TenantContext, Database } from '@edusphere/db';
import { sql } from 'drizzle-orm';
import type {
  CourseListingResult,
  CourseListingFiltersInput,
} from './marketplace.types.js';

@Injectable()
export class MarketplaceSearchService {
  private readonly logger = new Logger(MarketplaceSearchService.name);

  async getListings(
    db: Database,
    tenantId: string,
    userId: string,
    userRole: string,
    limit = 20,
    offset = 0,
    filters?: CourseListingFiltersInput
  ): Promise<CourseListingResult[]> {
    const ctx: TenantContext = {
      tenantId,
      userId,
      userRole: userRole as TenantContext['userRole'],
    };
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safeOffset = Math.max(0, offset);

    const instructorNameExpr = sql<string>`COALESCE(
      NULLIF(TRIM(${schema.users.first_name} || ' ' || ${schema.users.last_name}), ''),
      ${schema.users.display_name}
    )`;

    const enrollmentCountExpr = sql<number>`(
      SELECT COUNT(*)::int
      FROM purchases p
      WHERE p.course_id = ${schema.courses.id}
        AND p.status = 'COMPLETE'
    )`;

    const conditions = [
      eq(schema.courseListings.tenantId, tenantId),
      eq(schema.courseListings.isPublished, true),
    ];

    if (filters?.search) {
      conditions.push(ilike(schema.courses.title, `%${filters.search}%`));
    }
    if (filters?.priceMax !== undefined && filters.priceMax !== null) {
      conditions.push(
        lte(
          schema.courseListings.priceCents,
          Math.round(filters.priceMax * 100)
        )
      );
    }
    if (filters?.instructorName) {
      conditions.push(ilike(instructorNameExpr, `%${filters.instructorName}%`));
    }

    const rows = await withTenantContext(db, ctx, async (tx) =>
      tx
        .select({
          id: schema.courseListings.id,
          courseId: schema.courseListings.courseId,
          priceCents: schema.courseListings.priceCents,
          currency: schema.courseListings.currency,
          isPublished: schema.courseListings.isPublished,
          revenueSplitPercent: schema.courseListings.revenueSplitPercent,
          title: schema.courses.title,
          description: schema.courses.description,
          thumbnailUrl: schema.courses.thumbnail_url,
          instructorName: instructorNameExpr,
          enrollmentCount: enrollmentCountExpr,
        })
        .from(schema.courseListings)
        .innerJoin(
          schema.courses,
          eq(schema.courseListings.courseId, schema.courses.id)
        )
        .innerJoin(
          schema.users,
          eq(schema.courses.instructor_id, schema.users.id)
        )
        .where(and(...conditions))
        .limit(safeLimit)
        .offset(safeOffset)
    );

    return rows.map((row) => ({
      ...row,
      price: row.priceCents / 100,
      tags: [],
      rating: null,
      totalLessons: 0,
    }));
  }
}
