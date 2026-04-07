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
 * Uses the existing nahar-shalom-course seed data (tenant + course + instructor).
 *
 * Run: npx tsx packages/db/src/seed/seed-enriched-lesson.ts
 */

import 'dotenv/config';
import { createDatabaseConnection, closeAllPools, schema } from '../index.js';
import { withBypassRLS } from '../rls/withTenantContext.js';

// ─── Stable deterministic UUIDs (idempotent re-runs) ─────────────────────────
const DEMO_TENANT = '00000000-0000-0000-0000-000000000000';
const INSTRUCTOR_ID = 'cc000000-0000-0000-0000-000000000001';
const COURSE_ID = 'cc000000-0000-0000-0000-000000000002';
const MODULE_ID = 'cc100000-0000-0000-0000-000000000001';

const IDS = {
  lesson: 'ee000000-0000-0000-0000-000000000001',
  mediaAsset: 'ee000000-0000-0000-0000-000000000002',
  transcript: 'ee000000-0000-0000-0000-000000000003',
  lessonAsset: 'ee000000-0000-0000-0000-000000000004',
  // visual assets (placeholder)
  va1: 'ee100000-0000-0000-0000-000000000001',
  va2: 'ee100000-0000-0000-0000-000000000002',
  va3: 'ee100000-0000-0000-0000-000000000003',
  // visual anchors
  anchor1: 'ee200000-0000-0000-0000-000000000001',
  anchor2: 'ee200000-0000-0000-0000-000000000002',
  anchor3: 'ee200000-0000-0000-0000-000000000003',
  // citations
  cit1: 'ee300000-0000-0000-0000-000000000001',
  cit2: 'ee300000-0000-0000-0000-000000000002',
  cit3: 'ee300000-0000-0000-0000-000000000003',
  cit4: 'ee300000-0000-0000-0000-000000000004',
  // transcript segments (seg01..seg20)
  seg: (n: number) => `ee400000-0000-0000-0000-${String(n).padStart(12, '0')}`,
  // enriched blocks (blk01..blk10)
  blk: (n: number) => `ee500000-0000-0000-0000-${String(n).padStart(12, '0')}`,
} as const;

// YouTube video: Rabbi Yehuda Ashlag (Baal HaSulam) lecture — public domain
// "כוחות הנפש לפי הקבלה" — Kabbalah lecture channel
const YOUTUBE_VIDEO_ID = 'K6d8hqTqKyA';

