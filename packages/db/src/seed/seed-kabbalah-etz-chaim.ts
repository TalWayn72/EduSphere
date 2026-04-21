/**
 * Seed: קבלה — יסודות | מקור עץ חיים שיעור א'
 *
 * Creates a Hebrew Kabbalistic lesson owned by instructor@example.com
 * (Keycloak user ID 00000000-0000-0000-0000-000000000002) so the
 * task-6 E2E test can log in as that instructor and trigger polishing.
 *
 * Stable lesson UUID: fa000000-0000-0000-0000-000000000001
 *
 * Run standalone: npx tsx packages/db/src/seed/seed-kabbalah-etz-chaim.ts
 */

import 'dotenv/config';
import { createDatabaseConnection, closeAllPools, schema } from '../index.js';
import { withBypassRLS } from '../rls/withTenantContext.js';

// ─── Stable deterministic UUIDs (idempotent re-runs) ─────────────────────────
const DEMO_TENANT = '00000000-0000-0000-0000-000000000000';
// instructor@example.com — Keycloak user, matches seed.ts ID
const INSTRUCTOR_ID = '00000000-0000-0000-0000-000000000002';

const IDS = {
  course: 'fa000000-0000-0000-0000-000000000010',
  module: 'fa000000-0000-0000-0000-000000000020',
  lesson: 'fa000000-0000-0000-0000-000000000001',
  mediaAsset: 'fa000000-0000-0000-0000-000000000002',
  transcript: 'fa000000-0000-0000-0000-000000000003',
  lessonAsset: 'fa000000-0000-0000-0000-000000000004',
  seg: (n: number) =>
    `fa100000-0000-0000-0000-${String(n).padStart(12, '0')}`,
  blk: (n: number) =>
    `fa200000-0000-0000-0000-${String(n).padStart(12, '0')}`,
} as const;

// Public Hebrew Kabbalah YouTube video (Etz Chaim channel)
const YOUTUBE_VIDEO_ID = 'K6d8hqTqKyA';

