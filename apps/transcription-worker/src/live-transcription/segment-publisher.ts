/**
 * SegmentPublisher
 *
 * Persists a live transcript segment to the `live_transcript_segments` table
 * via Drizzle ORM with tenant RLS context, then publishes a NATS event so
 * frontend clients and downstream services receive the segment in real time.
 *
 * On partial segments (isFinal=false) we upsert by (session_id, segment_index)
 * so the row is updated when the final version arrives.
 */
import { Injectable, Logger } from '@nestjs/common';
import { db, schema, withTenantContext } from '@edusphere/db';
import { and, eq } from 'drizzle-orm';
import { NatsService } from '../nats/nats.service';
import type { LiveSegment, JargonHit } from './live-transcription.types';

const NATS_SUBJECT = 'EDUSPHERE.live.transcript.segment';

@Injectable()
export class SegmentPublisher {
  private readonly logger = new Logger(SegmentPublisher.name);

  constructor(private readonly nats: NatsService) {}

  /**
   * Upserts the segment row and publishes to NATS.
   * `hits` are stored in the `jargon_hits` JSONB column.
   */
  async publish(segment: LiveSegment, hits: JargonHit[] = []): Promise<void> {
    await Promise.allSettled([
      this.persist(segment, hits),
      this.publishNats(segment, hits),
    ]);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async persist(
    segment: LiveSegment,
    hits: JargonHit[]
  ): Promise<void> {
    try {
      await withTenantContext(
        db,
        {
          tenantId: segment.tenantId,
          userId: 'system',
          userRole: 'SUPER_ADMIN',
        },
        async (txDb) => {
          // Check if a row already exists (partial → final update)
          const existing = await txDb
            .select({ id: schema.live_transcript_segments.id })
            .from(schema.live_transcript_segments)
            .where(
              and(
                eq(
                  schema.live_transcript_segments.session_id,
                  segment.sessionId
                ),
                eq(
                  schema.live_transcript_segments.segment_index,
                  segment.segmentIndex
                )
              )
            )
            .limit(1);

          const values = {
            tenant_id: segment.tenantId,
            session_id: segment.sessionId,
            segment_index: segment.segmentIndex,
            text: segment.text,
            start_time:
              segment.startTime !== undefined
                ? String(segment.startTime)
                : null,
            end_time:
              segment.endTime !== undefined ? String(segment.endTime) : null,
            is_final: segment.isFinal,
            speaker: segment.speaker ?? null,
            jargon_hits: hits as unknown as Record<string, unknown>[],
          };

          if (existing.length > 0) {
            await txDb
              .update(schema.live_transcript_segments)
              .set(values)
              .where(eq(schema.live_transcript_segments.id, existing[0].id));
          } else {
            await txDb.insert(schema.live_transcript_segments).values(values);
          }
        }
      );
    } catch (err) {
      this.logger.error(
        { err, sessionId: segment.sessionId, index: segment.segmentIndex },
        'Failed to persist live segment'
      );
    }
  }

  private async publishNats(
    segment: LiveSegment,
    hits: JargonHit[]
  ): Promise<void> {
    try {
      await this.nats.publish(NATS_SUBJECT, {
        sessionId: segment.sessionId,
        tenantId: segment.tenantId,
        segmentIndex: segment.segmentIndex,
        text: segment.text,
        startTime: segment.startTime,
        endTime: segment.endTime,
        isFinal: segment.isFinal,
        speaker: segment.speaker ?? null,
        jargonHits: hits,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.warn(
        { err, sessionId: segment.sessionId },
        'Failed to publish segment to NATS'
      );
    }
  }
}
