/**
 * CpdService — F-027 CPD/CE Credit Tracking
 *
 * Responsibilities:
 *  1. Subscribe to EDUSPHERE.course.completed NATS events
 *  2. Look up course CPD credits → insert user_cpd_log record
 *  3. Query and aggregate CPD hours for learners
 *  4. Delegate exports to CpdExportService
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
  and,
  gte,
  lte,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { connect, StringCodec, type NatsConnection, type Subscription } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { isCourseCompletedEvent } from '@edusphere/nats-client';
import type { CourseCompletedPayload } from '@edusphere/nats-client';
import { CpdExportService } from './cpd-export.service.js';
import type { CpdReport, CpdLogEntry, CpdTypeSummary, CreateCreditTypeInput } from './cpd.types.js';

const COURSE_COMPLETED_SUBJECT = 'EDUSPHERE.course.completed';

@Injectable()
export class CpdService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CpdService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;
  private sub: Subscription | null = null;

  constructor(private readonly exportService: CpdExportService) {}

  async onModuleInit(): Promise<void> {
    await this.connectAndSubscribe();
  }

  async onModuleDestroy(): Promise<void> {
    this.sub?.unsubscribe();
    this.sub = null;
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    await closeAllPools();
    this.logger.log('CpdService destroyed - connections closed');
  }

  private async connectAndSubscribe(): Promise<void> {
    try {
      this.nc = await connect(buildNatsOptions());
      this.sub = this.nc.subscribe(COURSE_COMPLETED_SUBJECT);
      this.logger.log(`CpdService: subscribed to ${COURSE_COMPLETED_SUBJECT}`);
      void this.processMessages();
    } catch (err) {
      this.logger.error(`CpdService: NATS connect failed: ${String(err)}`);
    }
  }

  private async processMessages(): Promise<void> {
    if (!this.sub) return;
    for await (const msg of this.sub) {
      try {
        const raw = JSON.parse(this.sc.decode(msg.data)) as unknown;
        if (isCourseCompletedEvent(raw)) {
          await this.handleCourseCompleted(raw);
        }
      } catch (err) {
        this.logger.warn({ err }, 'CpdService: failed to process course.completed message');
      }
    }
  }

  private async handleCourseCompleted(payload: CourseCompletedPayload): Promise<void> {
    const { courseId, userId, tenantId, completionDate, certificateId } = payload;
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' };

    const credits = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select()
        .from(schema.courseCpdCredits)
        .where(and(
          eq(schema.courseCpdCredits.courseId, courseId),
          eq(schema.courseCpdCredits.tenantId, tenantId),
        )),
    );

    if (credits.length === 0) return;

    await withTenantContext(this.db, ctx, async (tx) => {
      const entries = credits.map((c) => ({
        userId,
        tenantId,
        courseId,
        creditTypeId: c.creditTypeId,
        earnedHours: c.creditHours,
        completionDate: new Date(completionDate),
        certificateId: certificateId ?? null,
      }));
      await tx.insert(schema.userCpdLog).values(entries);
    });

    this.logger.log(
      { userId, courseId, tenantId, creditCount: credits.length },
      'CpdService: CPD log entries created from course completion',
    );
  }

  async getUserCpdReport(
    userId: string,
    tenantId: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<CpdReport> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      let query = tx.select({
        id: schema.userCpdLog.id,
        courseId: schema.userCpdLog.courseId,
        earnedHours: schema.userCpdLog.earnedHours,
        completionDate: schema.userCpdLog.completionDate,
        creditTypeName: schema.cpdCreditTypes.name,
        regulatoryBody: schema.cpdCreditTypes.regulatoryBody,
      })
        .from(schema.userCpdLog)
        .innerJoin(schema.cpdCreditTypes, eq(schema.cpdCreditTypes.id, schema.userCpdLog.creditTypeId))
        .where(and(
          eq(schema.userCpdLog.userId, userId),
          eq(schema.userCpdLog.tenantId, tenantId),
          ...(dateRange ? [
            gte(schema.userCpdLog.completionDate, dateRange.start),
            lte(schema.userCpdLog.completionDate, dateRange.end),
          ] : []),
        ));
      return query;
    });

    const entries: CpdLogEntry[] = rows.map((r) => ({
      id: r.id,
      courseId: r.courseId,
      creditTypeName: r.creditTypeName,
      earnedHours: parseFloat(r.earnedHours),
      completionDate: r.completionDate.toISOString(),
    }));

    const byTypeMap = new Map<string, CpdTypeSummary>();
    for (const r of rows) {
      const key = r.creditTypeName;
      const existing = byTypeMap.get(key);
      const hours = parseFloat(r.earnedHours);
      if (existing) {
        existing.totalHours += hours;
      } else {
        byTypeMap.set(key, { name: r.creditTypeName, regulatoryBody: r.regulatoryBody, totalHours: hours });
      }
    }

    const byType = Array.from(byTypeMap.values());
    const totalHours = byType.reduce((sum, t) => sum + t.totalHours, 0);

    return { totalHours, byType, entries };
  }

  async exportCpdReport(
    userId: string,
    tenantId: string,
    format: 'NASBA' | 'AMA' | 'CSV',
  ): Promise<string> {
    const report = await this.getUserCpdReport(userId, tenantId);
    return this.exportService.generateReport(report, userId, tenantId, format);
  }

  async assignCreditsToCourse(
    courseId: string,
    creditTypeId: string,
    creditHours: number,
    tenantId: string,
  ): Promise<void> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' };
    await withTenantContext(this.db, ctx, async (tx) =>
      tx.insert(schema.courseCpdCredits).values({
        courseId,
        tenantId,
        creditTypeId,
        creditHours: creditHours.toFixed(2),
        approvedAt: new Date(),
      }),
    );
    this.logger.log({ courseId, creditTypeId, creditHours, tenantId }, 'CPD credits assigned to course');
  }

  async listCreditTypes(tenantId: string): Promise<typeof schema.cpdCreditTypes.$inferSelect[]> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' };
    return withTenantContext(this.db, ctx, async (tx) =>
      tx.select()
        .from(schema.cpdCreditTypes)
        .where(and(
          eq(schema.cpdCreditTypes.tenantId, tenantId),
          eq(schema.cpdCreditTypes.isActive, true),
        )),
    );
  }

  async createCreditType(
    input: CreateCreditTypeInput,
    tenantId: string,
  ): Promise<typeof schema.cpdCreditTypes.$inferSelect> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' };
    const [created] = await withTenantContext(this.db, ctx, async (tx) =>
      tx.insert(schema.cpdCreditTypes)
        .values({
          tenantId,
          name: input.name,
          regulatoryBody: input.regulatoryBody,
          creditHoursPerHour: input.creditHoursPerHour.toFixed(2),
        })
        .returning(),
    );
    this.logger.log({ name: input.name, regulatoryBody: input.regulatoryBody, tenantId }, 'CPD credit type created');
    return created!;
  }
}
