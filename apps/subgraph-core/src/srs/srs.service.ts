import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  lte,
  sql,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { connect, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { computeNextReview } from './sm2';

export interface SRSCard {
  id: string;
  conceptName: string;
  dueDate: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lastReviewedAt: string | null;
}

const DAILY_DIGEST_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SRS_REVIEW_DUE_SUBJECT = 'EDUSPHERE.srs.review.due';

@Injectable()
export class SrsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SrsService.name);
  private db: Database;
  private nats: NatsConnection | null = null;
  private digestIntervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleInit(): Promise<void> {
    try {
      this.nats = await connect(buildNatsOptions());
      this.logger.log('SrsService: NATS connected');
    } catch (err) {
      this.logger.warn(
        { err },
        'SrsService: NATS connection failed — digest disabled'
      );
    }
    this.scheduleDailyDigest();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.digestIntervalHandle !== null) {
      clearInterval(this.digestIntervalHandle);
      this.digestIntervalHandle = null;
    }
    if (this.nats) {
      await this.nats.drain();
      this.nats = null;
    }
    await closeAllPools();
  }

  private ctx(userId: string, tenantId: string): TenantContext {
    return { tenantId, userId, userRole: 'STUDENT' };
  }

  private mapCard(
    row: typeof schema.spacedRepetitionCards.$inferSelect
  ): SRSCard {
    return {
      id: row.id,
      conceptName: row.conceptName,
      dueDate:
        row.dueDate instanceof Date
          ? row.dueDate.toISOString()
          : String(row.dueDate),
      intervalDays: row.intervalDays,
      easeFactor: row.easeFactor,
      repetitions: row.repetitions,
      lastReviewedAt: row.lastReviewedAt
        ? row.lastReviewedAt instanceof Date
          ? row.lastReviewedAt.toISOString()
          : String(row.lastReviewedAt)
        : null,
    };
  }

  async getDueReviews(
    userId: string,
    tenantId: string,
    limit = 20
  ): Promise<SRSCard[]> {
    return withTenantContext(
      this.db,
      this.ctx(userId, tenantId),
      async (tx) => {
        const now = new Date();
        const rows = await tx
          .select()
          .from(schema.spacedRepetitionCards)
          .where(
            and(
              eq(schema.spacedRepetitionCards.userId, userId),
              eq(schema.spacedRepetitionCards.tenantId, tenantId),
              lte(schema.spacedRepetitionCards.dueDate, now)
            )
          )
          .limit(limit);
        return rows.map((r) => this.mapCard(r));
      }
    );
  }

  async getQueueCount(userId: string, tenantId: string): Promise<number> {
    return withTenantContext(
      this.db,
      this.ctx(userId, tenantId),
      async (tx) => {
        const now = new Date();
        const result = await tx
          .select({ count: sql<string>`COUNT(*)` })
          .from(schema.spacedRepetitionCards)
          .where(
            and(
              eq(schema.spacedRepetitionCards.userId, userId),
              eq(schema.spacedRepetitionCards.tenantId, tenantId),
              lte(schema.spacedRepetitionCards.dueDate, now)
            )
          );
        return Number(result[0]?.count ?? 0);
      }
    );
  }

  async createCard(
    userId: string,
    tenantId: string,
    conceptName: string
  ): Promise<SRSCard> {
    return withTenantContext(
      this.db,
      this.ctx(userId, tenantId),
      async (tx) => {
        const [row] = await tx
          .insert(schema.spacedRepetitionCards)
          .values({ userId, tenantId, conceptName })
          .returning();
        if (!row) throw new Error('Failed to create SRS card');
        this.logger.debug(
          { userId, tenantId, conceptName },
          'SRS card created'
        );
        return this.mapCard(row);
      }
    );
  }

  async submitReview(
    cardId: string,
    userId: string,
    tenantId: string,
    quality: number
  ): Promise<SRSCard> {
    if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
      throw new RangeError(
        `quality must be an integer 0–5, received: ${quality}`
      );
    }
    return withTenantContext(
      this.db,
      this.ctx(userId, tenantId),
      async (tx) => {
        const [existing] = await tx
          .select()
          .from(schema.spacedRepetitionCards)
          .where(
            and(
              eq(schema.spacedRepetitionCards.id, cardId),
              eq(schema.spacedRepetitionCards.userId, userId)
            )
          );
        if (!existing) throw new Error(`SRS card not found: ${cardId}`);

        const next = computeNextReview(
          {
            intervalDays: existing.intervalDays,
            easeFactor: existing.easeFactor,
            repetitions: existing.repetitions,
          },
          quality
        );

        const [updated] = await tx
          .update(schema.spacedRepetitionCards)
          .set({
            intervalDays: next.intervalDays,
            easeFactor: next.easeFactor,
            repetitions: next.repetitions,
            dueDate: next.dueDate,
            lastReviewedAt: new Date(),
          })
          .where(eq(schema.spacedRepetitionCards.id, cardId))
          .returning();

        if (!updated) throw new Error('Failed to update SRS card');
        this.logger.debug({ cardId, quality, next }, 'SRS review submitted');
        return this.mapCard(updated);
      }
    );
  }

  private scheduleDailyDigest(): void {
    const runDigest = () => void this.publishDailyDigest();
    this.digestIntervalHandle = setInterval(
      runDigest,
      DAILY_DIGEST_INTERVAL_MS
    );
    this.logger.log('SrsService: daily digest scheduled (every 24h)');
  }

  // ---------------------------------------------------------------------------
  // API alias methods — thin delegation, no duplicated business logic.
  // ---------------------------------------------------------------------------

  /**
   * Alias for getDueReviews.
   * getDueCards(tenantId, userId, limit?) → delegates to getDueReviews
   */
  async getDueCards(
    tenantId: string,
    userId: string,
    limit?: number
  ): Promise<SRSCard[]> {
    return this.getDueReviews(userId, tenantId, limit ?? 20);
  }

  /**
   * Alias for createCard with optional initialDueDate override.
   * scheduleReview(tenantId, userId, conceptName, initialDueDate?, algorithm?)
   * → delegates to createCard, then patches dueDate if initialDueDate provided.
   * The `algorithm` parameter is stored for future use; scheduling itself
   * always uses SM-2 via the existing createCard path (FSRS integration
   * requires schema column additions tracked separately).
   */
  async scheduleReview(
    tenantId: string,
    userId: string,
    conceptName: string,
    initialDueDate?: Date | string,
    _algorithm?: string
  ): Promise<SRSCard> {
    const card = await this.createCard(userId, tenantId, conceptName);
    if (!initialDueDate) return card;
    return withTenantContext(
      this.db,
      this.ctx(userId, tenantId),
      async (tx) => {
        const parsedDate =
          initialDueDate instanceof Date
            ? initialDueDate
            : new Date(initialDueDate);
        const [updated] = await tx
          .update(schema.spacedRepetitionCards)
          .set({ dueDate: parsedDate })
          .where(eq(schema.spacedRepetitionCards.id, card.id))
          .returning();
        if (!updated) throw new Error('Failed to update SRS card due date');
        return this.mapCard(updated);
      }
    );
  }

  /**
   * Alias for submitReview.
   * recordReview(tenantId, userId, cardId, quality) → delegates to submitReview
   */
  async recordReview(
    tenantId: string,
    userId: string,
    cardId: string,
    quality: number
  ): Promise<SRSCard> {
    return this.submitReview(cardId, userId, tenantId, quality);
  }

  private async publishDailyDigest(): Promise<void> {
    if (!this.nats) return;
    try {
      const payload = JSON.stringify({
        event: 'srs.review.due',
        timestamp: new Date().toISOString(),
      });
      this.nats.publish(
        SRS_REVIEW_DUE_SUBJECT,
        new TextEncoder().encode(payload)
      );
      this.logger.log(
        { subject: SRS_REVIEW_DUE_SUBJECT },
        'SRS daily digest published'
      );
    } catch (err) {
      this.logger.error({ err }, 'SRS daily digest publish failed');
    }
  }
}
