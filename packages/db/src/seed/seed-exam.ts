/**
 * SEED 5 — Exam Blueprint & Items
 *
 * Creates:
 *   - 1 ACTIVE exam blueprint for the Nahar Shalom course
 *   - 10 MCQ exam items covering key topics across modules 1-3
 *
 * Idempotent: uses onConflictDoNothing + deterministic UUIDs.
 */
import { createDatabaseConnection, schema } from '../index.js';

// ── Deterministic UUIDs ───────────────────────────────────────────────────────
const DEMO_TENANT   = '00000000-0000-0000-0000-000000000000';
const COURSE_ID     = 'cc000000-0000-0000-0000-000000000002';
const INSTRUCTOR_ID = '00000000-0000-0000-0000-000000000002';

// Module IDs (FK on exam items)
const M1 = 'cc100000-0000-0000-0000-000000000001';
const M2 = 'cc100000-0000-0000-0000-000000000002';
const M3 = 'cc100000-0000-0000-0000-000000000003';

const BLUEPRINT_ID = '00000000-0000-0000-0000-000000001001';

const ITEM_IDS = [
  '00000000-0000-0000-0000-000000001101',
  '00000000-0000-0000-0000-000000001102',
  '00000000-0000-0000-0000-000000001103',
  '00000000-0000-0000-0000-000000001104',
  '00000000-0000-0000-0000-000000001105',
  '00000000-0000-0000-0000-000000001106',
  '00000000-0000-0000-0000-000000001107',
  '00000000-0000-0000-0000-000000001108',
  '00000000-0000-0000-0000-000000001109',
  '00000000-0000-0000-0000-000000001110',
] as const;

type BloomLevel = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';

