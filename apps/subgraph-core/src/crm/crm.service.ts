/**
 * CrmService — orchestrates Salesforce OAuth + NATS event consumption.
 * NATS consumer: EDUSPHERE.course.completed → createCompletionActivity
 * Memory safety: OnModuleInit subscribes, OnModuleDestroy drains + closes pools.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { connect, NatsConnection, Subscription } from 'nats';
import {
  createDatabaseConnection, closeAllPools, schema, withTenantContext, eq, and, desc,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { isCourseCompletedEvent } from '@edusphere/nats-client';
import { SalesforceClient } from './salesforce.client.js';
import { CrmEncryptionService } from './crm-encryption.service.js';
import type { CrmConnection, CrmSyncLog } from '@edusphere/db';

const NATS_SUBJECT = 'EDUSPHERE.course.completed';
const SYNC_LOG_LIMIT_DEFAULT = 20;

@Injectable()
export class CrmService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CrmService.name);
  private readonly db: Database;
  private nats: NatsConnection | null = null;
  private subscription: Subscription | null = null;
  private readonly decoder = new TextDecoder();

  constructor(
    private readonly sfClient: SalesforceClient,
    private readonly enc: CrmEncryptionService,
  ) {
    this.db = createDatabaseConnection();
  }

  async onModuleInit(): Promise<void> {
    const natsUrl = process.env['NATS_URL'] ?? 'nats://localhost:4222';
    try {
      this.nats = await connect({ servers: natsUrl });
      this.subscription = this.nats.subscribe(NATS_SUBJECT);
      void this.consumeCompletions();
      this.logger.log('CrmService subscribed to EDUSPHERE.course.completed');
    } catch (err) {
      this.logger.warn({ err }, 'CrmService: NATS connection failed, CRM sync disabled');
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.subscription?.unsubscribe();
    if (this.nats) {
      await this.nats.drain().catch(() => void 0);
      this.nats = null;
    }
    await closeAllPools();
    this.logger.log('CrmService destroyed — NATS drained, DB pools closed');
  }

  private async consumeCompletions(): Promise<void> {
    if (!this.subscription) return;
    for await (const msg of this.subscription) {
      try {
        const raw = JSON.parse(this.decoder.decode(msg.data)) as unknown;
        if (!isCourseCompletedEvent(raw)) continue;
        await this.syncCompletion(raw.tenantId, raw.userId, raw.courseTitle ?? raw.courseId, raw.completionDate, raw.estimatedHours);
      } catch (err) {
        this.logger.error({ err }, 'CrmService: error processing course.completed event');
      }
    }
  }

  private async syncCompletion(
    tenantId: string, userId: string, courseTitle: string,
    completionDate: string, estimatedHours?: number,
  ): Promise<void> {
    const conn = await this.getConnection(tenantId);
    if (!conn || !conn.isActive) return;

    let accessToken = this.enc.decrypt(conn.accessToken);
    const instanceUrl = conn.instanceUrl;

    // Refresh token if expired
    if (conn.expiresAt && conn.expiresAt < new Date()) {
      const refreshed = await this.sfClient.refreshToken(this.enc.decrypt(conn.refreshToken));
      accessToken = refreshed.accessToken;
      await this.updateAccessToken(tenantId, refreshed.accessToken, refreshed.expiresAt);
    }

    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    try {
      const activityId = await this.sfClient.createCompletionActivity(instanceUrl, accessToken, {
        userId, courseTitle, completionDate: new Date(completionDate), durationHours: estimatedHours,
      });
      await this.logSync(ctx, 'COMPLETION_SYNC', 'SUCCESS', activityId, null);
      this.logger.log({ tenantId, userId, activityId }, 'CRM: completion synced to Salesforce');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.logSync(ctx, 'COMPLETION_SYNC', 'FAILED', null, message);
      this.logger.error({ tenantId, userId, message }, 'CRM: completion sync failed');
    }
  }

  async saveConnection(tenantId: string, code: string, userId: string): Promise<void> {
    const tokens = await this.sfClient.exchangeCode(code);
    const encAccessToken = this.enc.encrypt(tokens.accessToken);
    const encRefreshToken = this.enc.encrypt(tokens.refreshToken);
    const ctx: TenantContext = { tenantId, userId, userRole: 'ORG_ADMIN' };
    await withTenantContext(this.db, ctx, async (tx) => {
      await tx.delete(schema.crmConnections).where(eq(schema.crmConnections.tenantId, tenantId));
      await tx.insert(schema.crmConnections).values({
        tenantId, provider: 'SALESFORCE',
        accessToken: encAccessToken, refreshToken: encRefreshToken,
        instanceUrl: tokens.instanceUrl, connectedByUserId: userId,
        expiresAt: tokens.expiresAt, isActive: true,
      });
    });
    this.logger.log({ tenantId, instanceUrl: tokens.instanceUrl }, 'CRM connection saved');
  }

  async getConnection(tenantId: string): Promise<CrmConnection | null> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select().from(schema.crmConnections)
        .where(and(eq(schema.crmConnections.tenantId, tenantId), eq(schema.crmConnections.isActive, true)))
        .limit(1),
    );
    return rows[0] ?? null;
  }

  async disconnectCrm(tenantId: string): Promise<void> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    await withTenantContext(this.db, ctx, async (tx) =>
      tx.update(schema.crmConnections).set({ isActive: false })
        .where(eq(schema.crmConnections.tenantId, tenantId)),
    );
    this.logger.log({ tenantId }, 'CRM connection disconnected');
  }

  async getSyncLog(tenantId: string, limit?: number): Promise<CrmSyncLog[]> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    return withTenantContext(this.db, ctx, async (tx) =>
      tx.select().from(schema.crmSyncLog)
        .where(eq(schema.crmSyncLog.tenantId, tenantId))
        .orderBy(desc(schema.crmSyncLog.createdAt))
        .limit(limit ?? SYNC_LOG_LIMIT_DEFAULT),
    );
  }

  async enrollUserFromWebhook(tenantId: string, payload: unknown): Promise<void> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    try {
      const data = payload as { userId?: string; courseId?: string };
      this.logger.log({ tenantId, userId: data.userId, courseId: data.courseId }, 'CRM webhook: enrollment requested');
      // Enrollment via NATS or direct DB write handled by Content subgraph
      await this.logSync(ctx, 'ENROLLMENT_WEBHOOK', 'SUCCESS', null, null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.logSync(ctx, 'ENROLLMENT_WEBHOOK', 'FAILED', null, message);
      throw err;
    }
  }

  private async updateAccessToken(tenantId: string, accessToken: string, expiresAt: Date): Promise<void> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    await withTenantContext(this.db, ctx, async (tx) =>
      tx.update(schema.crmConnections)
        .set({ accessToken: this.enc.encrypt(accessToken), expiresAt, updatedAt: new Date() })
        .where(eq(schema.crmConnections.tenantId, tenantId)),
    );
  }

  private async logSync(
    ctx: TenantContext, operation: string, status: string,
    externalId: string | null, errorMessage: string | null,
  ): Promise<void> {
    await withTenantContext(this.db, ctx, async (tx) =>
      tx.insert(schema.crmSyncLog).values({
        tenantId: ctx.tenantId, operation, status, externalId, errorMessage,
      }),
    ).catch((err) => this.logger.error({ err }, 'CRM: failed to write sync log'));
  }
}
