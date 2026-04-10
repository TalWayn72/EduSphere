/**
 * SEED 2 — Gamification Data
 *
 * Creates 5 platform badges, awards 3 to the demo student,
 * seeds userPoints + pointEvents, userXpEvents + userXpTotals,
 * and gives the student a 5-day streak.
 *
 * Idempotent: uses onConflictDoNothing + deterministic UUIDs.
 */
import { createDatabaseConnection, schema } from '../index.js';

// ── Deterministic UUIDs ───────────────────────────────────────────────────────
const DEMO_TENANT = '00000000-0000-0000-0000-000000000000';
const STUDENT_ID  = '00000000-0000-0000-0000-000000000005';

// Badges
const BADGE_IDS = {
  firstLesson:    '00000000-0000-0000-0000-000000000101',
  courseComplete: '00000000-0000-0000-0000-000000000102',
  sevenDayStreak: '00000000-0000-0000-0000-000000000103',
  quizMaster:     '00000000-0000-0000-0000-000000000104',
  graphExplorer:  '00000000-0000-0000-0000-000000000105',
} as const;

// User-badge award IDs
const USER_BADGE_IDS = {
  firstLesson:   '00000000-0000-0000-0000-000000000201',
  quizMaster:    '00000000-0000-0000-0000-000000000202',
  graphExplorer: '00000000-0000-0000-0000-000000000203',
} as const;

// UserPoints row ID
const USER_POINTS_ID = '00000000-0000-0000-0000-000000000301';

// PointEvents
const POINT_EVENT_IDS = {
  lessonComplete: '00000000-0000-0000-0000-000000000401',
  quizBonus:      '00000000-0000-0000-0000-000000000402',
  streakBonus:    '00000000-0000-0000-0000-000000000403',
} as const;

// XP events
const XP_EVENT_IDS = {
  lessonCompleted: '00000000-0000-0000-0000-000000000501',
  quizPassed:      '00000000-0000-0000-0000-000000000502',
  streakBonus:     '00000000-0000-0000-0000-000000000503',
} as const;

// Streak
const STREAK_ID = '00000000-0000-0000-0000-000000000601';

