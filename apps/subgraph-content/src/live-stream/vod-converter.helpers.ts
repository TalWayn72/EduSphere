/**
 * vod-converter.helpers.ts — DB step helpers for VOD conversion.
 * All functions receive an already-open DrizzleDB and operate inside the
 * caller's withTenantContext() transaction where required.
 */
import { Logger } from '@nestjs/common';
import {
  type DrizzleDB,
  schema,
  withTenantContext,
  eq,
  and,
} from '@edusphere/db';

const log = new Logger('VodConverterHelpers');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MergedSegment {
  text: string;
  startTime: string | null;
  endTime: string | null;
  speaker: string | null;
}

// ─── mergeTranscriptSegments ──────────────────────────────────────────────────

export async function mergeTranscriptSegments(
  db: DrizzleDB,
  sessionId: string
): Promise<MergedSegment[]> {
  const rows = await db
    .select()
    .from(schema.live_transcript_segments)
    .where(
      and(
        eq(schema.live_transcript_segments.session_id, sessionId),
        eq(schema.live_transcript_segments.is_final, true)
      )
    )
    .orderBy(schema.live_transcript_segments.segment_index);

  return rows.map((r) => ({
    text: r.text,
    startTime: r.start_time ?? null,
    endTime: r.end_time ?? null,
    speaker: r.speaker ?? null,
  }));
}

// ─── convertBookmarksToAnnotations ───────────────────────────────────────────

export async function convertBookmarksToAnnotations(
  db: DrizzleDB,
  sessionId: string,
  assetId: string,
  tenantId: string
): Promise<(typeof schema.annotations.$inferInsert)[]> {
  const bookmarks = await db
    .select()
    .from(schema.live_bookmarks)
    .where(
      and(
        eq(schema.live_bookmarks.session_id, sessionId),
        eq(schema.live_bookmarks.tenant_id, tenantId)
      )
    );

  return bookmarks.map((bk) => ({
    tenant_id: tenantId,
    asset_id: assetId,
    user_id: bk.user_id,
    annotation_type: 'BOOKMARK' as const,
    layer: 'PERSONAL' as const,
    content: {
      label: bk.label ?? null,
      note: bk.note ?? null,
      sourceSessionId: sessionId,
    },
    spatial_data: bk.stream_ts ? { contentTimestamp: String(bk.stream_ts) } : null,
    is_resolved: false,
  }));
}

// ─── createMediaAsset ─────────────────────────────────────────────────────────

export async function createMediaAsset(
  db: DrizzleDB,
  tenantId: string,
  lessonId: string | null | undefined,
  recordingKey: string | null | undefined,
  sessionId: string
): Promise<string> {
  const bucket = process.env['MINIO_BUCKET'] ?? 'edusphere';
  const fileUrl = recordingKey
    ? `minio://${bucket}/${recordingKey}`
    : `recording://${sessionId}`;

  const [asset] = await withTenantContext(
    db,
    { tenantId, userId: 'system', userRole: 'INSTRUCTOR' },
    (txDb) =>
      txDb
        .insert(schema.media_assets)
        .values({
          tenant_id: tenantId,
          title: `Live Recording — ${sessionId}`,
          media_type: 'VIDEO',
          file_url: fileUrl,
          transcription_status: 'PENDING',
          metadata: { sourceSessionId: sessionId, lessonId: lessonId ?? null },
        })
        .returning({ id: schema.media_assets.id })
  );
  if (!asset) throw new Error(`Failed to create media asset for session ${sessionId}`);
  return asset.id;
}

// ─── upsertLessonAsset ────────────────────────────────────────────────────────

export async function upsertLessonAsset(
  db: DrizzleDB,
  lessonId: string,
  assetId: string,
  recordingKey: string | null | undefined
): Promise<void> {
  const existing = await db
    .select()
    .from(schema.lesson_assets)
    .where(
      and(
        eq(schema.lesson_assets.lesson_id, lessonId),
        eq(schema.lesson_assets.asset_type, 'VIDEO')
      )
    )
    .limit(1);

  if (existing.length > 0 && existing[0]) {
    await db
      .update(schema.lesson_assets)
      .set({ media_asset_id: assetId, file_url: recordingKey ?? null })
      .where(eq(schema.lesson_assets.id, existing[0].id));
  } else {
    await db.insert(schema.lesson_assets).values({
      lesson_id: lessonId,
      asset_type: 'VIDEO',
      media_asset_id: assetId,
      file_url: recordingKey ?? null,
    });
  }
}

// ─── seedTranscriptFromLive ───────────────────────────────────────────────────

export async function seedTranscriptFromLive(
  db: DrizzleDB,
  tenantId: string,
  instructorId: string,
  sessionId: string,
  assetId: string
): Promise<void> {
  try {
    const segments = await withTenantContext(
      db,
      { tenantId, userId: instructorId, userRole: 'INSTRUCTOR' },
      (txDb) => mergeTranscriptSegments(txDb, sessionId)
    );
    if (segments.length === 0) return;

    const [transcript] = await db
      .insert(schema.transcripts)
      .values({ asset_id: assetId, language: 'he', full_text: segments.map((s) => s.text).join(' ') })
      .returning({ id: schema.transcripts.id });

    if (!transcript) throw new Error(`Failed to create transcript for asset ${assetId}`);

    await db.insert(schema.transcript_segments).values(
      segments.map((s) => ({
        transcript_id: transcript.id,
        text: s.text,
        start_time: s.startTime ?? '0',
        end_time: s.endTime ?? '0',
        speaker: s.speaker,
      }))
    );
    log.log({ assetId, segmentCount: segments.length }, 'Live transcript segments seeded');
  } catch (err) {
    log.warn({ err, sessionId }, 'Failed to seed transcript — non-fatal');
  }
}

// ─── migrateBookmarks ────────────────────────────────────────────────────────

export async function migrateBookmarks(
  db: DrizzleDB,
  tenantId: string,
  instructorId: string,
  sessionId: string,
  assetId: string
): Promise<void> {
  try {
    const rows = await withTenantContext(
      db,
      { tenantId, userId: instructorId, userRole: 'INSTRUCTOR' },
      (txDb) => convertBookmarksToAnnotations(txDb, sessionId, assetId, tenantId)
    );
    if (rows.length === 0) return;
    await db.insert(schema.annotations).values(rows);
    log.log({ sessionId, count: rows.length }, 'Bookmarks migrated to annotations');
  } catch (err) {
    log.warn({ err, sessionId }, 'Failed to migrate bookmarks — non-fatal');
  }
}
