/**
 * NotificationDispatcherService — Phase 65.
 * Central orchestrator: receives notification requests, checks user preferences,
 * dispatches to enabled channels, and records delivery.
 * Fire-and-forget pattern — never blocks the NATS pipeline.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationDeliveriesService } from './notification-deliveries.service';
import { EmailChannelService } from './channels/email-channel.service';
import { WhatsAppChannelService } from './channels/whatsapp-channel.service';
import { PushDispatchService } from './push-dispatch.service';

/** Channels that can be dispatched to. */
const DISPATCHABLE_CHANNELS = ['push_web', 'push_mobile', 'email', 'whatsapp', 'in_app'] as const;
type DispatchChannel = (typeof DISPATCHABLE_CHANNELS)[number];

interface DispatchRequest {
  userId: string;
  tenantId: string;
  notificationType: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  /** If provided, only dispatch to these channels. */
  channels?: DispatchChannel[];
  /** User email for email channel. */
  email?: string;
  /** User phone for WhatsApp channel. */
  phone?: string;
}

@Injectable()
export class NotificationDispatcherService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationDispatcherService.name);
  private readonly pendingPromises: Promise<void>[] = [];
  /** Max pending fire-and-forget promises (memory safety). */
  private static readonly MAX_PENDING = 500;

  constructor(
    private readonly prefsService: NotificationPreferencesService,
    private readonly deliveriesService: NotificationDeliveriesService,
    private readonly emailChannel: EmailChannelService,
    private readonly whatsAppChannel: WhatsAppChannelService,
    private readonly pushDispatch: PushDispatchService
  ) {}

  async onModuleDestroy(): Promise<void> {
    // Drain pending fire-and-forget dispatches (best effort, 5s timeout).
    await Promise.race([
      Promise.allSettled(this.pendingPromises),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
    this.pendingPromises.length = 0;
  }

  /** Dispatch a notification — fire-and-forget, never blocks caller. */
  dispatch(request: DispatchRequest): void {
    // Memory safety: evict oldest if at capacity.
    if (this.pendingPromises.length >= NotificationDispatcherService.MAX_PENDING) {
      this.pendingPromises.splice(0, 50);
    }

    const promise = this.doDispatch(request).catch((err) => {
      this.logger.error(
        `[NotificationDispatcherService] Dispatch failed — userId=${request.userId} type=${request.notificationType}`,
        err
      );
    });

    this.pendingPromises.push(promise);
  }

  private async doDispatch(req: DispatchRequest): Promise<void> {
    const channels = req.channels ?? DISPATCHABLE_CHANNELS;

    for (const channel of channels) {
      const enabled = await this.prefsService.isChannelEnabled(
        req.userId,
        req.tenantId,
        req.notificationType,
        channel
      );

      if (!enabled) continue;

      const deliveryId = await this.deliveriesService.recordDelivery(
        req.tenantId,
        req.userId,
        req.notificationType,
        channel,
        req.title,
        req.body,
        req.payload
      );

      void this.sendToChannel(channel, req, deliveryId);
    }
  }

  private async sendToChannel(
    channel: DispatchChannel,
    req: DispatchRequest,
    _deliveryId: string
  ): Promise<void> {
    try {
      switch (channel) {
        case 'email':
          if (req.email) {
            await this.emailChannel.send(req.email, req.title, req.body);
          }
          break;
        case 'whatsapp':
          if (req.phone) {
            await this.whatsAppChannel.sendTemplate(req.phone, 'notification_generic', [req.title, req.body]);
          }
          break;
        case 'push_web':
        case 'push_mobile':
          await this.pushDispatch.dispatchToUser(req.userId, req.tenantId, req.title, req.body, req.payload);
          break;
        case 'in_app':
          // In-app is handled by the existing PubSub pipeline (NatsNotificationBridge).
          break;
      }
    } catch (err) {
      this.logger.error(
        `[NotificationDispatcherService] Channel ${channel} send error — userId=${req.userId}`,
        err
      );
    }
  }
}
