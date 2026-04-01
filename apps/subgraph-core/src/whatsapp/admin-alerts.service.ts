/**
 * AdminAlertsService — Phase 65.
 * Subscribes to NATS subjects for critical admin events and sends
 * WhatsApp template messages to ORG_ADMIN users with verified WhatsApp.
 * Rate limited: max 1 alert per type per 15 minutes.
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  connect,
  StringCodec,
  type NatsConnection,
  type Subscription,
} from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  closeAllPools,
  withTenantContext,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { WhatsAppChannelService } from '../notifications/channels/whatsapp-channel.service';

/** NATS subjects for admin alerts. */
const ADMIN_SUBJECTS = [
  'EDUSPHERE.admin.security.alert',
  'EDUSPHERE.admin.system.error',
  'EDUSPHERE.admin.billing.overdue',
] as const;

/** Max entries in rate-limit map before eviction. */
const MAX_RATE_MAP_SIZE = 500;
const RATE_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AdminAlertsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminAlertsService.name);
  private readonly sc = StringCodec();
  private readonly db: Database;
  private connection: NatsConnection | null = null;
  private readonly subs: Subscription[] = [];

  /** Rate limit map: key=`${tenantId}:${alertType}` → last sent timestamp. */
  private readonly rateLimitMap = new Map<string, number>();

  constructor(private readonly whatsApp: WhatsAppChannelService) {
    this.db = createDatabaseConnection();
  }

  async onModuleInit(): Promise<void> {
    try {
      const opts = buildNatsOptions();
      this.connection = await connect(opts);
      this.logger.log('[AdminAlertsService] Connected to NATS');

      for (const subject of ADMIN_SUBJECTS) {
        const sub = this.connection.subscribe(subject);
        this.subs.push(sub);
        void this.processMessages(subject, sub);
      }
    } catch (err) {
      this.logger.error('[AdminAlertsService] NATS connection failed', err);
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const sub of this.subs) {
      sub.unsubscribe();
    }
    this.subs.length = 0;

    if (this.connection) {
      await this.connection.drain();
      this.connection = null;
    }

    await closeAllPools();
    this.rateLimitMap.clear();
    this.logger.log('[AdminAlertsService] Destroyed');
  }

  private async processMessages(
    subject: string,
    sub: Subscription
  ): Promise<void> {
    for await (const msg of sub) {
      try {
        const raw = JSON.parse(this.sc.decode(msg.data)) as Record<
          string,
          unknown
        >;
        const tenantId = String(raw['tenantId'] ?? '');
        if (!tenantId) continue;

        const alertType = subject.split('.').pop() ?? 'unknown';
        const rateKey = `${tenantId}:${alertType}`;

        // Rate limit check.
        const lastSent = this.rateLimitMap.get(rateKey);
        if (lastSent && Date.now() - lastSent < RATE_LIMIT_MS) continue;

        // Evict old entries if map is too large.
        if (this.rateLimitMap.size >= MAX_RATE_MAP_SIZE) {
          const cutoff = Date.now() - RATE_LIMIT_MS;
          for (const [k, v] of this.rateLimitMap) {
            if (v < cutoff) this.rateLimitMap.delete(k);
          }
        }

        this.rateLimitMap.set(rateKey, Date.now());

        await this.notifyAdmins(
          tenantId,
          alertType,
          String(raw['title'] ?? 'Admin Alert'),
          String(raw['body'] ?? '')
        );
      } catch (err) {
        this.logger.error(`[AdminAlertsService] Error on ${subject}`, err);
      }
    }
  }

  private async notifyAdmins(
    tenantId: string,
    alertType: string,
    title: string,
    body: string
  ): Promise<void> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };

    const contacts = await withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .select()
        .from(schema.userWhatsappContacts)
        .where(
          and(
            eq(schema.userWhatsappContacts.tenantId, tenantId),
            eq(schema.userWhatsappContacts.verified, true),
            eq(schema.userWhatsappContacts.whatsappConsent, true)
          )
        );
    });

    for (const contact of contacts) {
      const fullPhone = `${contact.phoneCountryCode}${contact.phoneNumber}`;
      void this.whatsApp
        .sendTemplate(fullPhone, 'admin_alert', [alertType, title, body])
        .catch((err: unknown) => {
          this.logger.error(
            `[AdminAlertsService] WhatsApp send failed — tenantId=${tenantId}`,
            err
          );
        });
    }
  }
}
