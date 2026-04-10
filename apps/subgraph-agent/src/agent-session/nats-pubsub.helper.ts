/**
 * natsPubSubHelper — NATS/in-process pub-sub bridge for agent messageStream.
 *
 * When NATS_URL is set, publishes agent messages to `agent.message.<sessionId>`
 * and bridges incoming NATS messages to the local in-process pub/sub so all
 * replicas receive stream events.
 *
 * Falls back to in-process createPubSub when NATS is unavailable.
 */
import { Logger } from '@nestjs/common';
import { createPubSub } from 'graphql-yoga';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';

const logger = new Logger('AgentNatsPubSub');
const sc = StringCodec();

interface AgentMessagePayload {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
}

type PubSubType = {
  [key: `messageStream_${string}`]: [{ messageStream: AgentMessagePayload }];
};

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

export async function publishMessageStream(
  sessionId: string,
  message: AgentMessagePayload
): Promise<void> {
  inProcessPubSub.publish(`messageStream_${sessionId}`, {
    messageStream: message,
  });

  const nc = await getNatsConnection();
  if (nc) {
    try {
      nc.publish(
        `agent.message.${sessionId}`,
        sc.encode(JSON.stringify({ messageStream: message }))
      );
    } catch (err) {
      logger.warn(`NATS publish failed: ${String(err)}`);
    }
  }
}

export function subscribeMessageStream(sessionId: string) {
  return inProcessPubSub.subscribe(`messageStream_${sessionId}`);
}

// Bridge NATS → in-process for multi-replica deployments
void (async () => {
  const nc = await getNatsConnection();
  if (!nc) return;
  try {
    const sub = nc.subscribe('agent.message.*');
    (async () => {
      for await (const msg of sub) {
        try {
          const payload = JSON.parse(sc.decode(msg.data)) as {
            messageStream: AgentMessagePayload;
          };
          const sessionId = msg.subject.split('.').at(-1) ?? '';
          inProcessPubSub.publish(`messageStream_${sessionId}`, payload);
        } catch {
          // ignore
        }
      }
    })().catch(() => { /* ignore */ });
  } catch (err) {
    logger.warn(`NATS subscription setup failed: ${String(err)}`);
  }
})();