// ─── Hebrew transcript segments (~20) ────────────────────────────────────────
const SEGMENTS = [
  {
    n: 1,
    start: 0.0,
    end: 12.5,
    text: 'שלום לכולם, היום נלמד על עץ חיים של הרב חיים ויטאל, תלמידו של האר"י הקדוש.',
  },
  {
    n: 2,
    start: 12.5,
    end: 28.0,
    text: 'ספר עץ חיים הוא המקור העיקרי לכל לימוד הקבלה הלוריאנית. הוא כתוב על ידי ר\' חיים ויטאל מפי רבו האר"י.',
  },
  {
    n: 3,
    start: 28.0,
    end: 45.3,
    text: 'השער הראשון של עץ חיים עוסק בצמצום — כיווץ אור האין סוף כדי לפנות מקום לבריאה.',
  },
  {
    n: 4,
    start: 45.3,
    end: 62.8,
    text: 'כתוב בעץ חיים: "דע כי קודם שנאצלו הנאצלים ונבראו הנבראים היה אור עליון פשוט ממלא כל המציאות."',
  },
  {
    n: 5,
    start: 62.8,
    end: 80.0,
    text: 'לאחר הצמצום נשאר רק הרשימו — כמו טיפה של דיו שנשארת בקסת לאחר שמרוקנים אותה.',
  },
  {
    n: 6,
    start: 80.0,
    end: 98.5,
    text: 'הזוהר הקדוש אומר: "בראשית ברא אלהים" — ב\' בראשית — אות בית — היא הרמז לשתי ישויות: חכמה ובינה.',
  },
  {
    n: 7,
    start: 98.5,
    end: 118.2,
    text: "ספר הזוהר, חלק א', פרשת בראשית, מלמד אותנו שכל אות בתורה היא עולם שלם של אורות.",
  },
  {
    n: 8,
    start: 118.2,
    end: 138.0,
    text: 'עץ חיים, שער א\', ענף א\' — מסביר שהצמצום היה ממרכז נקודה אחת שנקראת "חלל".',
  },
  {
    n: 9,
    start: 138.0,
    end: 158.5,
    text: 'רחובות הנהר של הרש"ש מוסיף על עץ חיים: "כל מה שנכתב בכתבי האר"י — אין לפרש אחרת."',
  },
  {
    n: 10,
    start: 158.5,
    end: 180.0,
    text: 'עשר הספירות — כתר, חכמה, בינה, חסד, גבורה, תפארת, נצח, הוד, יסוד, מלכות — הן הכלים שבהם האין סוף מאיר.',
  },
  {
    n: 11,
    start: 180.0,
    end: 200.3,
    text: 'בעץ חיים שער ב\' כתוב: "ואחר הצמצום נשאר חלל ומקום פנוי ובתוך אותו חלל הוציא האין סוף קו אחד."',
  },
  {
    n: 12,
    start: 200.3,
    end: 222.0,
    text: 'הקו הזה — שנקרא גם "קו האמצע" — הוא מה שמחבר בין האין סוף לבין עולמות הבריאה.',
  },
  {
    n: 13,
    start: 222.0,
    end: 242.8,
    text: "בזוהר, חלק ג', פרשת אחרי מות — מדובר על ארבעת העולמות: אצילות, בריאה, יצירה ועשיה.",
  },
  {
    n: 14,
    start: 242.8,
    end: 265.0,
    text: 'כל אחד מהעולמות מכיל עשר ספירות משלו, אבל ברמה שונה של גילוי האלוקות.',
  },
  {
    n: 15,
    start: 265.0,
    end: 288.5,
    text: 'שבירת הכלים — שהיא תהליך שקדם לבריאת עולמנו — נלמדת בעץ חיים שער י"א בהרחבה.',
  },
  {
    n: 16,
    start: 288.5,
    end: 310.0,
    text: 'לאחר שבירת הכלים, ניצוצות האור פיזרו לכל מקום. ה"תיקון" — תיקון עולם — מטרתו לאסוף ניצוצות אלו.',
  },
  {
    n: 17,
    start: 310.0,
    end: 332.5,
    text: 'הרש"ש בנהר שלום כותב שמטרת כוונות התפילה היא בדיוק אסיפת הניצוצות הללו בכל תפילה.',
  },
  {
    n: 18,
    start: 332.5,
    end: 355.0,
    text: 'עץ חיים שער י"ג מלמד על פרצוף "זעיר אנפין" — הממשיך את האור מהפרצופים העליונים לעולמות התחתונים.',
  },
  {
    n: 19,
    start: 355.0,
    end: 378.0,
    text: 'יחוד ז"א ונוקבא — שהוא הנושא המרכזי בכוונות שבת — מוסבר בעץ חיים שער י"ד, ענף ה\'.',
  },
  {
    n: 20,
    start: 378.0,
    end: 400.0,
    text: 'לסיכום: עץ חיים הוא הבסיס. הזוהר הוא המקור. הרש"ש בנהר שלום הוא המפתח ליישום הכוונות בתפילה.',
  },
] as const;

