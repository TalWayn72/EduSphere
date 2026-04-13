/**
 * PresenceService — Manages viewer presence for live stream sessions.
 * Handles join/leave tracking in live_session_presence and broadcasts counts via NATS.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
} from '@edusphere/db';
import { buildNatsOptions } from '@edusphere/nats-client';
import { connect, StringCodec } from 'nats';

const PRESENCE_COUNT_SUBJECT = 'EDUSPHERE.live.presence.count';
const PRESENCE_JOINED_SUBJECT = 'EDUSPHERE.live.presence.joined';
const PRESENCE_LEFT_SUBJECT = 'EDUSPHERE.live.presence.left';

export interface PresenceViewer {
  userId: string;
  joinedAt: string;
}

export interface PresenceInfo {
  activeViewers: number;
  viewers: PresenceViewer[];
}

@Injectable()
export class PresenceService implements OnModuleDestroy {
  private readonly logger = new Logger(PresenceService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  private async publishNats(subject: string, payload: unknown): Promise<void> {
    if (!process.env['NATS_URL']) return;
    try {
      const nc = await connect(buildNatsOptions());
      nc.publish(subject, this.sc.encode(JSON.stringify(payload)));
      await nc.drain();
    } catch (err) {
      this.logger.warn(`NATS publish failed [${subject}]: ${String(err)}`);
    }
  }

  async join(
    sessionId: string,
    tenantId: string,
    userId: string
  ): Promise<PresenceInfo> {
    // Upsert presence record
    await this.db
      .insert(schema.live_session_presence)
      .values({
        tenant_id: tenantId,
        session_id: sessionId,
        user_id: userId,
        is_active: true,
        joined_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          schema.live_session_presence.session_id,
          schema.live_session_presence.user_id,
        ],
        set: {
          is_active: true,
          left_at: null,
          joined_at: new Date(),
        },
      });

    const info = await this.getActiveViewers(sessionId, tenantId);

    void this.publishNats(PRESENCE_JOINED_SUBJECT, {
      sessionId,
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
    });

    void this.publishPresenceCount(sessionId, tenantId, info.activeViewers);

    return info;
  }

  async leave(
    sessionId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    await this.db
      .update(schema.live_session_presence)
      .set({ is_active: false, left_at: new Date() })
      .where(
        and(
          eq(schema.live_session_presence.session_id, sessionId),
          eq(schema.live_session_presence.user_id, userId),
          eq(schema.live_session_presence.tenant_id, tenantId)
        )
      );

    const info = await this.getActiveViewers(sessionId, tenantId);

    void this.publishNats(PRESENCE_LEFT_SUBJECT, {
      sessionId,
      tenantId,
      userId,
      durationSeconds: 0,
      timestamp: new Date().toISOString(),
    });

    void this.publishPresenceCount(sessionId, tenantId, info.activeViewers);
  }

  async getActiveViewers(
    sessionId: string,
    tenantId: string
  ): Promise<PresenceInfo> {
    const rows = await this.db
      .select()
      .from(schema.live_session_presence)
      .where(
        and(
          eq(schema.live_session_presence.session_id, sessionId),
          eq(schema.live_session_presence.tenant_id, tenantId),
          eq(schema.live_session_presence.is_active, true)
        )
      );

    const viewers: PresenceViewer[] = rows.map((r) => ({
      userId: r.user_id,
      joinedAt: r.joined_at.toISOString(),
    }));

    return { activeViewers: viewers.length, viewers };
  }

  private async publishPresenceCount(
    sessionId: string,
    tenantId: string,
    count: number
  ): Promise<void> {
    void this.publishNats(PRESENCE_COUNT_SUBJECT, {
      sessionId,
      tenantId,
      count,
      timestamp: new Date().toISOString(),
    });
  }
}
