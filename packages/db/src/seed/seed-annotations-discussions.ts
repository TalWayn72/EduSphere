/**
 * SEED 4 — Annotations & Discussions
 *
 * Creates:
 *   - 4 annotations on the enriched media asset (PERSONAL + SHARED layers)
 *   - 2 Chavruta-style discussions with messages and participants
 *
 * Depends on seed-enriched-lesson (asset ID ee000000-...-0002 must exist).
 * Idempotent: uses onConflictDoNothing + deterministic UUIDs.
 */
import { createDatabaseConnection, schema } from '../index.js';

// ── Deterministic UUIDs ───────────────────────────────────────────────────────
const DEMO_TENANT = '00000000-0000-0000-0000-000000000000';
const STUDENT_ID = '00000000-0000-0000-0000-000000000005';
const INSTRUCTOR_ID = '00000000-0000-0000-0000-000000000002';
const KAB_INSTRUCTOR = 'cc000000-0000-0000-0000-000000000001';
const COURSE_ID = 'cc000000-0000-0000-0000-000000000002';

// Enriched media asset from seed-enriched-lesson
const ASSET_ID = 'ee000000-0000-0000-0000-000000000002';

// Annotation IDs
const ANNOTATION_IDS = {
  a1: '00000000-0000-0000-0000-000000000801',
  a2: '00000000-0000-0000-0000-000000000802',
  a3: '00000000-0000-0000-0000-000000000803',
  a4: '00000000-0000-0000-0000-000000000804',
} as const;

// Discussion IDs
const DISCUSSION_IDS = {
  d1: '00000000-0000-0000-0000-000000000901',
  d2: '00000000-0000-0000-0000-000000000902',
} as const;

// Discussion message IDs
const MSG_IDS = {
  d1m1: '00000000-0000-0000-0000-000000000911',
  d1m2: '00000000-0000-0000-0000-000000000912',
  d1m3: '00000000-0000-0000-0000-000000000913',
  d2m1: '00000000-0000-0000-0000-000000000921',
  d2m2: '00000000-0000-0000-0000-000000000922',
} as const;

// Participant IDs
const PART_IDS = {
  d1student: '00000000-0000-0000-0000-000000000931',
  d1instructor: '00000000-0000-0000-0000-000000000932',
  d2student: '00000000-0000-0000-0000-000000000933',
  d2kab: '00000000-0000-0000-0000-000000000934',
} as const;