// ─── 18 Hebrew Kabbalistic transcript segments ────────────────────────────────
const SEGMENTS = [
  {
    n: 1, start: 0.0, end: 14.0,
    text: 'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ — כך פותח הזוהר הקדוש את פרשת בראשית.',
  },
  {
    n: 2, start: 14.0, end: 30.0,
    text: 'עֵץ הַחַיִּים בְּתוֹךְ הַגָּן — ספר עץ חיים של רבי חיים ויטאל הוא הבסיס לכל לימוד הקבלה הלוריאנית.',
  },
  {
    n: 3, start: 30.0, end: 46.5,
    text: 'סֵפֶר יְצִירָה שָׁלֹשׁ וּשְׁלֹשִׁים עֶשֶׂר סְפִירוֹת בְּלִי מַה — עשר ספירות ולא תשע, עשר ולא אחת עשרה.',
  },
  {
    n: 4, start: 46.5, end: 65.0,
    text: 'מְקוֹר עֵץ חַיִּים פֶּרֶק א — הָאוֹר הַקַּדְמוֹן: קודם שנאצלו הנאצלים היה אור עליון פשוט ממלא כל המציאות.',
  },
  {
    n: 5, start: 65.0, end: 82.0,
    text: 'זֹהַר — וַיֹּאמֶר רַבִּי שִׁמְעוֹן: אנחנו לומדים שכל אות בתורה היא עולם שלם של אורות עליונים.',
  },
  {
    n: 6, start: 82.0, end: 100.0,
    text: 'כֶּתֶר — חָכְמָה — בִּינָה — חֶסֶד — גְּבוּרָה — תִּפְאֶרֶת — נֶצַח — הוֹד — יְסוֹד — מַלְכוּת: עשר הספירות.',
  },
  {
    n: 7, start: 100.0, end: 118.5,
    text: 'הצמצום הוא היסוד — האין סוף צמצם את אורו ממרכז נקודה ונוצר חלל ריק שאפשר את הבריאה.',
  },
  {
    n: 8, start: 118.5, end: 137.0,
    text: 'לאחר הצמצום נשאר הרשימו — כמו טיפת דיו בקסת — רושם עדין של האור שהיה שם.',
  },
  {
    n: 9, start: 137.0, end: 157.0,
    text: 'הקו — קו אור דק שנכנס לחלל מהאין סוף — הוא המחבר בין האין סוף לבין עולמות הבריאה.',
  },
  {
    n: 10, start: 157.0, end: 176.0,
    text: 'שבירת הכלים — שלב קדמוני שבו נשברו כלי עולם הנקודים — גרמה לפיזור ניצוצות האור בכל המציאות.',
  },
  {
    n: 11, start: 176.0, end: 197.0,
    text: 'תיקון עולם — המטרה האנושית לפי הקבלה — היא לאסוף את ניצוצות האור הפזורים ולהחזירם לשורשם.',
  },
  {
    n: 12, start: 197.0, end: 218.0,
    text: 'ארבעת העולמות: אָצִילוּת, בְּרִיאָה, יְצִירָה, עֲשִׂיָּה — כל אחד מכיל עשר ספירות ברמה שונה של גילוי.',
  },
  {
    n: 13, start: 218.0, end: 240.0,
    text: 'פרצוף זעיר אנפין — המחבר בין הפרצופים העליונים לבין המלכות — הוא לב מערכת הספירות.',
  },
  {
    n: 14, start: 240.0, end: 260.0,
    text: 'יחוד זעיר אנפין ונוקבא — שהוא עניין שבת ומועד — מוסבר בעץ חיים שער י"ד בהרחבה.',
  },
  {
    n: 15, start: 260.0, end: 281.0,
    text: 'רבי שמעון בר יוחאי אמר בזוהר: כל תפילה שאדם מתפלל בכוונה — היא מעלה ניצוץ אחד ממקום נפילתו.',
  },
  {
    n: 16, start: 281.0, end: 302.0,
    text: 'הכוונות שתיקן הרש"ש בספר נהר שלום — מבוססות על כתבי האר"י — הן הדרך לתפילה עם מודעות קבלית.',
  },
  {
    n: 17, start: 302.0, end: 323.0,
    text: 'אין סוף — הביטוי המרכזי לאלוהות בקבלה — מציין את האלוהות שאין לה סוף, גבול, או תכלית שניתן לתאר.',
  },
  {
    n: 18, start: 323.0, end: 344.0,
    text: 'לסיכום שיעור א: עץ חיים הוא המפתח, הזוהר הוא המקור, ועשר הספירות הן המבנה הבסיסי של המציאות האלוקית.',
  },
] as const;

