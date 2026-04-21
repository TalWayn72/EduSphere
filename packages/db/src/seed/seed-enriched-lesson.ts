/**
 * Seed: Enriched Lesson — שיעור בעץ חיים (Rabbi Ashlag, YouTube lecture)
 *
 * Creates a fully enriched lesson with:
 *   - media_asset with youtube_video_id
 *   - transcript + 20 Hebrew segments
 *   - 4 lesson_citations (VERIFIED)
 *   - 3 visual_anchors with timestamps
 *   - enriched_transcript_blocks: HEADING, TEXT, CITATION, VISUAL_ANCHOR types
 *
 * Deterministic Lesson UUID: ee000000-0000-0000-0000-000000000001
 *
 * Data constants: seed-enriched-lesson-data.ts
 * Run standalone: npx tsx packages/db/src/seed/seed-enriched-lesson.ts
 */

import 'dotenv/config';
import { createDatabaseConnection, closeAllPools, schema } from '../index.js';
import { withBypassRLS } from '../rls/withTenantContext.js';
import {
  DEMO_TENANT,
  INSTRUCTOR_ID,
  COURSE_ID,
  MODULE_ID,
  IDS,
  YOUTUBE_VIDEO_ID,
  SEGMENTS,
  VISUAL_ASSETS,
  VISUAL_ANCHORS,
  CITATIONS,
} from './seed-enriched-lesson-data.js';

