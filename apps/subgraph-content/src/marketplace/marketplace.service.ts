/**
 * MarketplaceService — F-031 Instructor Marketplace + Revenue Sharing
 *
 * Facade that delegates to focused sub-services:
 *  - MarketplaceListingService  (listing CRUD)
 *  - MarketplacePurchaseService (purchase flow + webhooks)
 *  - MarketplaceSearchService   (search/filter listings)
 *  - MarketplaceEarningsService (revenue calculations)
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createDatabaseConnection, closeAllPools, schema } from '@edusphere/db';
import { connect, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import Stripe from 'stripe';
import { MarketplaceEarningsService } from './marketplace.earnings.service.js';
import { MarketplaceListingService } from './marketplace-listing.service.js';
import { MarketplacePurchaseService } from './marketplace-purchase.service.js';
import { MarketplaceSearchService } from './marketplace-search.service.js';
import type {
  PurchaseResult,
  EarningsSummary,
  CourseListingResult,
  CourseListingFiltersInput,
  Purchase,
  InstructorPayout,
} from './marketplace.types.js';
import { StripeClient } from './stripe.client.js';

@Injectable()
export class MarketplaceService implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceService.name);
  private readonly db = createDatabaseConnection();
  private nc: NatsConnection | null = null;

  constructor(
    private readonly stripeClient: StripeClient,
    private readonly earningsService: MarketplaceEarningsService,
    private readonly listingService: MarketplaceListingService,
    private readonly purchaseService: MarketplacePurchaseService,
    private readonly searchService: MarketplaceSearchService
  ) {}

  async onModuleDestroy(): Promise<void> {
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    await closeAllPools();
    this.logger.log('MarketplaceService destroyed - connections closed');
  }

  private async getNatsConnection(): Promise<NatsConnection> {
    if (!this.nc) {
      this.nc = await connect(buildNatsOptions());
    }
    return this.nc;
  }

  async createListing(
    courseId: string,
    priceCents: number,
    currency: string,
    revenueSplitPercent: number,
    tenantId: string
  ): Promise<typeof schema.courseListings.$inferSelect> {
    return this.listingService.createListing(
      this.db,
      courseId,
      priceCents,
      currency,
      revenueSplitPercent,
      tenantId
    );
  }

  async publishListing(courseId: string, tenantId: string): Promise<void> {
    return this.listingService.publishListing(this.db, courseId, tenantId);
  }

  async purchaseCourse(
    courseId: string,
    userId: string,
    tenantId: string,
    userEmail: string,
    userName: string
  ): Promise<PurchaseResult> {
    return this.purchaseService.purchaseCourse(
      this.db,
      courseId,
      userId,
      tenantId,
      userEmail,
      userName
    );
  }

  async processWebhook(event: Stripe.Event, tenantId: string): Promise<void> {
    return this.purchaseService.processWebhook(this.db, event, tenantId, () =>
      this.getNatsConnection()
    );
  }

  async getListings(
    tenantId: string,
    userId: string,
    userRole: string,
    limit = 20,
    offset = 0,
    filters?: CourseListingFiltersInput
  ): Promise<CourseListingResult[]> {
    return this.searchService.getListings(
      this.db,
      tenantId,
      userId,
      userRole,
      limit,
      offset,
      filters
    );
  }

  async getUserPurchases(
    userId: string,
    tenantId: string
  ): Promise<Purchase[]> {
    return this.purchaseService.getUserPurchases(this.db, userId, tenantId);
  }

  async getInstructorEarnings(
    instructorId: string,
    tenantId: string
  ): Promise<EarningsSummary> {
    return this.earningsService.getInstructorEarnings(instructorId, tenantId);
  }

  async requestPayout(
    instructorId: string,
    tenantId: string
  ): Promise<InstructorPayout> {
    return this.earningsService.requestPayout(
      instructorId,
      tenantId,
      this.stripeClient
    );
  }
}