// ─── Export for use by seed.ts ────────────────────────────────────────────────
export async function seedKabbalahEtzChaim(): Promise<void> {
  const db = createDatabaseConnection();

  await withBypassRLS(db, async (tx) => {
    // 1. Course: קבלה — יסודות
    await tx
      .insert(schema.courses)
      .values({
        id: IDS.course,
        tenant_id: DEMO_TENANT,
        title: 'קבלה — יסודות',
        slug: 'kabbalah-yesodot',
        description: 'יסודות הקבלה הלוריאנית: עץ חיים, ספירות, צמצום ותיקון.',
        creator_id: INSTRUCTOR_ID,
        instructor_id: INSTRUCTOR_ID,
        is_published: true,
        is_public: true,
        tags: ['קבלה', 'עץ חיים', 'ספירות', 'יסודות'],
      })
      .onConflictDoNothing();

    // 2. Module
    await tx
      .insert(schema.modules)
      .values({
        id: IDS.module,
        course_id: IDS.course,
        title: 'שיעורי מבוא',
        description: 'שיעורי יסוד בקבלה הלוריאנית',
        order_index: 0,
      })
      .onConflictDoNothing();

    // 3. Media asset (YouTube)
    await tx
      .insert(schema.media_assets)
      .values({
        id: IDS.mediaAsset,
        tenant_id: DEMO_TENANT,
        course_id: IDS.course,
        module_id: IDS.module,
        title: 'מקור עץ חיים — שיעור א׳ — האור הקדמון',
        media_type: 'VIDEO',
        file_url: `https://www.youtube.com/watch?v=${YOUTUBE_VIDEO_ID}`,
        youtube_video_id: YOUTUBE_VIDEO_ID,
        duration: 350,
        transcription_status: 'COMPLETED',
        metadata: { language: 'he', source: 'youtube', channel: 'EtzChaim' },
      })
      .onConflictDoNothing();

    // 4. Lesson: מקור עץ חיים — שיעור א'
    await tx
      .insert(schema.lessons)
      .values({
        id: IDS.lesson,
        tenant_id: DEMO_TENANT,
        course_id: IDS.course,
        module_id: IDS.module,
        title: "מקור עץ חיים — שיעור א'",
        type: 'THEMATIC',
        series: 'קבלה — יסודות',
        instructor_id: INSTRUCTOR_ID,
        status: 'PUBLISHED',
      })
      .onConflictDoNothing();

    // 5. Lesson asset link
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

    // 6. Transcript
    await tx
      .insert(schema.transcripts)
      .values({
        id: IDS.transcript,
        asset_id: IDS.mediaAsset,
        language: 'he',
        full_text: SEGMENTS.map((s) => s.text).join(' '),
      })
      .onConflictDoNothing();

    // 7. Transcript segments (18 Hebrew Kabbalistic segments)
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

    // 8. Enriched transcript blocks (heading + text blocks)
    const blocks = [
      {
        id: IDS.blk(1),
        tenant_id: DEMO_TENANT,
        lesson_id: IDS.lesson,
        block_type: 'HEADING',
        block_order: 0,
        content: { text: 'קבלה — יסודות: מקור עץ חיים שיעור א', level: 1 },
        start_time: '0',
        end_time: '14.0',
      },
      ...SEGMENTS.slice(0, 8).map((s, i) => ({
        id: IDS.blk(i + 2),
        tenant_id: DEMO_TENANT,
        lesson_id: IDS.lesson,
        segment_id: IDS.seg(s.n),
        block_type: 'TEXT',
        block_order: i + 1,
        content: { text: s.text },
        start_time: String(s.start),
        end_time: String(s.end),
      })),
      {
        id: IDS.blk(10),
        tenant_id: DEMO_TENANT,
        lesson_id: IDS.lesson,
        block_type: 'HEADING',
        block_order: 9,
        content: { text: 'הצמצום והספירות — שלב ב', level: 2 },
        start_time: '157.0',
        end_time: '176.0',
      },
      ...SEGMENTS.slice(9).map((s, i) => ({
        id: IDS.blk(i + 11),
        tenant_id: DEMO_TENANT,
        lesson_id: IDS.lesson,
        segment_id: IDS.seg(s.n),
        block_type: 'TEXT',
        block_order: i + 10,
        content: { text: s.text },
        start_time: String(s.start),
        end_time: String(s.end),
      })),
    ];

    await tx
      .insert(schema.enriched_transcript_blocks)
      .values(blocks)
      .onConflictDoNothing();
  });

  console.log('✅ Hebrew Kabbalistic lesson seeded!');
  console.log(`   Lesson UUID:  ${IDS.lesson}`);
  console.log(`   Course UUID:  ${IDS.course}`);
  console.log(`   Instructor:   instructor@example.com (${INSTRUCTOR_ID})`);
  console.log(`   Segments:     ${SEGMENTS.length}`);
  console.log(`   Title:        מקור עץ חיים — שיעור א'`);
  console.log(
    `   Edit URL:     http://localhost:5173/lesson/${IDS.lesson}/edit`
  );
}

// ─── Standalone run ───────────────────────────────────────────────────────────
if (
  process.argv[1] &&
  process.argv[1].includes('seed-kabbalah-etz-chaim')
) {
  seedKabbalahEtzChaim()
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    })
    .finally(() => closeAllPools());
}
