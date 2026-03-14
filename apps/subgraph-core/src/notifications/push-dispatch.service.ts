import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import type { PushTokenService } from './push-token.service';

/**
 * PushDispatchService delivers push notifications to registered devices.
 *
 * Delivery is fire-and-forget: errors are logged with Pino but never rethrown
 * so a single bad token cannot break the notification pipeline.
 *
 * Memory safety: no DB pools opened; Promise.race enforces a 10 s deadline.
 * Privacy: token values and subscription objects are NEVER logged.
 */
@Injectable()
export class PushDispatchService implements OnModuleDestroy {
  private readonly logger = new Logger(PushDispatchService.name);

  constructor(private readonly pushTokenService: PushTokenService) {}

  async onModuleDestroy(): Promise<void> {
    // No persistent resources held by this service.
  }

  /**
   * Dispatch a push notification to every registered device for a user.
   * Fire-and-forget: resolves immediately; delivery errors are only logged.
   */
  async dispatchToUser(
    userId: string,
    tenantId: string,
    title: string,
    body: string,
    payload?: object
  ): Promise<void> {
    let tokens: Awaited<ReturnType<PushTokenService['getTokensForUser']>>;

    try {
      tokens = await this.pushTokenService.getTokensForUser(userId, tenantId);
    } catch (err) {
      this.logger.error(
        `[PushDispatchService] Failed to fetch tokens — userId=${userId} tenantId=${tenantId}`,
        err
      );
      return;
    }

    if (tokens.length === 0) return;

    const sends = tokens.map(async (t) => {
      try {
        const sendPromise =
          t.platform === 'web' && t.webPushSubscription
            ? this.sendWebPush(t.webPushSubscription, title, body)
            : t.expoPushToken
              ? this.sendExpoPush(t.expoPushToken, title, body, payload)
              : Promise.resolve();

        await Promise.race([sendPromise, this.timeout(10_000)]);
      } catch (err) {
        // Log platform but NOT the token value (privacy).
        this.logger.error(
          `[PushDispatchService] Delivery failed — userId=${userId} platform=${t.platform}`,
          err
        );
      }
    });

    // Fire and forget — await all but never propagate failures.
    void Promise.allSettled(sends);
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async sendExpoPush(
    expoPushToken: string,
    title: string,
    body: string,
    payload?: object
  ): Promise<void> {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: expoPushToken, title, body, data: payload }),
    });

    if (!response.ok) {
      // Log status code but not the token.
      this.logger.warn(
        `[PushDispatchService] Expo push returned HTTP ${response.status.toString()}`
      );
    }
  }

  private async sendWebPush(
    subscriptionJson: string,
    title: string,
    body: string
  ): Promise<void> {
    const vapidPublicKey = process.env['VAPID_PUBLIC_KEY'];
    const vapidPrivateKey = process.env['VAPID_PRIVATE_KEY'];
    const vapidSubject = process.env['VAPID_SUBJECT'] ?? 'mailto:admin@edusphere.dev';

    if (!vapidPublicKey || !vapidPrivateKey) {
      // Graceful fallback: log and skip when VAPID keys are not configured.
      const sub = JSON.parse(subscriptionJson) as { endpoint?: string };
      this.logger.debug(
        `[PushDispatchService] Web push stub (no VAPID keys) — domain: ${
          sub.endpoint ? new URL(sub.endpoint).hostname : 'unknown'
        }`
      );
      return;
    }

    // web-push is an optional peer dependency — require dynamically.
    // If not installed, log a warning and skip.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const webpush = require('web-push') as { setVapidDetails: (s: string, pub: string, priv: string) => void; sendNotification: (sub: unknown, payload: string) => Promise<unknown> };
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

      const subscription = JSON.parse(subscriptionJson) as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await webpush.sendNotification(
        subscription,
        JSON.stringify({ title, body })
      );

      this.logger.log(
        '[PushDispatchService] Web push sent successfully'
      );
    } catch (err) {
      this.logger.warn(
        { err },
        '[PushDispatchService] Web push delivery failed or web-push not installed'
      );
    }
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Push dispatch timed out after ${ms.toString()}ms`)),
        ms
      )
    );
  }
}
