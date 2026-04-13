/**
 * GlossaryFieldsResolver — field resolvers for GlossaryEntry type.
 * Handles term, lessonRefs, and crossReferences resolution.
 */
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { GlossaryAggregationService } from './glossary-aggregation.service.js';
import { JargonTermService } from '../jargon/jargon-term.service.js';

type GlossaryGQL = { id: string; termId: string; tenantId: string };
type LessonRefRow = {
  lesson_id: string;
  occurrence_count: number;
  centrality_score: string;
  first_mention_time: string | null;
};

@Resolver('GlossaryEntry')
export class GlossaryFieldsResolver {
  constructor(
    private readonly aggregationService: GlossaryAggregationService,
    private readonly termService: JargonTermService
  ) {}

  @ResolveField('term')
  async term(@Parent() entry: GlossaryGQL) {
    const t = await this.termService.findById(entry.termId, entry.tenantId);
    return {
      id: t.id,
      domainId: t.domain_id,
      tenantId: t.tenant_id,
      canonicalForm: t.canonical_form,
      phoneticHint: t.phonetic_hint ?? null,
      altForms: Array.isArray(t.alt_forms) ? t.alt_forms : [],
      definitionShort: t.definition_short ?? null,
      definitionFull: t.definition_full ?? null,
      language: t.language,
      source: t.source,
      confidence: t.confidence !== null ? Number(t.confidence) : null,
    };
  }

  @ResolveField('lessonRefs')
  async lessonRefs(@Parent() entry: GlossaryGQL) {
    const refs = await this.aggregationService.getLessonRefs(
      entry.id,
      entry.tenantId
    );
    return (refs as LessonRefRow[]).map((r) => ({
      lessonId: r.lesson_id,
      lessonTitle: null,
      occurrenceCount: r.occurrence_count,
      centralityScore: parseFloat(r.centrality_score),
      firstMentionTime:
        r.first_mention_time !== null ? parseFloat(r.first_mention_time) : null,
    }));
  }

  @ResolveField('crossReferences')
  async crossReferences() {
    // Stub — full graph traversal via Apache AGE in a later phase
    return [];
  }
}
