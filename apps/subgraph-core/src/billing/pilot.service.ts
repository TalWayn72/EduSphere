/**
 * pilot.service.ts — B2B pilot request submission.
 *
 * submitPilotRequest: public endpoint — validates input, inserts pilot_requests,
 *   emits 'pilot.request_submitted' NATS event.
 *
 * Approval/rejection/listing delegated to PilotApprovalService.
 * Memory safety: OnModuleDestroy drains NATS + closes DB pools.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
} from '@edusphere/db';
import type { Database, PilotRequest, TenantContext } from '@edusphere/db';
import { connect } from 'nats';
import type { NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { PilotRequestSchema } from './billing.schemas.js';
import { PilotApprovalService } from './pilot-approval.service.js';

const SUBJ_SUBMITTED = 'EDUSPHERE.pilot.request_submitted';

@Injectable()
export class PilotService implements OnModuleDestroy {
  private readonly logger = new Logger(PilotService.name);
  private readonly db: Database;
  private nats: NatsConnection | null = null;

  constructor(private readonly approvalService: PilotApprovalService) {
    this.db = createDatabaseConnection();
    this.initNats().catch((err) =>
      this.logger.warn({ err }, '[PilotService] NATS init skipped (non-fatal)')
    );
  }

  // SI-7: Uses buildNatsOptions() for TLS/NKey authentication support.
  private async initNats(): Promise<void> {
    this.nats = await connect(buildNatsOptions());
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.nats && !this.nats.isClosed()) {
        await this.nats.drain();
      }
    } catch (err) {
      this.logger.warn({ err }, '[PilotService] NATS drain error on destroy');
    }
    await closeAllPools();
  }

  /**
   * Public: submit a pilot request (no auth required).
   */
  async submitPilotRequest(input: unknown): Promise<PilotRequest> {
    const validated = PilotRequestSchema.safeParse(input);
    if (!validated.success) {
      throw new BadRequestException(
        `Invalid pilot request: ${validated.error.message}`
      );
    }
    const data = validated.data;

    const [existing] = await this.db
      .select({ id: schema.pilotRequests.id })
      .from(schema.pilotRequests)
      .where(
        and(
          eq(schema.pilotRequests.contactEmail, data.contactEmail),
          eq(schema.pilotRequests.status, 'pending')
        )
      )
      .limit(1);

    if (existing) {
      this.logger.log(
        { contactEmail: data.contactEmail },
        '[PilotService] Duplicate pilot request suppressed (email enumeration prevention)'
      );
      return {
        id: existing.id,
        orgName: data.orgName,
        orgType: data.orgType.toLowerCase(),
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone ?? null,
        estimatedUsers: data.estimatedUsers,
        useCase: data.useCase,
        status: 'pending',
        approvedAt: null,
        tenantId: null,
        pilotEndsAt: null,
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      } as unknown as PilotRequest;
    }

    const [created] = await this.db
      .insert(schema.pilotRequests)
      .values({
        orgName: data.orgName,
        orgType: data.orgType.toLowerCase(),
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        estimatedUsers: data.estimatedUsers,
        useCase: data.useCase,
        status: 'pending',
      })
      .returning();

    if (!created) {
      throw new InternalServerErrorException(
        '[PilotService] Failed to insert pilot_request row'
      );
    }

    this.publish(SUBJ_SUBMITTED, {
      requestId: created.id,
      orgName: created.orgName,
      contactEmail: created.contactEmail,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      { requestId: created.id, orgName: created.orgName },
      '[PilotService] Pilot request submitted — status: PENDING_APPROVAL'
    );

    return created;
  }

  // Delegation methods — forwarded to PilotApprovalService
  async approvePilotRequest(
    requestId: string,
    approvedByUserId: string,
    ctx: TenantContext
  ) {
    return this.approvalService.approvePilotRequest(
      requestId,
      approvedByUserId,
      ctx
    );
  }

  async rejectPilotRequest(
    requestId: string,
    reason: string | undefined,
    ctx: TenantContext
  ) {
    return this.approvalService.rejectPilotRequest(requestId, reason, ctx);
  }

  async listPilotRequests(status?: string) {
    return this.approvalService.listPilotRequests(status);
  }

  private publish(subject: string, payload: Record<string, unknown>): void {
    if (!this.nats || this.nats.isClosed()) return;
    try {
      this.nats.publish(
        subject,
        new TextEncoder().encode(JSON.stringify(payload))
      );
    } catch (err) {
      this.logger.warn({ err, subject }, '[PilotService] NATS publish failed');
    }
  }
}