export async function seedGamification(): Promise<void> {
  const db = createDatabaseConnection();

  // 1. Badges ───────────────────────────────────────────────────────────────────
  await db
    .insert(schema.badges)
    .values([
      {
        id:             BADGE_IDS.firstLesson,
        name:           'First Lesson',
        description:    'Completed your first lesson',
        iconEmoji:      '🎓',
        category:       'COMPLETION',
        pointsReward:   50,
        conditionType:  'LESSON_COUNT',
        conditionValue: 1,
      },
      {
        id:             BADGE_IDS.courseComplete,
        name:           'Course Complete',
        description:    'Finished an entire course',
        iconEmoji:      '🏆',
        category:       'COMPLETION',
        pointsReward:   500,
        conditionType:  'COURSE_COUNT',
        conditionValue: 1,
      },
      {
        id:             BADGE_IDS.sevenDayStreak,
        name:           '7-Day Streak',
        description:    'Studied 7 days in a row',
        iconEmoji:      '🔥',
        category:       'STREAK',
        pointsReward:   100,
        conditionType:  'STREAK_DAYS',
        conditionValue: 7,
      },
      {
        id:             BADGE_IDS.quizMaster,
        name:           'Quiz Master',
        description:    'Passed 5 quizzes with a perfect score',
        iconEmoji:      '🧠',
        category:       'ENGAGEMENT',
        pointsReward:   200,
        conditionType:  'QUIZ_PERFECT_COUNT',
        conditionValue: 5,
      },
      {
        id:             BADGE_IDS.graphExplorer,
        name:           'Graph Explorer',
        description:    'Explored 10 nodes in the knowledge graph',
        iconEmoji:      '🗺️',
        category:       'ENGAGEMENT',
        pointsReward:   150,
        conditionType:  'GRAPH_NODE_COUNT',
        conditionValue: 10,
      },
    ])
    .onConflictDoNothing();

  // 2. User-badge awards ────────────────────────────────────────────────────────
  await db
    .insert(schema.userBadges)
    .values([
      {
        id:       USER_BADGE_IDS.firstLesson,
        userId:   STUDENT_ID,
        badgeId:  BADGE_IDS.firstLesson,
        tenantId: DEMO_TENANT,
        earnedAt: new Date('2026-03-01T09:00:00Z'),
      },
      {
        id:       USER_BADGE_IDS.quizMaster,
        userId:   STUDENT_ID,
        badgeId:  BADGE_IDS.quizMaster,
        tenantId: DEMO_TENANT,
        earnedAt: new Date('2026-03-10T14:00:00Z'),
      },
      {
        id:       USER_BADGE_IDS.graphExplorer,
        userId:   STUDENT_ID,
        badgeId:  BADGE_IDS.graphExplorer,
        tenantId: DEMO_TENANT,
        earnedAt: new Date('2026-03-20T11:00:00Z'),
      },
    ])
    .onConflictDoNothing();

  // 3. User points (running total) ──────────────────────────────────────────────
  await db
    .insert(schema.userPoints)
    .values({
      id:          USER_POINTS_ID,
      userId:      STUDENT_ID,
      tenantId:    DEMO_TENANT,
      totalPoints: 750,
    })
    .onConflictDoNothing();

  // 4. Point events ─────────────────────────────────────────────────────────────
  await db
    .insert(schema.pointEvents)
    .values([
      {
        id:          POINT_EVENT_IDS.lessonComplete,
        userId:      STUDENT_ID,
        tenantId:    DEMO_TENANT,
        eventType:   'LESSON_COMPLETE',
        points:      50,
        description: 'Completed first lesson in Nahar Shalom course',
        createdAt:   new Date('2026-03-01T09:00:00Z'),
      },
      {
        id:          POINT_EVENT_IDS.quizBonus,
        userId:      STUDENT_ID,
        tenantId:    DEMO_TENANT,
        eventType:   'QUIZ_PASSED',
        points:      200,
        description: 'Perfect score on Rehovot HaNahar quiz',
        createdAt:   new Date('2026-03-10T14:00:00Z'),
      },
      {
        id:          POINT_EVENT_IDS.streakBonus,
        userId:      STUDENT_ID,
        tenantId:    DEMO_TENANT,
        eventType:   'STREAK_BONUS',
        points:      500,
        description: '5-day learning streak bonus',
        createdAt:   new Date('2026-03-20T11:00:00Z'),
      },
    ])
    .onConflictDoNothing();

  // 5. XP events ────────────────────────────────────────────────────────────────
  await db
    .insert(schema.userXpEvents)
    .values([
      {
        id:        XP_EVENT_IDS.lessonCompleted,
        userId:    STUDENT_ID,
        tenantId:  DEMO_TENANT,
        eventType: 'LESSON_COMPLETED',
        xpAwarded: 100,
        metadata:  { lessonTitle: 'Biography — Rashash in Kabbalah' },
        createdAt: new Date('2026-03-01T09:00:00Z'),
      },
      {
        id:        XP_EVENT_IDS.quizPassed,
        userId:    STUDENT_ID,
        tenantId:  DEMO_TENANT,
        eventType: 'QUIZ_PASSED',
        xpAwarded: 200,
        metadata:  { quizTitle: 'Rehovot HaNahar quiz', score: 100 },
        createdAt: new Date('2026-03-10T14:00:00Z'),
      },
      {
        id:        XP_EVENT_IDS.streakBonus,
        userId:    STUDENT_ID,
        tenantId:  DEMO_TENANT,
        eventType: 'STREAK_BONUS',
        xpAwarded: 150,
        metadata:  { streakDays: 5 },
        createdAt: new Date('2026-03-20T11:00:00Z'),
      },
    ])
    .onConflictDoNothing();

  // 6. XP totals ────────────────────────────────────────────────────────────────
  await db
    .insert(schema.userXpTotals)
    .values({
      userId:   STUDENT_ID,
      tenantId: DEMO_TENANT,
      totalXp:  450,
      level:    3,
    })
    .onConflictDoNothing();

  // 7. User streak ──────────────────────────────────────────────────────────────
  await db
    .insert(schema.userStreaks)
    .values({
      id:               STREAK_ID,
      userId:           STUDENT_ID,
      tenantId:         DEMO_TENANT,
      currentStreak:    5,
      longestStreak:    5,
      lastActivityDate: '2026-04-09',
    })
    .onConflictDoNothing();

  console.log('✅ Gamification seeded: 5 badges, 3 user-badge awards, points, XP, 5-day streak');
}
