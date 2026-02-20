/**
 * NATS Pub/Sub Bridge for Hive Gateway v2 Distributed Subscriptions
 *
 * Enables multiple gateway replicas to share subscription state via NATS JetStream.
 * In single-replica / dev mode (NATS_URL not set), falls back gracefully to an
 * in-process EventEmitter so local development requires no NATS server.
 *
 * Architecture:
 *   WebSocket client ──► Gateway replica A ──► NATS subject ──► Gateway replica B ──► WebSocket client
 *
 * Subject conventions:
 *   gw.sub.<topic>   – fan-out subjects used by all gateway replicas
 *
 * Usage in src/index.ts:
 *   import { createNatsPubSub } from './nats-subscriptions.js';
 *   const pubSub = await createNatsPubSub(logger);
 */

import { EventEmitter } from 'events';
import type { Logger } from 'pino';

// ── Public interface ──────────────────────────────────────────────────────────

export interface PubSubEngine {
  publish(topic: string, payload: unknown): Promise<void>;
  subscribe(topic: string, onMessage: (payload: unknown) => void): Promise<() => void>;
  close(): Promise<void>;
}

// ── In-process fallback (single-replica / dev) ────────────────────────────────

class InProcessPubSub implements PubSubEngine {
  private readonly emitter = new EventEmitter();

  async publish(topic: string, payload: unknown): Promise<void> {
    this.emitter.emit(topic, payload);
  }

  async subscribe(topic: string, onMessage: (payload: unknown) => void): Promise<() => void> {
    this.emitter.on(topic, onMessage);
    return () => {
      this.emitter.off(topic, onMessage);
    };
  }

  async close(): Promise<void> {
    this.emitter.removeAllListeners();
  }
}

// ── NATS JetStream pub/sub (multi-replica / production) ───────────────────────

/**
 * Thin types that mirror the nats.js API surface used here.
 * Avoids a hard compile-time import — the `nats` package is loaded dynamically
 * so the gateway still boots when NATS is unavailable.
 */
interface NatsConnection {
  publish(subject: string, data: Uint8Array): void;
  subscribe(subject: string): AsyncIterable<NatsMsg> & { unsubscribe(): void };
  drain(): Promise<void>;
  closed(): Promise<void | Error>;
}

interface NatsMsg {
  data: Uint8Array;
}

class NatsPubSub implements PubSubEngine {
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  constructor(
    private readonly nc: NatsConnection,
    private readonly logger: Logger,
  ) {}

  /** Publish a message to all gateway replicas subscribed to this topic. */
  async publish(topic: string, payload: unknown): Promise<void> {
    const subject = `gw.sub.${topic}`;
    try {
      const data = this.encoder.encode(JSON.stringify(payload));
      this.nc.publish(subject, data);
    } catch (err) {
      this.logger.error({ err, topic }, '[nats-pubsub] publish failed');
    }
  }

  /**
   * Subscribe to a topic across all replicas.
   * Returns an unsubscribe function that callers must invoke to release resources.
   */
  async subscribe(topic: string, onMessage: (payload: unknown) => void): Promise<() => void> {
    const subject = `gw.sub.${topic}`;
    const sub = this.nc.subscribe(subject);

    // Drain messages in a detached async loop
    (async () => {
      for await (const msg of sub) {
        try {
          const payload: unknown = JSON.parse(this.decoder.decode(msg.data));
          onMessage(payload);
        } catch (err) {
          this.logger.warn({ err, topic }, '[nats-pubsub] message parse error — skipped');
        }
      }
    })().catch((err: unknown) => {
      // Subscription closed normally or with error — log at debug level
      this.logger.debug({ err, topic }, '[nats-pubsub] subscription loop exited');
    });

    return () => {
      sub.unsubscribe();
    };
  }

  /** Drain inflight messages and close the NATS connection gracefully. */
  async close(): Promise<void> {
    await this.nc.drain();
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

let singleton: PubSubEngine | null = null;

/**
 * Returns a singleton PubSubEngine.
 *
 * - If `NATS_URL` is set: connects to NATS and returns a `NatsPubSub`.
 * - Otherwise: returns an `InProcessPubSub` (safe for single-replica dev).
 *
 * The function is idempotent — subsequent calls return the same instance.
 */
export async function createNatsPubSub(logger: Logger): Promise<PubSubEngine> {
  if (singleton) return singleton;

  const natsUrl = process.env['NATS_URL'];

  if (!natsUrl) {
    logger.warn(
      '[nats-pubsub] NATS_URL not set — using in-process pub/sub (single-replica only). ' +
        'Set NATS_URL to enable distributed subscriptions across multiple gateway replicas.',
    );
    singleton = new InProcessPubSub();
    return singleton;
  }

  try {
    // Dynamic import — keeps the gateway bootable even if `nats` is not installed.
    const { connect } = (await import('nats')) as {
      connect: (opts: { servers: string }) => Promise<NatsConnection>;
    };

    const nc = await connect({ servers: natsUrl });
    logger.info({ natsUrl }, '[nats-pubsub] connected to NATS — distributed subscriptions enabled');

    singleton = new NatsPubSub(nc, logger);

    // Log when the NATS connection closes unexpectedly
    nc.closed()
      .then((err) => {
        if (err) {
          logger.error({ err }, '[nats-pubsub] NATS connection closed with error');
        } else {
          logger.info('[nats-pubsub] NATS connection closed gracefully');
        }
        singleton = null; // Allow reconnection on next call
      })
      .catch(() => {
        singleton = null;
      });

    return singleton;
  } catch (err) {
    logger.warn(
      { err, natsUrl },
      '[nats-pubsub] NATS connection failed — falling back to in-process pub/sub. ' +
        'Subscriptions will NOT be shared across gateway replicas.',
    );
    singleton = new InProcessPubSub();
    return singleton;
  }
}

/**
 * Gracefully shuts down the active pub/sub engine.
 * Call during process SIGTERM / SIGINT handlers.
 */
export async function shutdownNatsPubSub(): Promise<void> {
  if (singleton) {
    await singleton.close();
    singleton = null;
  }
}
