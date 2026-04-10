/**
 * SEED 1 — Enrollments & Progress
 *
 * Enrolls the demo student + kabbalah instructor in the Nahar Shalom course
 * and marks content items from the first 5 modules as completed (~62% progress)
 * so dashboards show real data.
 *
 * Idempotent: uses onConflictDoNothing + deterministic enrollment UUIDs.
 * Progress rows use the live content item IDs (inserted without deterministic
 * UUIDs in nahar-shalom-course seed), so we query them at runtime.
 */
import { inArray } from 'drizzle-orm';
import { createDatabaseConnection, schema } from '../index.js';

// ── Deterministic UUIDs ───────────────────────────────────────────────────────
const COURSE_ID    = 'cc000000-0000-0000-0000-000000000002';
const STUDENT_ID   = '00000000-0000-0000-0000-000000000005';
const KAB_INSTRUCT = 'cc000000-0000-0000-0000-000000000001';

// First 5 module IDs (60% of the 8 modules)
const COMPLETED_MODULE_IDS = [
  'cc100000-0000-0000-0000-000000000001',
  'cc100000-0000-0000-0000-000000000002',
  'cc100000-0000-0000-0000-000000000003',
  'cc100000-0000-0000-0000-000000000004',
  'cc100000-0000-0000-0000-000000000005',
];

// Enrollment IDs
const ENROLLMENT_IDS = {
  student:    'ee010000-0000-0000-0000-000000000001',
  instructor: 'ee010000-0000-0000-0000-000000000002',
} as const;

export async function seedEnrollments(): Promise<void> {
  const db = createDatabaseConnection();

  // 1. Enrollments ──────────────────────────────────────────────────────────────
  await db
    .insert(schema.userCourses)
    .values([
      {
        id:       ENROLLMENT_IDS.student,
        userId:   STUDENT_ID,
        courseId: COURSE_ID,
        status:   'ACTIVE',
      },
      {
        id:       ENROLLMENT_IDS.instructor,
        userId:   KAB_INSTRUCT,
        courseId: COURSE_ID,
        status:   'ACTIVE',
      },
    ])
    .onConflictDoNothing();

  // 2. Resolve content item IDs for the completed modules ──────────────────────
  const items = await db
    .select({ id: schema.contentItems.id })
    .from(schema.contentItems)
    .where(inArray(schema.contentItems.moduleId, COMPLETED_MODULE_IDS));

  if (items.length === 0) {
    console.warn(
      'seed-enrollments: no content items found for modules 1-5; skipping progress rows. ' +
        'Run seedNaharShalomCourse() first.'
    );
    return;
  }

  // 3. Progress rows — mark each item 100% complete for the student ──────────
  for (const item of items) {
    await db
      .insert(schema.userProgress)
      .values({
        userId:        STUDENT_ID,
        contentItemId: item.id,
        isCompleted:   true,
        progress:      100,
        timeSpent:     300,
        completedAt:   new Date('2026-03-15T10:00:00Z'),
      })
      .onConflictDoNothing();
  }

  console.log(
    `✅ Enrollments seeded: 2 enrollments, ${items.length} progress records (modules 1-5)`
  );
}
