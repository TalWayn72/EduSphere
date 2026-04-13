/**
 * GlossaryAggregationService
 *
 * Auto-generates glossary definitions from jargon occurrence contexts
 * and computes per-lesson centrality scores.
 * LLM integration stubbed — concatenates occurrence contexts for now.
 */
import { Injectable, Logger } from '@nestjs/common';
import { createDatabaseConnection, schema, eq, and, desc } from '@edusphere/db';
import type { GlossaryEntry, NewGlossaryLessonRef } from '@edusphere/db';
import { GlossaryService } from './glossary.service.js';

type LessonAgg = { count: number; firstTime: string | null };

@Injectable()
export class GlossaryAggregationService {
  private readonly logger = new Logger(GlossaryAggregationService.name);
  private readonly db = createDatabaseConnection();

  constructor(private readonly glossaryService: GlossaryService) {}

  /**
   * Collect up to 10 occurrence snippets and synthesise a definition stub.
   * Replace with real LLM call in a later phase.
   */
  async aggregateDefinition(
    tenantId: string,
    termId: string
  ): Promise<GlossaryEntry> {
    const occurrences = await this.db
      .select({
        originalText: schema.jargon_occurrences.original_text,
        correctedText: schema.jargon_occurrences.corrected_text,
      })
      .from(schema.jargon_occurrences)
      .where(eq(schema.jargon_occurrences.term_id, termId))
      .orderBy(desc(schema.jargon_occurrences.created_at))
      .limit(10);

    const contexts = occurrences
      .map((o) => o.correctedText ?? o.originalText)
      .filter(Boolean);
    const aggregatedDefinition =
      contexts.length > 0
        ? `[Auto-generated from ${contexts.length} occurrences] ${contexts.slice(0, 3).join(' … ')}`
        : '[No occurrences found — add lesson content to generate definition]';

    this.logger.log(
      { tenantId, termId, occurrenceCount: contexts.length },
      'Aggregated glossary definition (stub)'
    );
    return this.glossaryService.saveAggregatedDefinition(
      tenantId,
      termId,
      aggregatedDefinition
    );
  }

  /**
   * Group jargon_occurrences by lesson and upsert glossary_lesson_refs
   * with occurrence_count and centrality_score.
   */
  async updateLessonRefs(tenantId: string, termId: string): Promise<void> {
    const entry = await this.glossaryService.getByTermId(tenantId, termId);
    const rows = await this.db
      .select({
        lessonId: schema.jargon_occurrences.lesson_id,
        startTime: schema.jargon_occurrences.start_time,
      })
      .from(schema.jargon_occurrences)
      .where(eq(schema.jargon_occurrences.term_id, termId));

    if (rows.length === 0) return;

    const lessonMap = new Map<string, LessonAgg>();
    for (const row of rows) {
      const st = row.startTime ? String(row.startTime) : null;
      const agg = lessonMap.get(row.lessonId);
      if (!agg) {
        lessonMap.set(row.lessonId, { count: 1, firstTime: st });
      } else {
        agg.count += 1;
        if (
          st !== null &&
          (agg.firstTime === null || parseFloat(st) < parseFloat(agg.firstTime))
        ) {
          agg.firstTime = st;
        }
      }
    }

    const total = rows.length;
    for (const [lessonId, data] of lessonMap) {
      const ref: NewGlossaryLessonRef = {
        tenant_id: tenantId,
        glossary_entry_id: entry.id,
        lesson_id: lessonId,
        occurrence_count: data.count,
        centrality_score: (data.count / total).toFixed(4),
        first_mention_time: data.firstTime,
      };
      await this.db
        .insert(schema.glossary_lesson_refs)
        .values(ref)
        .onConflictDoUpdate({
          target: [
            schema.glossary_lesson_refs.glossary_entry_id,
            schema.glossary_lesson_refs.lesson_id,
          ],
          set: {
            occurrence_count: ref.occurrence_count,
            centrality_score: ref.centrality_score,
            first_mention_time: ref.first_mention_time,
          },
        });
    }
    this.logger.log(
      { tenantId, termId, lessonCount: lessonMap.size },
      'Updated glossary lesson refs'
    );
  }

  /** Fetch lesson refs for a glossary entry. */
  async getLessonRefs(entryId: string, tenantId: string) {
    return this.db
      .select()
      .from(schema.glossary_lesson_refs)
      .where(
        and(
          eq(schema.glossary_lesson_refs.glossary_entry_id, entryId),
          eq(schema.glossary_lesson_refs.tenant_id, tenantId)
        )
      );
  }
}
