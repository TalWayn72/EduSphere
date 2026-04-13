/**
 * LiveStreamQueryService — Read-only queries for live sessions and transcripts.
 * Extracted from LiveStreamService to keep files under 300 lines.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  sql,
} from '@edusphere/db';
import type {
  LiveStreamSessionResult,
  TranscriptSegmentResult,
} from './live-stream.service';

type TypedSession = {
  id: string;
  status: string;
  meetingName: string;
  scheduledAt: Date;
  courseId?: string;
};

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
export class LiveStreamQueryService implements OnModuleDestroy {
  private readonly logger = new Logger(LiveStreamQueryService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getActiveSessions(
    tenantId: string,
    courseId?: string
  ): Promise<LiveStreamSessionResult[]> {
    const cfgs = await this.db
      .select()
      .from(schema.live_session_configs)
      .where(eq(schema.live_session_configs.tenant_id, tenantId));

    if (!cfgs.length) return [];

    const sessionIds = cfgs.map((c) => c.session_id);
    const sessions = await this.db
      .select()
      .from(schema.liveSessions)
      .where(sql`${schema.liveSessions.id} = ANY(${sessionIds})`);

    const activeStatuses = new Set(['LIVE', 'PAUSED']);
    const results: LiveStreamSessionResult[] = [];

    for (const cfg of cfgs) {
      const sess = sessions.find((s) => s.id === cfg.session_id) as
        | TypedSession
        | undefined;
      if (!sess) continue;
      if (!activeStatuses.has(sess.status)) continue;
      if (courseId && sess.courseId !== courseId) continue;

      results.push({
        id: cfg.id,
        sessionId: cfg.session_id,
        lessonId: cfg.lesson_id ?? null,
        meetingName: sess.meetingName,
        scheduledAt: sess.scheduledAt.toISOString(),
        status: mapPhase(sess.status),
        streamType: cfg.stream_type,
        viewerCount: cfg.viewer_count,
        maxViewers: cfg.max_viewers,
        instructorId: cfg.instructor_id ?? null,
        isScreenSharing: cfg.is_screen_sharing,
        tenantId: cfg.tenant_id,
      });
    }
    return results;
  }

  async getTranscript(
    sessionId: string,
    tenantId: string,
    afterIndex: number
  ): Promise<TranscriptSegmentResult[]> {
    const rows = await this.db
      .select()
      .from(schema.live_transcript_segments)
      .where(
        and(
          eq(schema.live_transcript_segments.session_id, sessionId),
          eq(schema.live_transcript_segments.tenant_id, tenantId)
        )
      )
      .orderBy(schema.live_transcript_segments.segment_index);

    return rows
      .filter((r) => r.segment_index > afterIndex)
      .map((r) => ({
        id: r.id,
        segmentIndex: r.segment_index,
        text: r.text,
        startTime: r.start_time ?? null,
        endTime: r.end_time ?? null,
        isFinal: r.is_final,
        jargonHits: Array.isArray(r.jargon_hits) ? r.jargon_hits : [],
      }));
  }
}
