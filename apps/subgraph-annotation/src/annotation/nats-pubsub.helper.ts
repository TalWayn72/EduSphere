/**
 * natsPubSubHelper — thin NATS/in-process pub-sub bridge.
 *
 * When NATS_URL is set, publishes annotation events to NATS subject
 * `annotation.added.<assetId>` and subscribes via NATS so that all
 * replicas receive events (multi-replica safe).
 *
 * When NATS is unavailable or NATS_URL is not configured, falls back
 * to the graphql-yoga in-process createPubSub (single-replica behaviour).
 */
import { Logger } from '@nestjs/common';
import { createPubSub } from 'graphql-yoga';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';

const logger = new Logger('NatsPubSubHelper');
const sc = StringCodec();

type AnnotationPayload = { annotationAdded: unknown };
type PubSubType = { [key: `annotationAdded_${string}`]: [AnnotationPayload] };

// In-process fallback always available
const inProcessPubSub = createPubSub<PubSubType>();

let natsConn: NatsConnection | null = null;
let natsAvailable = false;

/** Lazy NATS connection — resolves once, never throws (uses fallback on error). */
async function getNatsConnection(): Promise<NatsConnection | null> {
  if (natsAvailable && natsConn) return natsConn;
  if (!process.env['NATS_URL']) return null;
  try {
    natsConn = await connect(buildNatsOptions());
    natsAvailable = true;
    logger.log(`NATS connected: ${process.env['NATS_URL']}`);
    return natsConn;
  } catch (err) {
    logger.warn(`NATS unavailable, using in-process pub/sub: ${String(err)}`);
    return null;
  }
}

/** Publish an annotation event. Uses NATS when available; falls back to in-process. */
export async function publishAnnotationAdded(
  assetId: string,
  annotation: unknown
): Promise<void> {
  inProcessPubSub.publish(`annotationAdded_${assetId}`, {
    annotationAdded: annotation,
  });

  const nc = await getNatsConnection();
  if (nc) {
    try {
      nc.publish(
        `annotation.added.${assetId}`,
        sc.encode(JSON.stringify({ annotationAdded: annotation }))
      );
    } catch (err) {
      logger.warn(`NATS publish failed: ${String(err)}`);
    }
  }
}

/** Subscribe to annotation events for an asset. Returns async iterable compatible with graphql-yoga Subscription. */
export function subscribeAnnotationAdded(assetId: string) {
  // Always return the in-process subscription (receives events from publishAnnotationAdded).
  // NATS subscribers on other replicas bridge into in-process via their own publishAnnotationAdded calls.
  return inProcessPubSub.subscribe(`annotationAdded_${assetId}`);
}

// Wire NATS → in-process bridge for multi-replica scenarios (lazy init)
void (async () => {
  const nc = await getNatsConnection();
  if (!nc) return;
  try {
    const sub = nc.subscribe('annotation.added.*');
    (async () => {
      for await (const msg of sub) {
        try {
          const payload = JSON.parse(sc.decode(msg.data)) as AnnotationPayload;
          const assetId = msg.subject.split('.').at(-1) ?? '';
          inProcessPubSub.publish(`annotationAdded_${assetId}`, payload);
        } catch {
          // ignore parse errors
        }
      }
    })().catch(() => { /* ignore */ });
  } catch (err) {
    logger.warn(`NATS subscription setup failed: ${String(err)}`);
  }
})();
