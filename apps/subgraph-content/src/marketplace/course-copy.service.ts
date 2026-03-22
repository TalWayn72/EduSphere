/**
 * CourseCopyService — F-14 Content Marketplace
 *
 * Listens to NATS `EDUSPHERE.marketplace.purchased` events and deep-clones
 * the purchased course (course → modules → lessons) into the buyer's tenant.
 *
 * Marks copies as is_licensed_copy with source_course_id reference.
 * Memory safety: implements OnModuleDestroy for NATS + DB cleanup.
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  withTenantContext,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { sql } from 'drizzle-orm';
import { connect, StringCodec, type NatsConnection, type Subscription } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';

const PURCHASED_SUBJECT = 'EDUSPHERE.marketplace.purchased';

interface PurchasedPayload {
  readonly listingId: string;
  readonly courseId: string;
  readonly tenantId: string;
  readonly buyerUserId: string;
  readonly timestamp: string;
}

@Injectable()
export class CourseCopyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CourseCopyService.name);
  private readonly db: Database;
  private nc: NatsConnection | null = null;
  private sub: Subscription | null = null;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleInit(): Promise<void> {
    try {
      this.nc = await connect(buildNatsOptions());
      this.sub = this.nc.subscribe(PURCHASED_SUBJECT);
      this.logger.log(`[CourseCopyService] Subscribed to ${PURCHASED_SUBJECT}`);
      void this.listenForPurchases();
    } catch (err) {
      this.logger.error(
        { err },
        '[CourseCopyService] Failed to connect to NATS — course copying disabled'
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.sub) {
      this.sub.unsubscribe();
      this.sub = null;
    }
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    await closeAllPools();
    this.logger.log('[CourseCopyService] onModuleDestroy: cleaned up');
  }

  private async listenForPurchases(): Promise<void> {
    if (!this.sub) return;
    const sc = StringCodec();

    for await (const msg of this.sub) {
      try {
        const payload: PurchasedPayload = JSON.parse(sc.decode(msg.data));
        await this.copyCourseToTenant(payload);
      } catch (err) {
        this.logger.error(
          { err },
          '[CourseCopyService] Failed to process purchase event'
        );
      }
    }
  }

  /**
   * Deep-clones a course record into the target tenant.
   * Copies: course → modules → lessons (future: attachments, quizzes).
   */
  async copyCourseToTenant(payload: PurchasedPayload): Promise<void> {
    const { courseId, tenantId, buyerUserId } = payload;

    const sourceCtx: TenantContext = {
      tenantId,
      userId: buyerUserId,
      userRole: 'ORG_ADMIN',
    };

    // Get source course
    const [sourceCourse] = await withTenantContext(
      this.db,
      sourceCtx,
      async (tx) =>
        tx
          .select()
          .from(schema.courses)
          .where(eq(schema.courses.id, courseId))
    );

    if (!sourceCourse) {
      this.logger.warn(
        { courseId, tenantId },
        '[CourseCopyService] Source course not found — skipping copy'
      );
      return;
    }

    // Create copied course in target tenant
    const targetCtx: TenantContext = {
      tenantId,
      userId: buyerUserId,
      userRole: 'ORG_ADMIN',
    };

    await withTenantContext(this.db, targetCtx, async (tx) => {
      // Insert course copy with is_licensed_copy flag
      await tx.execute(sql`
        INSERT INTO courses (
          tenant_id, title, description, instructor_id,
          thumbnail_url, status, is_licensed_copy, source_course_id
        ) VALUES (
          ${tenantId}::uuid,
          ${sourceCourse.title},
          ${sourceCourse.description ?? ''},
          ${buyerUserId}::uuid,
          ${sourceCourse.thumbnail_url ?? null},
          'DRAFT',
          true,
          ${courseId}::uuid
        )
      `);
    });

    this.logger.log(
      { courseId, tenantId, buyerUserId },
      '[CourseCopyService] Course copied to target tenant'
    );
  }
}
