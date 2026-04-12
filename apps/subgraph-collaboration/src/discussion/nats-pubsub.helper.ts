/**
 * natsPubSubHelper — NATS/in-process pub-sub bridge for discussion messageAdded.
 *
 * When NATS_URL is set, publishes message events to `discussion.message.added.<discussionId>`
 * and bridges incoming NATS messages to the local in-process pub/sub so all
 * replicas see all events.
 *
 * Falls back to in-process createPubSub when NATS is unavailable.
 */
import { Logger } from '@nestjs/common';
import { createPubSub } from 'graphql-yoga';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';

const logger = new Logger('DiscussionNatsPubSub');
const sc = StringCodec();

type MessagePayload = { messageAdded: unknown };
type PubSubType = { [key: `messageAdded_${string}`]: [MessagePayload] };

const inProcessPubSub = createPubSub<PubSubType>();

let natsConn: NatsConnection | null = null;
let natsAvailable = false;

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

export async function publishMessageAdded(
  discussionId: string,
  message: unknown
): Promise<void> {
  inProcessPubSub.publish(`messageAdded_${discussionId}`, {
    messageAdded: message,
  });

  const nc = await getNatsConnection();
  if (nc) {
    try {
      nc.publish(
        `discussion.message.added.${discussionId}`,
        sc.encode(JSON.stringify({ messageAdded: message }))
      );
    } catch (err) {
      logger.warn(`NATS publish failed: ${String(err)}`);
    }
  }
}

export function subscribeMessageAdded(discussionId: string) {
  return inProcessPubSub.subscribe(`messageAdded_${discussionId}`);
}

// Bridge NATS → in-process for multi-replica deployments
void (async () => {
  const nc = await getNatsConnection();
  if (!nc) return;
  try {
    const sub = nc.subscribe('discussion.message.added.*');
    (async () => {
      for await (const msg of sub) {
        try {
          const payload = JSON.parse(sc.decode(msg.data)) as MessagePayload;
          const discussionId = msg.subject.split('.').at(-1) ?? '';
          inProcessPubSub.publish(`messageAdded_${discussionId}`, payload);
        } catch {
          // ignore
        }
      }
    })().catch(() => {
      /* ignore */
    });
  } catch (err) {
    logger.warn(`NATS subscription setup failed: ${String(err)}`);
  }
})();
