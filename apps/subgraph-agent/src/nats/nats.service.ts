import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  connect,
  StringCodec,
  type NatsConnection,
  type Subscription,
} from 'nats';
import type { AgentSessionPayload } from '@edusphere/nats-client';
import {
  validateAgentSessionEvent,
  EventValidationError,
} from '@edusphere/nats-client';

/**
 * NatsService publishes and subscribes to agent session lifecycle events
 * via core NATS pub/sub (no JetStream stream pre-configuration required).
 *
 * Subject convention: agent.session.<tenantId>
 *
 * Event schema:  AgentSessionPayload from @edusphere/nats-client
 * AsyncAPI spec: packages/nats-client/events.asyncapi.yaml
 */
@Injectable()
export class NatsService implements OnModuleDestroy {
  private readonly logger = new Logger(NatsService.name);
  private readonly sc = StringCodec();
  private connection: NatsConnection | null = null;
  private readonly subscriptions: Array<() => void> = [];

  // ── Connection ─────────────────────────────────────────────────────────────

  /** Returns the active NATS connection, establishing it lazily if needed. */
  private async getConnection(): Promise<NatsConnection> {
    if (this.connection) return this.connection;
    const url = process.env['NATS_URL'] ?? 'nats://localhost:4222';
    this.connection = await connect({ servers: url });
    this.logger.log(`Connected to NATS at ${url}`);
    return this.connection;
  }

  // ── Publish ────────────────────────────────────────────────────────────────

  /**
   * Publishes an agent session event to the subject
   * `agent.session.<tenantId>` (or `agent.session.global` when tenantId
   * is absent).
   */
  async publish(event: AgentSessionPayload): Promise<void> {
    try {
      const nc = await this.getConnection();
      const tenantSegment = event.tenantId ?? 'global';
      const subject = `agent.session.${tenantSegment}`;
      nc.publish(subject, this.sc.encode(JSON.stringify(event)));
      this.logger.debug(
        `Published ${event.type} for session ${event.sessionId} on ${subject}`
      );
    } catch (err) {
      this.logger.error('Failed to publish agent event', err);
      throw err;
    }
  }

  // ── Subscribe ──────────────────────────────────────────────────────────────

  /**
   * Subscribes to `subject` and invokes `handler` for each valid
   * {@link AgentSessionPayload} message.  Malformed messages are logged and
   * silently discarded — the contract enforced by {@link validateAgentSessionEvent}.
   *
   * Returns a cleanup function that unsubscribes when called.
   */
  async subscribe(
    subject: string,
    handler: (event: AgentSessionPayload) => Promise<void>
  ): Promise<() => void> {
    const nc = await this.getConnection();
    const sub: Subscription = nc.subscribe(subject);

    const processMessages = async (): Promise<void> => {
      for await (const msg of sub) {
        try {
          const raw = JSON.parse(this.sc.decode(msg.data)) as unknown;
          const event = validateAgentSessionEvent(raw);
          await handler(event);
        } catch (err) {
          if (err instanceof EventValidationError) {
            this.logger.warn(
              `Invalid NATS event on ${subject}: ${err.violations.join(', ')}`
            );
          } else {
            this.logger.error('Error processing NATS message', err);
          }
        }
      }
    };

    void processMessages();
    this.logger.debug(`Subscribed to NATS subject: ${subject}`);

    const cleanup = () => sub.unsubscribe();
    this.subscriptions.push(cleanup);
    return cleanup;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async onModuleDestroy(): Promise<void> {
    this.subscriptions.forEach((cleanup) => cleanup());
    this.subscriptions.length = 0;
    if (this.connection) {
      await this.connection.drain();
      this.connection = null;
      this.logger.log('NATS connection closed');
    }
  }
}
