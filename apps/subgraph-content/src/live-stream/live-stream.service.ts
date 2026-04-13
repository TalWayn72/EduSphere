/**
 * LiveStreamService — CRUD and lifecycle management for live_session_configs.
 * Joins with live_sessions for status. Publishes NATS events on state changes.
 * Read queries (getActiveSessions, getTranscript) are in live-stream-query.service.ts.
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
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

const Subjects = {
  STREAM_STARTED: 'EDUSPHERE.live.stream.started',
  STREAM_PAUSED: 'EDUSPHERE.live.stream.paused',
  STREAM_RESUMED: 'EDUSPHERE.live.stream.resumed',
  STREAM_ENDED: 'EDUSPHERE.live.stream.ended',
  STREAM_SCREEN_SHARE: 'EDUSPHERE.live.stream.screen_share',
} as const;

export interface LiveStreamSessionResult {
  id: string;
  sessionId: string;
  lessonId: string | null;
  meetingName: string;
  scheduledAt: string;
  status: string;
  streamType: string;
  viewerCount: number;
  maxViewers: number;
  instructorId: string | null;
  isScreenSharing: boolean;
  tenantId: string;
}

export interface TranscriptSegmentResult {
  id: string;
  segmentIndex: number;
  text: string;
  startTime: string | null;
  endTime: string | null;
  isFinal: boolean;
  jargonHits: unknown[];
}

type DbSessionStatus = 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'ENDED' | 'RECORDING' | 'CANCELLED';

function mapPhase(dbStatus: string): string {
  const map: Record<string, string> = {
    SCHEDULED: 'PRE_LIVE',
    LIVE: 'LIVE',
    PAUSED: 'PAUSED',
    ENDED: 'ENDED',
    RECORDING: 'VOD_READY',
  };
  return map[dbStatus] ?? 'PRE_LIVE';
}

@Injectable()
export class LiveStreamService implements OnModuleDestroy {
  private readonly logger = new Logger(LiveStreamService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  private async publishEvent(subject: string, payload: unknown): Promise<void> {
    if (!process.env['NATS_URL']) return;
    try {
      const nc = await connect(buildNatsOptions());
      nc.publish(subject, this.sc.encode(JSON.stringify(payload)));
      await nc.drain();
    } catch (err) {
      this.logger.warn(`NATS publish failed [${subject}]: ${String(err)}`);
    }
  }

  async fetchJoined(
    sessionId: string,
    tenantId: string
  ): Promise<LiveStreamSessionResult | null> {
    const [cfg] = await this.db
      .select()
      .from(schema.live_session_configs)
      .where(
        and(
          eq(schema.live_session_configs.session_id, sessionId),
          eq(schema.live_session_configs.tenant_id, tenantId)
        )
      )
      .limit(1);
    if (!cfg) return null;

    const [sess] = await this.db
      .select()
      .from(schema.liveSessions)
      .where(eq(schema.liveSessions.id, sessionId))
      .limit(1);
    if (!sess) return null;

    const typedSess = sess as { meetingName: string; scheduledAt: Date; status: string };
    return {
      id: cfg.id,
      sessionId: cfg.session_id,
      lessonId: cfg.lesson_id ?? null,
      meetingName: typedSess.meetingName,
      scheduledAt: typedSess.scheduledAt.toISOString(),
      status: mapPhase(typedSess.status),
      streamType: cfg.stream_type,
      viewerCount: cfg.viewer_count,
      maxViewers: cfg.max_viewers,
      instructorId: cfg.instructor_id ?? null,
      isScreenSharing: cfg.is_screen_sharing,
      tenantId: cfg.tenant_id,
    };
  }

  async getSession(
    sessionId: string,
    tenantId: string
  ): Promise<LiveStreamSessionResult | null> {
    return this.fetchJoined(sessionId, tenantId);
  }

  async createConfig(
    sessionId: string,
    tenantId: string,
    instructorId: string,
    opts: { streamType?: string; lessonId?: string; maxViewers?: number; autoRecord?: boolean }
  ): Promise<LiveStreamSessionResult> {
    await this.db.insert(schema.live_session_configs).values({
      tenant_id: tenantId,
      session_id: sessionId,
      stream_type: opts.streamType ?? 'BBB',
      lesson_id: opts.lessonId ?? undefined,
      instructor_id: instructorId,
      max_viewers: opts.maxViewers ?? 0,
      auto_record: opts.autoRecord ?? true,
    });

    const result = await this.fetchJoined(sessionId, tenantId);
    if (!result) throw new NotFoundException(`Session ${sessionId} not found after create`);
    return result;
  }

  async updateConfig(
    sessionId: string,
    tenantId: string,
    opts: { maxViewers?: number; autoRecord?: boolean }
  ): Promise<LiveStreamSessionResult> {
    const updates: Record<string, unknown> = {};
    if (opts.maxViewers !== undefined) updates['max_viewers'] = opts.maxViewers;
    if (opts.autoRecord !== undefined) updates['auto_record'] = opts.autoRecord;

    if (Object.keys(updates).length > 0) {
      await this.db
        .update(schema.live_session_configs)
        .set(updates)
        .where(
          and(
            eq(schema.live_session_configs.session_id, sessionId),
            eq(schema.live_session_configs.tenant_id, tenantId)
          )
        );
    }

    const result = await this.fetchJoined(sessionId, tenantId);
    if (!result) throw new NotFoundException(`Session ${sessionId} not found`);
    return result;
  }

  async transition(
    sessionId: string,
    tenantId: string,
    instructorId: string,
    action: 'start' | 'pause' | 'resume' | 'end'
  ): Promise<LiveStreamSessionResult> {
    const [sess] = await this.db
      .select()
      .from(schema.liveSessions)
      .where(eq(schema.liveSessions.id, sessionId))
      .limit(1);
    if (!sess) throw new NotFoundException(`Session ${sessionId} not found`);

    const currentStatus = (sess as { status: DbSessionStatus }).status;
    const actionToStatus: Record<string, DbSessionStatus> = {
      start: 'LIVE', pause: 'PAUSED', resume: 'LIVE', end: 'ENDED',
    };
    const validFrom: Record<string, string[]> = {
      start: ['SCHEDULED'],
      pause: ['LIVE'],
      resume: ['PAUSED'],
      end: ['LIVE', 'PAUSED', 'SCHEDULED'],
    };

    if (!validFrom[action]?.includes(currentStatus)) {
      throw new BadRequestException(
        `Cannot ${action} session in status ${currentStatus}`
      );
    }

    await this.db
      .update(schema.liveSessions)
      .set({ status: actionToStatus[action] })
      .where(eq(schema.liveSessions.id, sessionId));

    const subjectMap: Record<string, string> = {
      start: Subjects.STREAM_STARTED,
      pause: Subjects.STREAM_PAUSED,
      resume: Subjects.STREAM_RESUMED,
      end: Subjects.STREAM_ENDED,
    };

    void this.publishEvent(subjectMap[action] ?? '', {
      sessionId, tenantId, instructorId,
      timestamp: new Date().toISOString(),
    });

    const result = await this.fetchJoined(sessionId, tenantId);
    if (!result) throw new NotFoundException(`Session ${sessionId} not found after transition`);
    return result;
  }

  async toggleScreenShare(
    sessionId: string,
    tenantId: string,
    instructorId: string,
    active: boolean
  ): Promise<LiveStreamSessionResult> {
    await this.db
      .update(schema.live_session_configs)
      .set({ is_screen_sharing: active })
      .where(
        and(
          eq(schema.live_session_configs.session_id, sessionId),
          eq(schema.live_session_configs.tenant_id, tenantId)
        )
      );

    void this.publishEvent(Subjects.STREAM_SCREEN_SHARE, {
      sessionId, tenantId, instructorId, active,
      timestamp: new Date().toISOString(),
    });

    const result = await this.fetchJoined(sessionId, tenantId);
    if (!result) throw new NotFoundException(`Session ${sessionId} not found`);
    return result;
  }
}
