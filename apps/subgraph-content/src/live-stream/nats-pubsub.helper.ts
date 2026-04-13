/**
 * liveStreamNatsPubSub — NATS/in-process pub-sub bridge for live stream subscriptions.
 *
 * Bridges NATS messages to the local in-process pub/sub so all
 * replicas see all events for liveTranscriptUpdated, livePresenceChanged,
 * and liveSessionStatusChanged subscriptions.
 *
 * Falls back to in-process createPubSub when NATS is unavailable.
 */
import { Logger } from '@nestjs/common';
import { createPubSub } from 'graphql-yoga';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';

const logger = new Logger('LiveStreamNatsPubSub');
const sc = StringCodec();

type TranscriptPayload = { liveTranscriptUpdated: unknown };
type PresencePayload = { livePresenceChanged: unknown };
type StatusPayload = { liveSessionStatusChanged: unknown };

type PubSubType = {
  [key: `transcript_${string}`]: [TranscriptPayload];
  [key: `presence_${string}`]: [PresencePayload];
  [key: `status_${string}`]: [StatusPayload];
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

// ─── Publish helpers ─────────────────────────────────────────────────────────

export async function publishTranscriptSegment(
  sessionId: string,
  segment: unknown
): Promise<void> {
  inProcessPubSub.publish(`transcript_${sessionId}`, {
    liveTranscriptUpdated: segment,
  });
  const nc = await getNatsConnection();
  if (!nc) return;
  try {
    nc.publish(
      `EDUSPHERE.live.transcript.segment`,
      sc.encode(JSON.stringify({ sessionId, segment }))
    );
  } catch (err) {
    logger.warn(`NATS publish transcript failed: ${String(err)}`);
  }
}

export async function publishPresenceUpdate(
  sessionId: string,
  presence: unknown
): Promise<void> {
  inProcessPubSub.publish(`presence_${sessionId}`, {
    livePresenceChanged: presence,
  });
  const nc = await getNatsConnection();
  if (!nc) return;
  try {
    nc.publish(
      `EDUSPHERE.live.presence.count`,
      sc.encode(JSON.stringify({ sessionId, presence }))
    );
  } catch (err) {
    logger.warn(`NATS publish presence failed: ${String(err)}`);
  }
}

export async function publishSessionStatus(
  sessionId: string,
  session: unknown
): Promise<void> {
  inProcessPubSub.publish(`status_${sessionId}`, {
    liveSessionStatusChanged: session,
  });
  const nc = await getNatsConnection();
  if (!nc) return;
  try {
    nc.publish(
      `EDUSPHERE.live.stream.started`,
      sc.encode(JSON.stringify({ sessionId, session }))
    );
  } catch (err) {
    logger.warn(`NATS publish status failed: ${String(err)}`);
  }
}

// ─── Subscribe helpers ────────────────────────────────────────────────────────

export function subscribeTranscript(sessionId: string) {
  return inProcessPubSub.subscribe(`transcript_${sessionId}`);
}

export function subscribePresence(sessionId: string) {
  return inProcessPubSub.subscribe(`presence_${sessionId}`);
}

export function subscribeSessionStatus(sessionId: string) {
  return inProcessPubSub.subscribe(`status_${sessionId}`);
}

// ─── NATS → in-process bridge (multi-replica) ────────────────────────────────

void (async () => {
  const nc = await getNatsConnection();
  if (!nc) return;

  try {
    const transcriptSub = nc.subscribe('EDUSPHERE.live.transcript.segment');
    const presenceSub = nc.subscribe('EDUSPHERE.live.presence.count');
    const statusSub = nc.subscribe('EDUSPHERE.live.stream.*');

    // Bridge transcript segments
    void (async () => {
      for await (const msg of transcriptSub) {
        try {
          const data = JSON.parse(sc.decode(msg.data)) as {
            sessionId: string;
            segment: unknown;
          };
          inProcessPubSub.publish(`transcript_${data.sessionId}`, {
            liveTranscriptUpdated: data.segment,
          });
        } catch {
          /* ignore */
        }
      }
    })().catch(() => {
      /* ignore */
    });

    // Bridge presence updates
    void (async () => {
      for await (const msg of presenceSub) {
        try {
          const data = JSON.parse(sc.decode(msg.data)) as {
            sessionId: string;
            presence: unknown;
          };
          inProcessPubSub.publish(`presence_${data.sessionId}`, {
            livePresenceChanged: data.presence,
          });
        } catch {
          /* ignore */
        }
      }
    })().catch(() => {
      /* ignore */
    });

    // Bridge session status updates
    void (async () => {
      for await (const msg of statusSub) {
        try {
          const data = JSON.parse(sc.decode(msg.data)) as {
            sessionId: string;
            session: unknown;
          };
          inProcessPubSub.publish(`status_${data.sessionId}`, {
            liveSessionStatusChanged: data.session,
          });
        } catch {
          /* ignore */
        }
      }
    })().catch(() => {
      /* ignore */
    });
  } catch (err) {
    logger.warn(`NATS subscription setup failed: ${String(err)}`);
  }
})();
