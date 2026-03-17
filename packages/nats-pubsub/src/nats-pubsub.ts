import { PubSubEngine } from 'graphql-subscriptions';
import {
  type NatsConnection,
  type Subscription as NatsSub,
  StringCodec,
} from 'nats';

/**
 * NATS-backed PubSubEngine for GraphQL subscriptions.
 *
 * Bridges NATS subjects to GraphQL subscription iterators.
 * Each subscription gets a unique integer ID for unsubscribe tracking.
 * Extends PubSubEngine to inherit default asyncIterableIterator.
 */
export class NatsPubSub extends PubSubEngine {
  private readonly sc = StringCodec();
  private nextSubId = 0;
  private readonly subscriptions = new Map<
    number,
    { natsSub: NatsSub; triggerName: string }
  >();

  constructor(private readonly nc: NatsConnection) {
    super();
  }

  async publish(triggerName: string, payload: unknown): Promise<void> {
    const data = this.sc.encode(JSON.stringify(payload));
    this.nc.publish(triggerName, data);
  }

  async subscribe(
    triggerName: string,
    onMessage: (message: unknown) => void
  ): Promise<number> {
    const sub = this.nc.subscribe(triggerName);
    const id = this.nextSubId++;
    this.subscriptions.set(id, { natsSub: sub, triggerName });

    // Process messages in background — non-blocking
    void (async () => {
      for await (const msg of sub) {
        try {
          const parsed: unknown = JSON.parse(this.sc.decode(msg.data));
          onMessage(parsed);
        } catch {
          // Malformed message — skip silently
        }
      }
    })();

    return id;
  }

  unsubscribe(subId: number): void {
    const entry = this.subscriptions.get(subId);
    if (entry) {
      entry.natsSub.unsubscribe();
      this.subscriptions.delete(subId);
    }
  }

  /** Drain all subscriptions — call during module destroy */
  async close(): Promise<void> {
    for (const [id] of this.subscriptions) {
      this.unsubscribe(id);
    }
  }
}