export async function seedEnrichedLesson(): Promise<void> {
  const db = createDatabaseConnection();

  await withBypassRLS(db, async (tx) => {
    // 1. Visual assets (placeholder images in MinIO)
    await tx
      .insert(schema.visualAssets)
      .values(
        VISUAL_ASSETS.map((va) => ({
          id: va.id,
          tenant_id: DEMO_TENANT,
          course_id: COURSE_ID,
          uploader_id: INSTRUCTOR_ID,
          filename: va.filename,
          original_name: va.original_name,
          mime_type: 'image/webp',
          size_bytes: va.size_bytes,
          storage_key: `${DEMO_TENANT}/${COURSE_ID}/visual-assets/${va.id}-${va.key_suffix}.webp`,
          scan_status: 'CLEAN',
          metadata: va.metadata,
        }))
      )
      .onConflictDoNothing();

    // 2. Media asset with YouTube video ID
    await tx
      .insert(schema.media_assets)
      .values({
        id: IDS.mediaAsset,
        tenant_id: DEMO_TENANT,
        course_id: COURSE_ID,
        module_id: MODULE_ID,
        title: 'שיעור בעץ חיים — צמצום, ספירות וכוונות תפילה',
        media_type: 'VIDEO',
        file_url: `https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}`,
        youtube_video_id: YOUTUBE_VIDEO_ID,
        duration: 400,
        transcription_status: 'COMPLETED',
        metadata: {
          language: 'he',
          source: 'youtube',
          channel: 'Kabbalah Teachings',
        },
      })
      .onConflictDoNothing();

    // 3. Lesson
    await tx
      .insert(schema.lessons)
      .values({
        id: IDS.lesson,
        tenant_id: DEMO_TENANT,
        course_id: COURSE_ID,
        module_id: MODULE_ID,
        title: 'עץ חיים — צמצום, ספירות וכוונות תפילה',
        type: 'THEMATIC',
        series: 'קבלת האר"י',
        instructor_id: INSTRUCTOR_ID,
        status: 'PUBLISHED',
      })
      .onConflictDoNothing();

    // 4. Lesson asset (links lesson → media_asset)
    await tx
      .insert(schema.lesson_assets)
      .values({
        id: IDS.lessonAsset,
        lesson_id: IDS.lesson,
        asset_type: 'VIDEO',
        source_url: `https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}`,
        media_asset_id: IDS.mediaAsset,
        metadata: { youtube_video_id: YOUTUBE_VIDEO_ID },
      })
      .onConflictDoNothing();

    // 5. Transcript
    await tx
      .insert(schema.transcripts)
      .values({
        id: IDS.transcript,
        asset_id: IDS.mediaAsset,
        language: 'he',
        full_text: SEGMENTS.map((s) => s.text).join(' '),
      })
      .onConflictDoNothing();

    // 6. Transcript segments (20 Hebrew Kabbalistic segments)
    await tx
      .insert(schema.transcript_segments)
      .values(
        SEGMENTS.map((s) => ({
          id: IDS.seg(s.n),
          transcript_id: IDS.transcript,
          start_time: String(s.start),
          end_time: String(s.end),
          text: s.text,
          speaker: 'מרצה',
        }))
      )
      .onConflictDoNothing();

    // 7. Visual anchors (with video timestamps)
    await tx
      .insert(schema.visualAnchors)
      .values(
        VISUAL_ANCHORS.map((a) => ({
          id: a.id,
          tenant_id: DEMO_TENANT,
          media_asset_id: IDS.mediaAsset,
          created_by: INSTRUCTOR_ID,
          anchor_text: a.anchor_text,
          anchor_hash: a.anchor_hash,
          page_number: null,
          pos_x: a.pos.x,
          pos_y: a.pos.y,
          pos_w: a.pos.w,
          pos_h: a.pos.h,
          visual_asset_id: a.visual_asset_id,
          document_order: a.document_order,
          start_time: a.start_time,
          end_time: a.end_time,
          is_broken: false,
        }))
      )
      .onConflictDoNothing();

    // 8. Lesson citations (4 VERIFIED citations from Zohar, Etz Chaim, Nahar Shalom)
    await tx
      .insert(schema.lesson_citations)
      .values(
        CITATIONS.map((c) => ({
          id: c.id,
          lesson_id: IDS.lesson,
          source_text: c.source_text,
          book_name: c.book_name,
          part: c.part,
          page: c.page,
          column: c.column,
          paragraph: c.paragraph,
          match_status: c.match_status,
          confidence: c.confidence,
          resolved_text: c.resolved_text,
        }))
      )
      .onConflictDoNothing();

    // 9. Enriched transcript blocks (10 blocks: HEADING, TEXT, VISUAL_ANCHOR, CITATION)
    await tx
      .insert(schema.enriched_transcript_blocks)
      .values([
        {
          id: IDS.blk(1),
          tenant_id: DEMO_TENANT,
          lesson_id: IDS.lesson,
          block_type: 'HEADING',
          block_order: 0,
          content: { text: 'עץ חיים — מבוא לצמצום ולעשר הספירות', level: 1 },
          start_time: '0',
          end_time: '12.5',
        },
        {
          id: IDS.blk(2),
          tenant_id: DEMO_TENANT,
          lesson_id: IDS.lesson,
          segment_id: IDS.seg(1),
          block_type: 'TEXT',
          block_order: 1,
          content: { text: SEGMENTS[0].text },
          start_time: '0',
          end_time: '12.5',
        },
        {
          id: IDS.blk(3),
          tenant_id: DEMO_TENANT,
          lesson_id: IDS.lesson,
          segment_id: IDS.seg(2),
          block_type: 'TEXT',
          block_order: 2,
          content: { text: SEGMENTS[1].text },
          start_time: '12.5',
          end_time: '28.0',
        },
        {
          id: IDS.blk(4),
          tenant_id: DEMO_TENANT,
          lesson_id: IDS.lesson,
          segment_id: IDS.seg(3),
          block_type: 'HEADING',
          block_order: 3,
          content: { text: 'הצמצום — יסוד הבריאה', level: 2 },
          start_time: '28.0',
          end_time: '45.3',
        },
        {
          id: IDS.blk(5),
          tenant_id: DEMO_TENANT,
          lesson_id: IDS.lesson,
          segment_id: IDS.seg(4),
          block_type: 'TEXT',
          block_order: 4,
          content: { text: SEGMENTS[3].text },
          start_time: '45.3',
          end_time: '62.8',
        },
        {
          id: IDS.blk(6),
          tenant_id: DEMO_TENANT,
          lesson_id: IDS.lesson,
          segment_id: IDS.seg(5),
          block_type: 'VISUAL_ANCHOR',
          block_order: 5,
          anchor_id: IDS.anchor2,
          content: {
            caption: 'תרשים הצמצום — חלל ורשימו',
            alt: 'Tzimtzum diagram',
          },
          start_time: '28.0',
          end_time: '80.0',
        },
        {
          id: IDS.blk(7),
          tenant_id: DEMO_TENANT,
          lesson_id: IDS.lesson,
          segment_id: IDS.seg(4),
          block_type: 'CITATION',
          block_order: 6,
          citation_id: IDS.cit1,
          content: {
            quote:
              'דע כי קודם שנאצלו הנאצלים ונבראו הנבראים היה אור עליון פשוט ממלא כל המציאות',
            source: 'עץ חיים, שער א, ענף א',
          },
          start_time: '45.3',
          end_time: '80.0',
        },
        {
          id: IDS.blk(8),
          tenant_id: DEMO_TENANT,
          lesson_id: IDS.lesson,
          segment_id: IDS.seg(10),
          block_type: 'TEXT',
          block_order: 7,
          content: { text: SEGMENTS[9].text },
          start_time: '158.5',
          end_time: '180.0',
        },
        {
          id: IDS.blk(9),
          tenant_id: DEMO_TENANT,
          lesson_id: IDS.lesson,
          segment_id: IDS.seg(10),
          block_type: 'VISUAL_ANCHOR',
          block_order: 8,
          anchor_id: IDS.anchor1,
          content: { caption: 'עץ חיים — עשר הספירות', alt: 'Sefirot diagram' },
          start_time: '158.5',
          end_time: '200.3',
        },
        {
          id: IDS.blk(10),
          tenant_id: DEMO_TENANT,
          lesson_id: IDS.lesson,
          segment_id: IDS.seg(6),
          block_type: 'CITATION',
          block_order: 9,
          citation_id: IDS.cit3,
          content: {
            quote: 'בְּרֵאשִׁית — בָּהּ שִׁית — בָּהּ שִׁיתָא סִטְרִין',
            source: 'זוהר, חלק א, פרשת בראשית',
          },
          start_time: '80.0',
          end_time: '118.2',
        },
      ])
      .onConflictDoNothing();
  });

  console.log('✅ Enriched lesson seeded!');
  console.log(`   Lesson UUID:  ${IDS.lesson}`);
  console.log(`   Course UUID:  ${COURSE_ID}`);
  console.log(`   YouTube:      ${YOUTUBE_VIDEO_ID}`);
  console.log(
    `   Segments:     ${SEGMENTS.length} | Citations: 4 | Blocks: 10`
  );
  console.log(
    `   URL: http://localhost:5173/courses/${COURSE_ID}/lessons/${IDS.lesson}`
  );
}

// ─── Standalone entry point ───────────────────────────────────────────────────
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  seedEnrichedLesson()
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    })
    .finally(() => closeAllPools());
}
