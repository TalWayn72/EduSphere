/**
 * nats-pubsub.helper — NATS/in-process pub-sub bridge for live-chat subscriptions.
 *
 * Bridges three event streams:
 *   live.chat.message.<sessionId>  → liveChatMessageAdded
 *   live.reaction.burst.<sessionId> → liveReactionBurst
 *   live.qa.<sessionId>             → liveQAUpdated
 *
 * Falls back to in-process pub/sub when NATS is unavailable.
 */
import { Logger } from '@nestjs/common';
import { createPubSub } from 'graphql-yoga';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';

const logger = new Logger('LiveChatNatsPubSub');
const sc = StringCodec();

type ChatPayload = { liveChatMessageAdded: unknown };
type BurstPayload = { liveReactionBurst: unknown };
type QAPayload = { liveQAUpdated: unknown };

type PubSubEvents = {
  [key: `chatMsg_${string}`]: [ChatPayload];
  [key: `reactionBurst_${string}`]: [BurstPayload];
  [key: `qaUpdated_${string}`]: [QAPayload];
};

const pubSub = createPubSub<PubSubEvents>();

let natsConn: NatsConnection | null = null;
let natsAvailable = false;

async function getNatsConn(): Promise<NatsConnection | null> {
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

// ─── Publish helpers ────────────────────────────────────────────────────────

export async function publishMessageAdded(
  sessionId: string,
  message: unknown
): Promise<void> {
  pubSub.publish(`chatMsg_${sessionId}`, { liveChatMessageAdded: message });

  const nc = await getNatsConn();
  if (nc) {
    try {
      nc.publish(
        `live.chat.message.${sessionId}`,
        sc.encode(JSON.stringify({ liveChatMessageAdded: message }))
      );
    } catch (err) {
      logger.warn(`NATS publish failed (chat): ${String(err)}`);
    }
  }
}

export async function publishReactionBurst(
  sessionId: string,
  burst: unknown
): Promise<void> {
  pubSub.publish(`reactionBurst_${sessionId}`, { liveReactionBurst: burst });

  const nc = await getNatsConn();
  if (nc) {
    try {
      nc.publish(
        `live.reaction.burst.${sessionId}`,
        sc.encode(JSON.stringify({ liveReactionBurst: burst }))
      );
    } catch (err) {
      logger.warn(`NATS publish failed (burst): ${String(err)}`);
    }
  }
}

export async function publishQAUpdated(
  sessionId: string,
  question: unknown
): Promise<void> {
  pubSub.publish(`qaUpdated_${sessionId}`, { liveQAUpdated: question });

  const nc = await getNatsConn();
  if (nc) {
    try {
      nc.publish(
        `live.qa.${sessionId}`,
        sc.encode(JSON.stringify({ liveQAUpdated: question }))
      );
    } catch (err) {
      logger.warn(`NATS publish failed (qa): ${String(err)}`);
    }
  }
}

// ─── Subscribe helpers ───────────────────────────────────────────────────────

export function subscribeMessageAdded(sessionId: string) {
  return pubSub.subscribe(`chatMsg_${sessionId}`);
}

export function subscribeReactionBurst(sessionId: string) {
  return pubSub.subscribe(`reactionBurst_${sessionId}`);
}

export function subscribeQAUpdated(sessionId: string) {
  return pubSub.subscribe(`qaUpdated_${sessionId}`);
}

// ─── NATS → in-process bridge (multi-replica) ───────────────────────────────

void (async () => {
  const nc = await getNatsConn();
  if (!nc) return;

  const bridgeSubject = async (
    pattern: string,
    handler: (subject: string, payload: unknown) => void
  ) => {
    try {
      const sub = nc.subscribe(pattern);
      (async () => {
        for await (const msg of sub) {
          try {
            const payload = JSON.parse(sc.decode(msg.data)) as unknown;
            const sessionId = msg.subject.split('.').at(-1) ?? '';
            handler(sessionId, payload);
          } catch {
            // ignore malformed messages
          }
        }
      })().catch(() => {
        /* ignore */
      });
    } catch (err) {
      logger.warn(
        `NATS subscription setup failed [${pattern}]: ${String(err)}`
      );
    }
  };

  await bridgeSubject('live.chat.message.*', (sid, p) =>
    pubSub.publish(`chatMsg_${sid}`, p as ChatPayload)
  );
  await bridgeSubject('live.reaction.burst.*', (sid, p) =>
    pubSub.publish(`reactionBurst_${sid}`, p as BurstPayload)
  );
  await bridgeSubject('live.qa.*', (sid, p) =>
    pubSub.publish(`qaUpdated_${sid}`, p as QAPayload)
  );
})();