export async function seedAnnotationsDiscussions(): Promise<void> {
  const db = createDatabaseConnection();

  // 0. Ensure the enriched media asset exists (seed-enriched-lesson may not have run) ────
  await db
    .insert(schema.media_assets)
    .values({
      id: ASSET_ID,
      tenant_id: DEMO_TENANT,
      title: 'Nahar Shalom — Enriched Lesson Asset',
      media_type: 'DOCUMENT',
      file_url: 'https://placeholder/nahar-shalom.docx',
      transcription_status: 'COMPLETED',
      metadata: {},
    })
    .onConflictDoNothing();

  // 1. Annotations ──────────────────────────────────────────────────────────────
  await db
    .insert(schema.annotations)
    .values([
      {
        id: ANNOTATION_IDS.a1,
        tenant_id: DEMO_TENANT,
        asset_id: ASSET_ID,
        user_id: STUDENT_ID,
        annotation_type: 'INLINE_COMMENT',
        layer: 'PERSONAL',
        content: {
          text: 'Connection between tzimtzum and kavvanot — important!',
        },
        text_start: 120,
        text_end: 180,
        range_type: 'character',
      },
      {
        id: ANNOTATION_IDS.a2,
        tenant_id: DEMO_TENANT,
        asset_id: ASSET_ID,
        user_id: STUDENT_ID,
        annotation_type: 'BOOKMARK',
        layer: 'PERSONAL',
        content: { label: 'Return here — question about Partzufim' },
      },
      {
        id: ANNOTATION_IDS.a3,
        tenant_id: DEMO_TENANT,
        asset_id: ASSET_ID,
        user_id: KAB_INSTRUCTOR,
        annotation_type: 'SUGGESTION',
        layer: 'INSTRUCTOR',
        content: {
          text: 'Note the connection between Rehovot HaNahar and Principle 3',
          suggestion: 'Compare with Ramchal commentary',
        },
        text_start: 50,
        text_end: 90,
        range_type: 'character',
      },
      {
        id: ANNOTATION_IDS.a4,
        tenant_id: DEMO_TENANT,
        asset_id: ASSET_ID,
        user_id: INSTRUCTOR_ID,
        annotation_type: 'TEXT',
        layer: 'SHARED',
        content: {
          text: 'Key topic for next class discussion: the comparison method',
        },
      },
    ])
    .onConflictDoNothing();

  // 2. Discussions ──────────────────────────────────────────────────────────────
  await db
    .insert(schema.discussions)
    .values([
      {
        id: DISCUSSION_IDS.d1,
        tenant_id: DEMO_TENANT,
        course_id: COURSE_ID,
        title: 'Chavruta Question: Nature of Tzimtzum',
        description:
          'Discussion on 4 approaches to Tzimtzum — literal or metaphorical?',
        creator_id: STUDENT_ID,
        discussion_type: 'CHAVRUTA',
      },
      {
        id: DISCUSSION_IDS.d2,
        tenant_id: DEMO_TENANT,
        course_id: COURSE_ID,
        title: 'Forum: Shacharit Kavvanot in Modern Times',
        description:
          'Are the Rashash kavvanot still halachically relevant today?',
        creator_id: KAB_INSTRUCTOR,
        discussion_type: 'FORUM',
      },
    ])
    .onConflictDoNothing();

  // 3. Discussion messages ───────────────────────────────────────────────────────
  await db
    .insert(schema.discussion_messages)
    .values([
      // Discussion 1 — Chavruta on Tzimtzum
      {
        id: MSG_IDS.d1m1,
        discussion_id: DISCUSSION_IDS.d1,
        user_id: STUDENT_ID,
        content:
          'I think the tzimtzum is metaphorical — the infinite light did not literally move.',
        message_type: 'TEXT',
      },
      {
        id: MSG_IDS.d1m2,
        discussion_id: DISCUSSION_IDS.d1,
        user_id: KAB_INSTRUCTOR,
        content:
          'But Ramchal disagrees! He writes tzimtzum is about revelation, not essence.',
        message_type: 'TEXT',
        parent_message_id: MSG_IDS.d1m1,
      },
      {
        id: MSG_IDS.d1m3,
        discussion_id: DISCUSSION_IDS.d1,
        user_id: STUDENT_ID,
        content:
          'I found a source in Nahar Shalom (question 52) that supports the metaphorical approach.',
        message_type: 'TEXT',
        parent_message_id: MSG_IDS.d1m2,
      },
      // Discussion 2 — Forum on modern kavvanot
      {
        id: MSG_IDS.d2m1,
        discussion_id: DISCUSSION_IDS.d2,
        user_id: KAB_INSTRUCTOR,
        content:
          'Rav Kadouri ztl used the Rashash kavvanot until his last day — proof of relevance.',
        message_type: 'TEXT',
      },
      {
        id: MSG_IDS.d2m2,
        discussion_id: DISCUSSION_IDS.d2,
        user_id: STUDENT_ID,
        content:
          'Is there a practical abbreviated version of the kavvanot for busy people?',
        message_type: 'TEXT',
      },
    ])
    .onConflictDoNothing();

  // 4. Participants ─────────────────────────────────────────────────────────────
  await db
    .insert(schema.discussion_participants)
    .values([
      {
        id: PART_IDS.d1student,
        discussion_id: DISCUSSION_IDS.d1,
        user_id: STUDENT_ID,
      },
      {
        id: PART_IDS.d1instructor,
        discussion_id: DISCUSSION_IDS.d1,
        user_id: KAB_INSTRUCTOR,
      },
      {
        id: PART_IDS.d2student,
        discussion_id: DISCUSSION_IDS.d2,
        user_id: STUDENT_ID,
      },
      {
        id: PART_IDS.d2kab,
        discussion_id: DISCUSSION_IDS.d2,
        user_id: KAB_INSTRUCTOR,
      },
    ])
    .onConflictDoNothing();

  console.log(
    '✅ Annotations & Discussions seeded: 4 annotations, 2 discussions, 5 messages, 4 participants'
  );
}
