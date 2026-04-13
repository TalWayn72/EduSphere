/**
 * Seed: Kabbalah Lesson — שיעור קבלה - ספירת העומר ומוחין דקטנות
 *
 * Creates the full lesson record, media asset, lesson_asset link, and
 * enriched transcript blocks for the YouTube video 3QTC00L1x1w.
 * - Blocks 1-10: AI-generated summary/heading blocks
 * - Blocks 11+: Full transcript from docs/transcripts/3QTC00L1x1w-transcript.txt
 *
 * Lesson ID (stable): 52105dcc-f21a-4b2c-93fd-11d33b830aaa
 * YouTube Video ID:   3QTC00L1x1w
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  isNull,
  ne,
} from '../index.js';
import { withBypassRLS } from '../rls/withTenantContext.js';

// __dirname available via tsx (CommonJS semantics for seed scripts)
interface TranscriptBlock {
  startTime: number;
  endTime: number;
  text: string;
}
const transcriptBlocks: TranscriptBlock[] = JSON.parse(
  readFileSync(join(__dirname, 'transcript-blocks-data.json'), 'utf8')
) as TranscriptBlock[];

// ─── Stable UUIDs ─────────────────────────────────────────────────────────────
const DEMO_TENANT = '00000000-0000-0000-0000-000000000000';
const INSTRUCTOR_ID = 'cc000000-0000-0000-0000-000000000001';
// Dedicated stable course for ספירת העומר lessons (separate from נהר שלום cc000000-...0002)
const COURSE_ID = '55dfa451-bf85-4750-ac64-76d17dac5afb';
const MODULE_ID = 'cc100000-0000-0000-0000-000000000001';

const LESSON_ID = '52105dcc-f21a-4b2c-93fd-11d33b830aaa';
const MEDIA_ASSET_ID = '52105dcc-f21a-4b2c-93fd-11d33b830bbb';
const LESSON_ASSET_ID = '52105dcc-f21a-4b2c-93fd-11d33b830ccc';

// Block IDs (stable, for idempotent re-runs)
const blk = (n: number) =>
  `52105dcc-f21a-4b2c-93fd-aa${String(n).padStart(10, '0')}`;
// Transcript block IDs — stable via deterministic index prefix
const tblk = (n: number) =>
  `52105dcc-f21a-4b2c-93fd-bb${String(n).padStart(10, '0')}`;

const YOUTUBE_VIDEO_ID = '3QTC00L1x1w';

export async function seedKabbalahLesson(): Promise<void> {
  const db = createDatabaseConnection();

  await withBypassRLS(db, async (tx) => {
    // 0. Ensure the ספירת העומר course exists and is published
    await tx
      .insert(schema.courses)
      .values({
        id: COURSE_ID,
        tenant_id: DEMO_TENANT,
        title: 'ספירת העומר',
        description:
          'שיעורים בנושא ספירת העומר, מוחין דקטנות ומוחין דגדלות על פי תורת הקבלה',
        creator_id: INSTRUCTOR_ID,
        instructor_id: INSTRUCTOR_ID,
        is_published: true,
        is_public: true,
        slug: 'sefirat-haomer',
        tags: ['קבלה', 'ספירת העומר', 'מוחין'],
      })
      .onConflictDoUpdate({
        target: schema.courses.id,
        set: { is_published: true, updated_at: new Date() },
      });

    // 1. Media asset with YouTube video ID
    await tx
      .insert(schema.media_assets)
      .values({
        id: MEDIA_ASSET_ID,
        tenant_id: DEMO_TENANT,
        course_id: COURSE_ID,
        module_id: MODULE_ID,
        title: 'שיעור קבלה - ספירת העומר ומוחין דקטנות',
        media_type: 'VIDEO',
        file_url: `https://www.youtube.com/live/${YOUTUBE_VIDEO_ID}`,
        youtube_video_id: YOUTUBE_VIDEO_ID,
        duration: 6414,
        transcription_status: 'COMPLETED',
        metadata: {
          language: 'he',
          source: 'youtube',
          channel: 'ישיבת המקובלים בית אל',
        },
      })
      .onConflictDoUpdate({
        target: schema.media_assets.id,
        set: {
          youtube_video_id: YOUTUBE_VIDEO_ID,
          file_url: `https://www.youtube.com/live/${YOUTUBE_VIDEO_ID}`,
          transcription_status: 'COMPLETED',
          updated_at: new Date(),
        },
      });

    // 2. Lesson record — must exist for enrichedLesson resolver
    await tx
      .insert(schema.lessons)
      .values({
        id: LESSON_ID,
        tenant_id: DEMO_TENANT,
        course_id: COURSE_ID,
        module_id: MODULE_ID,
        title: 'שיעור קבלה - ספירת העומר ומוחין דקטנות',
        type: 'THEMATIC',
        series: 'ספירת העומר תשפ"ו',
        instructor_id: INSTRUCTOR_ID,
        status: 'PUBLISHED',
      })
      .onConflictDoUpdate({
        target: schema.lessons.id,
        set: {
          status: 'PUBLISHED',
          course_id: COURSE_ID,
          updated_at: new Date(),
        },
      });

    // 3. Lesson asset — links lesson → media_asset (enables youtubeVideoId lookup).
    // Remove any UI-created duplicates (no media_asset_id, non-canonical ID) first.
    await tx
      .delete(schema.lesson_assets)
      .where(
        and(
          eq(schema.lesson_assets.lesson_id, LESSON_ID),
          ne(schema.lesson_assets.id, LESSON_ASSET_ID),
          isNull(schema.lesson_assets.media_asset_id)
        )
      );

    await tx
      .insert(schema.lesson_assets)
      .values({
        id: LESSON_ASSET_ID,
        lesson_id: LESSON_ID,
        asset_type: 'VIDEO',
        source_url: `https://www.youtube.com/live/${YOUTUBE_VIDEO_ID}`,
        media_asset_id: MEDIA_ASSET_ID,
        metadata: { youtube_video_id: YOUTUBE_VIDEO_ID },
      })
      .onConflictDoUpdate({
        target: schema.lesson_assets.id,
        set: {
          media_asset_id: MEDIA_ASSET_ID,
          source_url: `https://www.youtube.com/live/${YOUTUBE_VIDEO_ID}`,
          metadata: { youtube_video_id: YOUTUBE_VIDEO_ID },
        },
      });

    // 4a. Summary/heading blocks (AI-generated — positions 0-9)
    // onConflictDoUpdate ensures re-seeding always refreshes content
    const summaryBlocks = [
      {
        id: blk(1),
        tenant_id: DEMO_TENANT,
        lesson_id: LESSON_ID,
        block_type: 'HEADING' as const,
        block_order: 0,
        content: { text: 'שיעור קבלה: ספירת העומר ומוחין דקטנות', level: 1 },
        start_time: '0',
        end_time: '60',
      },
      {
        id: blk(2),
        tenant_id: DEMO_TENANT,
        lesson_id: LESSON_ID,
        block_type: 'TEXT' as const,
        block_order: 1,
        content: {
          text: 'שיעור מאת מרן הרב ישראל, יום ה כב ניסן תשפ"ו. הרב דן בנושאי מוחין דקטנות ומוחין דגדלות בתקופת ספירת העומר. מוחין דקטנות הוא מצב רוחני שבו האדם נמצא בשפל, אולם על פי הקבלה מדובר בשלב הכרחי של הכנה לגדלות. שיעור זה נלמד ביום כב ניסן תשפ"ו בישיבת בית אל ירושלים.',
        },
        start_time: '60',
        end_time: '269',
      },
      {
        id: blk(3),
        tenant_id: DEMO_TENANT,
        lesson_id: LESSON_ID,
        block_type: 'HEADING' as const,
        block_order: 2,
        content: { text: 'הגדרת מוחין דקטנות', level: 2 },
        start_time: '269',
        end_time: '402',
      },
      {
        id: blk(4),
        tenant_id: DEMO_TENANT,
        lesson_id: LESSON_ID,
        block_type: 'TEXT' as const,
        block_order: 3,
        content: {
          text: 'מוחין דקטנות הוא מצב שבו האדם חי ללא מודעות לאלוקות, מצב שפל שמצד אחד הוא שלילי אך מצד שני הכרחי להתפתחות הרוחנית. בתקופת ספירת העומר, עם ישראל עובר ממצב קטנות (יציאת מצרים) לגדלות (קבלת התורה).',
        },
        start_time: '402',
        end_time: '636',
      },
      {
        id: blk(5),
        tenant_id: DEMO_TENANT,
        lesson_id: LESSON_ID,
        block_type: 'HEADING' as const,
        block_order: 4,
        content: { text: 'ספירת העומר — תהליך העלאת המוחין', level: 2 },
        start_time: '636',
        end_time: '900',
      },
      {
        id: blk(6),
        tenant_id: DEMO_TENANT,
        lesson_id: LESSON_ID,
        block_type: 'TEXT' as const,
        block_order: 5,
        content: {
          text: 'ספירת העומר היא תהליך של 49 יום שבמהלכו עם ישראל עולה ממוחין דקטנות (מצב של יציאת מצרים) למוחין דגדלות (מצב של קבלת התורה בשבועות). כל שבוע מכוון כנגד ספירה אחת מהשבע ספירות התחתונות.',
        },
        start_time: '900',
        end_time: '1200',
      },
      {
        id: blk(7),
        tenant_id: DEMO_TENANT,
        lesson_id: LESSON_ID,
        block_type: 'TEXT' as const,
        block_order: 6,
        content: {
          text: 'נקודות מרכזיות: 1. מוחין דקטנות כמצב ביניים הכרחי. 2. ספירת העומר כתהליך של העלאת מוחין. 3. הקשר בין ימי הספירה לספירות הקבלה. 4. חשיבות הכוונה בעבודת הספירה.',
        },
        start_time: '1200',
        end_time: '1534',
      },
      {
        id: blk(8),
        tenant_id: DEMO_TENANT,
        lesson_id: LESSON_ID,
        block_type: 'HEADING' as const,
        block_order: 7,
        content: { text: 'מקורות — ספר הכוונות של האר"י', level: 2 },
        start_time: '1534',
        end_time: '1800',
      },
      {
        id: blk(9),
        tenant_id: DEMO_TENANT,
        lesson_id: LESSON_ID,
        block_type: 'TEXT' as const,
        block_order: 8,
        content: {
          text: 'הרב קורא מדף פ עד דף פו של ספר הכוונות של האר"י ומסביר את שלבי ספירת העומר: פסח — גדלות ראשונה, לאחריה חזרה לקטנות (מוחין דקטנות). ספירת העומר — עלייה הדרגתית מ"עיבור" ל"ניקה" עד לגדלות בשבועות.',
        },
        start_time: '1800',
        end_time: '2160',
      },
      {
        id: blk(10),
        tenant_id: DEMO_TENANT,
        lesson_id: LESSON_ID,
        block_type: 'TEXT' as const,
        block_order: 9,
        content: {
          text: 'שבועות — נשלמת הקומה, עלייה לדרגת "אמא ואבא" (חב"ד). הרב מסביר שמטרת כוונות הספירה היא להעלות את האדם ממוחין דקטנות לגדלות, בדיוק כפי שעם ישראל עלה ממצרים לסיני.',
        },
        start_time: '2160',
        end_time: '2500',
      },
    ];

    for (const block of summaryBlocks) {
      await tx
        .insert(schema.enriched_transcript_blocks)
        .values(block)
        .onConflictDoUpdate({
          target: schema.enriched_transcript_blocks.id,
          set: {
            block_type: block.block_type,
            block_order: block.block_order,
            content: block.content,
            start_time: block.start_time,
            end_time: block.end_time,
            updated_at: new Date(),
          },
        });
    }

    // 4b. Full transcript blocks (from docs/transcripts/3QTC00L1x1w-transcript.txt)
    //     2-minute windows, positions 10..62
    const HEADING_BLOCK = {
      id: tblk(0),
      tenant_id: DEMO_TENANT,
      lesson_id: LESSON_ID,
      block_type: 'HEADING' as const,
      block_order: 10,
      content: { text: 'תמלול מלא של השיעור', level: 2 },
      start_time: '0',
      end_time: '5',
    };

    await tx
      .insert(schema.enriched_transcript_blocks)
      .values([HEADING_BLOCK])
      .onConflictDoUpdate({
        target: schema.enriched_transcript_blocks.id,
        set: {
          block_type: HEADING_BLOCK.block_type,
          block_order: HEADING_BLOCK.block_order,
          content: HEADING_BLOCK.content,
          start_time: HEADING_BLOCK.start_time,
          end_time: HEADING_BLOCK.end_time,
          updated_at: new Date(),
        },
      });

    const transcriptRows = transcriptBlocks.map((block, idx) => ({
      id: tblk(idx + 1),
      tenant_id: DEMO_TENANT,
      lesson_id: LESSON_ID,
      block_type: 'TEXT' as const,
      block_order: 11 + idx,
      content: { text: block.text },
      start_time: String(block.startTime),
      end_time: String(block.endTime),
    }));

    // Upsert in batches of 10 to avoid parameter limit
    const BATCH = 10;
    for (let i = 0; i < transcriptRows.length; i += BATCH) {
      const batch = transcriptRows.slice(i, i + BATCH);
      for (const row of batch) {
        await tx
          .insert(schema.enriched_transcript_blocks)
          .values(row)
          .onConflictDoUpdate({
            target: schema.enriched_transcript_blocks.id,
            set: {
              block_order: row.block_order,
              content: row.content,
              start_time: row.start_time,
              end_time: row.end_time,
              updated_at: new Date(),
            },
          });
      }
    }
  });

  const totalBlocks = 11 + transcriptBlocks.length;
  console.log('✅ Kabbalah lesson seeded successfully!');
  console.log(`   Lesson ID:         ${LESSON_ID}`);
  console.log(`   Media Asset ID:    ${MEDIA_ASSET_ID}`);
  console.log(`   YouTube Video:     ${YOUTUBE_VIDEO_ID}`);
  console.log(`   Summary blocks:    10`);
  console.log(`   Transcript blocks: ${transcriptBlocks.length} (+1 heading)`);
  console.log(`   Total blocks:      ${totalBlocks}`);
  console.log(`   URL: http://localhost:5173/learn/${LESSON_ID}`);
}
