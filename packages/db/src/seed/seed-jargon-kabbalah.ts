/**
 * Seed: Jargon — קבלה / ספירת העומר
 *
 * Populates:
 *   - jargon_domains: "קבלה — ספירת העומר"
 *   - jargon_terms: 30 Kabbalistic terms with Hebrew definitions
 *   - lesson_domain_assignments: links domain → lesson 52105dcc-...
 *   - jargon_occurrences: term locations in enriched transcript blocks
 *
 * Idempotent: all inserts use onConflictDoNothing()
 * Run standalone: npx tsx packages/db/src/seed/seed-jargon-kabbalah.ts
 */

import 'dotenv/config';
import { createDatabaseConnection, schema } from '../index.js';
import { withBypassRLS } from '../rls/withTenantContext.js';
import {
  DEMO_TENANT,
  LESSON_ID,
  DOMAIN_ID,
  DOMAIN_ASSIGNMENT_ID,
  KABBALAH_OCCURRENCES,
} from './seed-jargon-kabbalah-data.js';
import { KABBALAH_TERMS } from './seed-jargon-kabbalah-terms.js';

export async function seedJargonKabbalah(): Promise<void> {
  const db = createDatabaseConnection();

  await withBypassRLS(db, async (tx) => {
    // ── 1. Jargon domain ─────────────────────────────────────────────────────
    await tx
      .insert(schema.jargon_domains)
      .values({
        id: DOMAIN_ID,
        tenant_id: DEMO_TENANT,
        name: 'קבלה — ספירת העומר',
        description:
          'מונחי יסוד בקבלת האר"י הקדוש הקשורים לספירת העומר, מוחין דקטנות ומוחין דגדלות, עץ החיים, הפרצופים וספר הכוונות.',
        language: 'he',
        metadata: {
          source: 'ספר הכוונות — האר"י הקדוש',
          tradition: 'לוריאנית',
          lesson_id: LESSON_ID,
        },
      })
      .onConflictDoNothing();

    // ── 2. Jargon terms (30 terms in batches of 10) ──────────────────────────
    const BATCH = 10;
    for (let i = 0; i < KABBALAH_TERMS.length; i += BATCH) {
      const batch = KABBALAH_TERMS.slice(i, i + BATCH);
      await tx
        .insert(schema.jargon_terms)
        .values(
          batch.map((t) => ({
            id: t.id,
            tenant_id: DEMO_TENANT,
            domain_id: DOMAIN_ID,
            canonical_form: t.canonical_form,
            phonetic_hint: t.phonetic_hint,
            alt_forms: t.alt_forms,
            definition_short: t.definition_short,
            definition_full: t.definition_full,
            language: 'he',
            source: 'MANUAL' as const,
            confidence: '0.9900',
          }))
        )
        .onConflictDoNothing();
    }

    // ── 3. Lesson domain assignment ──────────────────────────────────────────
    await tx
      .insert(schema.lesson_domain_assignments)
      .values({
        id: DOMAIN_ASSIGNMENT_ID,
        lesson_id: LESSON_ID,
        domain_id: DOMAIN_ID,
        detection_method: 'INSTRUCTOR_CONFIRMED' as const,
        confidence: '1.0000',
      })
      .onConflictDoNothing();

    // ── 4. Jargon occurrences (term → block links) ───────────────────────────
    await tx
      .insert(schema.jargon_occurrences)
      .values(
        KABBALAH_OCCURRENCES.map((o) => ({
          id: o.id,
          lesson_id: LESSON_ID,
          term_id: o.term_id,
          block_id: o.block_id,
          start_time: o.start_time,
          end_time: o.end_time,
          original_text: o.original_text,
          confidence: '0.9500',
        }))
      )
      .onConflictDoNothing();
  });

  console.log('✅ Jargon Kabbalah seed completed!');
  console.log(`   Domain ID:           ${DOMAIN_ID}`);
  console.log(`   Lesson ID:           ${LESSON_ID}`);
  console.log(`   Terms seeded:        ${KABBALAH_TERMS.length}`);
  console.log(`   Occurrences seeded:  ${KABBALAH_OCCURRENCES.length}`);
}

// Allow direct execution
if (process.argv[1]?.includes('seed-jargon-kabbalah')) {
  void (async () => {
    const { closeAllPools } = await import('../index.js');
    seedJargonKabbalah()
      .catch((err) => {
        console.error('❌ Seed failed:', err);
        process.exit(1);
      })
      .finally(() => closeAllPools());
  })();
}