// ─── Main seed function ───────────────────────────────────────────────────────
async function seedEnrichedLesson(): Promise<void> {
  const db = createDatabaseConnection();

  await withBypassRLS(db, async (tx) => {
    // 1. Visual assets (placeholder images in MinIO)
    await tx
      .insert(schema.visualAssets)
      .values([
        {
          id: IDS.va1,
          tenant_id: DEMO_TENANT,
          course_id: COURSE_ID,
          uploader_id: INSTRUCTOR_ID,
          filename: 'etz-chaim-diagram-sefirot.webp',
          original_name: 'etz-chaim-diagram-sefirot.png',
          mime_type: 'image/webp',
          size_bytes: 42000,
          storage_key: `${DEMO_TENANT}/${COURSE_ID}/visual-assets/${IDS.va1}-etz-chaim-sefirot.webp`,
          scan_status: 'CLEAN',
          metadata: {
            width: 800,
            height: 1200,
            alt_text: 'תרשים עץ חיים — עשר הספירות',
          },
        },
        {
          id: IDS.va2,
          tenant_id: DEMO_TENANT,
          course_id: COURSE_ID,
          uploader_id: INSTRUCTOR_ID,
          filename: 'tzimtzum-diagram.webp',
          original_name: 'tzimtzum-diagram.png',
          mime_type: 'image/webp',
          size_bytes: 28000,
          storage_key: `${DEMO_TENANT}/${COURSE_ID}/visual-assets/${IDS.va2}-tzimtzum-diagram.webp`,
          scan_status: 'CLEAN',
          metadata: {
            width: 700,
            height: 700,
            alt_text: 'תרשים הצמצום — חלל ורשימו',
          },
        },
        {
          id: IDS.va3,
          tenant_id: DEMO_TENANT,
          course_id: COURSE_ID,
          uploader_id: INSTRUCTOR_ID,
          filename: 'four-worlds-chart.webp',
          original_name: 'four-worlds-chart.png',
          mime_type: 'image/webp',
          size_bytes: 35000,
          storage_key: `${DEMO_TENANT}/${COURSE_ID}/visual-assets/${IDS.va3}-four-worlds-chart.webp`,
          scan_status: 'CLEAN',
          metadata: {
            width: 600,
            height: 900,
            alt_text: 'ארבעה עולמות: אצילות בריאה יצירה עשיה',
          },
        },
      ])
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

    // 6. Transcript segments (20 Hebrew segments)
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
      .values([
        {
          id: IDS.anchor1,
          tenant_id: DEMO_TENANT,
          media_asset_id: IDS.mediaAsset,
          created_by: INSTRUCTOR_ID,
          anchor_text:
            'עשר הספירות — כתר, חכמה, בינה, חסד, גבורה, תפארת, נצח, הוד, יסוד, מלכות',
          anchor_hash:
            'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          page_number: null,
          pos_x: '0.1',
          pos_y: '0.2',
          pos_w: '0.8',
          pos_h: '0.05',
          visual_asset_id: IDS.va1,
          document_order: 0,
          start_time: '158.5',
          end_time: '200.3',
          is_broken: false,
        },
        {
          id: IDS.anchor2,
          tenant_id: DEMO_TENANT,
          media_asset_id: IDS.mediaAsset,
          created_by: INSTRUCTOR_ID,
          anchor_text: 'הצמצום — ממרכז נקודה אחת שנקראת "חלל" — חלל ורשימו',
          anchor_hash:
            'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
          page_number: null,
          pos_x: '0.1',
          pos_y: '0.3',
          pos_w: '0.8',
          pos_h: '0.05',
          visual_asset_id: IDS.va2,
          document_order: 1,
          start_time: '28.0',
          end_time: '80.0',
          is_broken: false,
        },
        {
          id: IDS.anchor3,
          tenant_id: DEMO_TENANT,
          media_asset_id: IDS.mediaAsset,
          created_by: INSTRUCTOR_ID,
          anchor_text:
            'ארבעת העולמות: אצילות, בריאה, יצירה ועשיה — כל אחד מכיל עשר ספירות',
          anchor_hash:
            'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
          page_number: null,
          pos_x: '0.1',
          pos_y: '0.4',
          pos_w: '0.8',
          pos_h: '0.05',
          visual_asset_id: IDS.va3,
          document_order: 2,
          start_time: '222.0',
          end_time: '265.0',
          is_broken: false,
        },
      ])
      .onConflictDoNothing();

    // 8. Lesson citations (4 VERIFIED citations)
    await tx
      .insert(schema.lesson_citations)
      .values([
        {
          id: IDS.cit1,
          lesson_id: IDS.lesson,
          source_text:
            'דע כי קודם שנאצלו הנאצלים ונבראו הנבראים היה אור עליון פשוט ממלא כל המציאות',
          book_name: 'עץ חיים',
          part: 'שער א',
          page: 'א',
          column: 'א',
          paragraph: 'ענף א',
          match_status: 'VERIFIED',
          confidence: '0.9800',
          resolved_text:
            'דע כי קודם שנאצלו הנאצלים ונבראו הנבראים היה אור עליון פשוט ממלא כל המציאות. ולא היה שום מקום פנוי בבחינת אויר ריקני וחלל, אלא הכל היה מלא אור אין סוף פשוט ההוא.',
        },
        {
          id: IDS.cit2,
          lesson_id: IDS.lesson,
          source_text:
            'ואחר הצמצום נשאר חלל ומקום פנוי ובתוך אותו חלל הוציא האין סוף קו אחד',
          book_name: 'עץ חיים',
          part: 'שער א',
          page: 'ב',
          column: 'א',
          paragraph: 'ענף ב',
          match_status: 'VERIFIED',
          confidence: '0.9650',
          resolved_text:
            'ואחר הצמצום נשאר חלל ומקום פנוי ובתוך אותו חלל הוציא מאין סוף ב"ה קו אחד ישר מאורו העגול הנ"ל מלמעלה למטה יורד ומשתלשל לתוך אותו חלל.',
        },
        {
          id: IDS.cit3,
          lesson_id: IDS.lesson,
          source_text:
            "בראשית ברא אלהים — ב' בראשית — אות בית — היא הרמז לחכמה ובינה",
          book_name: 'זוהר',
          part: 'חלק א',
          page: 'א',
          column: 'א',
          paragraph: 'פרשת בראשית',
          match_status: 'VERIFIED',
          confidence: '0.9100',
          resolved_text:
            'בְּרֵאשִׁית — בְּרֵאשִׁית בְּרָא אֱלֹהִים. בַּלְּשׁוֹן הָעֶלְיוֹן. בְּרֵאשִׁית — בָּהּ שִׁית — בָּהּ שִׁיתָא סִטְרִין. וְהַיְינוּ שֵׁשׁ קְצָווֹת הַמֻּכְלָלִים בִּסְפִירַת חָכְמָה.',
        },
        {
          id: IDS.cit4,
          lesson_id: IDS.lesson,
          source_text:
            'ידוע שאנו סומכים על כתבי רבינו האר"י ז"ל בלבד, כפי שנמסרו על ידי ר\' חיים ויטאל',
          book_name: 'נהר שלום',
          part: 'הקדמה',
          page: 'לב',
          column: 'א',
          paragraph: 'רחובות הנהר',
          match_status: 'VERIFIED',
          confidence: '0.9950',
          resolved_text:
            'ידוע שאנו סומכים על כתבי רבינו האר"י ז"ל בלבד, כפי שנמסרו על ידי מוהרח"ו ז"ל. ואין לנו לסמוך על שום חיבור אחר שנכתב אחרי פטירתו ז"ל, כי אין לנו מסורת ברורה ממנו.',
        },
      ])
      .onConflictDoNothing();

    // 9. Enriched transcript blocks
    await tx
      .insert(schema.enriched_transcript_blocks)
      .values([
        // HEADING block (no segment)
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
        // TEXT blocks (segments 1-4)
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
        // HEADING: Tzimtzum section
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
        // TEXT + VISUAL_ANCHOR: Tzimtzum diagram
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
        // CITATION: Etz Chaim quote about Tzimtzum
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
        // TEXT: Sefirot section
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
        // VISUAL_ANCHOR: Sefirot diagram
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
        // CITATION: Zohar
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

  console.log('✅ Enriched lesson seeded successfully!');
  console.log(`   Lesson ID:      ${IDS.lesson}`);
  console.log(`   Course ID:      ${COURSE_ID}`);
  console.log(`   Media Asset ID: ${IDS.mediaAsset}`);
  console.log(`   YouTube Video:  ${YOUTUBE_VIDEO_ID}`);
  console.log('   Records:');
  console.log('     visual_assets:               3');
  console.log('     media_assets:                1');
  console.log('     lessons:                     1');
  console.log('     lesson_assets:               1');
  console.log('     transcripts:                 1');
  console.log('     transcript_segments:         20');
  console.log('     visual_anchors:              3');
  console.log('     lesson_citations:            4');
  console.log('     enriched_transcript_blocks:  10');
  console.log('   Total:                         44 records');
  console.log();
  console.log(
    `   Browser: http://localhost:5173/courses/${COURSE_ID}/lessons/${IDS.lesson}`
  );
}

seedEnrichedLesson()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => closeAllPools());