type MCQData = {
  type: 'MCQ';
  stem: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type ItemDef = {
  id: string;
  moduleId: string;
  domainTag: string;
  bloomLevel: BloomLevel;
  questionData: MCQData;
  irtB: number;
};

const EXAM_ITEMS: ItemDef[] = [
  {
    id: ITEM_IDS[0], moduleId: M1, domainTag: 'biography', bloomLevel: 'REMEMBER', irtB: -0.5,
    questionData: {
      type: 'MCQ',
      stem: 'In which city was the Rashash (Rabbi Shalom Sharabi) born?',
      options: ['Jerusalem', 'Sanaa', 'Safed', 'Cairo'],
      correctIndex: 1,
      explanation: 'The Rashash was born in Sanaa, Yemen in 1720.',
    },
  },
  {
    id: ITEM_IDS[1], moduleId: M1, domainTag: 'biography', bloomLevel: 'REMEMBER', irtB: -0.3,
    questionData: {
      type: 'MCQ',
      stem: 'Who recognized the Rashash greatness at Yeshivat Beit El?',
      options: ['Rabbi Chaim Vital', 'Rabbi Gedalyah Chayun', 'The Ari', 'The Baal Shem Tov'],
      correctIndex: 1,
      explanation: 'Rabbi Gedalyah Chayun, head of Beit El Yeshiva, discovered his greatness through letters.',
    },
  },
  {
    id: ITEM_IDS[2], moduleId: M2, domainTag: 'rehovot-hanahar', bloomLevel: 'UNDERSTAND', irtB: 0.0,
    questionData: {
      type: 'MCQ',
      stem: 'According to Principle 1 of Rehovot HaNahar, on what do we rely?',
      options: ['The Zohar alone', 'The writings of the Ari alone', 'The Rambam', 'Sefer Yetzira'],
      correctIndex: 1,
      explanation: 'Principle 1: we rely solely on the writings of the Ari as transmitted by Rabbi Chaim Vital.',
    },
  },
  {
    id: ITEM_IDS[3], moduleId: M2, domainTag: 'rehovot-hanahar', bloomLevel: 'UNDERSTAND', irtB: 0.2,
    questionData: {
      type: 'MCQ',
      stem: 'According to Principle 3, which writings of the Ari take precedence?',
      options: ['The earliest ones', 'The later ones (written at greater age)', 'The secret ones', 'The questions'],
      correctIndex: 1,
      explanation: 'Later writings reflect a higher level of understanding.',
    },
  },
  {
    id: ITEM_IDS[4], moduleId: M3, domainTag: 'tzimtzum', bloomLevel: 'UNDERSTAND', irtB: 0.1,
    questionData: {
      type: 'MCQ',
      stem: 'What remains in the void (chalal) after the Tzimtzum?',
      options: ['Nothing', 'The Reshimu and the Kav', 'Angels', 'Stars'],
      correctIndex: 1,
      explanation: 'The Reshimu (faint impression) and Kav (thin beam of light) remain after Tzimtzum.',
    },
  },
  {
    id: ITEM_IDS[5], moduleId: M3, domainTag: 'sefirot', bloomLevel: 'REMEMBER', irtB: -0.4,
    questionData: {
      type: 'MCQ',
      stem: 'How many Sefirot are there in Kabbalah?',
      options: ['7', '10', '12', '22'],
      correctIndex: 1,
      explanation: 'The Ten Sefirot: Keter, Chochma, Binah, Chesed, Gevurah, Tiferet, Netzach, Hod, Yesod, Malchut.',
    },
  },
  {
    id: ITEM_IDS[6], moduleId: M3, domainTag: 'partzufim', bloomLevel: 'ANALYZE', irtB: 0.6,
    questionData: {
      type: 'MCQ',
      stem: 'Which Partzuf corresponds to the Sefirah of Binah?',
      options: ['Abba', 'Ima', 'Zeir Anpin', 'Atik Yomin'],
      correctIndex: 1,
      explanation: 'Ima corresponds to Binah; Abba corresponds to Chochma.',
    },
  },
  {
    id: ITEM_IDS[7], moduleId: M3, domainTag: 'four-worlds', bloomLevel: 'REMEMBER', irtB: -0.2,
    questionData: {
      type: 'MCQ',
      stem: 'Which world is the physical world according to the Ari?',
      options: ['Atzilut', 'Beriah', 'Yetzirah', 'Asiyah'],
      correctIndex: 3,
      explanation: 'Asiyah is the physical world, the lowest of the four worlds.',
    },
  },
  {
    id: ITEM_IDS[8], moduleId: M2, domainTag: 'rehovot-hanahar', bloomLevel: 'APPLY', irtB: 0.4,
    questionData: {
      type: 'MCQ',
      stem: 'When there is a contradiction between two places in the Ari writings, per Principle 2:',
      options: [
        'Follow the later text',
        'Compare and find an interpretation that reconciles both',
        'Ask a posek',
        'Choose based on personal preference',
      ],
      correctIndex: 1,
      explanation: 'Principle 2: compare and find an interpretation consistent with all sources.',
    },
  },
  {
    id: ITEM_IDS[9], moduleId: M1, domainTag: 'nahar-shalom-book', bloomLevel: 'UNDERSTAND', irtB: 0.3,
    questionData: {
      type: 'MCQ',
      stem: 'What did Rav Kadouri ztl say about Rehovot HaNahar?',
      options: [
        'Study it quickly',
        'Until you have studied it, you have not studied Kabbalah',
        'It is for advanced students only',
        'It is a Zionist text only',
      ],
      correctIndex: 1,
      explanation: 'Rav Kadouri: "Until you have studied Rehovot HaNahar — you have not studied Kabbalah."',
    },
  },
];

export async function seedExam(): Promise<void> {
  const db = createDatabaseConnection();

  // 1. Exam blueprint ──────────────────────────────────────────────────────────
  await db
    .insert(schema.examBlueprints)
    .values({
      id:                     BLUEPRINT_ID,
      tenantId:               DEMO_TENANT,
      courseId:               COURSE_ID,
      title:                  'Nahar Shalom — Final Certification Exam',
      description:            'Certification exam on Nahar Shalom: biography, Rehovot HaNahar, and Lurianic Kabbalah',
      timeLimitMinutes:       60,
      totalQuestions:         10,
      passingScore:           700,
      passingMethod:          'SCALED_SCORE',
      domainDistribution:     { biography: 3, 'rehovot-hanahar': 3, tzimtzum: 1, sefirot: 1, partzufim: 1, 'four-worlds': 1 },
      bloomDistribution:      { REMEMBER: 4, UNDERSTAND: 4, APPLY: 1, ANALYZE: 1 },
      difficultyRange:        { min: -0.5, max: 0.6 },
      shuffleQuestions:       true,
      shuffleAnswers:         true,
      maxRetakes:             3,
      retakeCooldownHours:    24,
      showResultsImmediately: true,
      showCorrectAnswers:     false,
      isAdaptive:             false,
      status:                 'ACTIVE',
      version:                1,
      createdBy:              INSTRUCTOR_ID,
    })
    .onConflictDoNothing();

  // 2. Exam items ───────────────────────────────────────────────────────────────
  for (const item of EXAM_ITEMS) {
    await db
      .insert(schema.examItems)
      .values({
        id:                item.id,
        tenantId:          DEMO_TENANT,
        courseId:          COURSE_ID,
        moduleId:          item.moduleId,
        domainTag:         item.domainTag,
        bloomLevel:        item.bloomLevel,
        questionData:      item.questionData,
        irtA:              1.0,
        irtB:              item.irtB,
        irtC:              0.25,
        calibrationStatus: 'CALIBRATED',
        source:            'MANUAL',
        qualityTier:       'SME_REVIEWED',
        exposureCount:     0,
        difFlagged:        false,
        createdBy:         INSTRUCTOR_ID,
      })
      .onConflictDoNothing();
  }

  console.log(`✅ Exam seeded: 1 ACTIVE blueprint, ${EXAM_ITEMS.length} MCQ items`);

  await db.$client.end();
}
