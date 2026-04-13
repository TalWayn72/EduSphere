/**
 * Jargon seed data — קבלה / ספירת העומר
 *
 * Constants, IDs, occurrences. Terms are in seed-jargon-kabbalah-terms.ts.
 * Tenant: DEMO_TENANT (00000000-0000-0000-0000-000000000000)
 */

export const DEMO_TENANT = '00000000-0000-0000-0000-000000000000';
export const LESSON_ID = '52105dcc-f21a-4b2c-93fd-11d33b830aaa';

export const DOMAIN_ID = 'd0000000-0000-0000-0000-000000000001';
export const DOMAIN_ASSIGNMENT_ID = 'da000000-0000-0000-0000-000000000002';

/** Stable UUID helpers */
export const jt = (n: number) =>
  `e7000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

export const jo = (n: number) =>
  `0c000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

// Block IDs — summary blocks from seed-kabbalah-sefirat-haomer.ts
const blk = (n: number) =>
  `52105dcc-f21a-4b2c-93fd-aa${String(n).padStart(10, '0')}`;

export const BLOCK_IDS = {
  heading1: blk(1), // "שיעור קבלה: ספירת העומר ומוחין דקטנות"
  summary: blk(2), // overview paragraph
  headingMochin: blk(3), // "הגדרת מוחין דקטנות"
  mochinText: blk(4), // text about mochin
  headingSefirah: blk(5), // "ספירת העומר — תהליך העלאת המוחין"
  sefirahText: blk(6), // text about sefirat haomer process
  keyPoints: blk(7), // key points text
  headingAri: blk(8), // "מקורות — ספר הכוונות של האר\"י"
  ariText: blk(9), // Ari text
  shavuotText: blk(10), // shavuot text
};

export interface TermDef {
  id: string;
  canonical_form: string;
  phonetic_hint: string;
  alt_forms: string[];
  definition_short: string;
  definition_full: string;
}

export interface OccurrenceDef {
  id: string;
  term_id: string;
  block_id: string;
  start_time: string;
  end_time: string;
  original_text: string;
}

export const KABBALAH_OCCURRENCES: OccurrenceDef[] = [
  {
    id: jo(1),
    term_id: jt(1),
    block_id: BLOCK_IDS.sefirahText,
    start_time: '900',
    end_time: '1200',
    original_text: 'כל שבוע מכוון כנגד ספירה אחת מהשבע ספירות התחתונות',
  },
  {
    id: jo(2),
    term_id: jt(2),
    block_id: BLOCK_IDS.headingMochin,
    start_time: '269',
    end_time: '402',
    original_text: 'הגדרת מוחין דקטנות',
  },
  {
    id: jo(3),
    term_id: jt(2),
    block_id: BLOCK_IDS.mochinText,
    start_time: '402',
    end_time: '636',
    original_text: 'מוחין דקטנות הוא מצב שבו האדם חי ללא מודעות לאלוקות',
  },
  {
    id: jo(4),
    term_id: jt(3),
    block_id: BLOCK_IDS.headingSefirah,
    start_time: '636',
    end_time: '900',
    original_text: 'ספירת העומר — תהליך העלאת המוחין',
  },
  {
    id: jo(5),
    term_id: jt(3),
    block_id: BLOCK_IDS.sefirahText,
    start_time: '900',
    end_time: '1200',
    original_text: 'עולה ממוחין דקטנות למוחין דגדלות',
  },
  {
    id: jo(6),
    term_id: jt(27),
    block_id: BLOCK_IDS.headingAri,
    start_time: '1534',
    end_time: '1800',
    original_text: 'מקורות — ספר הכוונות של האר"י',
  },
  {
    id: jo(7),
    term_id: jt(28),
    block_id: BLOCK_IDS.ariText,
    start_time: '1800',
    end_time: '2160',
    original_text: 'הרב קורא מדף פ עד דף פו של ספר הכוונות של האר"י',
  },
  {
    id: jo(8),
    term_id: jt(13),
    block_id: BLOCK_IDS.shavuotText,
    start_time: '2160',
    end_time: '2500',
    original_text: 'עלייה לדרגת אמא ואבא — חב"ד',
  },
  {
    id: jo(9),
    term_id: jt(17),
    block_id: BLOCK_IDS.summary,
    start_time: '60',
    end_time: '269',
    original_text: 'שיעור מאת מרן הרב ישראל, יום ה כב ניסן תשפ"ו',
  },
  {
    id: jo(10),
    term_id: jt(16),
    block_id: BLOCK_IDS.keyPoints,
    start_time: '1200',
    end_time: '1534',
    original_text: 'הקשר בין ימי הספירה לספירות הקבלה',
  },
];
